// Record the landing hero into assets/demo.gif (real scanner, real physics).
// usage: node scripts/gif.mjs http://localhost:8765/ assets/demo.gif
import { createRequire } from "node:module";
import { execSync, execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
const require = createRequire(execSync("npm root -g").toString().trim() + "/");
const puppeteer = require("puppeteer-core");
const [url, out] = process.argv.slice(2);
const dir = "/tmp/airing-gif";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox", "--hide-scrollbars"] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
await page.goto(url + "?poster", { waitUntil: "domcontentloaded" });
const cdp = await page.createCDPSession();
const frames = [];
cdp.on("Page.screencastFrame", async (f) => {
  frames.push({ data: f.data, t: f.metadata.timestamp });
  await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "png", everyNthFrame: 1 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(5200);
await page.click('button[data-host="netlify"]');
await wait(5000);
await page.click('button[data-host="cf-workers"]');
await wait(5600);
await cdp.send("Page.stopScreencast");
await browser.close();
// resample to a steady 12 fps
const fps = 12;
const t0 = frames[0].t, t1 = frames.at(-1).t;
let k = 0, n = 0;
for (let t = t0; t <= t1; t += 1 / fps) {
  while (k + 1 < frames.length && frames[k + 1].t <= t) k++;
  writeFileSync(`${dir}/f${String(n++).padStart(4, "0")}.png`, Buffer.from(frames[k].data, "base64"));
}
console.log(frames.length, "raw frames →", n, "frames");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", `${dir}/f%04d.png`, "-vf", "scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle", out]);
console.log("wrote", out);
