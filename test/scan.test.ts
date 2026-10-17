import { test } from "node:test";
import assert from "node:assert/strict";
import { scan } from "../src/scan.js";
import { nodeTree } from "../src/tree-node.js";
import { deploymentsFromCommand } from "../src/detect.js";
import { parseEnv, secretVars } from "../src/rules.js";
import { sha256Hex } from "../src/sha256.js";
import { createHash } from "node:crypto";
import { vibeApp, writeTree, fake } from "./helpers.js";

const byHost = (r: Awaited<ReturnType<typeof scan>>, h: string) => r.deployments.find((d) => d.deployment.host === h)!;
const find = (d: ReturnType<typeof byHost>, p: string) => d.findings.find((f) => f.path === p);

test("sha256 matches node:crypto", () => {
  for (const s of ["", "abc", "x".repeat(1000), "ключ🔑"]) assert.equal(sha256Hex(s), createHash("sha256").update(s).digest("hex"));
});

test("matrix: the $90k project root, host by host", async () => {
  const { root, google } = vibeApp();
  const r = await scan(nodeTree(root));
  assert.equal(r.matrix, true);
  assert.equal(r.deployments.length, 7);
  const pages = byHost(r, "cf-pages");
  const env = find(pages, ".env")!;
  assert.equal(env.severity, "LEAK");
  assert.deepEqual(env.secrets.map((s) => s.name).sort(), ["DATABASE_URL", "GOOGLE_API_KEY", "OPENAI_API_KEY"]);
  assert.equal(env.secrets.find((s) => s.name === "GOOGLE_API_KEY")!.provider, "Google Cloud / Gemini");
  assert.equal(env.secrets.find((s) => s.name === "GOOGLE_API_KEY")!.fingerprint, sha256Hex(google).slice(0, 8));
  assert.ok(find(pages, ".dev.vars")?.severity === "LEAK");
  assert.ok(find(pages, "backup.sql")?.severity === "LEAK");
  assert.ok(!find(pages, ".git/"), "wrangler pages skips **/.git");
  assert.ok(pages.savedByHost.some((s) => s.path === ".git/"));
  assert.ok(!find(pages, ".env.example"), "template with placeholders is fine");
  // Workers assets ship .git too
  assert.equal(find(byHost(r, "cf-workers"), ".git/")?.severity, "LEAK");
  // Netlify skips dotfiles but not the SQL dump
  const net = byHost(r, "netlify");
  assert.ok(!find(net, ".env") && !find(net, ".dev.vars") && !find(net, ".git/"));
  assert.equal(find(net, "backup.sql")?.severity, "LEAK");
  // Vercel with a build script: uploaded, not necessarily served
  assert.equal(find(byHost(r, "vercel"), ".env")?.severity, "RISK");
  // Firebase without hosting.ignore: dot:true
  assert.equal(find(byHost(r, "firebase"), ".env")?.severity, "LEAK");
  // GitHub Pages artifact: hidden excluded
  assert.ok(!find(byHost(r, "github-pages"), ".env"));
  // the bundle: inline Google key is RISK (could be a restricted browser key), map with key is LEAK
  assert.equal(find(pages, "dist/assets/index-3f2a.js")?.severity, "RISK");
  assert.ok(pages.findings.some((f) => f.path === "dist/assets/index-3f2a.js.map" && f.rule === "source-map"));
  // values never appear anywhere in the report
  assert.ok(!JSON.stringify(r).includes(google));
  assert.ok(!JSON.stringify(r).includes("hunter2"));
  assert.equal(r.worst, "LEAK");
});

test("config: wrangler.toml pages_build_output_dir → only dist is checked", async () => {
  const { root } = vibeApp({ "wrangler.toml": 'name = "swarm"\npages_build_output_dir = "./dist"\ncompatibility_date = "2026-10-01"\n' });
  const r = await scan(nodeTree(root));
  assert.equal(r.matrix, false);
  assert.equal(r.deployments.length, 1);
  const d = r.deployments[0];
  assert.equal(d.deployment.host, "cf-pages");
  assert.equal(d.deployment.dir, "dist");
  assert.ok(!d.findings.some((f) => f.path === ".env"));
  assert.equal(r.worst, "RISK"); // inline browser key + source map, no hard leak
});

test("env parsing: quotes, export, comments, placeholders", () => {
  const vars = parseEnv(`export A_TOKEN='abc123def'\nB_SECRET="x" # short\nC_KEY=changeme\nNEXT_PUBLIC_URL=https://x\n# D_KEY=zzz\nE_PASSWORD = p@ss w0rd long # trailing\n`);
  assert.deepEqual(vars.map((v) => v.name), ["A_TOKEN", "B_SECRET", "C_KEY", "NEXT_PUBLIC_URL", "E_PASSWORD"]);
  const s = secretVars(vars).map((x) => x.name);
  assert.deepEqual(s, ["A_TOKEN", "E_PASSWORD"]);
});

