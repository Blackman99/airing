import { HOSTS } from "./hosts.js";
import type { ProbeReport } from "./probe.js";
import type { DeploymentReport, Finding, ScanReport, SecretRef, Severity } from "./types.js";

export interface Style {
  leak: (s: string) => string;
  risk: (s: string) => string;
  info: (s: string) => string;
  ok: (s: string) => string;
  dim: (s: string) => string;
  bold: (s: string) => string;
  path: (s: string) => string;
}
const id = (s: string) => s;
export const plain: Style = { leak: id, risk: id, info: id, ok: id, dim: id, bold: id, path: id };
export function ansi(): Style {
  const w = (a: string, b: string) => (s: string) => `\x1b[${a}m${s}\x1b[${b}m`;
  return { leak: w("1;38;5;196", "0"), risk: w("38;5;214", "39"), info: w("2", "22"), ok: w("38;5;35", "39"), dim: w("2", "22"), bold: w("1", "22"), path: w("38;5;117", "39") };
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const u = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < u.length - 1) (v /= 1024), i++;
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${u[i]}`;
}

const pad = (s: string, n: number) => s + " ".repeat(Math.max(0, n - visible(s).length));
const visible = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");
const sev = (st: Style, s: Severity) => (s === "LEAK" ? st.leak(" LEAK ") : s === "RISK" ? st.risk(" RISK ") : st.info(" info "));

function secretLines(st: Style, secrets: SecretRef[], indent: string): string[] {
  const out: string[] = [];
  const w = Math.min(28, Math.max(...secrets.map((s) => s.name.length), 4));
  const pw = Math.min(24, Math.max(...secrets.map((s) => s.provider.length), 8));
  const sw = Math.min(26, Math.max(...secrets.map((s) => s.shape.length), 12));
  for (const s of secrets.slice(0, 12)) {
    out.push(`${indent}${st.bold(pad(s.name, w))}  ${pad(s.provider, pw)}  ${st.dim(pad(s.shape, sw))}  ${st.dim("sha256:" + s.fingerprint)}`);
    if (s.rotate) out.push(`${indent}${" ".repeat(w + 2)}${st.dim("rotate →")} ${s.rotate}`);
  }
  if (secrets.length > 12) out.push(`${indent}${st.dim(`… ${secrets.length - 12} more`)}`);
  return out;
}

function findingLines(st: Style, f: Finding, showFix = true, pw = 30): string[] {
  const out = [`  ${sev(st, f.severity)} ${st.path(pad(f.path, pw))} ${st.dim(pad(fmtBytes(f.size), 8))} ${f.title} — ${f.detail}`];
  if (f.secrets.length) out.push(...secretLines(st, f.secrets, "         "));
  if (showFix && f.fix && f.severity !== "INFO") out.push(`         ${st.dim("fix:")} ${f.fix}`);
  return out;
}

export interface FormatOpts {
  all?: boolean;
  /** the folder the user passed on the command line, for display */
  root?: string;
  /** --matrix was asked for (vs. no config found) */
  matrix?: boolean;
}

function deploymentText(st: Style, r: DeploymentReport, o: FormatOpts): string[] {
  const d = r.deployment;
  const out: string[] = [];
  const base = o.root && o.root !== "." ? o.root.replace(/\/+$/, "") + "/" : "";
  const dir = d.dir === "." ? base || "./" : base + d.dir + "/";
  out.push(`${st.bold("airing")} · ${st.bold(r.hostName)} · ${st.path(dir)}  ${st.dim(`(${d.source})`)}`);
  const goes = r.totals.public + r.totals.uploaded;
  const verb = r.totals.uploaded && !r.totals.public ? "upload" : "go public";
  out.push(`  ${goes} file${goes === 1 ? "" : "s"} ${verb} · ${r.totals.home} stay${r.totals.home === 1 ? "s" : ""} home`);
  if (!r.totals.files) out.push(`  ${st.risk("this directory is empty or missing — is the build output there yet?")}`);
  const shown = r.findings.filter((f) => o.all || f.severity !== "INFO");
  if (shown.length) out.push("");
  const pw = Math.min(44, Math.max(30, ...shown.map((f) => f.path.length + 1)));
  for (const f of shown) out.push(...findingLines(st, f, false, pw));
  const hidden = r.findings.length - shown.length;
  if (hidden) out.push(st.dim(`  + ${hidden} info note${hidden === 1 ? "" : "s"} (--all to show)`));
  if (r.remedy) {
    out.push("");
    if (r.remedy.say) out.push(`  ${st.bold("keep it home:")} ${r.remedy.say}`);
    if (r.remedy.lines?.length) out.push(...r.remedy.lines.slice(0, 12).map((l) => `      ${st.path(l)}`));
    for (const n of r.remedy.notes ?? []) out.push(`  ${st.bold("also:")} ${n}`);
  }
  if (r.savedByHost.length) {
    out.push("");
    out.push(`  ${st.ok("saved by the host:")} ${r.savedByHost.slice(0, 6).map((s) => `${s.path} ${st.dim(`(${s.why})`)}`).join(", ")}${r.savedByHost.length > 6 ? st.dim(` +${r.savedByHost.length - 6}`) : ""}`);
  }
  return out;
}

export function formatScan(r: ScanReport, st: Style = plain, o: FormatOpts = {}): string {
  const out: string[] = [];
  if (r.matrix) out.push(...matrixText(st, r, o));
  else
    for (const [i, d] of r.deployments.entries()) {
      if (i) out.push("");
      out.push(...deploymentText(st, d, o));
    }
  out.push("");
  out.push(verdict(st, r, o));
  return out.join("\n");
}

function verdict(st: Style, r: ScanReport, o: FormatOpts = {}): string {
  const all = r.deployments.flatMap((d) => d.findings);
  const leaks = all.filter((f) => f.severity === "LEAK").length;
  const risks = all.filter((f) => f.severity === "RISK").length;
  if (r.matrix) {
    const worst = [...r.deployments].sort((a, b) => b.findings.filter((f) => f.severity === "LEAK").length - a.findings.filter((f) => f.severity === "LEAK").length)[0];
    const n = worst?.findings.filter((f) => f.severity === "LEAK").length ?? 0;
    if (!n && !risks) return st.ok("✓ nothing secret would go public on any host.") + st.dim(" airing only reads; nothing was uploaded.");
    const riskyFiles = new Set(all.filter((f) => f.severity === "RISK").map((f) => f.path)).size;
    if (!n) return st.risk(`! no secrets, but ${riskyFiles} risky file${riskyFiles === 1 ? "" : "s"} on every host that serves ${riskyFiles === 1 ? "it" : "them"}.`) + st.dim(` details: airing ${o.root && o.root !== "." ? o.root + " " : ""}--host <id>`);
    return st.leak(`✗ worst host: ${worst.hostName} would publish ${n} leak${n === 1 ? "" : "s"}.`) + st.dim(` fixes: airing ${o.root && o.root !== "." ? o.root + " " : ""}--host ${worst.deployment.host}${o.matrix ? "" : "   (no deploy config found, so every host was checked)"}`);
  }
  if (leaks) return st.leak(`✗ ${leaks} leak${leaks === 1 ? "" : "s"} would be public.`) + st.dim(" nothing was uploaded — airing only reads. Fix, then deploy.");
  if (risks) return st.risk(`! no secrets, ${risks} risk${risks === 1 ? "" : "s"} worth a look.`) + st.dim(" exit 0 (use --fail-on risk to block)");
  return st.ok("✓ clean: nothing secret in the upload set.") + st.dim(" airing only reads; nothing was uploaded.");
}

const SHORT: Record<string, string> = { "cf-pages": "CF Pages", "cf-workers": "CF Workers", vercel: "Vercel", netlify: "Netlify", firebase: "Firebase", "github-pages": "GH Pages", "gh-pages": "gh-pages" };

function matrixRows(r: ScanReport) {
  const rows = new Map<string, { label: string; secretish: boolean; cells: Map<string, { sev?: Severity; home?: boolean }> }>();
  for (const d of r.deployments) {
    for (const f of d.findings) {
      if (f.severity === "INFO") continue;
      const row = rows.get(f.path) ?? { label: f.path, secretish: false, cells: new Map() };
      if (/vercel/.test(d.deployment.host) && /uploaded to Vercel/.test(f.detail)) row.secretish = true;
      const prev = row.cells.get(d.deployment.host);
      if (!prev?.sev || (f.severity === "LEAK" && prev.sev !== "LEAK")) row.cells.set(d.deployment.host, { sev: f.severity });
      if (f.secrets.length && !/\(/.test(row.label)) row.label = `${f.path} (${f.secrets.length} secret${f.secrets.length === 1 ? "" : "s"})`;
      rows.set(f.path, row);
    }
  }
  for (const d of r.deployments)
    for (const s of d.savedByHost) {
      const row = rows.get(s.path);
      if (row && !row.cells.has(d.deployment.host)) row.cells.set(d.deployment.host, { home: true });
    }
  return [...rows.values()];
}

function matrixText(st: Style, r: ScanReport, _o: FormatOpts): string[] {
  const out: string[] = [];
  const dir = r.deployments[0]?.deployment.dir ?? ".";
  out.push(`${st.bold("airing")} · ${st.path(r.root)}${dir !== "." ? st.path("/" + dir) : ""} · ${st.dim(_o.matrix ? "--matrix: what each host would hang out in public" : "no deploy config found, so here is what each host would hang out in public")}`);
  out.push("");
  const rows = matrixRows(r);
  if (!rows.length) {
    out.push(st.ok("  every host: nothing secret in this folder."));
    return out;
  }
  const w = Math.min(38, Math.max(...rows.map((x) => x.label.length), 10)) + 2;
  out.push(("  " + pad("", w) + r.deployments.map((d, i, all) => st.dim(i === all.length - 1 ? SHORT[d.deployment.host] : pad(SHORT[d.deployment.host], 11))).join("")).trimEnd());
  for (const row of rows) {
    const cells = r.deployments.map((d) => {
      const c = row.cells.get(d.deployment.host);
      const uploadOnly = d.deployment.host === "vercel" && d.deployment.opts.vercelStatic === false && row.secretish;
      const txt = !c || c.home ? "home" : uploadOnly ? "upload" : c.sev === "LEAK" ? "PUBLIC" : "risk";
      const styled = txt === "PUBLIC" ? st.leak(txt) : txt === "home" ? st.ok(txt) : st.risk(txt);
      return styled + " ".repeat(Math.max(0, 11 - txt.length));
    });
    out.push(("  " + st.path(pad(row.label.length > w - 2 ? row.label.slice(0, w - 3) + "…" : row.label, w)) + cells.join("")).trimEnd());
  }
  return out;
}

export function formatMarkdown(r: ScanReport): string {
  const out: string[] = [];
  for (const d of r.deployments) {
    const leaks = d.findings.filter((f) => f.severity === "LEAK");
    out.push(`### airing · ${d.hostName} · \`${d.deployment.dir}/\` — ${leaks.length ? `❌ ${leaks.length} leak${leaks.length === 1 ? "" : "s"}` : "✅ no secrets"}`);
    out.push("");
    out.push(`${d.totals.public + d.totals.uploaded} files go out, ${d.totals.home} stay home (${d.deployment.source}).`);
    const shown = d.findings.filter((f) => f.severity !== "INFO");
    if (shown.length) {
      out.push("", "| | path | what | fix |", "|---|---|---|---|");
      for (const f of shown) {
        const sec = f.secrets.length ? `<br>${f.secrets.map((s) => `\`${s.name}\` (${s.provider}, sha256:${s.fingerprint})`).join(", ")}` : "";
        out.push(`| ${f.severity} | \`${f.path}\` | ${f.title} — ${f.detail}${sec} | ${f.fix} |`);
      }
    }
    out.push("");
  }
  return out.join("\n");
}

