import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { ansi, formatMarkdown, formatProbe, formatScan, plain } from "./format.js";
import { HOST_IDS, HOSTS, isHostId } from "./hosts.js";
import { runMcp } from "./mcp.js";
import { probe } from "./probe.js";
import { failed, parseDeployLine, scanPath, type FailOn } from "./run.js";
import { scan } from "./scan.js";
import { nodeTree } from "./tree-node.js";
import { VERSION } from "./version.js";

const HELP = `airing ${VERSION} — what is your deploy airing in public?

  airing [dir]                     what each host would publish from dir (default .)
  airing [dir] --host <id>         one host, with fixes   (${HOST_IDS.join(" | ")})
  airing probe <url>               what anyone can download from the live site right now
  airing guard -- <deploy cmd>     scan first, run the deploy only if nothing would leak
  airing hook                      Claude Code PreToolUse hook (reads hook JSON on stdin)
  airing hosts                     each host's real ignore rules, with upstream source links
  airing mcp                       read-only MCP server on stdio

options
  --dir <path>        deploy directory inside [dir] (overrides config)
  --matrix            check every host even if config names one
  --fail-on <level>   leak (default) | risk | never
  --json | --markdown output format
  --all               include info notes
  --timeout <s>       probe: seconds per request (default 10)
  --no-color

exit codes: 0 nothing at --fail-on level · 1 would leak / leaking · 2 usage or I/O error
Values are never printed: names, shapes and sha256 fingerprints only.`;

interface Args {
  _: string[];
  flags: Record<string, string | boolean>;
  rest: string[];
}
function parseArgs(argv: string[]): Args {
  const a: Args = { _: [], flags: {}, rest: [] };
  const takes = new Set(["host", "dir", "fail-on", "timeout", "path"]);
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === "--") {
      a.rest = argv.slice(i + 1);
      break;
    }
    if (x.startsWith("--")) {
      const [k, v] = x.slice(2).split("=", 2);
      if (v !== undefined) a.flags[k] = v;
      else if (takes.has(k)) {
        const next = argv[i + 1];
        if (next === undefined || next.startsWith("--")) throw new UsageError(`--${k} needs a value`);
        a.flags[k] = next;
        i++;
      } else a.flags[k] = true;
    } else if (x === "-h") a.flags.help = true;
    else if (x === "-v" || x === "-V") a.flags.version = true;
    else a._.push(x);
  }
  return a;
}

class UsageError extends Error {}

const KNOWN = new Set(["host", "dir", "fail-on", "timeout", "path", "matrix", "json", "markdown", "all", "no-color", "help", "version"]);
function closest(k: string): string | undefined {
  const d = (a: string, b: string) => {
    const m = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) m[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return m[a.length][b.length];
  };
  let best: string | undefined, bd = 3;
  for (const c of KNOWN) { const x = d(k, c); if (x < bd) (bd = x), (best = c); }
  return best;
}
function checkFlags(a: Args) {
  for (const k of Object.keys(a.flags)) {
    if (KNOWN.has(k)) continue;
    const c = closest(k);
    throw new UsageError(`unknown option --${k}${c ? ` (did you mean --${c}?)` : ""}`);
  }
  if (a.flags.timeout !== undefined && !(Number(a.flags.timeout) > 0)) throw new UsageError(`--timeout is seconds per request, e.g. --timeout 20 (got "${a.flags.timeout}")`);
}

const style = (a: Args) => (a.flags["no-color"] || process.env.NO_COLOR || !process.stdout.isTTY ? plain : ansi());
function failOn(a: Args): FailOn {
  const v = String(a.flags["fail-on"] ?? "leak");
  if (v !== "leak" && v !== "risk" && v !== "never") throw new UsageError(`--fail-on must be leak, risk or never (got "${v}")`);
  return v;
}
function hostFlag(a: Args) {
  const h = a.flags.host;
  if (h === undefined) return undefined;
  if (typeof h !== "string" || !isHostId(h)) throw new UsageError(`unknown host "${h}". Known: ${HOST_IDS.join(", ")}`);
  return h;
}

