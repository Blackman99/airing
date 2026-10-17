import { build } from "esbuild";
import { chmodSync } from "node:fs";

const common = { bundle: true, platform: "node", target: "node18", format: "esm", legalComments: "none", logLevel: "warning" };
// esm bundles of CJS deps (ignore) need a require shim
const banner = "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);";
await build({ ...common, entryPoints: ["src/cli.ts"], outfile: "dist/cli.js", banner: { js: "#!/usr/bin/env node\n" + banner } });
await build({ ...common, entryPoints: ["src/index.ts"], outfile: "dist/index.js", banner: { js: banner } });
await build({ ...common, entryPoints: ["src/action.ts"], outfile: "dist/action.js", target: "node20", banner: { js: banner } });
// Landing page: the real scanner, bundled for the browser.
await build({ bundle: true, platform: "browser", format: "esm", target: "es2022", minify: true, entryPoints: ["site-src/app.js"], outfile: "site/app.js", legalComments: "none", logLevel: "warning" });
chmodSync("dist/cli.js", 0o755);
console.log("built dist/cli.js dist/index.js dist/action.js site/app.js");
