// Each host's real upload semantics, transcribed from the upstream source (links in docs/reference).
// Every function answers one question for one file: does the host skip it, and if not, is it served?
import ignore from "ignore";
import { Minimatch } from "minimatch";
import type { Fate, HostId, HostOpts } from "./types.js";

export interface HostInfo {
  id: HostId;
  name: string;
  /** the command an agent typically runs */
  command: string;
  /** one line on what the host skips by default */
  skips: string;
  source: string;
}

export const HOSTS: Record<HostId, HostInfo> = {
  "cf-pages": {
    id: "cf-pages",
    name: "Cloudflare Pages",
    command: "wrangler pages deploy <dir>",
    skips: "only _worker.js, _redirects, _headers, _routes.json, functions/, .DS_Store, node_modules, .git, .wrangler — not .env, not .gitignore",
    source: "https://github.com/cloudflare/workers-sdk/blob/main/packages/wrangler/src/pages/validate.ts",
  },
  "cf-workers": {
    id: "cf-workers",
    name: "Cloudflare Workers assets",
    command: "wrangler deploy  ([assets] directory)",
    skips: "only .assetsignore, _redirects, _headers + whatever .assetsignore lists — even .git ships",
    source: "https://github.com/cloudflare/workers-sdk/blob/main/packages/workers-shared/utils/helpers.ts",
  },
  vercel: {
    id: "vercel",
    name: "Vercel",
    command: "vercel [deploy] [dir]",
    skips: ".git, node_modules, .env.local, .env.*.local, .vercel … + .vercelignore — not .env, not .env.production, not .gitignore",
    source: "https://github.com/vercel/vercel/blob/main/packages/client/src/utils/index.ts",
  },
  netlify: {
    id: "netlify",
    name: "Netlify",
    command: "netlify deploy --dir <dir>",
    skips: "every dotfile and dot-directory (except .well-known), __MACOSX, _redirects, _headers, node_modules at the site root",
    source: "https://github.com/netlify/cli/blob/main/src/commands/deploy/deploy.ts",
  },
  firebase: {
    id: "firebase",
    name: "Firebase Hosting",
    command: "firebase deploy --only hosting",
    skips: "only firebase-debug.log and .firebase/ + hosting.ignore in firebase.json — dotfiles included (dot: true)",
    source: "https://github.com/firebase/firebase-tools/blob/main/src/listFiles.ts",
  },
  "github-pages": {
    id: "github-pages",
    name: "GitHub Pages (Actions)",
    command: "actions/upload-pages-artifact",
    skips: ".git, .github, and every dotfile unless include-hidden-files: true",
    source: "https://github.com/actions/upload-pages-artifact/blob/main/action.yml",
  },
  "gh-pages": {
    id: "gh-pages",
    name: "gh-pages (npm)",
    command: "gh-pages -d <dir>",
    skips: "dotfiles unless --dotfiles; node_modules is NOT skipped",
    source: "https://github.com/tschaub/gh-pages/blob/main/lib/index.js",
  },
  surge: {
    id: "surge",
    name: "Surge",
    command: "surge <dir> <domain>",
    skips: ".git, every dotfile and dot-directory, *.*~, node_modules, bower_components + .surgeignore (which can un-ignore with !)",
    source: "https://github.com/sintaxi/surge-sdk/blob/master/stream/lib/stream.js",
  },
};

export const HOST_IDS = Object.keys(HOSTS) as HostId[];

export function isHostId(s: string): s is HostId {
  return (HOST_IDS as string[]).includes(s);
}

export interface FateResult {
  fate: Fate;
  why?: string;
}

/** Inputs a host filter needs beyond the path. */
export interface HostFilterInput {
  opts: HostOpts;
  /** contents of .vercelignore / .nowignore in the deploy dir, if any */
  vercelignore?: string;
  /** contents of .assetsignore in the assets dir, if any */
  assetsignore?: string;
  /** contents of .surgeignore in the project dir, if any */
  surgeignore?: string;
}

type Filter = (path: string) => FateResult;

const segs = (p: string) => p.split("/");
const prefixes = (p: string) => {
  const s = segs(p);
  return s.map((_, i) => s.slice(0, i + 1).join("/"));
};

