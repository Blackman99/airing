// QA screenshots with real time (rAF-driven physics needs it).
// usage: node scripts/qa.mjs <url> <out.png> <w> <h> [--wait ms] [--click selector] [--reduce] [--full] [--scroll y] [--dpr n]
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(execSync("npm root -g").toString().trim() + "/");
const puppeteer = require("puppeteer-core");
const [url, out, w, h, ...rest] = process.argv.slice(2);
const opt = (k, d) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : d; };
const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox", "--hide-scrollbars"] });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.setViewport({ width: +w, height: +h, deviceScaleFactor: +opt("--dpr", 1) });
if (rest.includes("--reduce")) await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await page.goto(url, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, +opt("--wait", 4500)));
const click = opt("--click");
if (click) { await page.click(click); await new Promise((r) => setTimeout(r, +opt("--after", 4500))); }
const sy = opt("--scroll");
if (sy) { await page.evaluate((y) => window.scrollTo(0, +y), sy); await new Promise((r) => setTimeout(r, 1500)); }
await page.screenshot({ path: out, fullPage: rest.includes("--full") });
if (errors.length) console.error("page errors:\n" + errors.join("\n"));
console.log("wrote", out);
await browser.close();
