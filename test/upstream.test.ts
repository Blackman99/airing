// Cross-checks against the hosts' own code where it is importable, or their exact algorithm where it is not.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { tmpdir } from "node:os";
import { buildFileTree } from "@vercel/client";
import { globSync } from "glob";
import { glob as tinyglob } from "tinyglobby";
import ignore from "ignore";
import { Minimatch } from "minimatch";
import { hostFilter } from "../src/hosts.js";
import { nodeTree } from "../src/tree-node.js";
import { vibeApp, writeTree } from "./helpers.js";

const ours = (root: string, host: Parameters<typeof hostFilter>[0], input: Parameters<typeof hostFilter>[1] = { opts: {} }) => {
  const files = nodeTree(root).files;
  const f = hostFilter(host, input, { hasCargo: files.some((e) => e.path === "Cargo.toml") });
  return files.filter((e) => f(e.path).fate !== "home").map((e) => e.path).sort();
};

const extra = {
  "sub/.git/config": "[core]\n",
  "sub/node_modules/x.js": "x",
  "a/.hidden/node_modules/y.js": "y",
  "functions/api.js": "export {}",
  "_headers": "/*\n  X: y",
  "nested/_headers": "x",
  ".well-known/security.txt": "x",
  "__MACOSX/._a": "x",
  ".env.local": "A=1",
  ".env.production.local": "A=1",
  ".env.production": "A=1",
  ".vercelignore": "backup.sql\n/dist/assets/*.map\n",
  "Cargo.toml": "[package]",
  "target/release/bin": "x",
};

test("vercel: same upload set as @vercel/client buildFileTree", async () => {
  const { root } = vibeApp(extra);
  const { fileList } = await buildFileTree(root, { isDirectory: true }, () => {});
  const upstream = fileList.map((p: string) => relative(root, p).split(sep).join("/")).filter((p: string) => statSync(join(root, p)).isFile()).sort();
  const { readFileSync } = await import("node:fs");
  const mine = ours(root, "vercel", { opts: {}, vercelignore: readFileSync(join(root, ".vercelignore"), "utf8") });
  // buildFileTree also lists the .vercelignore itself; so do we
  assert.deepEqual(mine, upstream);
  assert.ok(upstream.includes(".env") && upstream.includes(".env.production"), "Vercel uploads .env and .env.production");
  assert.ok(!upstream.includes(".env.local"));
});

test("firebase: same set as firebase-tools listFiles (glob@10, dot: true)", () => {
  const { root } = vibeApp(extra);
  for (const userIgnore of [undefined, ["firebase.json", "**/.*", "**/node_modules/**"], ["**/*.map", "backup.sql"]]) {
    const upstream = globSync("**/*", { cwd: root, dot: true, follow: true, nodir: true, posix: true, ignore: ["**/firebase-debug.log", "**/firebase-debug.*.log", ".firebase/*"].concat(userIgnore ?? []) }).sort();
    assert.deepEqual(ours(root, "firebase", { opts: { firebaseIgnore: userIgnore } }), upstream, JSON.stringify(userIgnore));
  }
});

test("gh-pages: same set as tinyglobby (gh-pages' own globber)", async () => {
  const { root } = vibeApp(extra);
  for (const dot of [false, true]) {
    const upstream = (await tinyglob("**/*", { cwd: root, dot, onlyFiles: true })).sort();
    assert.deepEqual(ours(root, "gh-pages", { opts: { ghPagesDotfiles: dot } }), upstream, `dotfiles=${dot}`);
  }
});

