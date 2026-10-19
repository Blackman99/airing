import { posix } from "node:path";
// GitHub Action entry: scan the deploy dir (and optionally probe the live URL), write a job summary.
import { appendFileSync, existsSync } from "node:fs";
import { formatMarkdown, formatProbe, formatScan, plain } from "./format.js";
import { isHostId } from "./hosts.js";
import { probe } from "./probe.js";
import { failed, scanPath, type FailOn } from "./run.js";

const input = (name: string, def = "") => (process.env[`INPUT_${name.replace(/ /g, "_").toUpperCase()}`] ?? def).trim();
const out = (k: string, v: string) => process.env.GITHUB_OUTPUT && appendFileSync(process.env.GITHUB_OUTPUT, `${k}<<__AIRING__\n${v}\n__AIRING__\n`);
const summary = (s: string) => process.env.GITHUB_STEP_SUMMARY && appendFileSync(process.env.GITHUB_STEP_SUMMARY, s + "\n");

async function main() {
  const path = input("path", ".") || ".";
  const host = input("host");
  const dir = input("dir");
  const url = input("probe-url");
  const fo = (input("fail-on", "leak") || "leak") as FailOn;
  if (!["leak", "risk", "never"].includes(fo)) throw new Error(`fail-on must be leak, risk or never (got ${fo})`);
  if (host && !isHostId(host)) throw new Error(`unknown host "${host}" — use cf-pages, cf-workers, vercel, netlify, firebase, github-pages, gh-pages or surge (or leave it empty)`);
  const doScan = input("scan", "true") !== "false";
  if (!doScan && !url) throw new Error("scan: false and no probe-url — nothing to check. Set probe-url, or drop scan: false");
  if (doScan && !existsSync(path)) throw new Error(`path "${path}" does not exist in the workspace — did you forget actions/checkout, or run this before the build step?`);

  let bad = false;
  let leaks = 0;
  let risks = 0;
  const json: Record<string, unknown> = {};
  if (doScan) {
    const r = await scanPath(path, { host: host ? (host as any) : undefined, dir: dir || undefined });
    console.log(formatScan(r, plain));
    summary(formatMarkdown(r));
    // in matrix mode the same file shows up once per host: count the worst host, annotate each file once
    const count = (sev: string) => Math.max(0, ...r.deployments.map((d) => d.findings.filter((f) => f.severity === sev).length));
    leaks += count("LEAK");
    risks += count("RISK");
    const seen = new Set<string>();
    for (const d of r.deployments)
      for (const f of d.findings.filter((f) => f.severity === "LEAK" || f.severity === "RISK")) {
        const file = posix.join(path.replace(/\\/g, "/"), d.deployment.dir, f.path.replace(/\/$/, ""));
        if (seen.has(file)) continue;
        seen.add(file);
        const fix = f.fix || d.remedy?.say || "";
        console.log(`::${f.severity === "LEAK" ? "error" : "warning"} file=${file},title=airing: ${f.title}${r.matrix ? ` (${d.hostName})` : ""}::${f.detail}${fix ? ` — ${fix}` : ""}`);
      }
    bad ||= failed(r.worst, fo);
    json.scan = { worst: r.worst, deployments: r.deployments.map((d) => ({ host: d.deployment.host, dir: d.deployment.dir, findings: d.findings.filter((f) => f.severity !== "INFO").map(({ rule, severity, path, title }) => ({ rule, severity, path, title })) })) };
  }
  if (url) {
    const p = await probe(url);
    if (p.unreachable) console.log(`::warning title=airing probe::${p.errors[0] ?? "could not reach " + url} — nothing was checked`);
    const text = formatProbe(p, plain);
    console.log("\n" + text);
    summary("### airing probe · " + p.target + "\n\n```\n" + text + "\n```\n");
    leaks += p.findings.filter((f) => f.severity === "LEAK").length;
    risks += p.findings.filter((f) => f.severity === "RISK").length;
    bad ||= failed(p.worst, fo);
    json.probe = { worst: p.worst, findings: p.findings.map(({ rule, severity, path, title, url }) => ({ rule, severity, path, title, url })) };
  }
  out("leaks", String(leaks));
  out("risks", String(risks));
  out("json", JSON.stringify(json));
  if (bad) {
    const what = leaks ? `${leaks} leak${leaks === 1 ? "" : "s"}${url ? " (scan + live probe)" : ""} — secrets would be, or are, public` : `${risks} risk${risks === 1 ? "" : "s"} and fail-on: risk`;
    console.log(`::error title=airing::${what}. Names and fingerprints are in the job summary; values are never printed.`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.log(`::error title=airing::${(e as Error).message}`);
  process.exitCode = 2;
});
