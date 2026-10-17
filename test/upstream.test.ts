// Cross-checks against the hosts' own code where it is importable, or their exact algorithm where it is not.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
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