test("github-pages: same set as the tar command in upload-pages-artifact", (t) => {
  const { root } = vibeApp(extra);
  for (const hidden of [false, true]) {
    let out: string;
    try {
      out = execFileSync("tar", ["--dereference", "--hard-dereference", "--directory", root, "-cvf", "/dev/null", "--exclude=.git", "--exclude=.github", ...(hidden ? [] : ["--exclude=.[^/]*"]), "."], { encoding: "utf8" });
    } catch {
      t.skip("GNU tar not available");
      return;
    }
    const upstream = out.split("\n").map((l) => l.replace(/^\.\//, "")).filter((p) => p && !p.endsWith("/") && p !== ".").filter((p) => statSync(join(root, p)).isFile()).sort();
    assert.deepEqual(ours(root, "github-pages", { opts: { includeHiddenFiles: hidden } }), upstream, `hidden=${hidden}`);
  }
});

test("cf-pages: same set as wrangler's validate() walk (algorithm copied verbatim)", () => {
  const { root } = vibeApp(extra);
  const IGNORE_LIST = ["_worker.js", "_redirects", "_headers", "_routes.json", "functions", "**/.DS_Store", "**/node_modules", "**/.git", ".wrangler"].map((p) => new Minimatch(p));
  const files: string[] = [];
  const walk = (dir: string, start: string) => {
    for (const file of readdirSync(dir)) {
      const filepath = join(dir, file);
      const rel = relative(start, filepath);
      if (IGNORE_LIST.some((m) => m.match(rel))) continue;
      if (statSync(filepath).isDirectory()) walk(filepath, start);
      else files.push(rel.split(sep).join("/"));
    }
  };
  walk(root, root);
  assert.deepEqual(ours(root, "cf-pages"), files.sort());
  assert.ok(files.includes(".env") && files.includes("a/.hidden/node_modules/y.js") && !files.includes("sub/node_modules/x.js"));
});

test("cf-workers: same set as wrangler's buildAssetManifest (ignore lib, recursive readdir)", () => {
  const root = writeTree({ ".assetsignore": "*.map\n!keep.map\n", "a.map": "x", "keep.map": "y", ".git/HEAD": "ref", "_redirects": "/a /b", "deep/_headers": "x", ".env": "A=1" });
  const ig = ignore().add(["/.assetsignore", "/_redirects", "/_headers", "*.map", "!keep.map", ""]);
  const upstream = (readdirSync(root, { recursive: true }) as string[]).filter((p) => !ig.test(p).ignored && statSync(join(root, p)).isFile()).map((p) => p.split(sep).join("/")).sort();
  assert.deepEqual(ours(root, "cf-workers", { opts: {}, assetsignore: "*.map\n!keep.map\n" }), upstream);
  assert.ok(upstream.includes(".git/HEAD") && upstream.includes("deep/_headers"));
});

test("netlify: same set as netlify-cli getDeployFilesFilter (algorithm copied verbatim)", () => {
  const { root } = vibeApp(extra);
  const filter = (filename: string, skipNodeModules: boolean) => {
    const base = filename.split("/").pop()!;
    return !((skipNodeModules && base === "node_modules") || (base.startsWith(".") && base !== ".well-known") || base.startsWith("__MACOSX") || base.includes("/.") || base === "_redirects" || base === "_headers");
  };
  for (const atRoot of [true, false]) {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        const rel = relative(root, p).split(sep).join("/");
        if (!filter(rel, atRoot)) continue;
        if (statSync(p).isDirectory()) walk(p);
        else files.push(rel);
      }
    };
    walk(root);
    assert.deepEqual(ours(root, "netlify", { opts: { netlifyAtRoot: atRoot } }), files.sort(), `atRoot=${atRoot}`);
  }
});

