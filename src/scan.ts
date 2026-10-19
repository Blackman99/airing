// The core: for each deployment, resolve the host's real upload set and classify what would be public.
// Pure over the Tree interface so the landing page runs exactly this code on a dropped folder.
import { detectDeployments, HOST_ORDER, join, norm } from "./detect.js";
import { HOSTS, hostFilter } from "./hosts.js";
import { classify, riskyByName } from "./rules.js";
import { fingerprint } from "./sha256.js";
import { VERSION } from "./version.js";
import type { Deployment, DeploymentReport, FileFate, Finding, HostId, Remedy, ScanReport, Severity, Tree } from "./types.js";

export interface ScanOptions {
  host?: HostId;
  /** deploy dir relative to the tree root (overrides config) */
  dir?: string;
  /** explicit deployments (guard/hook), dir "" = take from config */
  deployments?: Deployment[];
  /** force the all-hosts matrix even when config names a host */
  matrix?: boolean;
}

const RANK: Record<Severity, number> = { LEAK: 3, RISK: 2, INFO: 1 };
export const worstOf = (fs: Finding[]): Severity | "CLEAN" => {
  let w: Severity | "CLEAN" = "CLEAN";
  for (const f of fs) if (w === "CLEAN" || RANK[f.severity] > RANK[w]) w = f.severity;
  return w;
};

/** Host-specific way to keep a file home. */
export function fixFor(host: HostId, path: string, rule: string, dirLabel: string): string {
  const pat = rule === "git-dir" ? ".git" : rule === "env-file" ? ".env*" : path;
  switch (host) {
    case "cf-pages":
      return rule === "git-dir"
        ? `move it out of ${dirLabel} (wrangler skips .git only by name at any depth — this one is reachable)`
        : `deploy only your build output (wrangler pages deploy dist), or move ${path} out of ${dirLabel} — Pages has no ignore file`;
    case "cf-workers":
      return `add "${pat}" to ${dirLabel === "." ? "" : dirLabel + "/"}.assetsignore`;
    case "vercel":
      return `add "${pat}" to .vercelignore (Vercel does not read .gitignore)`;
    case "netlify":
      return `move ${path} out of the publish dir ${dirLabel}`;
    case "firebase":
      return `add "**/${rule === "env-file" ? ".env*" : path.split("/").pop()}" to hosting.ignore in firebase.json (or restore the default "**/.*")`;
    case "github-pages":
      return `remove it from ${dirLabel}, or drop include-hidden-files: true`;
    case "gh-pages":
      return `remove it from ${dirLabel}, or drop --dotfiles`;
    case "surge":
      return `add "${pat}" to ${dirLabel === "." ? "" : dirLabel + "/"}.surgeignore (and drop any !${pat} line there)`;
  }
}

async function mapLimit<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]);
      }
    }),
  );
  return out;
}

const SERVER_SIDE: Record<string, string> = {
  "cf-pages": "a Pages Function",
  "cf-workers": "your Worker, with the key in a secret: wrangler secret put",
  vercel: "a Vercel Function, key in Project → Environment Variables",
  netlify: "a Netlify Function, key in Site configuration → Environment variables",
  firebase: "a Cloud Function, key in Secret Manager",
  "github-pages": "a serverless function on another host — GitHub Pages is static only",
  "gh-pages": "a serverless function on another host — GitHub Pages is static only",
  surge: "a serverless function on another host — Surge is static only",
};

const BUILD_DIRS = ["dist", "build", "out", "public", "_site", ".output/public", "www"];