async function main(argv: string[]): Promise<number> {
  const a = parseArgs(argv);
  checkFlags(a);
  if (a.flags.version) return console.log(VERSION), 0;
  const cmd = a._[0];
  if (a.flags.help || cmd === "help") return console.log(HELP), 0;

  if (cmd === "mcp") return await runMcp(), 0;

  if (cmd === "hosts") {
    if (a.flags.json) return console.log(JSON.stringify(HOSTS, null, 2)), 0;
    const st = style(a);
    for (const h of Object.values(HOSTS)) {
      console.log(`${st.bold(h.name.padEnd(26))} ${st.dim(h.id)}`);
      console.log(`  ${st.dim("runs:")}  ${h.command}`);
      console.log(`  ${st.dim("skips:")} ${h.skips}`);
      console.log(`  ${st.dim("source:")} ${h.source}\n`);
    }
    return 0;
  }

  if (cmd === "probe") {
    const url = a._[1];
    if (!url) throw new UsageError("probe needs a URL: airing probe https://my-site.pages.dev");
    const timeoutMs = a.flags.timeout ? Number(a.flags.timeout) * 1000 : undefined;
    const fo = failOn(a);
    const r = await probe(url, { timeoutMs });
    if (a.flags.json) console.log(JSON.stringify(r, null, 2));
    else console.log(formatProbe(r, style(a), { all: !!a.flags.all }));
    if (r.errors.length && r.checked <= r.errors.length) return 2;
    return failed(r.worst, fo) ? 1 : 0;
  }

  if (cmd === "hook") return hook();

  if (cmd === "guard") {
    if (!a.rest.length) throw new UsageError("guard needs the deploy command after --: airing guard -- npx wrangler pages deploy dist");
    const line = a.rest.join(" ");
    const { cwd, deployments } = parseDeployLine(line, process.cwd());
    const fo = failOn(a);
    if (!deployments.length) {
      console.error(style(a).risk(`airing: "${a.rest[0]}" is not a deploy command I know (wrangler, vercel, netlify, firebase, gh-pages, surge, aws s3 sync) — running it unchecked.`));
    } else {
      const r = await scan(nodeTree(cwd), { deployments });
      if (failed(r.worst, fo)) {
        console.error(formatScan(r, process.stderr.isTTY && !process.env.NO_COLOR ? ansi() : plain, { all: !!a.flags.all }));
        console.error(style(a).leak("airing: deploy NOT run."));
        return 1;
      }
      const n = r.deployments.reduce((s, d) => s + d.totals.public + d.totals.uploaded, 0);
      console.error(style(a).ok(`airing: ${n} files checked, nothing secret — deploying.`));
    }
    return await new Promise<number>((res) => {
      const child = spawn(a.rest[0], a.rest.slice(1), { stdio: "inherit", shell: process.platform === "win32" });
      child.on("error", (e) => (console.error(`airing: could not run ${a.rest[0]}: ${e.message}`), res(127)));
      child.on("exit", (code, sig) => res(code ?? (sig ? 128 : 1)));
    });
  }

  // default: scan
  const path = cmd ?? ".";
  if (a._.length > 1) throw new UsageError(`one directory at a time (got ${a._.join(", ")})`);
  const host = hostFlag(a);
  const fo = failOn(a);
  if (!existsSync(path)) throw new UsageError(`${path} does not exist — pass the folder you deploy, e.g. airing dist (or airing . for the project root)`);
  const r = await scanPath(path, { host, dir: typeof a.flags.dir === "string" ? a.flags.dir : undefined, matrix: !!a.flags.matrix });
  if (a.flags.json) console.log(JSON.stringify(r, (k, v) => (k === "fates" && !a.flags.all ? undefined : v), 2));
  else if (a.flags.markdown) console.log(formatMarkdown(r));
  else console.log(formatScan(r, style(a), { all: !!a.flags.all, root: path, matrix: !!a.flags.matrix }));
  return failed(r.worst, fo) ? 1 : 0;
}

/** Claude Code PreToolUse: deny a Bash deploy whose upload set would leak; silent otherwise. */
async function hook(): Promise<number> {
  let input: any = {};
  try {
    input = JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    return 0; // never break the agent on malformed input
  }
  const command: string | undefined = input?.tool_input?.command;
  if (input?.tool_name && input.tool_name !== "Bash") return 0;
  if (typeof command !== "string") return 0;
  const { cwd, deployments } = parseDeployLine(command, typeof input.cwd === "string" ? input.cwd : process.cwd());
  if (!deployments.length) return 0;
  try {
    const r = await scan(nodeTree(cwd), { deployments });
    if (r.worst !== "LEAK") return 0;
    const reason = formatScan(r, plain, {}).split("\n").slice(0, 40).join("\n");
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: `airing blocked this deploy: secrets would be public.\n\n${reason}\n\nFollow the "keep it home:" line above (deploy the build output, or add the ignore lines), rotate any key that was already deployed, then retry. Do not work around this by deploying a different way.`,
        },
      }) + "\n",
    );
  } catch {
    return 0;
  }
  return 0;
}

main(process.argv.slice(2)).then(
  (code) => (process.exitCode = code),
  (e) => {
    if (e instanceof UsageError) console.error(`airing: ${e.message}\nrun airing --help`);
    else console.error(`airing: ${(e as Error).message}`);
    process.exitCode = 2;
  },
);