test("surge: same set as surge-stream getFiles (surge-ignore defaults + .surgeignore, walker copied verbatim)", () => {
  const surgeIgnore: string[] = createRequire(import.meta.url)("surge-ignore");
  const { root } = vibeApp({ ...extra, "notes.txt~": "x", "draft.html~": "x", "bower_components/a.js": "x", "deep/bower_components/b.js": "x", ".well-known/assetlinks.json": "{}" });
  for (const surgeignore of [undefined, "!.env\nbackup.sql\n", "!.well-known\n*.map\n", "!.git\n"]) {
    // surge-stream lib/stream.js getFiles + lib/project.js ignorer, minus the symlink branch (no links here)
    const ig = ignore().add(surgeIgnore);
    if (surgeignore) ig.add(surgeignore);
    const getFiles = (dir: string, prefix: string): string[] => {
      let results: string[] = [];
      for (const entry of readdirSync(dir)) {
        const fullPath = join(dir, entry);
        const relativePath = prefix ? prefix + "/" + entry : entry;
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          if (ig.ignores(relativePath + "/")) continue;
          results = results.concat(getFiles(fullPath, relativePath));
        } else if (stat.isFile()) {
          if (!ig.ignores(relativePath)) results.push(relativePath);
        }
      }
      return results;
    };
    const upstream = getFiles(root, "").sort();
    assert.deepEqual(ours(root, "surge", { opts: {}, surgeignore }), upstream, JSON.stringify(surgeignore));
    if (!surgeignore) assert.ok(!upstream.includes(".env") && !upstream.some((p) => p.startsWith(".git/")) && upstream.includes("backup.sql") && !upstream.includes("notes.txt~"));
  }
});

// --- AWS S3 -----------------------------------------------------------------------------------
const S3_FILTER_SETS: { name: string; f: [("exclude" | "include"), string][] }[] = [
  { name: "no filters (everything goes)", f: [] },
  { name: "the common wrong fix: .*", f: [["exclude", ".*"]] },
  { name: "./ never matches", f: [["exclude", "./.env"], ["exclude", "./backup.sql"]] },
  { name: "last match wins", f: [["exclude", ".*"], ["include", ".well-known/*"], ["include", ".env"], ["exclude", ".env"]] },
  { name: "allow-list", f: [["exclude", "*"], ["include", "*.html"], ["include", "dist/*"], ["exclude", "*.map"]] },
  { name: "sets and ?", f: [["exclude", "[.]git/*"], ["exclude", "*/[!a-m]*/*.js"], ["exclude", "?env*"], ["exclude", "backup.sq[a-z]"]] },
  { name: "deep dotfiles", f: [["exclude", ".env*"], ["exclude", "*/.env*"], ["exclude", ".git/*"], ["exclude", "*/.git/*"], ["exclude", "node_modules/*"]] },
];

/** The real aws CLI, `aws s3 sync --dryrun`, against a stub S3 endpoint that lists an empty bucket. */
test("aws-s3: same set as the real aws CLI (aws s3 sync --dryrun against an empty stub bucket)", async (t) => {
  const { execFile } = await import("node:child_process");
  const { createServer } = await import("node:http");
  const bin = process.env.AIRING_AWS || "aws";
  const run = (args: string[], env: NodeJS.ProcessEnv) =>
    new Promise<string>((res, rej) => execFile(bin, args, { env, encoding: "utf8", maxBuffer: 1 << 24, shell: process.platform === "win32" }, (e, out, err) => (e ? rej(new Error(err || e.message)) : res(out))));
  const env: NodeJS.ProcessEnv = { ...process.env, AWS_ACCESS_KEY_ID: "AKIDEXAMPLE", AWS_SECRET_ACCESS_KEY: "stub", AWS_DEFAULT_REGION: "us-east-1", AWS_REGION: "us-east-1", AWS_EC2_METADATA_DISABLED: "true", AWS_PAGER: "", AWS_CONFIG_FILE: join(tmpdir(), "airing-no-aws-config"), AWS_SHARED_CREDENTIALS_FILE: join(tmpdir(), "airing-no-aws-creds") };
  try {
    await run(["--version"], env);
  } catch {
    if (process.env.GITHUB_ACTIONS) throw new Error("the aws CLI is preinstalled on GitHub-hosted runners — the cross-check must run there");
    t.skip("aws CLI not installed (set AIRING_AWS=/path/to/aws)");
    return;
  }
  const server = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "application/xml" });
    res.end('<?xml version="1.0" encoding="UTF-8"?><ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>b</Name><Prefix></Prefix><KeyCount>0</KeyCount><MaxKeys>1000</MaxKeys><IsTruncated>false</IsTruncated></ListBucketResult>');
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  try {
    const { root } = vibeApp({ ...extra, "dist/.env": "A=1", "dist/.git/config": "[core]", "dist/assets/vendor/x.js": "x", "env.txt": "x", "xenv": "x", "backup.sqx": "x" });
    for (const set of S3_FILTER_SETS) {
      const flags = set.f.flatMap(([k, p]) => [`--${k}`, p]);
      const out = await run(["s3", "sync", root, "s3://b", "--dryrun", "--no-progress", "--endpoint-url", `http://127.0.0.1:${port}`, ...flags], env);
      const upstream = out.split(/\r?\n/).map((l) => /\(dryrun\) upload: .* to s3:\/\/b\/(.+)$/.exec(l)?.[1]).filter((x): x is string => !!x).sort();
      assert.ok(upstream.length > 0, set.name + ": aws uploaded nothing?\n" + out);
      assert.deepEqual(ours(root, "aws-s3", { opts: { s3Filters: set.f.map(([type, pattern]) => ({ type, pattern })) } }), upstream, set.name);
      if (!set.f.length) assert.ok(upstream.includes(".env") && upstream.includes(".git/config") && upstream.includes("node_modules/left-pad/index.js"), "aws s3 sync has no built-in ignores");
      if (set.name.startsWith("the common")) assert.ok(!upstream.includes(".env") && upstream.includes("dist/.env"), ".* does not reach into sub-directories");
    }
  } finally {
    server.close();
  }
});

