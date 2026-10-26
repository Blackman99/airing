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
  assert.equal(r.deployments.length, 9);
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
  // Surge: dotfiles and .git stay home, the SQL dump does not
  const sg = byHost(r, "surge");
  assert.ok(!find(sg, ".env") && !find(sg, ".dev.vars") && !find(sg, ".git/"));
  assert.equal(find(sg, "backup.sql")?.severity, "LEAK");
  // aws s3 sync: no default ignores at all — .env, .git, the dump, node_modules all go up
  const s3 = byHost(r, "aws-s3");
  for (const p of [".env", ".dev.vars", ".git/", "backup.sql"]) assert.equal(find(s3, p)?.severity, "LEAK", p);
  assert.equal(s3.savedByHost.length, 0);
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
  assert.deepEqual(p("npx surge ./dist my-app.surge.sh"), ["surge:dist"]);
  assert.deepEqual(p("surge --project build --domain x.surge.sh"), ["surge:build"]);
  assert.deepEqual(p("surge -p=out -d x.surge.sh"), ["surge:out"]);
  assert.deepEqual(p("surge publish public"), ["surge:public"]);
  assert.deepEqual(p("surge . _"), ["surge:."]);
  assert.deepEqual(p("surge"), ["surge:."]);
  assert.deepEqual(p("surge list"), []);
  assert.deepEqual(p("surge teardown x.surge.sh"), []);
  assert.deepEqual(p("surge x.surge.sh status"), []);
  assert.deepEqual(p("surge --help"), []);
  assert.deepEqual(p("aws s3 sync dist s3://my-site"), ["aws-s3:dist"]);
  assert.deepEqual(p("aws --profile prod s3 sync ./out s3://my-site --delete --cache-control max-age=60"), ["aws-s3:out"]);
  assert.deepEqual(p("aws s3 sync . s3://b --exclude=.git/* --region=eu-west-1 --dryrun"), ["aws-s3:."]);
  assert.deepEqual(p("aws s3 cp build s3://b/ --recursive"), ["aws-s3:build"]);
  assert.deepEqual(p("aws s3 mv --recursive public s3://b"), ["aws-s3:public"]);
  assert.deepEqual(p("aws s3 cp index.html s3://b/"), [], "single file, not a site");
  assert.deepEqual(p("aws s3 sync s3://b ./backup"), [], "download");
  assert.deepEqual(p("aws s3 sync s3://a s3://b"), [], "bucket to bucket");
  assert.deepEqual(p("aws s3 ls s3://b"), []);
  assert.deepEqual(p("aws s3api put-object --bucket b --key k --body f"), []);
  assert.deepEqual(p("aws cloudfront create-invalidation --distribution-id X --paths /*"), []);
  assert.deepEqual(p("npm run build && aws s3 sync dist s3://b --delete && aws cloudfront create-invalidation --distribution-id X --paths '/*'"), ["aws-s3:dist"]);
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

test("surge: a .surgeignore that un-ignores .env publishes it, and the fix names .surgeignore", async () => {
  const { root } = vibeApp({ ".surgeignore": "!.env\n!.well-known\n" });
  const r = await scan(nodeTree(root), { host: "surge", dir: "." });
  const d = r.deployments[0];
  assert.equal(find(d, ".env")?.severity, "LEAK");
  assert.ok(!find(d, ".dev.vars"), "only .env was re-included");
  assert.ok(!find(d, ".git/"));
  assert.ok(d.savedByHost.some((s) => s.path === ".dev.vars"));
  const clean = await scan(nodeTree(writeTree({ "index.html": "<h1>hi</h1>", ".env": `OPENAI_API_KEY=${fake.openai()}\n`, "app.js": "x" })), { host: "surge", dir: "." });
  assert.equal(clean.worst, "CLEAN");
});

test("matrix labels keep the file name and the secret count when shortened", async () => {
  const { fitLabel } = await import("../src/format.js");
  assert.equal(fitLabel("dist/assets/index-8f3a.js (1 secret)", 34), "dist/…/index-8f3a.js (1 secret)");
  assert.equal(fitLabel(".env (4 secrets)", 34), ".env (4 secrets)");
  assert.equal(fitLabel("a-very-long-file-name-without-any-folder.sql", 20), "…hout-any-folder.sql");
  assert.equal(fitLabel("public/very/deep/folder/structure/with-a-long-name.js.map", 34), "public/…/with-a-long-name.js.map");
});