// --- Cloudflare Pages: wrangler pages deploy -------------------------------------------------
// IGNORE_LIST is matched (minimatch, default options) against every directory and file the walker
// visits, relative to the deploy dir; a matching directory is skipped with everything under it.
const PAGES_IGNORE = ["_worker.js", "_redirects", "_headers", "_routes.json", "functions", "**/.DS_Store", "**/node_modules", "**/.git", ".wrangler"];
const PAGES_MM = PAGES_IGNORE.map((p) => new Minimatch(p));
const PAGES_WHY: Record<string, string> = {
  "_worker.js": "uploaded as Worker code, not as an asset",
  _redirects: "parsed as config",
  _headers: "parsed as config",
  "_routes.json": "parsed as config",
  functions: "built into Functions, not served",
};
function cfPages(): Filter {
  return (path) => {
    for (const pre of prefixes(path)) {
      for (const mm of PAGES_MM) {
        if (mm.match(pre)) {
          const why = PAGES_WHY[mm.pattern] ?? `wrangler IGNORE_LIST "${mm.pattern}"`;
          return { fate: "home", why };
        }
      }
    }
    return { fate: "public" };
  };
}

// --- Cloudflare Workers static assets: wrangler deploy with [assets] -------------------------
function cfWorkers(input: HostFilterInput): Filter {
  const patterns = ["/.assetsignore", "/_redirects", "/_headers"];
  if (input.assetsignore !== undefined) patterns.push(...input.assetsignore.split("\n"));
  const ig = ignore().add(patterns);
  const userIg = input.assetsignore !== undefined ? ignore().add(input.assetsignore.split("\n")) : undefined;
  return (path) => {
    if (ig.test(path).ignored) {
      const why = userIg?.test(path).ignored ? ".assetsignore" : "assets metafile";
      return { fate: "home", why };
    }
    return { fate: "public" };
  };
}