/** Our fnmatch port against CPython's own fnmatch.fnmatchcase (what aws-cli calls on POSIX). */
test("aws-s3: fnmatch port matches CPython fnmatch on tricky patterns", async (t) => {
  const { fnmatchRegExp } = await import("../src/hosts.js");
  const pats = ["*", ".*", "*.map", "*/.env*", "?env", "[.]git/*", "[!a-m]*", "[]]x", "[!]]x", "[z-a]x", "[!z-a]x", "[a-]x", "[-a]x", "[a-c-e]x", "*[", "a[b", "[\\]x", "[^a]x", "[[]x", "a**b", "dist/*.js", "*/*/*.js", "[a-c][!x-z]?", "(a|b)", "a+b", "a.b", "$x^", "{a,b}", "[&&]x", "[~~]x", "[a&&b]x", "--x", "[!-]x"];
  const strs = ["", "a", ".env", ".git/config", "dist/.env", "dist/a.js", "dist/assets/a.js", "a.map", "x/y.map", "]x", "!x", "-x", "ax", "bx", "dx", "ex", "fx", "zx", "\\x", "^x", "[x", "ab", "aXb", "a/b", "a/x/b", "a[b", "abc", "cay", "(a|b)", "a+b", "a.b", "aab", "$x^", "{a,b}", "&x", "~x", "--x", "a/.env.local", "env", "xenv", ".env\nx"];
  let py = "";
  for (const exe of ["python3", "python"]) {
    try {
      py = execFileSync(exe, ["-c", "import fnmatch,json,sys;d=json.load(sys.stdin);print(json.dumps([[fnmatch.fnmatchcase(s,p) for s in d['s']] for p in d['p']]))"], { input: JSON.stringify({ p: pats, s: strs }), encoding: "utf8" });
      break;
    } catch {}
  }
  if (!py) {
    if (process.env.GITHUB_ACTIONS) throw new Error("python is preinstalled on GitHub-hosted runners — the cross-check must run there");
    t.skip("python not installed");
    return;
  }
  const want: boolean[][] = JSON.parse(py);
  pats.forEach((p, i) => strs.forEach((s, j) => assert.equal(fnmatchRegExp(p).test(s), want[i][j], `fnmatch(${JSON.stringify(s)}, ${JSON.stringify(p)})`)));
});