test("aws-s3: --exclude/--include in order, last match wins, the fix is exclude flags", async () => {
  const { s3Excludes } = await import("../src/scan.js");
  const filters = (...f: [("exclude" | "include"), string][]) => f.map(([type, pattern]) => ({ type, pattern }));
  const run = async (s3Filters: ReturnType<typeof filters>, extra: Record<string, string> = {}) => {
    const { root } = vibeApp({ "site/index.html": "<h1>hi</h1>", "site/.env": `OPENAI_API_KEY=${fake.openai()}\n`, "site/.git/config": "[core]\n", "site/sub/.env.local": `STRIPE_SECRET_KEY=${fake.stripe()}\n`, ...extra });
    return (await scan(nodeTree(root), { deployments: [{ host: "aws-s3", dir: "site", source: "command", opts: { s3Filters } }] })).deployments[0];
  };
  // no filters: everything leaks, and the fix names both the top-level and nested copies
  const none = await run([]);
  assert.deepEqual(none.findings.filter((f) => f.severity === "LEAK").map((f) => f.path).sort(), [".env", ".git/", "sub/.env.local"]);
  assert.ok(/aws s3 command/.test(none.remedy!.say));
  assert.deepEqual(none.remedy!.lines, ['--exclude ".env*"', '--exclude "*/.env*"', '--exclude ".git/*"']);
  // the common wrong fix: ".*" saves .env and .git at the top — fnmatch "*" crosses "/" — but not sub/.env.local
  const dot = await run(filters(["exclude", ".*"]));
  assert.deepEqual(dot.findings.filter((f) => f.severity === "LEAK").map((f) => f.path), ["sub/.env.local"]);
  assert.ok(dot.savedByHost.some((s) => s.path === ".env" && s.why === '--exclude ".*"'));
  // a later --include re-publishes it
  const back = await run(filters(["exclude", ".*"], ["include", ".env"]));
  assert.equal(find(back, ".env")?.severity, "LEAK");
  assert.ok(!find(back, ".git/"));
  // "./" never matches, and the report says why
  const slash = await run(filters(["exclude", "./.env"], ["exclude", ".git/*"], ["exclude", "*/.env*"]));
  assert.equal(find(slash, ".env")?.severity, "LEAK");
  assert.ok(!find(slash, ".git/") && !find(slash, "sub/.env.local"));
  assert.ok(slash.remedy!.notes!.some((n) => n.includes('--exclude "./.env"') && n.includes('drop it')));
  assert.equal(slash.remedy!.lines!.length, 2, "only what still leaks: .env* and */.env*");
  // the excludes we suggest really do keep each file home under aws-cli semantics
  assert.deepEqual(s3Excludes("git-dir", "a/.git/"), ["a/.git/*"]);
  const fixed = await run(none.remedy!.lines!.map((l) => ({ type: "exclude" as const, pattern: /"(.*)"/.exec(l)![1] })));
  assert.deepEqual(fixed.findings.filter((f) => f.severity === "LEAK"), []);
});

test("aws-s3: read from workflows, deploy scripts and Makefiles (free-form shell)", async () => {
  const { detectDeployments } = await import("../src/detect.js");
  const { root } = vibeApp({
    ".github/workflows/deploy.yml": "on: push\njobs:\n  d:\n    steps:\n      - run: npm run build\n      - run: |\n          aws s3 sync ./dist s3://my-site \\\n            --delete \\\n            --exclude \"*.map\"   # no maps\n      - run: aws s3 sync ${{ env.OUT }} s3://other\n",
    "scripts/deploy.sh": "#!/bin/sh\nset -e\naws s3 cp public s3://assets --recursive\n",
    "Makefile": "deploy:\n\t@aws s3 sync build s3://b --exclude '.git/*'\n",
    "src/notes.md": "aws s3 sync docs s3://ignored-not-a-script\n",
  });
  const d = await detectDeployments(nodeTree(root));
  const s3 = d.deployments.filter((x) => x.host === "aws-s3");
  assert.deepEqual(s3.map((x) => `${x.dir}@${x.source}`).sort(), ["build@Makefile", "dist@.github/workflows/deploy.yml", "public@scripts/deploy.sh"]);
  assert.deepEqual(s3.find((x) => x.dir === "dist")!.opts.s3Filters, [{ type: "exclude", pattern: "*.map" }]);
  assert.deepEqual(s3.find((x) => x.dir === "build")!.opts.s3Filters, [{ type: "exclude", pattern: ".git/*" }]);
  assert.ok(d.notes.some((n) => n.startsWith(".github/workflows/deploy.yml: aws s3 upload from \"${{") && n.includes("a variable")), "a variable dir is reported, not guessed");
});
