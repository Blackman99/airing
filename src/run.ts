import { resolve } from "node:path";
import { deploymentsFromCommand } from "./detect.js";
import { scan } from "./scan.js";
import { nodeTree } from "./tree-node.js";
import type { HostId, ScanReport, Severity } from "./types.js";

export type FailOn = "leak" | "risk" | "never";
export const failed = (worst: Severity | "CLEAN", on: FailOn) => (on === "never" ? false : on === "risk" ? worst === "LEAK" || worst === "RISK" : worst === "LEAK");

export async function scanPath(path: string, opts: { host?: HostId; dir?: string; matrix?: boolean } = {}): Promise<ScanReport> {
  const tree = nodeTree(path);
  const r = await scan(tree, opts);
  return r;
}

/** `cd foo && npx wrangler pages deploy dist` → { cwd: foo, deployments } */
export function parseDeployLine(line: string, cwd: string) {
  let dir = cwd;
  const m = /^\s*cd\s+(["']?)([^"'&;|]+)\1\s*(?:&&|;)\s*/.exec(line);
  if (m) dir = resolve(cwd, m[2].trim());
  return { cwd: dir, deployments: deploymentsFromCommand(m ? line.slice(m[0].length) : line) };
}
