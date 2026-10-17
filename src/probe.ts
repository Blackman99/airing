// `airing probe <url>`: what a stranger can download from your live site right now.
// GET-only, ~30 requests, soft-404 aware, every hit content-validated, values never printed.
import { inlineSecrets, parseEnv, secretVars } from "./rules.js";
import { fingerprint, sha256Hex } from "./sha256.js";
import { VERSION } from "./version.js";
import type { Finding, Severity } from "./types.js";
import { worstOf } from "./scan.js";

export interface ProbeOptions {
  timeoutMs?: number;
  concurrency?: number;
  maxScripts?: number;
  extraPaths?: string[];
  fetchImpl?: typeof fetch;
}

export interface ProbeReport {
  tool: "airing";
  version: string;
  target: string;
  checked: number;
  /** how the site answers a path that cannot exist */
  notFound: { status: number; note: string };
  findings: (Finding & { url: string; status: number })[];
  errors: string[];
  /** the home page itself did not answer: nothing was checked */
  unreachable?: boolean;
  worst: Severity | "CLEAN";
}

interface Got {
  url: string;
  status: number;
  type: string;
  body: Uint8Array;
  text: string;
  finalUrl: string;
}

type Check = { path: string; rule: string; validate: (g: Got) => Omit<Finding, "path" | "size" | "fix" | "rule"> | undefined };

const UA = `airing/${VERSION} (+https://github.com/Blackman99/airing; checks your own site for exposed files)`;
const looksHtml = (t: string) => /^\s*(<!doctype|<html|<head|<body|<\?xml|<)/i.test(t);

const envCheck = (path: string): Check => ({
  path,
  rule: "env-file",
  validate: (g) => {
    if (looksHtml(g.text)) return undefined;
    const lines = g.text.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#"));
    const vars = parseEnv(g.text);
    if (!vars.length || vars.length < lines.length * 0.5) return undefined;
    const secrets = secretVars(vars);
    return secrets.length
      ? { severity: "LEAK", title: "env file is downloadable", detail: `${vars.length} variables, ${secrets.length} look secret`, secrets }
      : { severity: "RISK", title: "env file is downloadable", detail: `${vars.length} variables, none look secret`, secrets: [] };
  },
});

