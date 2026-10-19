// Where does this project deploy to, and from which directory? Read from the config files the
// deploy CLIs themselves read. Nothing here touches the network.
import { parse as parseToml } from "smol-toml";
import type { Deployment, HostId, Tree } from "./types.js";

export const norm = (p: string) => {
  const s = p.replace(/\\/g, "/").replace(/^\.\/+/, "").replace(/\/+$/, "");
  return s === "" ? "." : s;
};
export const join = (a: string, b: string) => norm(a === "." ? b : `${a}/${b}`);

function stripJsonc(s: string): string {
  let out = "";
  let i = 0;
  let inStr = false;
  while (i < s.length) {
    const c = s[i];
    if (inStr) {
      out += c;
      if (c === "\\") (out += s[i + 1] ?? ""), i++;
      else if (c === '"') inStr = false;
      i++;
    } else if (c === '"') (inStr = true), (out += c), i++;
    else if (c === "/" && s[i + 1] === "/") while (i < s.length && s[i] !== "\n") i++;
    else if (c === "/" && s[i + 1] === "*") {
      i += 2;
      while (i < s.length && !(s[i] === "*" && s[i + 1] === "/")) i++;
      i += 2;
    } else (out += c), i++;
  }
  return out.replace(/,(\s*[}\]])/g, "$1");
}

async function readJson(tree: Tree, path: string): Promise<any | undefined> {
  const t = await tree.readText(path, 2 * 1024 * 1024);
  if (t === undefined) return undefined;
  try {
    return JSON.parse(stripJsonc(t));
  } catch {
    return undefined;
  }
}
async function readToml(tree: Tree, path: string): Promise<any | undefined> {
  const t = await tree.readText(path, 2 * 1024 * 1024);
  if (t === undefined) return undefined;
  try {
    return parseToml(t);
  } catch {
    return undefined;
  }
}

const has = (tree: Tree, p: string) => tree.files.some((f) => f.path === p);

export interface Detected {
  deployments: Deployment[];
  notes: string[];
  /** package.json has a build script (Vercel then serves build output, not the upload) */
  hasBuildScript: boolean;
}

