// What makes a public file dangerous. Values are never returned: names, shapes and sha256 fingerprints only.
import { fingerprint } from "./sha256.js";
import { isPlaceholder, PROVIDERS, providerFor, PUBLIC_NAME, SECRET_NAME, shapeOf } from "./providers.js";
import type { Finding, SecretRef, Severity } from "./types.js";

const base = (p: string) => p.slice(p.lastIndexOf("/") + 1);
const ext = (p: string) => {
  const b = base(p).toLowerCase();
  const i = b.lastIndexOf(".");
  return i > 0 ? b.slice(i + 1) : "";
};

export const ENV_TEMPLATE = /^\.env\.(example|sample|template|dist|defaults|schema|tpl)$|\.example$/i;
export function isEnvFile(path: string): boolean {
  const b = base(path);
  return /^\.env(\..+)?$/i.test(b) || b === ".dev.vars" || b === ".envrc" || /^[\w.-]+\.env$/i.test(b) || /^\.dev\.vars\.[\w-]+$/.test(b);
}

const KEY_NAMES = /^(id_rsa|id_dsa|id_ecdsa|id_ed25519)(\.old)?$|\.(pem|key|p12|pfx|jks|keystore|ppk|asc)$/i;
const CRED_NAMES = /^(credentials(\.json)?|service[-_]?account.*\.json|.*-firebase-adminsdk-.*\.json|gcloud.*\.json|\.npmrc|\.pypirc|\.netrc|_netrc|\.git-credentials|\.htpasswd|\.pgpass|\.my\.cnf|\.s3cfg|\.boto)$/i;
const DB_EXT = new Set(["sql", "dump", "sqlite", "sqlite3", "db", "mdb", "bak"]);
const HISTORY = /^\.(bash|zsh|sh|python|psql|mysql|node_repl|sqlite)_history$|^\.history$/;
const TEXT_EXT = new Set(["js", "mjs", "cjs", "jsx", "ts", "tsx", "html", "htm", "json", "txt", "css", "xml", "yml", "yaml", "toml", "md", "vue", "svelte", "astro", "php", "ini", "cfg", "conf", "config", "properties", "env", "sh", "py", "rb", "csv", "webmanifest", "log"]);
const CONFIG_NAMES = /^(wrangler\.(toml|json|jsonc)|netlify\.toml|vercel\.json|firebase\.json|\.firebaserc|project\.json|now\.json|docker-compose\.ya?ml|Dockerfile)$/;
const AGENT_DIRS = /^(\.claude|\.codex|\.cursor|\.opencode|\.aider.*|\.continue|\.windsurf|\.cline)$/;