const CHECKS: Check[] = [
  ...[".env", ".env.local", ".env.production", ".env.prod", ".env.development", ".env.staging", ".env.backup", ".env.bak", ".env.save", ".env.old", ".dev.vars"].map(envCheck),
  {
    path: ".git/config",
    rule: "git-dir",
    validate: (g) => {
      if (!/\[core\]/.test(g.text) || looksHtml(g.text)) return undefined;
      const cred = /url\s*=\s*https?:\/\/([^\s:@/]+):([^\s@/]+)@/.exec(g.text);
      return {
        severity: "LEAK",
        title: "git repository is downloadable",
        detail: `/.git/config answers — git-dumper can rebuild your source and history${cred ? "; remote URL embeds a token" : ""}`,
        secrets: cred ? [{ name: "remote URL credentials", provider: "git host", fingerprint: fingerprint(cred[2]), shape: `${cred[2].slice(0, 4)}…(${cred[2].length} chars)` }] : [],
      };
    },
  },
  {
    path: ".git/HEAD",
    rule: "git-dir",
    validate: (g) => (/^(ref: refs\/|[0-9a-f]{40}\s*$)/.test(g.text) ? { severity: "LEAK", title: "git repository is downloadable", detail: "/.git/HEAD answers", secrets: [] } : undefined),
  },
  {
    path: ".npmrc",
    rule: "credentials",
    validate: (g) => {
      if (looksHtml(g.text) || !/registry|_auth|always-auth|@[\w-]+:/.test(g.text)) return undefined;
      const m = /(_authToken|_auth|_password)\s*=\s*(\S+)/.exec(g.text);
      return m && !/\$\{/.test(m[2])
        ? { severity: "LEAK", title: ".npmrc with a registry token", detail: `${m[1]} is set`, secrets: [{ name: m[1], provider: "npm", fingerprint: fingerprint(m[2]), rotate: "https://www.npmjs.com/settings/~/tokens", shape: `${m[2].slice(0, 4)}…(${m[2].length} chars)` }] }
        : { severity: "INFO", title: ".npmrc is downloadable", detail: "registry config, no inline token", secrets: [] };
    },
  },
  ...["id_rsa", "id_ed25519", ".ssh/id_rsa", "server.key", "private.pem", "key.pem"].map(
    (path): Check => ({
      path,
      rule: "private-key",
      validate: (g) => (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(g.text) ? { severity: "LEAK", title: "private key is downloadable", detail: "anyone can act as you", secrets: [{ name: path, provider: "key pair", fingerprint: fingerprint(g.text), shape: "PEM block" }] } : undefined),
    }),
  ),
  ...["backup.sql", "dump.sql", "db.sql", "database.sql", "data.sql"].map(
    (path): Check => ({ path, rule: "db-dump", validate: (g) => (!looksHtml(g.text) && /(CREATE TABLE|INSERT INTO|COPY .* FROM stdin)/i.test(g.text) ? { severity: "LEAK", title: "database dump is downloadable", detail: "your data, in one request", secrets: [] } : undefined) }),
  ),
  ...["db.sqlite", "database.sqlite", "data.db", "db.sqlite3"].map(
    (path): Check => ({ path, rule: "db-dump", validate: (g) => (new TextDecoder().decode(g.body.subarray(0, 15)) === "SQLite format 3" ? { severity: "LEAK", title: "SQLite database is downloadable", detail: "your data, in one request", secrets: [] } : undefined) }),
  ),
  {
    path: ".aws/credentials",
    rule: "credentials",
    validate: (g) => {
      const m = /aws_secret_access_key\s*=\s*(\S+)/i.exec(g.text);
      return m ? { severity: "LEAK", title: "AWS credentials are downloadable", detail: "aws_secret_access_key is set", secrets: [{ name: "aws_secret_access_key", provider: "AWS", fingerprint: fingerprint(m[1]), rotate: "https://console.aws.amazon.com/iam/home#/security_credentials", shape: `…(${m[1].length} chars)` }] } : undefined;
    },
  },
  ...["service-account.json", "serviceAccount.json", "credentials.json", "firebase-adminsdk.json"].map(
    (path): Check => ({
      path,
      rule: "credentials",
      validate: (g) => (/"type"\s*:\s*"service_account"/.test(g.text) && /"private_key"/.test(g.text) ? { severity: "LEAK", title: "service-account key is downloadable", detail: "full API access as that account", secrets: [{ name: "private_key", provider: "Google Cloud", fingerprint: fingerprint(g.text), rotate: "https://console.cloud.google.com/iam-admin/serviceaccounts", shape: "JSON key file" }] } : undefined),
    }),
  ),
  {
    path: ".claude/settings.local.json",
    rule: "agent-config",
    validate: (g) => (!looksHtml(g.text) && /"permissions"|"env"|"hooks"/.test(g.text) ? { severity: "RISK", title: "your coding agent's local settings are downloadable", detail: "permissions, env and hook config from .claude/", secrets: [] } : undefined),
  },
  {
    path: ".DS_Store",
    rule: "ds-store",
    validate: (g) => (g.body.length > 8 && g.body[3] === 1 && new TextDecoder().decode(g.body.subarray(4, 8)) === "Bud1" ? { severity: "INFO", title: ".DS_Store is downloadable", detail: "lists file names in that folder", secrets: [] } : undefined),
  },
  { path: "wrangler.toml", rule: "config-file", validate: (g) => (!looksHtml(g.text) && /compatibility_date|pages_build_output_dir|^name\s*=/m.test(g.text) ? { severity: "INFO", title: "wrangler.toml is downloadable", detail: "the whole project root was deployed", secrets: [] } : undefined) },
  { path: ".vercel/project.json", rule: "config-file", validate: (g) => (/"projectId"/.test(g.text) ? { severity: "INFO", title: ".vercel/project.json is downloadable", detail: "the whole project root was deployed", secrets: [] } : undefined) },
];

export async function probe(target: string, opts: ProbeOptions = {}): Promise<ProbeReport> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const conc = opts.concurrency ?? 4;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(target) ? target : `https://${target}`);
  } catch {
    throw new Error(`not a URL: ${target}`);
  }
  url.hash = "";
  url.search = "";
  if (!url.pathname.endsWith("/") && !/\.[a-z0-9]{1,6}$/i.test(url.pathname)) url.pathname += "/";
  const base = new URL(url.pathname.endsWith("/") ? url.href : url.href.replace(/[^/]*$/, ""));
  const report: ProbeReport = { tool: "airing", version: VERSION, target: base.href, checked: 0, notFound: { status: 0, note: "" }, findings: [], errors: [], worst: "CLEAN" };

  const get = async (u: string, max = 5 * 1024 * 1024): Promise<Got | undefined> => {
    report.checked++;
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetchImpl(u, { redirect: "follow", signal: ac.signal, headers: { "user-agent": UA, accept: "*/*" } });
      const buf = new Uint8Array(await res.arrayBuffer()).subarray(0, max);
      return { url: u, status: res.status, type: res.headers.get("content-type") ?? "", body: buf, text: new TextDecoder().decode(buf), finalUrl: res.url || u };
    } catch (e) {
      const err = e as Error & { cause?: { code?: string } };
      const msg = err.name === "AbortError" ? `no answer within ${Math.round(timeoutMs / 1000)}s` : err.cause?.code === "ENOTFOUND" ? "DNS: no such host" : err.cause?.code === "ECONNREFUSED" ? "connection refused" : err.cause?.code ? `${err.message} (${err.cause.code})` : err.message;
      report.errors.push(`${u}: ${msg}`);
      return undefined;
    } finally {
      clearTimeout(t);
    }
  };

  const home = await get(base.href);
  if (!home) {
    report.errors = [`could not reach ${base.href} — ${report.errors[0]?.split(": ").slice(1).join(": ") || "no answer"}`];
    report.unreachable = true;
    return report;
  }
  const rand = sha256Hex(String(Date.now()) + Math.random()).slice(0, 10);
  const ghosts = (await Promise.all([get(new URL(`airing-${rand}.env`, base).href), get(new URL(`.airing-${rand}/config`, base).href)])).filter(Boolean) as Got[];
  const ghostHashes = new Set(ghosts.filter((g) => g.status === 200).map((g) => sha256Hex(g.text)));
  ghostHashes.add(sha256Hex(home.text));
  const g0 = ghosts[0];
  report.notFound = g0
    ? { status: g0.status, note: g0.status === 200 ? "answers 200 for paths that don't exist (SPA fallback) — hits are content-checked, not status-checked" : `answers ${g0.status} for paths that don't exist` }
    : { status: 0, note: "no answer for a missing path" };

  const soft = (g: Got) => g.status !== 200 || ghostHashes.has(sha256Hex(g.text)) || (g.finalUrl !== g.url && new URL(g.finalUrl).pathname === base.pathname);
  const seenRule = new Set<string>();
  const push = (path: string, g: Got, rule: string, v: Omit<Finding, "path" | "size" | "fix" | "rule">, fix: string) => {
    if (rule === "git-dir") {
      if (seenRule.has("git-dir")) return;
      seenRule.add("git-dir");
    }
    report.findings.push({ rule, path, size: g.body.length, fix, url: g.url, status: g.status, ...v });
  };

  const checks = [...CHECKS, ...(opts.extraPaths ?? []).map((p): Check => ({ path: p.replace(/^\//, ""), rule: "custom", validate: (g) => ({ severity: "RISK", title: `${p} is downloadable`, detail: `${g.body.length} bytes, ${g.type || "unknown type"}`, secrets: inlineSecrets(g.text).refs }) }))];
  let i = 0;
  await Promise.all(
    Array.from({ length: conc }, async () => {
      while (i < checks.length) {
        const c = checks[i++];
        const g = await get(new URL(c.path, base).href);
        if (!g || soft(g)) continue;
        const v = c.validate(g);
        if (v) push("/" + c.path, g, c.rule, v, fixText(c.rule));
      }
    }),
  );

  // Bundles + source maps referenced by the page itself.
  const inlineHome = inlineSecrets(home.text);
  if (inlineHome.refs.length) push(new URL(home.url).pathname, home, "inline-secret", inlineVerdict(inlineHome, "the page HTML"), fixText("inline-secret"));
  const scripts = [...home.text.matchAll(/<(?:script[^>]*\ssrc|link[^>]*rel=["']?modulepreload["']?[^>]*\shref)=["']([^"']+)["']/gi)]
    .map((m) => {
      try {
        return new URL(m[1], home.finalUrl);
      } catch {
        return undefined;
      }
    })
    .filter((u): u is URL => !!u && u.origin === base.origin);
  const uniq = [...new Map(scripts.map((u) => [u.href, u])).values()].slice(0, opts.maxScripts ?? 20);
  let k = 0;
  await Promise.all(
    Array.from({ length: conc }, async () => {
      while (k < uniq.length) {
        const s = uniq[k++];
        const g = await get(s.href, 15 * 1024 * 1024);
        if (!g || g.status !== 200) continue;
        const inl = inlineSecrets(g.text);
        if (inl.refs.length) push(s.pathname, g, "inline-secret", inlineVerdict(inl, "served JavaScript"), fixText("inline-secret"));
        const ref = /\/\/[#@]\s*sourceMappingURL=([^\s'"]+)\s*$/m.exec(g.text)?.[1];
        const mapUrl = ref && !ref.startsWith("data:") ? new URL(ref, s).href : `${s.href}.map`;
        if (new URL(mapUrl).origin !== base.origin) continue;
        const m = await get(mapUrl, 50 * 1024 * 1024);
        if (!m || soft(m)) continue;
        try {
          const j = JSON.parse(m.text);
          if (j.version !== 3 || !Array.isArray(j.sources)) continue;
          const contents: string[] = Array.isArray(j.sourcesContent) ? j.sourcesContent.filter((c: unknown) => typeof c === "string" && c.length) : [];
          if (contents.length) {
            const inS = inlineSecrets(contents.join("\n"));
            if (inS.refs.length && !inS.onlyPublicish) push(new URL(mapUrl).pathname, m, "inline-secret", { severity: "LEAK", title: "secret inside a public source map", detail: `original source contains ${inS.refs.length} key${inS.refs.length === 1 ? "" : "s"}`, secrets: inS.refs }, fixText("inline-secret"));
            push(new URL(mapUrl).pathname, m, "source-map", { severity: "RISK", title: "source map serves your original source", detail: `${contents.length} of ${j.sources.length} files readable via sourcesContent`, secrets: [] }, fixText("source-map"));
          }
        } catch {
          /* not a map */
        }
      }
    }),
  );

  const RANK = { LEAK: 3, RISK: 2, INFO: 1 } as const;
  report.findings.sort((a, b) => RANK[b.severity] - RANK[a.severity] || a.path.localeCompare(b.path));
  report.worst = worstOf(report.findings);
  return report;
}

function inlineVerdict(inl: ReturnType<typeof inlineSecrets>, where: string): Omit<Finding, "path" | "size" | "fix" | "rule"> {
  return inl.onlyPublicish
    ? { severity: "RISK", title: `Google API key in ${where}`, detail: "fine only if it is a restricted browser key (Firebase web config); unrestricted, it is someone else's free Gemini", secrets: inl.refs }
    : { severity: "LEAK", title: `secret in ${where}`, detail: `${inl.refs.length} key${inl.refs.length === 1 ? "" : "s"} anyone can read`, secrets: inl.refs };
}

function fixText(rule: string): string {
  switch (rule) {
    case "env-file":
    case "credentials":
    case "private-key":
    case "inline-secret":
      return "rotate first (it has been public), then remove it from the deploy dir and redeploy; on Cloudflare Pages also delete old deployments — <hash>.<project>.pages.dev keeps serving them";
    case "git-dir":
      return "deploy only your build output; then rotate anything that was ever committed";
    case "db-dump":
      return "take it down now and treat the data as disclosed";
    case "source-map":
      return "stop shipping sourcesContent (build.sourcemap: 'hidden' / false) or upload maps to your error tracker only";
    default:
      return "remove it from the deploy dir and redeploy";
  }
}