test("firebase hosting.ignore default keeps dotfiles home", async () => {
  const root = writeTree({
    "firebase.json": JSON.stringify({ hosting: { public: "public", ignore: ["firebase.json", "**/.*", "**/node_modules/**"] } }),
    "public/index.html": "<h1>hi</h1>",
    "public/.env": `GEMINI_API_KEY=${fake.google()}\n`,
    "public/admin/.env.production": "SECRET_TOKEN=abcdefghijkl\n",
  });
  const r = await scan(nodeTree(root));
  assert.equal(r.deployments[0].deployment.host, "firebase");
  assert.equal(r.worst, "CLEAN");
  assert.equal(r.deployments[0].savedByHost.length, 2);
});

test("firebase without hosting.ignore publishes .env", async () => {
  const root = writeTree({ "firebase.json": JSON.stringify({ hosting: { public: "public" } }), "public/.env": "GEMINI_API_KEY=abcdefghijklmnop\n" });
  const r = await scan(nodeTree(root));
  assert.equal(r.worst, "LEAK");
});

test("assetsignore keeps .env home on Workers", async () => {
  const root = writeTree({ "wrangler.jsonc": '{ "name": "w", // c\n "assets": { "directory": "./public" } }', "public/.assetsignore": ".env*\n", "public/.env": "API_KEY=abcdefghijk\n", "public/index.html": "x" });
  const r = await scan(nodeTree(root));
  assert.equal(r.deployments[0].deployment.host, "cf-workers");
  assert.equal(r.worst, "CLEAN");
  assert.equal(r.deployments[0].savedByHost[0].why, ".assetsignore");
});

test("private keys, service accounts, npmrc", async () => {
  const pem = "-----BEGIN OPENSSH PRIVATE KEY-----\n" + "b3BlbnNzaC1rZXktdjEAAAAA".repeat(4) + "\n-----END OPENSSH PRIVATE KEY-----\n";
  const root = writeTree({
    "site/id_ed25519": pem,
    "site/cert.pem": "-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----\n",
    "site/sa/service-account.json": JSON.stringify({ type: "service_account", private_key: "-----BEGIN PRIVATE KEY-----\\nX\\n-----END PRIVATE KEY-----\\n" }),
    "site/.npmrc": "//registry.npmjs.org/:_authToken=npm_" + "a".repeat(36) + "\n",
    "site/index.html": "ok",
  });
  const r = await scan(nodeTree(root), { host: "cf-pages", dir: "site" });
  const paths = r.deployments[0].findings.filter((f) => f.severity === "LEAK").map((f) => f.path).sort();
  assert.deepEqual(paths, [".npmrc", "id_ed25519", "sa/service-account.json"]);
});

test("command parsing: what an agent actually types", () => {
  const p = (s: string) => deploymentsFromCommand(s).map((d) => `${d.host}:${d.dir || "(cfg)"}`);
  assert.deepEqual(p("npx wrangler pages deploy . --project-name swarm"), ["cf-pages:."]);
  assert.deepEqual(p("npm run build && npx wrangler@latest pages deploy dist --branch main"), ["cf-pages:dist"]);
  assert.deepEqual(p("bunx wrangler deploy"), ["cf-workers:(cfg)"]);
  assert.deepEqual(p("wrangler deploy --assets ./public"), ["cf-workers:public"]);
  assert.deepEqual(p("vercel --prod"), ["vercel:."]);
  assert.deepEqual(p("vercel deploy ./out --prod --yes"), ["vercel:out"]);
  assert.deepEqual(p("vercel env pull"), []);
  assert.deepEqual(p("npx netlify-cli deploy --dir=build --prod"), ["netlify:build"]);
  assert.deepEqual(p("firebase deploy --only hosting"), ["firebase:(cfg)"]);
  assert.deepEqual(p("firebase deploy --only functions"), []);
  assert.deepEqual(p("npx gh-pages -d dist --dotfiles"), ["gh-pages:dist"]);
  assert.deepEqual(p("git push && echo done"), []);
  assert.deepEqual(p("CLOUDFLARE_ACCOUNT_ID=x npx wrangler pages deploy out"), ["cf-pages:out"]);
});

test("connection strings built from variables are not keys", async () => {
  const { inlineSecrets } = await import("../src/rules.js");
  const tpl = ["postgres://app:", "${pw}", "@db:5432/x"].join("");
  assert.equal(inlineSecrets(`const u = \`${tpl}\``).refs.length, 0);
  assert.equal(inlineSecrets("url = 'mysql://root:{{ .Password }}@db/x'").refs.length, 0);
  assert.equal(inlineSecrets("redis://u:$REDIS_PASSWORD@h:6379").refs.length, 0);
  assert.equal(inlineSecrets("postgres://app:" + "s3cr3tPassw0rd" + "@db.example.com/x").refs.length, 1);
});