// --- Vercel -----------------------------------------------------------------------------------
export const VERCEL_DEFAULT_IGNORES = [
  ".hg", ".git", ".gitmodules", ".svn", ".cache", ".next", ".now", ".vercel", ".npmignore", ".dockerignore", ".gitignore",
  ".*.swp", ".DS_Store", ".wafpicke-*", ".lock-wscript", ".env.local", ".env.*.local", ".venv", ".yarn/cache", ".pnp*",
  "npm-debug.log", "config.gypi", "node_modules", "__pycache__", "venv", "CVS",
];
const clearRelative = (s: string) => s.replace(/(\n|^)\.\//g, "$1");
function vercel(input: HostFilterInput, hasCargo: boolean): Filter {
  const defaults = [...VERCEL_DEFAULT_IGNORES, ...(hasCargo ? ["/target"] : [])];
  const ig = ignore().add(`${defaults.join("\n")}\n${clearRelative(input.vercelignore ?? "")}`);
  const defIg = ignore().add(defaults.join("\n"));
  const served: Fate = input.opts.vercelStatic === false ? "uploaded" : "public";
  return (path) => {
    // Vercel's readdir applies the ignore to every directory and file it visits.
    for (const pre of prefixes(path)) {
      if (ig.ignores(pre)) return { fate: "home", why: defIg.ignores(pre) ? "Vercel default ignore" : ".vercelignore" };
    }
    return { fate: served };
  };
}

// --- Netlify ----------------------------------------------------------------------------------
function netlify(input: HostFilterInput): Filter {
  const skipNodeModules = input.opts.netlifyAtRoot !== false;
  return (path) => {
    for (const base of segs(path)) {
      if (skipNodeModules && base === "node_modules") return { fate: "home", why: "node_modules at the site root" };
      if (base.startsWith(".") && base !== ".well-known") return { fate: "home", why: "Netlify skips dotfiles" };
      if (base.startsWith("__MACOSX")) return { fate: "home", why: "__MACOSX" };
      if (base === "_redirects" || base === "_headers") return { fate: "home", why: "bundled into config" };
    }
    return { fate: "public" };
  };
}

// --- Firebase Hosting -------------------------------------------------------------------------
// listFiles(): glob("**/*", { dot: true, follow: true, nodir: true, ignore: [built-ins, ...hosting.ignore] })
const FIREBASE_BUILTIN = ["**/firebase-debug.log", "**/firebase-debug.*.log", ".firebase/*"];
function firebase(input: HostFilterInput): Filter {
  const user = input.opts.firebaseIgnore ?? [];
  const mms = [...FIREBASE_BUILTIN, ...user].map((p) => ({ p, mm: new Minimatch(p.replace(/^\.\//, ""), { dot: true }), builtin: FIREBASE_BUILTIN.includes(p) }));
  return (path) => {
    for (const { p, mm, builtin } of mms) {
      // glob ignore: a pattern matches the file, or (for "x/**") anything under it
      if (mm.match(path) || (p.endsWith("/**") && prefixes(path).some((pre) => mm.match(pre + "/")))) {
        return { fate: "home", why: builtin ? "firebase-tools built-in ignore" : `hosting.ignore "${p}"` };
      }
    }
    return { fate: "public" };
  };
}

// --- GitHub Pages via actions/upload-pages-artifact -------------------------------------------
// tar --exclude=.git --exclude=.github [--exclude=.[^/]*]  (tar --exclude matches any path component)
function githubPages(input: HostFilterInput): Filter {
  const hidden = input.opts.includeHiddenFiles === true;
  return (path) => {
    for (const base of segs(path)) {
      if (base === ".git" || base === ".github") return { fate: "home", why: "always excluded by upload-pages-artifact" };
      if (!hidden && base.startsWith(".") && base.length > 1) return { fate: "home", why: "hidden files excluded (include-hidden-files: false)" };
    }
    return { fate: "public" };
  };
}

// --- gh-pages (npm) ---------------------------------------------------------------------------
// tinyglobby.glob("**/*", { cwd: dir, dot: options.dotfiles, onlyFiles: true })  (dotfiles default false).
// Whatever it copies is committed to a branch of your (usually public) repo, so "public" either way.
function ghPages(input: HostFilterInput): Filter {
  const dot = input.opts.ghPagesDotfiles === true;
  return (path) => {
    if (!dot && segs(path).some((s) => s.startsWith("."))) return { fate: "home", why: "gh-pages skips dotfiles (no --dotfiles)" };
    return { fate: "public" };
  };
}

// --- Surge -----------------------------------------------------------------------------------
// surge-stream getFiles(): readdir walk; a directory is pruned when ig.ignores(rel + "/"), a file
// kept unless ig.ignores(rel). ig = ignore().add(surge-ignore defaults).add(.surgeignore text).
export const SURGE_DEFAULT_IGNORES = [".git", ".*", "*.*~", "node_modules", "bower_components"];
function surge(input: HostFilterInput): Filter {
  const ig = ignore().add(SURGE_DEFAULT_IGNORES);
  if (input.surgeignore) ig.add(input.surgeignore);
  const defIg = ignore().add(SURGE_DEFAULT_IGNORES);
  const why = (rel: string) =>
    !defIg.ignores(rel) ? ".surgeignore" : /(^|\/)\.[^/]*\/?$/.test(rel) ? "Surge skips dotfiles" : /~$/.test(rel) ? "Surge skips editor backups (*.*~)" : `Surge default ignore`;
  return (path) => {
    const s = segs(path);
    for (let i = 1; i < s.length; i++) {
      const dir = s.slice(0, i).join("/") + "/";
      if (ig.ignores(dir)) return { fate: "home", why: why(dir) };
    }
    if (ig.ignores(path)) return { fate: "home", why: why(path) };
    return { fate: "public" };
  };
}

export function hostFilter(host: HostId, input: HostFilterInput, ctx: { hasCargo?: boolean } = {}): Filter {
  switch (host) {
    case "cf-pages":
      return cfPages();
    case "cf-workers":
      return cfWorkers(input);
    case "vercel":
      return vercel(input, !!ctx.hasCargo);
    case "netlify":
      return netlify(input);
    case "firebase":
      return firebase(input);
    case "github-pages":
      return githubPages(input);
    case "gh-pages":
      return ghPages(input);
    case "surge":
      return surge(input);
  }
}