/** Find deploy targets declared in this project. `root` is a posix dir inside the tree (default "."). */
export async function detectDeployments(tree: Tree): Promise<Detected> {
  const out: Deployment[] = [];
  const notes: string[] = [];
  const add = (d: Deployment) => {
    if (!out.some((x) => x.host === d.host && x.dir === d.dir)) out.push(d);
  };

  // Cloudflare: wrangler.toml / wrangler.json / wrangler.jsonc
  for (const name of ["wrangler.toml", "wrangler.json", "wrangler.jsonc"]) {
    if (!has(tree, name)) continue;
    const cfg = name.endsWith(".toml") ? await readToml(tree, name) : await readJson(tree, name);
    if (!cfg) {
      notes.push(`${name}: could not parse`);
      continue;
    }
    if (typeof cfg.pages_build_output_dir === "string") add({ host: "cf-pages", dir: norm(cfg.pages_build_output_dir), source: `${name} pages_build_output_dir`, opts: {} });
    const assetsDir = cfg.assets?.directory ?? cfg.site?.bucket;
    if (typeof assetsDir === "string") add({ host: "cf-workers", dir: norm(assetsDir), source: `${name} ${cfg.assets?.directory ? "assets.directory" : "site.bucket"}`, opts: {} });
  }

  // Netlify: netlify.toml [build] base + publish
  if (has(tree, "netlify.toml")) {
    const cfg = await readToml(tree, "netlify.toml");
    const b = norm(cfg?.build?.base ?? ".");
    const pub = cfg?.build?.publish;
    if (typeof pub === "string") {
      const dir = join(b, pub);
      add({ host: "netlify", dir, source: "netlify.toml build.publish", opts: { netlifyAtRoot: dir === b } });
    } else add({ host: "netlify", dir: b, source: "netlify.toml (no build.publish → base)", opts: { netlifyAtRoot: true } });
  }

  // Firebase Hosting: firebase.json hosting (object or array)
  if (has(tree, "firebase.json")) {
    const cfg = await readJson(tree, "firebase.json");
    const hs = cfg?.hosting ? (Array.isArray(cfg.hosting) ? cfg.hosting : [cfg.hosting]) : [];
    for (const h of hs) {
      if (typeof h?.public !== "string") continue;
      add({
        host: "firebase",
        dir: norm(h.public),
        source: `firebase.json hosting${h.target ? `[${h.target}]` : h.site ? `[${h.site}]` : ""}.public`,
        opts: { firebaseIgnore: Array.isArray(h.ignore) ? h.ignore.filter((x: unknown) => typeof x === "string") : undefined },
      });
    }
  }

  // Vercel: vercel.json / .vercel/project.json → the project dir is uploaded
  const pkg = await readJson(tree, "package.json");
  const scripts: Record<string, string> = pkg?.scripts && typeof pkg.scripts === "object" ? pkg.scripts : {};
  if (has(tree, "vercel.json") || has(tree, ".vercel/project.json") || has(tree, "now.json")) {
    const v = (await readJson(tree, "vercel.json")) ?? {};
    const proj = (await readJson(tree, ".vercel/project.json")) ?? {};
    const hasBuild = !!(v.buildCommand || v.outputDirectory || v.framework || proj.settings?.framework || proj.settings?.buildCommand || scripts.build);
    add({ host: "vercel", dir: ".", source: has(tree, "vercel.json") ? "vercel.json" : ".vercel/project.json", opts: { vercelStatic: !hasBuild } });
  }

  // package.json scripts that deploy
  for (const [name, cmd] of Object.entries(scripts)) {
    for (const d of deploymentsFromCommand(String(cmd))) {
      if (d.host === "vercel") d.opts.vercelStatic = !scripts.build;
      add({ ...d, source: `package.json scripts.${name}` });
    }
  }

  // GitHub Actions: upload-pages-artifact path / include-hidden-files, wrangler-action pages deploy
  for (const f of tree.files) {
    if (!/^\.github\/workflows\/[^/]+\.ya?ml$/.test(f.path)) continue;
    const y = (await tree.readText(f.path, 512 * 1024)) ?? "";
    const blocks = y.split(/\n(?=\s*-\s+(?:name|uses|id):)/);
    for (const blk of blocks) {
      if (/uses:\s*actions\/upload-pages-artifact@/.test(blk)) {
        const p = /\bpath:\s*["']?([^"'\n#]+?)["']?\s*(?:#.*)?$/m.exec(blk)?.[1]?.trim() ?? "_site";
        const hidden = /include-hidden-files:\s*["']?true/.test(blk);
        if (!/\$\{\{/.test(p)) add({ host: "github-pages", dir: norm(p), source: `${f.path} upload-pages-artifact`, opts: { includeHiddenFiles: hidden } });
      }
      const wa = /uses:\s*cloudflare\/wrangler-action@[\s\S]*?command:\s*["']?([^\n"']+)/.exec(blk);
      if (wa) for (const d of deploymentsFromCommand("wrangler " + wa[1])) add({ ...d, source: `${f.path} wrangler-action` });
    }
  }
  return { deployments: out, notes, hasBuildScript: typeof scripts.build === "string" };
}

const DIR_FLAG = (cmd: string, flags: string[]) => {
  for (const fl of flags) {
    const m = new RegExp(`(?:^|\\s)${fl.replace(/[-]/g, "\\-")}(?:=|\\s+)(["']?)([^\\s"']+)\\1`).exec(cmd);
    if (m) return m[2];
  }
  return undefined;
};

/** Split a shell line into simple commands (good enough for deploy lines, not a shell). */
function simpleCommands(line: string): string[][] {
  return line
    .split(/&&|\|\||;|\|/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map((t) => t.replace(/^["']|["']$/g, "")));
}

const BIN_ALIAS: Record<string, string> = { "netlify-cli": "netlify", "@netlify/cli": "netlify", "firebase-tools": "firebase", ntl: "netlify", now: "vercel" };
const RUNNERS = new Set(["npx", "bunx", "pnpx", "yarn", "pnpm", "bun", "npm", "dlx", "exec", "run", "-y", "--yes", "x"]);

/** Deploy commands in a shell line → deployments (dir relative to cwd). Used by guard, hook and scripts detection. */
export function deploymentsFromCommand(line: string): Deployment[] {
  const out: Deployment[] = [];
  for (const argv0 of simpleCommands(line)) {
    let argv = argv0.filter((a) => !/^[A-Z_][A-Z0-9_]*=/.test(a)); // leading env assignments
    while (argv.length && RUNNERS.has(argv[0])) argv = argv.slice(1);
    if (!argv.length) continue;
    const raw = argv[0].replace(/(.)@[^/]*$/, "$1");
    const name = raw.startsWith("@") ? raw : raw.replace(/^.*[\\/]/, "").replace(/\.(cmd|exe|ps1)$/i, "");
    const bin = BIN_ALIAS[name] ?? name;
    const rest = argv.slice(1);
    const cmd = rest.join(" ");
    const positionals = (from: number) => rest.slice(from).filter((a, i, arr) => !a.startsWith("-") && !(i > 0 && /^--?(project-name|branch|commit-hash|commit-message|env|scope|token|site|alias|message|m|auth|config|cwd|target|filter|only|project|name)$/.test(arr[i - 1])));
    if (bin === "wrangler") {
      if (rest[0] === "pages" && (rest[1] === "deploy" || rest[1] === "publish")) {
        const dir = positionals(2)[0];
        out.push({ host: "cf-pages", dir: dir ? norm(dir) : "", source: "command", opts: {} });
      } else if (rest[0] === "deploy" || rest[0] === "publish" || rest[0] === "versions") {
        const assets = DIR_FLAG(cmd, ["--assets", "--site"]);
        out.push({ host: "cf-workers", dir: assets ? norm(assets) : "", source: "command", opts: {} });
      }
    } else if (bin === "vercel" || bin === "now") {
      const sub = rest[0];
      if (sub && /^(env|login|logout|link|pull|ls|list|domains|dns|certs|secrets|logs|inspect|whoami|teams|switch|alias|rm|remove|project|projects|git|init|dev|build|help|telemetry|redeploy|promote|rollback)$/.test(sub)) continue;
      const dirs = positionals(sub === "deploy" ? 1 : 0);
      out.push({ host: "vercel", dir: dirs[0] ? norm(dirs[0]) : ".", source: "command", opts: { vercelStatic: rest.includes("--prebuilt") ? true : undefined } });
    } else if (bin === "netlify" || bin === "ntl") {
      if (rest[0] !== "deploy") continue;
      const dir = DIR_FLAG(cmd, ["--dir", "-d"]);
      out.push({ host: "netlify", dir: dir ? norm(dir) : "", source: "command", opts: {} });
    } else if (bin === "firebase") {
      if (rest[0] !== "deploy") continue;
      const only = DIR_FLAG(cmd, ["--only"]);
      if (only && !/hosting/.test(only)) continue;
      out.push({ host: "firebase", dir: "", source: "command", opts: {} });
    } else if (bin === "gh-pages") {
      const dir = DIR_FLAG(cmd, ["-d", "--dist"]) ?? ".";
      out.push({ host: "gh-pages", dir: norm(dir), source: "command", opts: { ghPagesDotfiles: rest.includes("--dotfiles") || rest.includes("-t") } });
    } else if (bin === "surge") {
      const dir = surgeProject(rest);
      if (dir !== undefined) out.push({ host: "surge", dir: norm(dir), source: "command", opts: {} });
    }
  }
  return out;
}

// surge's router (lib/surge.js): `surge [publish|deploy] <path> [domain]`, `surge <path> -d <domain>`,
// `surge -p <path> -d <domain>` publish; every other verb (list, teardown, login…) uploads nothing.
const SURGE_VERBS = new Set(["login", "logout", "whoami", "verify", "mfa", "list", "revs", "rollback", "rollfore", "cutover", "discard", "teardown", "status", "token", "tokens", "ssl", "plan", "card", "invite", "revoke", "encrypt", "config", "dns", "zone", "debug", "stats", "account", "certs", "files", "audit", "bust", "usage", "traffic", "load", "audience", "nuke", "plus"]);
const SURGE_VALUE_FLAGS = new Set(["-p", "--project", "-d", "--domain", "-e", "--endpoint", "-m", "--message", "-a", "--add", "-r", "--remove", "--build"]);
function surgeProject(rest: string[]): string | undefined {
  const pos: string[] = [];
  const flags = new Map<string, string>();
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    const eq = /^(--?[a-z-]+)=(.*)$/.exec(a);
    if (eq) flags.set(eq[1], eq[2]);
    else if (SURGE_VALUE_FLAGS.has(a)) flags.set(a, rest[++i] ?? "");
    else if (a.startsWith("-")) flags.set(a, "");
    else pos.push(a);
  }
  if (flags.has("-h") || flags.has("--help") || flags.has("-V") || flags.has("--version")) return undefined;
  const project = flags.get("-p") ?? flags.get("--project");
  const intent = project !== undefined || [...flags.keys()].some((f) => /^(-d|--domain|--stage|-s|--preview|-m|--message|-a|--add|-r|--remove|--build|--private|--public)$/.test(f));
  if (pos[0] === "publish" || pos[0] === "deploy") return project ?? pos[1] ?? ".";
  if (pos[0] && SURGE_VERBS.has(pos[0])) return undefined;
  if (pos[1] && pos[1] !== "publish" && pos[1] !== "deploy" && SURGE_VERBS.has(pos[1])) return undefined; // surge <proj> <verb>
  if (pos[0] && /\.html?$/i.test(pos[0])) return undefined; // a one-file project: nothing else goes up
  if (pos[0]) return project ?? pos[0];
  // bare `surge` (or flags only): surge 0.45 prints help, older releases prompt with the cwd as the
  // default project and publish it, so check the cwd
  return project ?? (intent || !pos.length ? "." : undefined);
}

export const HOST_ORDER: HostId[] = ["cf-pages", "cf-workers", "vercel", "netlify", "firebase", "github-pages", "gh-pages", "surge"];