/** One remedy for the whole upload set, in the host's own vocabulary. */
export function remedyFor(tree: Tree, d: Deployment, findings: Finding[]): Remedy | undefined {
  const bad = findings.filter((f) => f.severity !== "INFO");
  if (!bad.length) return undefined;
  const dir = d.dir === "." ? "" : d.dir + "/";
  const notes: string[] = [];
  for (const f of bad.filter((f) => f.rule === "inline-secret" && !f.path.endsWith(".map")))
    notes.push(`${f.path}: the key is compiled into code you serve — no ignore file can hide it. Move the call server-side (${SERVER_SIDE[d.host]}), or if it is a browser key, restrict it by HTTP referrer and API.`);
  const ignorable = bad.filter((f) => !(f.rule === "inline-secret" && !f.path.endsWith(".map")));
  // hosts with an ignore file get patterns; for the rest you move files, so name the files
  const patterns = d.host === "cf-workers" || d.host === "vercel" || d.host === "firebase" || d.host === "surge";
  const agentDir = (p: string) => { const s = p.split("/"); const i = s.findIndex((x) => x.startsWith(".")); return s.slice(0, i + 1).join("/"); };
  const line = (f: Finding) =>
    f.rule === "source-map" || f.path.endsWith(".map") ? "*.map"
    : !patterns ? (f.rule === "agent-config" ? agentDir(f.path) + "/" : f.path)
    : f.rule === "git-dir" ? ".git" : f.rule === "env-file" ? (f.path.endsWith(".dev.vars") ? ".dev.vars" : ".env*") : f.rule === "agent-config" ? agentDir(f.path) : f.path.replace(/\/$/, "");
  const lines = [...new Set(ignorable.map(line))];
  if (lines.includes("*.map")) notes.push("source maps: build with sourcemap: 'hidden' (Vite: build.sourcemap) so .map files never reach the output at all.");
  const atRoot = d.dir === "." && tree.files.some((f) => f.path === "package.json");
  const build = atRoot ? BUILD_DIRS.find((b) => tree.files.some((f) => f.path.startsWith(b + "/") && /\.html?$/.test(f.path))) : undefined;
  const r = (say: string, extra: Partial<Remedy> = {}): Remedy => ({ say, lines: lines.length ? lines : undefined, notes: notes.length ? notes : undefined, ...extra });
  if (build && ["cf-pages", "netlify", "gh-pages", "firebase", "github-pages", "surge"].includes(d.host)) {
    const cmd = { "cf-pages": `wrangler pages deploy ${build}`, netlify: `netlify deploy --dir ${build}`, "gh-pages": `gh-pages -d ${build}`, firebase: `set "public": "${build}" in firebase.json`, "github-pages": `path: ${build}`, surge: `surge ${build} <domain>` }[d.host as "cf-pages"];
    return r(`you are deploying the project root — deploy the build output instead: ${cmd}`, { lines: undefined });
  }
  if (!lines.length) return r("");
  switch (d.host) {
    case "cf-pages":
      return r(`move these out of ${dir || "the deploy dir"} — direct uploads to Pages have no ignore file (workers-sdk#14500)`);
    case "cf-workers":
      return r(`add to ${dir}.assetsignore`, { file: `${dir}.assetsignore` });
    case "vercel":
      return r("add to .vercelignore (Vercel never reads .gitignore)", { file: `${dir}.vercelignore` });
    case "netlify":
      return r(`move these out of the publish dir${dir ? " " + dir : ""}`);
    case "firebase":
      return r(`add to "hosting.ignore" in firebase.json`, { file: "firebase.json", lines: lines.map((l) => (l.includes("/") || l.startsWith("*") ? l : `**/${l}`)) });
    case "github-pages":
      return r(d.opts.includeHiddenFiles ? "drop include-hidden-files: true, or move these out of the artifact path" : `move these out of the artifact path${dir ? " " + dir : ""}`);
    case "gh-pages":
      return r(d.opts.ghPagesDotfiles ? "drop --dotfiles, or move these out" : `move these out of ${dir || "the folder you pass to gh-pages -d"}`);
    case "surge":
      return r(`add to ${dir}.surgeignore (and delete any "!" line there that re-includes them)`, { file: `${dir}.surgeignore` });
  }
}

