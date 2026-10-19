// Minimal MCP server (JSON-RPC 2.0, newline-delimited over stdio). Read-only tools only.
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { formatMarkdown, formatProbe, plain } from "./format.js";
import { HOST_IDS, HOSTS, isHostId } from "./hosts.js";
import { probe } from "./probe.js";
import { scanPath } from "./run.js";
import { VERSION } from "./version.js";

export const TOOLS = [
  {
    name: "scan_deploy",
    description:
      "Before running a deploy command (wrangler pages deploy, wrangler deploy with assets, vercel, netlify deploy, firebase deploy, actions/upload-pages-artifact, gh-pages, surge), resolve exactly which files that host would upload from a directory using the host's own ignore rules, and report anything secret that would become public: .env / .dev.vars files with secret-looking variables, .git/, private keys, cloud credential files, database dumps, source maps with original source, provider API keys baked into bundles. Secret values are never returned (names, shapes and sha256 fingerprints only). With no host and no deploy config, checks every host. Read-only: never uploads, deploys or edits.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Project directory (absolute, or relative to the server's working directory). Default: the working directory." },
        host: { type: "string", enum: HOST_IDS, description: "Deploy target. Omit to use the project's config (wrangler.toml, netlify.toml, firebase.json, vercel.json, package.json scripts, Pages workflow)." },
        dir: { type: "string", description: "Deploy directory inside path (e.g. dist). Omit to use the config." },
      },
      required: [],
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "probe_url",
    description:
      "Check what anyone can download from a live site right now: ~30 GET requests for the usual leak paths (/.env, /.env.production, /.dev.vars, /.git/config, /.npmrc, private keys, SQL/SQLite dumps, service-account JSON, .claude/settings.local.json) plus the page's own scripts and their source maps. Soft-404/SPA-fallback aware; every hit is content-validated. Secret values are never returned. Only use on sites you own or are authorized to test. Read-only (GET only).",
    inputSchema: { type: "object", properties: { url: { type: "string", description: "Site URL, e.g. https://my-app.pages.dev" } }, required: ["url"] },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  {
    name: "host_rules",
    description: "What each static host skips by default when it uploads a directory (transcribed from the upstream CLI source, with links). Use to explain why a file would or would not be public.",
    inputSchema: { type: "object", properties: {}, required: [] },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
];

type Json = Record<string, any>;

export async function callTool(name: string, args: Json, cwd = process.cwd()): Promise<{ text: string; isError?: boolean }> {
  if (name === "scan_deploy") {
    const path = resolve(cwd, typeof args.path === "string" && args.path ? args.path : ".");
    if (args.host !== undefined && !isHostId(String(args.host))) return { text: `unknown host "${args.host}". Known: ${HOST_IDS.join(", ")}`, isError: true };
    const r = await scanPath(path, { host: args.host, dir: typeof args.dir === "string" && args.dir ? args.dir : undefined });
    const compact = r.deployments.map((d) => ({ host: d.deployment.host, dir: d.deployment.dir, source: d.deployment.source, totals: d.totals, findings: d.findings.filter((f) => f.severity !== "INFO"), savedByHost: d.savedByHost.slice(0, 20) }));
    return { text: `worst: ${r.worst}${r.matrix ? " (no deploy config: every host checked)" : ""}\n\n${formatMarkdown(r)}\n\n\`\`\`json\n${JSON.stringify({ root: r.root, worst: r.worst, deployments: compact }, null, 2)}\n\`\`\`` };
  }
  if (name === "probe_url") {
    if (typeof args.url !== "string" || !args.url) return { text: "url is required", isError: true };
    const r = await probe(args.url);
    return { text: formatProbe(r, plain, {}) + "\n\n```json\n" + JSON.stringify({ target: r.target, worst: r.worst, findings: r.findings, notFound: r.notFound, errors: r.errors.slice(0, 5) }, null, 2) + "\n```" };
  }
  if (name === "host_rules") return { text: JSON.stringify(HOSTS, null, 2) };
  return { text: `unknown tool ${name}`, isError: true };
}

export async function runMcp(): Promise<void> {
  const rl = createInterface({ input: process.stdin });
  const send = (m: Json) => process.stdout.write(JSON.stringify(m) + "\n");
  const pending: Promise<unknown>[] = [];
  for await (const line of rl) {
    if (!line.trim()) continue;
    let msg: Json;
    try {
      msg = JSON.parse(line);
    } catch {
      send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } });
      continue;
    }
    const { id, method, params } = msg;
    if (id === undefined || id === null) continue; // notification
    const reply = (result: Json) => send({ jsonrpc: "2.0", id, result });
    if (method === "initialize") {
      reply({
        protocolVersion: params?.protocolVersion ?? "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "airing", version: VERSION },
        instructions: "Call scan_deploy on the project before running any deploy command (wrangler, vercel, netlify, firebase, gh-pages, surge). If it reports LEAK, do not deploy; fix the upload set first. After a deploy, probe_url checks the live site. All tools are read-only.",
      });
    } else if (method === "ping") reply({});
    else if (method === "tools/list") reply({ tools: TOOLS });
    else if (method === "tools/call") {
      pending.push(
        callTool(params?.name, params?.arguments ?? {}).then(
          (r) => reply({ content: [{ type: "text", text: r.text }], isError: !!r.isError }),
          (e) => reply({ content: [{ type: "text", text: `error: ${(e as Error).message}` }], isError: true }),
        ),
      );
    } else send({ jsonrpc: "2.0", id, error: { code: -32601, message: `method not found: ${method}` } });
  }
  await Promise.all(pending);
}