export interface EnvVar {
  name: string;
  value: string;
}
export function parseEnv(text: string): EnvVar[] {
  const out: EnvVar[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*[=:]\s*(.*)$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    if (/^["']/.test(v)) {
      const q = v[0];
      const end = v.indexOf(q, 1);
      v = end > 0 ? v.slice(1, end) : v.slice(1);
    } else v = v.replace(/\s+#.*$/, "");
    out.push({ name: m[1], value: v });
  }
  return out;
}

function ref(name: string, value: string): SecretRef {
  const p = providerFor(name, value);
  return { name, provider: p?.name ?? "unknown issuer", fingerprint: fingerprint(value), rotate: p?.rotate, shape: shapeOf(value) };
}

export function secretVars(vars: EnvVar[]): SecretRef[] {
  const out: SecretRef[] = [];
  for (const { name, value } of vars) {
    if (isPlaceholder(value)) continue;
    const valueHit = PROVIDERS.some((p) => p.value?.test(value));
    const nameHit = SECRET_NAME.test(name) && !PUBLIC_NAME.test(name);
    if (valueHit || nameHit) out.push(ref(name, value));
  }
  return out;
}

/** Provider keys, private-key blocks and service-role JWTs inside any text. */
export function inlineSecrets(text: string, limit = 20): { refs: SecretRef[]; onlyPublicish: boolean } {
  const refs: SecretRef[] = [];
  const seen = new Set<string>();
  let onlyPublicish = true;
  const add = (name: string, value: string, publicish: boolean, provider?: string, shape?: string) => {
    const fp = fingerprint(value);
    if (seen.has(fp) || refs.length >= limit) return;
    seen.add(fp);
    const p = provider ? undefined : providerFor(name, value);
    refs.push({ name, provider: provider ?? p?.name ?? name, fingerprint: fp, rotate: p?.rotate, shape: shape ?? shapeOf(value) });
    if (!publicish) onlyPublicish = false;
  };
  for (const p of PROVIDERS) {
    if (!p.value) continue;
    const re = new RegExp(p.value.source, "g");
    for (const m of text.matchAll(re)) add(`${p.name} key`, m[0], !!p.publicInBundles);
  }
  for (const m of text.matchAll(/-----BEGIN ((?:RSA |EC |DSA |OPENSSH |ENCRYPTED |PGP )?PRIVATE KEY(?: BLOCK)?)-----[\s\S]{20,}?-----END/g)) {
    const kind = m[1].replace(/PRIVATE KEY.*/, "").trim();
    const label = { "": "PKCS#8", OPENSSH: "OpenSSH", RSA: "RSA", EC: "EC", DSA: "DSA", ENCRYPTED: "encrypted", PGP: "PGP" }[kind] ?? kind;
    add(`${label} private key`, m[0], false, "PEM block", `${m[0].length} chars`);
  }
  // Supabase service_role (and any JWT that says it is one): bypasses row-level security.
  for (const m of text.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g)) {
    try {
      const json = atobUrl(m[1]);
      if (/"role"\s*:\s*"service_role"/.test(json)) add("Supabase service_role JWT", m[0], false);
    } catch {
      /* not a JWT */
    }
  }
  return { refs, onlyPublicish: refs.length > 0 && onlyPublicish };
}

function atobUrl(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  if (typeof atob === "function") return atob(b64);
  return Buffer.from(b64, "base64").toString("utf8");
}

export interface RuleInput {
  path: string;
  size: number;
  readText(max?: number): Promise<string | undefined>;
  readHead(n: number): Promise<Uint8Array | undefined>;
}

const f = (rule: string, severity: Severity, path: string, size: number, title: string, detail: string, secrets: SecretRef[] = [], fix = ""): Finding => ({ rule, severity, path, size, title, detail, secrets, fix });

/** Name-only check used to show what a host saved you from (no reads). */
export function riskyByName(path: string): string | undefined {
  const segs = path.split("/");
  if (segs.includes(".git")) return "git-dir";
  if (segs.some((s) => AGENT_DIRS.test(s))) return "agent-config";
  const b = base(path);
  if (isEnvFile(path) && !ENV_TEMPLATE.test(b)) return "env-file";
  if (KEY_NAMES.test(b)) return "private-key";
  if (CRED_NAMES.test(b)) return "credentials";
  if (HISTORY.test(b)) return "shell-history";
  if (DB_EXT.has(ext(path)) || /\.sql\.gz$/i.test(b)) return "db-dump";
  return undefined;
}

const MB = 1024 * 1024;

/** Classify one file that would be public. Returns zero or more findings (git-dir is aggregated by the caller). */
export async function classify(file: RuleInput): Promise<Finding[]> {
  const { path, size } = file;
  const b = base(path);
  const e = ext(path);
  const out: Finding[] = [];

  if (isEnvFile(path)) {
    const text = (await file.readText(MB)) ?? "";
    const vars = parseEnv(text);
    const secrets = secretVars(vars);
    const template = ENV_TEMPLATE.test(b);
    if (secrets.length) {
      out.push(f("env-file", "LEAK", path, size, template ? "env template with real-looking values" : "env file", `${vars.length} variable${vars.length === 1 ? "" : "s"}, ${secrets.length} look${secrets.length === 1 ? "s" : ""} secret`, secrets));
    } else if (vars.length && !template) {
      out.push(f("env-file", "RISK", path, size, "env file", `${vars.length} variable${vars.length === 1 ? "" : "s"}, none look secret — still your config, in public`));
    } else if (!template) {
      out.push(f("env-file", "INFO", path, size, "empty env file", "no KEY=VALUE lines"));
    }
    return out;
  }

  if (KEY_NAMES.test(b)) {
    const text = (await file.readText(256 * 1024)) ?? "";
    if (/-----BEGIN [A-Z ]*PRIVATE KEY/.test(text) || /PuTTY-User-Key-File/.test(text) || e === "p12" || e === "pfx" || e === "jks" || e === "keystore") {
      out.push(f("private-key", "LEAK", path, size, "private key", "anyone can download it and act as you", [ref(b, text)]));
      return out;
    }
    if (/-----BEGIN (CERTIFICATE|PUBLIC KEY)/.test(text)) return out; // public material, fine
  }

  if (CRED_NAMES.test(b)) {
    const text = (await file.readText(MB)) ?? "";
    let secrets: SecretRef[] = [];
    let why = "";
    if (/service_account/.test(text) && /private_key/.test(text)) {
      secrets = [{ name: "service account private_key", provider: "Google Cloud", fingerprint: fingerprint(text), rotate: "https://console.cloud.google.com/iam-admin/serviceaccounts", shape: "JSON key file" }];
      why = "Google service-account key: full API access as that account";
    } else if (/_authToken\s*=|_auth\s*=|_password\s*=/.test(text)) {
      const m = /(_authToken|_auth|_password)\s*=\s*(\S+)/.exec(text);
      secrets = m && !/\$\{/.test(m[2]) ? [{ ...ref("NPM_TOKEN", m[2]), name: m[1] }] : [];
      why = secrets.length ? "registry auth token" : "registry config (token comes from an env var)";
    } else if (/aws_secret_access_key/i.test(text)) {
      const m = /aws_secret_access_key\s*=\s*(\S+)/i.exec(text);
      secrets = m ? [ref("AWS_SECRET_ACCESS_KEY", m[1])] : [];
      why = "AWS credentials file";
    } else if (/password|machine\s+\S+\s+login/i.test(text) || /:\$apr1\$|:\$2[aby]\$|:\{SHA\}/.test(text) || /https?:\/\/[^\s:@]+:[^\s@]+@/.test(text)) {
      secrets = [ref(b, text)];
      why = "contains credentials";
    }
    if (secrets.length) out.push(f("credentials", "LEAK", path, size, "credentials file", why, secrets));
    else if (why) out.push(f("credentials", "INFO", path, size, "credentials config", why));
    else out.push(f("credentials", "RISK", path, size, "credentials-named file", "named like a credential file; check what is inside"));
    return out;
  }

  if (HISTORY.test(b)) {
    out.push(f("shell-history", "RISK", path, size, "shell history", "every command you typed, often with tokens pasted inline"));
    return out;
  }

  if (DB_EXT.has(e) || /\.sql\.gz$/i.test(b)) {
    const head = await file.readHead(16);
    const sqlite = head && new TextDecoder().decode(head).startsWith("SQLite format 3");
    if (e === "bak" && !sqlite) {
      out.push(f("backup-file", "RISK", path, size, "backup file", "editor/server backups often hold old config or source"));
      return out;
    }
    if (e === "db" && !sqlite) return out;
    out.push(f("db-dump", "LEAK", path, size, sqlite ? "SQLite database" : "database dump", "your data, downloadable in one request"));
    return out;
  }

  if (/\.(old|orig|swp|swo)$|~$/.test(b)) {
    out.push(f("backup-file", "RISK", path, size, "backup file", "editor/server backups often hold old config or source"));
    return out;
  }

  if (e === "map" && size <= 50 * MB) {
    const text = await file.readText(50 * MB);
    if (text) {
      let sources = 0;
      let withContent = 0;
      let content = "";
      try {
        const j = JSON.parse(text);
        sources = Array.isArray(j.sources) ? j.sources.length : 0;
        if (Array.isArray(j.sourcesContent)) {
          for (const c of j.sourcesContent) if (typeof c === "string" && c.length) (withContent++, (content += c + "\n"));
        }
        if (Array.isArray(j.sections)) withContent += j.sections.length;
      } catch {
        /* not JSON */
      }
      if (withContent) {
        const inl = inlineSecrets(content);
        if (inl.refs.length && !inl.onlyPublicish) out.push(f("inline-secret", "LEAK", path, size, "secret inside source map", `original source in sourcesContent contains ${inl.refs.length} key${inl.refs.length === 1 ? "" : "s"}`, inl.refs));
        out.push(f("source-map", "RISK", path, size, "source map with original source", `${withContent} of ${sources} original files readable via sourcesContent`));
      } else if (sources) {
        out.push(f("source-map", "INFO", path, size, "source map (no sourcesContent)", `${sources} source paths, no source text`));
      }
    }
    return out;
  }

  const segs = path.split("/");
  const agent = segs.find((s) => AGENT_DIRS.test(s));
  if (agent) {
    out.push(f("agent-config", "RISK", path, size, `${agent}/ agent files`, "your coding agent's settings, permissions and local notes"));
    return out;
  }

  if (CONFIG_NAMES.test(b)) {
    out.push(f("config-file", "INFO", path, size, "deploy/config file", "reveals project names and settings; rarely secret"));
  }
  if (b === ".DS_Store") {
    out.push(f("ds-store", "INFO", path, size, ".DS_Store", "lists the names of files in that folder"));
    return out;
  }

  if ((TEXT_EXT.has(e) || b === "_worker.js") && size <= 8 * MB) {
    const text = await file.readText(8 * MB);
    if (text) {
      const inl = inlineSecrets(text);
      if (inl.refs.length) {
        out.push(
          inl.onlyPublicish
            ? f("inline-secret", "RISK", path, size, "Google API key in a public file", "fine only if it is a restricted Firebase/Maps browser key; an unrestricted Gemini/Cloud key here is the $90k bill", inl.refs)
            : f("inline-secret", "LEAK", path, size, "secret baked into a public file", `${inl.refs.length} key${inl.refs.length === 1 ? "" : "s"} in served code`, inl.refs),
        );
      }
    }
  }
  return out;
}