export async function scanDeployment(tree: Tree, d: Deployment): Promise<DeploymentReport> {
  const dir = norm(d.dir || ".");
  const prefix = dir === "." ? "" : dir + "/";
  const inDir = tree.files.filter((f) => prefix === "" || f.path.startsWith(prefix)).map((f) => ({ ...f, rel: f.path.slice(prefix.length) }));
  const read = (rel: string) => tree.readText(prefix + rel, 1024 * 1024);
  const filter = hostFilter(
    d.host,
    {
      opts: d.opts,
      vercelignore: d.host === "vercel" ? ((await read(".vercelignore")) ?? (await read(".nowignore"))) : undefined,
      assetsignore: d.host === "cf-workers" ? await read(".assetsignore") : undefined,
      surgeignore: d.host === "surge" ? await read(".surgeignore") : undefined,
    },
    { hasCargo: inDir.some((f) => f.rel === "Cargo.toml") },
  );

  const fates: FileFate[] = inDir.map((f) => {
    const r = filter(f.rel);
    return { path: f.rel, size: f.size, fate: r.fate, why: r.why };
  });

  const findings: Finding[] = [];
  const savedByHost: DeploymentReport["savedByHost"] = [];
  const gitGroups = new Map<string, { size: number; files: number }>();
  const nmGroups = new Map<string, { size: number; files: number }>();

  const out = fates.filter((x) => x.fate !== "home");
  const perFile = await mapLimit(out, 8, async (x) => {
    const segs = x.path.split("/");
    const gi = segs.indexOf(".git");
    if (gi >= 0) {
      const key = segs.slice(0, gi + 1).join("/");
      const g = gitGroups.get(key) ?? { size: 0, files: 0 };
      g.size += x.size;
      g.files++;
      gitGroups.set(key, g);
      return [] as Finding[];
    }
    const ni = segs.indexOf("node_modules");
    if (ni >= 0) {
      const key = segs.slice(0, ni + 1).join("/");
      const g = nmGroups.get(key) ?? { size: 0, files: 0 };
      g.size += x.size;
      g.files++;
      nmGroups.set(key, g);
      return [] as Finding[];
    }
    return classify({
      path: x.path,
      size: x.size,
      readText: (max) => tree.readText(prefix + x.path, max),
      readHead: async (n) => (tree.readHead ? tree.readHead(prefix + x.path, n) : undefined),
    });
  });
  for (const fs of perFile) findings.push(...fs);

  for (const [key, g] of gitGroups) {
    const cfg = (await tree.readText(prefix + key + "/config", 64 * 1024)) ?? "";
    const cred = /url\s*=\s*https?:\/\/([^\s:@/]+):([^\s@/]+)@/.exec(cfg);
    findings.push({
      rule: "git-dir",
      severity: "LEAK",
      path: key + "/",
      size: g.size,
      title: "git repository",
      detail: `${g.files} files: full source and history — tools like git-dumper rebuild the repo from /${key}/${cred ? "; remote URL embeds a token" : ""}`,
      secrets: cred ? [{ name: "remote URL credentials", provider: /github/.test(cfg) ? "GitHub" : "git host", fingerprint: fingerprint(cred[2]), rotate: /github/.test(cfg) ? "https://github.com/settings/tokens" : undefined, shape: `${cred[2].slice(0, 4)}…(${cred[2].length} chars)` }] : [],
      fix: "",
    });
  }

  for (const [key, g] of nmGroups) {
    findings.push({ rule: "node-modules", severity: "INFO", path: key + "/", size: g.size, title: "node_modules", detail: `${g.files} dependency files go public too (not scanned for secrets)`, secrets: [], fix: "" });
  }

  for (const x of fates) {
    if (x.fate !== "home") continue;
    const rule = riskyByName(x.path);
    if (!rule) continue;
    const segs = x.path.split("/");
    const gi = segs.indexOf(".git");
    const p = gi >= 0 ? segs.slice(0, gi + 1).join("/") + "/" : x.path;
    if (!savedByHost.some((s) => s.path === p)) savedByHost.push({ path: p, why: x.why ?? "skipped", rule });
  }

  const dirLabel = dir === "." ? "the project root" : dir + "/";
  for (const f of findings) {
    if (d.host === "vercel" && d.opts.vercelStatic === false && f.severity === "LEAK") {
      f.severity = "RISK";
      f.detail += " — uploaded to Vercel's build machine; public only if your build copies it into the output";
    }
    if (!f.fix) f.fix = fixFor(d.host, f.path.replace(/\/$/, ""), f.rule, dirLabel);
  }
  findings.sort((a, b) => RANK[b.severity] - RANK[a.severity] || b.size - a.size || a.path.localeCompare(b.path));

  const totals = { files: fates.length, bytes: fates.reduce((s, x) => s + x.size, 0), public: 0, uploaded: 0, home: 0 };
  for (const x of fates) totals[x.fate]++;
  const remedy = remedyFor(tree, { ...d, dir }, findings);
  return { deployment: { ...d, dir }, hostName: HOSTS[d.host].name, fates, findings, savedByHost, totals, remedy };
}

export async function scan(tree: Tree, opts: ScanOptions = {}): Promise<ScanReport> {
  let deployments: Deployment[] = [];
  const detected = await detectDeployments(tree);
  let matrix = false;
  if (opts.deployments?.length) {
    deployments = opts.deployments.map((d) => {
      if (d.dir) return d;
      const fromCfg = detected.deployments.find((x) => x.host === d.host);
      return fromCfg ? { ...fromCfg, opts: { ...fromCfg.opts, ...strip(d.opts) }, source: `${d.source} + ${fromCfg.source}` } : { ...d, dir: "." };
    });
  } else if (opts.host) {
    const fromCfg = detected.deployments.find((x) => x.host === opts.host);
    deployments = [opts.dir ? { host: opts.host, dir: norm(opts.dir), source: "--host + --dir", opts: fromCfg?.opts ?? {} } : (fromCfg ?? { host: opts.host, dir: ".", source: "--host", opts: {} })];
  } else if (!opts.matrix && detected.deployments.length) {
    deployments = opts.dir ? detected.deployments.map((d) => ({ ...d, dir: join(norm(opts.dir!), "."), source: d.source + " (dir overridden)" })) : detected.deployments;
  } else {
    matrix = true;
    const base = norm(opts.dir ?? ".");
    deployments = HOST_ORDER.map((host) => {
      const cfg = detected.deployments.find((x) => x.host === host);
      const opts = cfg?.opts ?? (host === "vercel" ? { vercelStatic: !detected.hasBuildScript } : {});
      return { host, dir: base, source: "matrix", opts };
    });
  }
  for (const d of deployments) if (d.host === "vercel" && d.opts.vercelStatic === undefined) d.opts = { ...d.opts, vercelStatic: !detected.hasBuildScript };
  const reports: DeploymentReport[] = [];
  for (const d of deployments) reports.push(await scanDeployment(tree, d));
  const all = reports.flatMap((r) => r.findings);
  return { tool: "airing", version: VERSION, root: tree.name, matrix, deployments: reports, worst: worstOf(all) };
}

function strip<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}
