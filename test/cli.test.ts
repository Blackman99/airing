import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { vibeApp, writeTree } from "./helpers.js";

const CLI = join(dirname(fileURLToPath(import.meta.url)), "..", "dist", "cli.js");
const posixOnly = { skip: process.platform === "win32" ? "uses #!/bin/sh stubs" : false };
const run = (args: string[], opts: { cwd?: string; input?: string } = {}) => {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd: opts.cwd, input: opts.input, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
  return { code: r.status, out: r.stdout, err: r.stderr };
};

test("built CLI exists (run npm run build first)", () => assert.ok(existsSync(CLI)));

test("exit codes: 1 on leak, 0 clean, 2 usage", () => {
  const { root } = vibeApp();
  assert.equal(run([root]).code, 1);
  const clean = writeTree({ "dist/index.html": "<h1>ok</h1>", "dist/app.js": "console.log(1)" });
  const r = run([join(clean, "dist")]);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /nothing secret would go public on any host/);
  assert.equal(run([root, "--host", "nope"]).code, 2);
  assert.match(run([root, "--host", "nope"]).err, /unknown host "nope"/);
  assert.equal(run([root, "--fail-on"]).code, 2);
  assert.equal(run(["/definitely/not/here"]).code, 2);
  assert.equal(run([root, "--fail-on", "never"]).code, 0);
});

test("--json carries no secret values", () => {
  const { root, google, openai, stripe } = vibeApp();
  const r = run([root, "--json", "--all"]);
  const j = JSON.parse(r.out);
  assert.equal(j.tool, "airing");
  assert.equal(j.deployments.length, 7);
  for (const v of [google, openai, stripe, "hunter2"]) assert.ok(!r.out.includes(v));
});

test("guard: refuses a dirty deploy and never runs it", posixOnly, () => {
  const { root } = vibeApp();
  const marker = join(root, "ran.txt");
  writeFileSync(join(root, "wrangler"), `#!/bin/sh\necho ran > ${marker}\n`, { mode: 0o755 });
  for (const argv of [["wrangler", "pages", "deploy", "."], ["./wrangler", "pages", "deploy", "."]]) {
    const r = spawnSync(process.execPath, [CLI, "guard", "--", ...argv], { cwd: root, encoding: "utf8", env: { ...process.env, NO_COLOR: "1", PATH: `${root}:${process.env.PATH}` } });
    assert.equal(r.status, 1, r.stderr);
    assert.match(r.stderr, /deploy NOT run/);
    assert.match(r.stderr, /\.env/);
  }
  assert.ok(!existsSync(marker), "wrangler must not run when the upload set leaks");
});

test("guard: clean deploy runs the command and passes its exit code", posixOnly, () => {
  const root = writeTree({ "dist/index.html": "<h1>ok</h1>" });
  writeFileSync(join(root, "wrangler"), `#!/bin/sh\necho deployed "$@"\nexit 7\n`, { mode: 0o755 });
  const r = spawnSync(process.execPath, [CLI, "guard", "--", "wrangler", "pages", "deploy", "dist"], { cwd: root, encoding: "utf8", env: { ...process.env, NO_COLOR: "1", PATH: `${root}:${process.env.PATH}` } });
  assert.equal(r.status, 7);
  assert.match(r.stdout, /deployed pages deploy dist/);
  assert.match(r.stderr, /nothing secret — deploying/);
});

test("hook: denies a Claude Code Bash deploy that would leak, silent otherwise", () => {
  const { root } = vibeApp();
  const deny = run(["hook"], { input: JSON.stringify({ hook_event_name: "PreToolUse", tool_name: "Bash", cwd: root, tool_input: { command: "npm run build && npx wrangler pages deploy . --project-name swarm" } }) });
  assert.equal(deny.code, 0);
  const j = JSON.parse(deny.out);
  assert.equal(j.hookSpecificOutput.permissionDecision, "deny");
  assert.match(j.hookSpecificOutput.permissionDecisionReason, /\.env/);
  const ok = run(["hook"], { input: JSON.stringify({ tool_name: "Bash", cwd: root, tool_input: { command: "npx wrangler pages deploy dist" } }) });
  assert.equal(ok.out, "");
  assert.equal(run(["hook"], { input: JSON.stringify({ tool_name: "Bash", cwd: root, tool_input: { command: "ls -la" } }) }).out, "");
  assert.equal(run(["hook"], { input: "not json" }).code, 0);
  const cd = run(["hook"], { input: JSON.stringify({ tool_name: "Bash", cwd: "/", tool_input: { command: `cd ${root} && vercel --prod` } }) });
  assert.equal(cd.out, "", "vercel with a build script uploads, does not serve → not a hard deny");
});

test("mcp: initialize, list, scan_deploy", () => {
  const { root, google } = vibeApp();
  const input = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    { jsonrpc: "2.0", method: "notifications/initialized" },
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
    { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "scan_deploy", arguments: { path: root, host: "cf-pages" } } },
    { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "scan_deploy", arguments: { path: root, host: "bogus" } } },
  ].map((x) => JSON.stringify(x)).join("\n") + "\n";
  const r = run(["mcp"], { input });
  const lines = r.out.trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(lines.find((l) => l.id === 1).result.serverInfo.name, "airing");
  assert.deepEqual(lines.find((l) => l.id === 2).result.tools.map((t: any) => t.name), ["scan_deploy", "probe_url", "host_rules"]);
  const scanRes = lines.find((l) => l.id === 3).result;
  assert.equal(scanRes.isError, false);
  assert.match(scanRes.content[0].text, /worst: LEAK/);
  assert.ok(!scanRes.content[0].text.includes(google));
  assert.equal(lines.find((l) => l.id === 4).result.isError, true);
});

test("usage errors fail fast, before any scan output, with a hint", () => {
  const { root } = vibeApp();
  const bad = run([root, "--fail-on", "maybe"]);
  assert.equal(bad.code, 2);
  assert.equal(bad.out, "", "no report is printed before a usage error");
  const typo = run([root, "--jsn"]);
  assert.equal(typo.code, 2);
  assert.match(typo.err, /unknown option --jsn \(did you mean --json\?\)/);
  const missing = run(["/definitely/not/here"]);
  assert.match(missing.err, /does not exist — pass the folder you deploy/);
  assert.match(run(["probe", "https://example.invalid", "--timeout", "x"]).err, /--timeout is seconds/);
});

test("scanning another folder names it in the header, not ./", () => {
  const clean = writeTree({ "dist/index.html": "<h1>ok</h1>", "dist/app.js.map": JSON.stringify({ version: 3, sources: ["a.ts"], sourcesContent: ["x"] }) });
  const r = run([join(clean, "dist"), "--host", "netlify"]);
  assert.match(r.out, /airing · Netlify · .*dist\/ {2}\(--host\)/);
  assert.doesNotMatch(r.out, /publish dir \.\//);
});
