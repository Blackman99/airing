// Write the landing page's sample project to a directory: node scripts/sample.mjs /tmp/swarm-landing
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { SAMPLE } from "../site-src/sample.js";
const out = process.argv[2];
if (!out) throw new Error("usage: node scripts/sample.mjs <dir>");
for (const [p, v] of Object.entries(SAMPLE)) {
  mkdirSync(dirname(join(out, p)), { recursive: true });
  writeFileSync(join(out, p), v);
}
console.log("wrote", Object.keys(SAMPLE).length, "files to", out);