export function formatProbe(r: ProbeReport, st: Style = plain, o: FormatOpts = {}): string {
  const out: string[] = [];
  out.push(`${st.bold("airing probe")} · ${st.path(r.target)}`);
  if (r.unreachable) {
    out.push("", `  ${st.risk(r.errors[0] ?? "could not reach the site")}`, "");
    out.push(st.risk("? nothing was checked.") + st.dim(" is the URL right and the site deployed? (only probe sites you own)"));
    return out.join("\n");
  }
  out.push(`  ${r.checked} GET request${r.checked === 1 ? "" : "s"} · ${st.dim(r.notFound.note)}`);
  const shown = r.findings.filter((f) => o.all || f.severity !== "INFO");
  if (shown.length) out.push("");
  const ppw = Math.min(52, Math.max(30, ...shown.map((f) => f.path.length + 1)));
  for (const f of shown) {
    out.push(`  ${sev(st, f.severity)} ${st.path(pad(f.path, ppw))} ${st.dim(pad(fmtBytes(f.size), 8))} ${f.title} — ${f.detail}`);
    if (f.secrets.length) out.push(...secretLines(st, f.secrets, "         "));
    if (f.severity !== "INFO") out.push(`         ${st.dim("fix:")} ${f.fix}`);
  }
  const hidden = r.findings.length - shown.length;
  if (hidden) out.push(st.dim(`  + ${hidden} info note${hidden === 1 ? "" : "s"} (--all to show)`));
  if (r.errors.length) {
    out.push("");
    for (const e of r.errors.slice(0, 5)) out.push(`  ${st.dim("no answer:")} ${e}`);
    if (r.errors.length > 5) out.push(st.dim(`  + ${r.errors.length - 5} more requests failed — try --timeout 20`));
  }
  out.push("");
  const leaks = r.findings.filter((f) => f.severity === "LEAK").length;
  if (!r.checked || (r.errors.length && r.checked <= r.errors.length)) out.push(st.risk("? could not reach the site — nothing was checked."));
  else if (leaks) out.push(st.leak(`✗ ${leaks} thing${leaks === 1 ? "" : "s"} anyone can download right now.`) + st.dim(" rotate before you fix — it has been public."));
  else if (shown.length) out.push(st.risk("! nothing secret reachable, but look at the risks above."));
  else out.push(st.ok("✓ nothing exposed at the usual paths.") + st.dim(" (a probe checks ~40 known paths, not every file — run `airing <dir>` before deploying)"));
  return out.join("\n");
}

export { HOSTS };
