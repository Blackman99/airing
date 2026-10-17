// airing — the laundry line. The garments on the line are the real output of
// airing's scanner (src/scan.ts) run in your browser on the sample project or
// on a folder you drop into the basket. Nothing is uploaded anywhere.
import { scan, HOSTS, HOST_IDS, hostFilter, formatScan, plain } from "../src/browser.ts";

const NS = "http://www.w3.org/2000/svg";
const C = {
  sky: "#9ccbe6", terra: "#c8643f", salmon: "#e9a58c", green: "#2c5b4c", ink: "#17242f",
  linen: "#f7f9f8", peg: "#b88a55", scarlet: "#df2a40", slate: "#6e7f8c", indigo: "#4a5a9a",
};
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
const $ = (s, r = document) => r.querySelector(s);
const svgEl = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
};
const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

// ───────────────────────────────── sample project ─────────────────────────────
import { SAMPLE } from "./sample.js";

function memTree(name, files) {
  const enc = new TextEncoder();
  const entries = Object.entries(files).map(([path, v]) => ({ path, size: enc.encode(v).length }));
  return {
    name,
    files: entries,
    readText: async (p, max = 1 << 20) => (p in files ? files[p].slice(0, max) : undefined),
    readHead: async (p, n) => (p in files ? enc.encode(files[p].slice(0, n)) : undefined),
  };
}

// A folder dropped into the basket: File objects, read lazily, never sent anywhere.
const MAX_DROP = 30000;
function fileTree(name, list) {
  const map = new Map(list.map((x) => [x.path, x.file]));
  return {
    name,
    files: list.map((x) => ({ path: x.path, size: x.file.size })),
    readText: async (p, max = 1 << 20) => {
      const f = map.get(p);
      if (!f) return undefined;
      try {
        return await f.slice(0, max).text();
      } catch {
        return undefined;
      }
    },
    readHead: async (p, n) => {
      const f = map.get(p);
      if (!f) return undefined;
      try {
        return new Uint8Array(await f.slice(0, n).arrayBuffer());
      } catch {
        return undefined;
      }
    },
  };
}
async function readDropped(items) {
  const out = [];
  let root = "your folder";
  const walk = async (entry, prefix) => {
    if (out.length >= MAX_DROP) return;
    if (entry.isFile) {
      const file = await new Promise((res, rej) => entry.file(res, rej)).catch(() => null);
      if (file) out.push({ path: prefix + entry.name, file });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      for (;;) {
        const batch = await new Promise((res) => reader.readEntries(res, () => res([])));
        if (!batch.length) break;
        for (const e of batch) await walk(e, prefix + entry.name + "/");
      }
    }
  };
  const entries = [...items].map((i) => i.webkitGetAsEntry?.()).filter(Boolean);
  if (entries.length === 1 && entries[0].isDirectory) {
    root = entries[0].name;
    const reader = entries[0].createReader();
    for (;;) {
      const batch = await new Promise((res) => reader.readEntries(res, () => res([])));
      if (!batch.length) break;
      for (const e of batch) await walk(e, "");
    }
  } else for (const e of entries) await walk(e, "");
  return { root, files: out };
}

// ───────────────────────────────── state ───────────────────────────────────────
const state = {
  tree: memTree("swarm-landing", SAMPLE),
  sample: true,
  dir: ".",
  host: "cf-pages",
  report: null,
  garments: [],
  geo: null,
  t: 0,
  sag: 0,
  sagV: 0,
  busy: false,
};

// ───────────────────────────────── geometry ────────────────────────────────────
function layout(W, H) {
  const land = W / H > 1.15 && W >= 1180;
  const g = { W, H, land };
  if (land) {
    g.lb = 0.235 * W; g.lt = 0.305 * W; // left facade inner edge: bottom, top
    g.rb = 0.765 * W; g.rt = 0.695 * W;
  } else {
    g.lb = 0.075 * W; g.lt = 0.13 * W;
    g.rb = 0.925 * W; g.rt = 0.87 * W;
  }
  g.xL = (y) => g.lt + (g.lb - g.lt) * (y / H);
  g.xR = (y) => g.rt + (g.rb - g.rt) * (y / H);
  if (land) {
    g.top = { a: { x: g.xL(0.07 * H), y: 0.07 * H }, b: { x: g.xR(0.06 * H), y: 0.06 * H } };
    g.far = { a: { x: g.xL(0.3 * H), y: 0.3 * H }, b: { x: g.xR(0.28 * H), y: 0.28 * H } };
    g.balY = 0.715 * H;
    g.basket = { x: 0.125 * W, y: 0.615 * H, w: 0.12 * W, h: 0.1 * H };
    g.A = { x: 0.288 * W, y: 0.5 * H };
    g.B = { x: g.xR(0.455 * H) - 4, y: 0.455 * H };
    g.cap = W >= 1560 ? 7 : 6;
    g.gw = Math.min(118, (g.B.x - g.A.x) / (g.cap + 1.6));
  } else {
    g.top = { a: { x: g.xL(0.05 * H), y: 0.05 * H }, b: { x: g.xR(0.045 * H), y: 0.045 * H } };
    g.far = null;
    g.balY = 0.93 * H;
    g.basket = { x: g.xL(0.85 * H) + 4, y: 0.83 * H, w: Math.min(118, 0.3 * W), h: 0.085 * H };
    g.A = { x: g.xL(0.36 * H) + 12, y: 0.36 * H };
    g.B = { x: g.xR(0.33 * H) - 2, y: 0.33 * H };
    g.wallPulley = true;
    g.cap = W < 380 ? 4 : 5;
    g.gw = Math.min(64, (g.B.x - g.A.x) / (g.cap + 0.9));
  }
  return g;
}
const SAG0 = () => (state.geo.land ? 26 : 18);
function lineAt(g, t, sag) {
  // a real catenary: cosh, normalised so the ends sit on the anchors and the middle drops `sag`
  const k = 1.15;
  const c = (Math.cosh(k * (2 * t - 1)) - Math.cosh(k)) / (1 - Math.cosh(k));
  return { x: g.A.x + (g.B.x - g.A.x) * t, y: g.A.y + (g.B.y - g.A.y) * t + sag * c };
}
function linePath(g, sag, a = g.A, b = g.B) {
  const gg = { ...g, A: a, B: b };
  let d = "";
  for (let i = 0; i <= 40; i++) {
    const p = lineAt(gg, i / 40, sag);
    d += (i ? "L" : "M") + p.x.toFixed(1) + " " + p.y.toFixed(1);
  }
  return d;
}

// ───────────────────────────────── garments ────────────────────────────────────
const SHAPES = {
  tee: (w, h) => `M${-w * 0.5} 0 L${-w * 0.2} 0 Q0 ${h * 0.1} ${w * 0.2} 0 L${w * 0.5} 0 L${w * 0.62} ${h * 0.26} L${w * 0.38} ${h * 0.34} L${w * 0.36} ${h} L${-w * 0.36} ${h} L${-w * 0.38} ${h * 0.34} L${-w * 0.62} ${h * 0.26}Z`,
  briefs: (w, h) => `M${-w * 0.5} 0 L${w * 0.5} 0 L${w * 0.46} ${h * 0.34} Q${w * 0.18} ${h * 0.42} ${w * 0.12} ${h * 0.72} L${-w * 0.12} ${h * 0.72} Q${-w * 0.18} ${h * 0.42} ${-w * 0.46} ${h * 0.34}Z`,
  trousers: (w, h) => `M${-w * 0.42} 0 L${w * 0.42} 0 L${w * 0.46} ${h} L${w * 0.08} ${h} L0 ${h * 0.3} L${-w * 0.08} ${h} L${-w * 0.46} ${h}Z`,
  towel: (w, h) => `M${-w * 0.45} 0 L${w * 0.45} 0 L${w * 0.45} ${h * 0.92} Q0 ${h * 0.98} ${-w * 0.45} ${h * 0.92}Z`,
  socks: (w, h) => `M${-w * 0.42} 0 L${-w * 0.12} 0 L${-w * 0.12} ${h * 0.6} Q${-w * 0.12} ${h * 0.8} ${-w * 0.3} ${h * 0.8} L${-w * 0.46} ${h * 0.8} Q${-w * 0.52} ${h * 0.66} ${-w * 0.42} ${h * 0.56}Z M${w * 0.12} 0 L${w * 0.42} 0 L${w * 0.42} ${h * 0.56} Q${w * 0.52} ${h * 0.66} ${w * 0.46} ${h * 0.8} L${w * 0.3} ${h * 0.8} Q${w * 0.12} ${h * 0.8} ${w * 0.12} ${h * 0.6}Z`,
  slip: (w, h) => `M${-w * 0.3} 0 L${w * 0.3} 0 L${w * 0.26} ${h * 0.3} L${w * 0.5} ${h} L${-w * 0.5} ${h} L${-w * 0.26} ${h * 0.3}Z`,
  longsleeve: (w, h) => `M${-w * 0.42} 0 L${-w * 0.16} 0 Q0 ${h * 0.09} ${w * 0.16} 0 L${w * 0.42} 0 L${w * 0.6} ${h * 0.86} L${w * 0.46} ${h * 0.9} L${w * 0.34} ${h * 0.4} L${w * 0.34} ${h} L${-w * 0.34} ${h} L${-w * 0.34} ${h * 0.4} L${-w * 0.46} ${h * 0.9} L${-w * 0.6} ${h * 0.86}Z`,
};
const KIND_BY_RULE = { "env-file": "briefs", credentials: "briefs", "private-key": "briefs", "shell-history": "socks", "git-dir": "slip", "db-dump": "trousers", "backup-file": "trousers", "source-map": "longsleeve", "agent-config": "socks", "config-file": "towel", "inline-secret": "tee", "node-modules": "towel", "ds-store": "socks" };
const SHORT = {
  "git-dir": () => "repo + history", "db-dump": () => "database dump", "backup-file": () => "backup copy", "source-map": () => "original source",
  "agent-config": () => "agent settings", "private-key": () => "private key", "shell-history": () => "shell history", "config-file": () => "host config",
  "inline-secret": (f) => (f.secrets[0]?.provider ?? "API").split(/[ /]/)[0] + " key in JS", "ds-store": () => "file listing",
};
const kindForFile = (p) => (/\.html?$/.test(p) ? "tee" : /\.(m?js|tsx?|jsx|css)$/.test(p) ? "trousers" : /\.(json|md|txt|toml|ya?ml)$/.test(p) ? "socks" : "towel");
const shortPath = (p, n) => {
  if (p.length <= n) return p;
  const base = p.split("/").filter(Boolean).pop() + (p.endsWith("/") ? "/" : "");
  if (base.length + 2 <= n) return "…/" + base;
  return base.slice(0, Math.ceil(n / 2) - 1) + "…" + base.slice(-(Math.floor(n / 2) - 1));
};

/** Turn one host's report into what hangs on the line (capped), most telling first. */
function garmentsFor(rep, cap) {
  const fateOf = new Map(rep.fates.map((f) => [f.path, f.fate]));
  const flagged = rep.findings.filter((f) => f.severity !== "INFO" || f.rule === "node-modules").map((f) => {
    const isDir = f.path.endsWith("/");
    const fate = isDir ? (rep.fates.some((x) => x.path.startsWith(f.path) && x.fate === "public") ? "public" : "uploaded") : fateOf.get(f.path) ?? "public";
    const secret = f.secrets[0]?.name;
    const what = f.rule === "env-file" || f.rule === "credentials" ? secret ?? f.title : SHORT[f.rule]?.(f) ?? f.title;
    const more = f.rule === "env-file" && f.secrets.length > 1 ? ` +${f.secrets.length - 1}` : "";
    const n = f.secrets.length;
    const tiny = { "database dump": "db dump", "original source": "source", "agent settings": "agent cfg", "repo + history": "repo", "backup copy": "backup", "shell history": "history" }[what] ?? (f.rule === "inline-secret" ? "key in JS" : what);
    const whatS = f.rule === "env-file" || f.rule === "credentials" ? (n > 1 ? `${n} keys` : n ? "1 key" : "env") : tiny;
    let line2, line2s;
    if (f.rule === "node-modules") line2 = line2s = "dependencies";
    else if (fate === "uploaded") (line2 = "BUILD MACHINE · " + what + more), (line2s = "BUILD · " + whatS);
    else if (f.severity === "LEAK") (line2 = "PUBLIC · " + what + more), (line2s = "PUBLIC · " + whatS);
    else (line2 = "RISK · " + what), (line2s = "RISK · " + whatS);
    return { path: f.path, kind: KIND_BY_RULE[f.rule] ?? "towel", sev: f.rule === "node-modules" ? "INFO" : f.severity, fate, line2, line2s };
  });
  const covered = (p) => rep.findings.some((f) => f.path === p || (f.path.endsWith("/") && p.startsWith(f.path)));
  const plainFiles = rep.fates.filter((x) => x.fate !== "home" && !covered(x.path)).sort((a, b) => a.path.split("/").length - b.path.split("/").length || a.path.localeCompare(b.path));
  const order = { LEAK: 0, RISK: 1, INFO: 2 };
  flagged.sort((a, b) => order[a.sev] - order[b.sev]);
  const nFlag = Math.min(flagged.length, Math.max(cap - 2, Math.ceil(cap * 0.7)));
  const pick = flagged.slice(0, nFlag);
  const room = cap - pick.length;
  const normals = plainFiles.slice(0, room).map((x) => ({ path: x.path, kind: kindForFile(x.path), sev: "OK", fate: x.fate }));
  // interleave so the scarlet ones are spread along the street
  const line = [];
  const a = [...pick], b = [...normals];
  while (a.length || b.length) {
    if (b.length && (line.length % 2 === 0 || !a.length)) line.push(b.shift());
    if (a.length) line.push(a.shift());
  }
  const hidden = flagged.length - pick.length + plainFiles.length - normals.length;
  if (hidden > 0) line.push({ path: `+${hidden} more`, kind: "socks", sev: "MORE", fate: "public", line2: flagged.length > pick.length ? `${flagged.length - pick.length} flagged` : "files" });
  return line;
}

const NORMAL_FILLS = [C.linen, C.salmon, C.green, C.linen];
function drawGarment(layer, gm, i, gw, land) {
  const g = svgEl("g", { class: "garment" + (gm.sev === "LEAK" && gm.fate === "public" ? " leak" : ""), "data-path": gm.path }, layer);
  const w = gm.kind === "socks" ? gw * 0.7 : gm.kind === "briefs" ? gw * 0.8 : gw * (0.86 + 0.1 * ((i * 7) % 3) / 2);
  const h = gm.kind === "briefs" ? w * 0.9 : gm.kind === "socks" ? w * 1.2 : gm.kind === "trousers" || gm.kind === "longsleeve" || gm.kind === "slip" ? w * 1.35 : w * 1.05;
  let fill, stroke = C.ink, pattern = null;
  if (gm.fate === "uploaded") fill = C.indigo;
  else if (gm.sev === "LEAK") fill = C.scarlet;
  else if (gm.sev === "RISK") { fill = C.linen; pattern = "url(#stripes)"; }
  else if (gm.sev === "MORE") fill = C.slate;
  else fill = NORMAL_FILLS[i % NORMAL_FILLS.length];
  const body = svgEl("g", { class: "body" }, g);
  svgEl("path", { d: SHAPES[gm.kind](w, h), fill, stroke, "stroke-width": 1.6, "stroke-linejoin": "round" }, body);
  if (pattern) svgEl("path", { d: SHAPES[gm.kind](w, h), fill: pattern, stroke: "none" }, body);
  if (gm.kind === "briefs" && gm.sev === "LEAK") svgEl("path", { d: `M${-w * 0.07} ${h * 0.2} a${w * 0.07} ${w * 0.07} 0 1 1 ${w * 0.14} 0 l${-w * 0.03} ${h * 0.16} h${-w * 0.08}z`, fill: C.ink, opacity: 0.85 }, body);
  if (gm.kind === "towel" && gm.sev === "OK") for (const yy of [0.72, 0.8]) svgEl("line", { x1: -w * 0.45, x2: w * 0.45, y1: h * yy, y2: h * yy, stroke: fill === C.green ? C.linen : C.terra, "stroke-width": 2 }, body);
  // two wooden pegs
  const pegs = svgEl("g", { class: "pegs", opacity: 0 }, g);
  for (const px of [-w * 0.32, w * 0.32]) {
    svgEl("rect", { x: px - 2.6, y: -9, width: 5.2, height: 17, rx: 1.6, fill: C.peg, stroke: C.ink, "stroke-width": 1 }, pegs);
    svgEl("line", { x1: px - 2.6, x2: px + 2.6, y1: -1, y2: -1, stroke: C.ink, "stroke-width": 0.8 }, pegs);
  }
  // care label: hangs plumb on a thread from the hem, in one of three rows so names never collide
  const lab = svgEl("g", { class: "label" }, L.labels);
  const thread = svgEl("line", { class: "thread" });
  L.labels.prepend(thread); // every thread under every label: a long thread never crosses a neighbour's tag
  const fs = land ? 11 : 9.5;
  const clip = (s, n) => (s.length <= n ? s : s.slice(0, n - 1) + "…");
  const t1 = shortPath(gm.path, land ? 21 : 15);
  const l2 = land || !gm.line2s || gm.line2.length <= 19 ? gm.line2 : gm.line2s;
  const t2 = l2 ? clip(l2, land ? 28 : 21) : null;
  const lw = Math.max(t1.length, t2 ? t2.length * 0.92 : 0) * fs * 0.61 + 12;
  const lh = t2 ? fs * 2.6 + 4 : fs * 1.6 + 2;
  const flagged = gm.sev === "LEAK" || gm.sev === "RISK" || gm.fate === "uploaded";
  svgEl("rect", { x: -lw / 2, y: 0, width: lw, height: lh, rx: 2, fill: C.linen, stroke: flagged ? (gm.fate === "uploaded" ? C.indigo : C.scarlet) : C.ink, "stroke-width": flagged ? 1.6 : 0.9 }, lab);
  const tx = svgEl("text", { x: 0, y: fs * 1.2, "text-anchor": "middle", class: "lab1", "font-size": fs }, lab);
  tx.textContent = t1;
  let flip = null;
  if (t2) {
    flip = svgEl("g", { class: "flip" }, lab);
    svgEl("rect", { x: -lw / 2 + 2, y: fs * 1.5, width: lw - 4, height: fs * 1.15 + 2, fill: gm.fate === "uploaded" ? C.indigo : gm.sev === "LEAK" ? C.scarlet : gm.sev === "RISK" ? C.ink : C.slate }, flip);
    const tt = svgEl("text", { x: 0, y: fs * 2.45, "text-anchor": "middle", class: "lab2", "font-size": fs * 0.92 }, flip);
    tt.textContent = t2;
  }
  return { el: g, w, h, pegs, flip, lab, thread, lh };
}

// ───────────────────────────────── scene ───────────────────────────────────────
const svg = $("#alley");
let L = {}; // layers

function buildScene() {
  const hero = $(".hero");
  // decide landscape first: the stage's height depends on it
  hero.classList.toggle("land", hero.clientWidth / innerHeight > 1.15 && hero.clientWidth >= 1180);
  const W = svg.clientWidth || hero.clientWidth, H = svg.clientHeight;
  const g = (state.geo = layout(W, H));
  hero.classList.toggle("land", g.land);
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.replaceChildren();
  const defs = svgEl("defs", {}, svg);
  const pat = svgEl("pattern", { id: "stripes", width: 9, height: 9, patternUnits: "userSpaceOnUse", patternTransform: "rotate(90)" }, defs);
  svgEl("rect", { width: 4, height: 9, fill: C.scarlet }, pat);
  const weave = svgEl("pattern", { id: "weave", width: 10, height: 8, patternUnits: "userSpaceOnUse" }, defs);
  svgEl("rect", { width: 10, height: 8, fill: C.peg }, weave);
  svgEl("path", { d: "M0 4 Q2.5 0 5 4 T10 4", fill: "none", stroke: C.ink, "stroke-opacity": 0.35, "stroke-width": 1 }, weave);
  svgEl("path", { d: "M0 8 Q2.5 4 5 8 T10 8", fill: "none", stroke: C.linen, "stroke-opacity": 0.35, "stroke-width": 1 }, weave);
  const brick = svgEl("pattern", { id: "brick", width: 22, height: 12, patternUnits: "userSpaceOnUse" }, defs);
  svgEl("rect", { width: 22, height: 12, fill: "#a8502f" }, brick);
  svgEl("path", { d: "M0 0.5H22M0 6.5H22M11 0.5V6.5M0.5 6.5V12M21.5 6.5V12", stroke: C.salmon, "stroke-opacity": 0.55, "stroke-width": 1 }, brick);

  svgEl("rect", { width: W, height: H, fill: C.sky }, svg);
  // thin high clouds, linen at low alpha — just enough to read as sky
  const r = rng(7);
  for (let i = 0; i < 4; i++) {
    const cx = g.lt + (g.rt - g.lt) * (0.15 + 0.7 * r()), cy = H * (0.15 + 0.5 * r()), cw = 60 + 120 * r();
    svgEl("path", { d: `M${cx - cw} ${cy} Q${cx - cw / 2} ${cy - 9} ${cx} ${cy - 3} T${cx + cw} ${cy}`, stroke: C.linen, "stroke-opacity": 0.45, "stroke-width": 5, fill: "none", "stroke-linecap": "round" }, svg);
  }
  L.far = svgEl("g", { class: "far" }, svg);
  L.sheet = svgEl("g", { class: "sheet" }, svg);
  drawFacade(g, "left");
  drawFacade(g, "right");
  L.ropes = svgEl("g", {}, svg);
  L.topRope = svgEl("path", { class: "rope", fill: "none" }, L.ropes);
  L.mainRope = svgEl("path", { class: "rope", fill: "none" }, L.ropes);
  L.mainTwist = svgEl("path", { class: "twist", fill: "none" }, L.ropes);
  L.topTwist = svgEl("path", { class: "twist", fill: "none" }, L.ropes);
  if (g.far) L.farRope = svgEl("path", { class: "rope thin", fill: "none", d: linePath(g, 10, g.far.a, g.far.b) }, L.far);
  drawBalcony(g);
  L.labels = svgEl("g", {}, svg);
  L.garments = svgEl("g", {}, svg);
  drawSheet(g);
  if (g.far) drawFarLine(g);
  placeOverlays(g);
}

function drawFacade(g, side) {
  const { W, H } = g;
  const left = side === "left";
  const grp = svgEl("g", { class: "facade " + side }, svg);
  const edge = left ? [[0, 0], [g.lt, 0], [g.lb, H], [0, H]] : [[W, 0], [g.rt, 0], [g.rb, H], [W, H]];
  svgEl("path", { d: "M" + edge.map((p) => p.join(" ")).join("L") + "Z", fill: left ? C.terra : C.salmon }, grp);
  const clip = svgEl("clipPath", { id: "clip-" + side }, svg.querySelector("defs"));
  svgEl("path", { d: "M" + edge.map((p) => p.join(" ")).join("L") + "Z" }, clip);
  const inner = svgEl("g", { "clip-path": `url(#clip-${side})` }, grp);
  const r = rng(left ? 11 : 23);
  const x0 = (y) => (left ? 0 : g.xR(y)), x1 = (y) => (left ? g.xL(y) : W);
  // weathered plaster: patches a shade off, and a few where the brick shows through
  for (let i = 0; i < 9; i++) {
    const y = H * r(), x = x0(y) + (x1(y) - x0(y)) * r(), s = 30 + 70 * r();
    const pts = [];
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2, rr = s * (0.6 + 0.5 * r());
      pts.push([x + Math.cos(a) * rr * 1.3, y + Math.sin(a) * rr * 0.7]);
    }
    svgEl("path", { d: "M" + pts.map((p) => p.map((v) => v.toFixed(1)).join(" ")).join("L") + "Z", fill: i % 3 === 0 ? C.linen : C.ink, "fill-opacity": i % 3 === 0 ? 0.1 : 0.06 }, inner);
  }
  const keepOut = state.keepOut?.[side] ?? [];
  const hits = (x, y, s) => keepOut.some((k) => x + s * 1.3 > k.x && x - s * 1.3 < k.x + k.w && y + s > k.y && y - s < k.y + k.h);
  for (let i = 0, tries = 0; i < 2 && tries < 30; tries++) {
    const y = H * (0.12 + 0.75 * r()), x = x0(y) + (x1(y) - x0(y)) * (0.2 + 0.55 * r()), s = 40 + 30 * r();
    if (hits(x, y, s)) continue;
    i++;
    const pts = [];
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2, rr = s * (0.55 + 0.45 * r());
      pts.push([x + Math.cos(a) * rr * 1.25, y + Math.sin(a) * rr * 0.62]);
    }
    const d = "M" + pts.map((p) => p.map((v) => v.toFixed(1)).join(" ")).join("L") + "Z";
    svgEl("path", { d, fill: C.linen, "fill-opacity": 0.28, transform: "translate(-3 -3)" }, inner);
    svgEl("path", { d, fill: "url(#brick)", stroke: C.ink, "stroke-opacity": 0.25 }, inner);
  }
  // stone string course at each floor
  const floors = g.land ? [0.2, 0.5, 0.8] : [0.25, 0.58];
  for (const f of floors) {
    const y = H * f;
    svgEl("path", { d: `M${x0(y)} ${y}L${x1(y)} ${y}L${x1(y + 7)} ${y + 7}L${x0(y + 7)} ${y + 7}Z`, fill: C.linen, "fill-opacity": 0.32 }, inner);
  }
  // windows with green shutters, laid out in the same perspective as the edges
  const rows = g.land ? [0.035, 0.27, 0.57, 0.86] : [0.08, 0.36, 0.66];
  const cols = left ? [0.3, 0.72] : [0.28, 0.7];
  let n = 0;
  for (const fy of rows) for (const fx of cols) {
    const y = H * fy;
    const span = x1(y) - x0(y);
    if (span < 40) continue;
    const ww = Math.min(span * 0.22, 64), wh = Math.min(H * 0.105, ww * 1.6);
    const cx = x0(y) + span * fx;
    const box = { x: cx - ww, y, w: ww * 2, h: wh };
    if (keepOut.some((k) => box.x < k.x + k.w && box.x + box.w > k.x && box.y < k.y + k.h && box.y + box.h > k.y)) continue;
    drawWindow(inner, cx, y, ww, wh, n++ % 3 === 1);
  }
}
function drawWindow(parent, cx, y, ww, wh, closed) {
  const g = svgEl("g", { class: "window" }, parent);
  svgEl("rect", { x: cx - ww / 2 - 4, y: y - 4, width: ww + 8, height: wh + 8, fill: C.linen, "fill-opacity": 0.35 }, g);
  svgEl("rect", { x: cx - ww / 2, y, width: ww, height: wh, fill: C.ink, "fill-opacity": 0.82 }, g);
  svgEl("line", { x1: cx, x2: cx, y1: y, y2: y + wh, stroke: C.linen, "stroke-opacity": 0.3 }, g);
  const sw = ww / 2;
  const leaf = (x, w) => {
    svgEl("rect", { x, y, width: w, height: wh, fill: C.green, stroke: C.ink, "stroke-width": 1 }, g);
    for (let k = 1; k < 10; k++) svgEl("line", { x1: x + 2, x2: x + w - 2, y1: y + (wh * k) / 10, y2: y + (wh * k) / 10, stroke: C.ink, "stroke-opacity": 0.45, "stroke-width": 1 }, g);
  };
  if (closed) { leaf(cx - ww / 2, sw); leaf(cx, sw); }
  else { leaf(cx - ww / 2 - sw * 0.9, sw * 0.85); leaf(cx + ww / 2 + sw * 0.05, sw * 0.85); }
  svgEl("rect", { x: cx - ww / 2 - 6, y: y + wh + 3, width: ww + 12, height: 4, fill: C.ink, "fill-opacity": 0.5 }, g);
}

function drawBalcony(g) {
  const { H } = g;
  const b = g.basket;
  const grp = svgEl("g", { class: "balcony" }, svg);
  const x0 = g.land ? b.x - 0.04 * g.W : 0;
  const x1 = g.A.x + 10;
  // slab, iron railing, the post carrying the pulley
  svgEl("rect", { x: x0, y: g.balY, width: x1 - x0, height: 9, fill: C.linen, stroke: C.ink, "stroke-width": 1.2 }, grp);
  svgEl("rect", { x: x0 + 6, y: g.balY + 9, width: x1 - x0 - 12, height: 5, fill: C.ink, "fill-opacity": 0.35 }, grp);
  if (g.wallPulley) svgEl("path", { d: `M${g.A.x - 14} ${g.A.y - 12} L${g.A.x} ${g.A.y} M${g.A.x - 14} ${g.A.y + 12} L${g.A.x} ${g.A.y}`, stroke: C.ink, "stroke-width": 3 }, grp);
  else svgEl("line", { x1: g.A.x, x2: g.A.x, y1: g.A.y, y2: g.balY, stroke: C.ink, "stroke-width": 3 }, grp);
  L.basketPile = svgEl("g", {}, grp);
  // basket: woven body + rim
  const bx = b.x, by = b.y, bw = b.w, bh = b.h;
  L.basket = svgEl("g", { class: "basket" }, grp);
  svgEl("path", { d: `M${bx} ${by + bh * 0.18} L${bx + bw} ${by + bh * 0.18} L${bx + bw * 0.9} ${by + bh} L${bx + bw * 0.1} ${by + bh}Z`, fill: "url(#weave)", stroke: C.ink, "stroke-width": 1.4 }, L.basket);
  svgEl("rect", { x: bx - 3, y: by + bh * 0.1, width: bw + 6, height: bh * 0.12, rx: 4, fill: C.peg, stroke: C.ink, "stroke-width": 1.4 }, L.basket);
  L.basketCount = svgEl("text", { x: bx + bw / 2, y: by + bh * 0.66, "text-anchor": "middle", class: "basket-count" }, L.basket);
  const rail = svgEl("g", {}, grp);
  const ry = g.balY - (g.land ? 0.075 * H : 0.06 * H);
  svgEl("line", { x1: x0, x2: x1, y1: ry, y2: ry, stroke: C.ink, "stroke-width": 2.4 }, rail);
  for (let x = x0 + 8; x < x1; x += 13) {
    if (x > bx - 2 && x < bx + bw + 2) continue; // basket sits in front
    svgEl("line", { x1: x, x2: x, y1: ry, y2: g.balY, stroke: C.ink, "stroke-width": 1.4 }, rail);
  }
  // pulley wheel
  svgEl("circle", { cx: g.A.x, cy: g.A.y, r: 9, fill: C.peg, stroke: C.ink, "stroke-width": 2 }, grp);
  svgEl("circle", { cx: g.A.x, cy: g.A.y, r: 2.4, fill: C.ink }, grp);
  // the hook on the far wall
  svgEl("path", { d: `M${g.B.x + 10} ${g.B.y - 6} L${g.B.x} ${g.B.y} `, stroke: C.ink, "stroke-width": 3, fill: "none" }, grp);
  for (const p of [g.top.a, g.top.b]) svgEl("circle", { cx: p.x, cy: p.y, r: 3.5, fill: C.ink }, grp);
}

function drawSheet(g) {
  const s = L.sheet;
  const a = g.top.a, b = g.top.b;
  const cx = (a.x + b.x) / 2;
  const sw = Math.min((b.x - a.x) * (g.land ? 0.82 : 0.86), g.land ? 600 : 420);
  const sh = g.land ? Math.min(g.H * 0.2, sw * 0.36) : sw * 0.4;
  L.sheetGeo = { cx, sw, sh, y: lineAt({ ...g, A: a, B: b }, 0.5, 12).y };
  L.sheetPath = svgEl("path", { fill: C.linen, stroke: C.ink, "stroke-width": 1.4 }, s);
  L.sheetHem = svgEl("path", { fill: "none", stroke: C.terra, "stroke-width": 2.2, "stroke-dasharray": "1 0" }, s);
  L.sheetText = svgEl("text", { x: cx, y: L.sheetGeo.y + sh * 0.7, "text-anchor": "middle", class: "sheet-word", "font-size": sh * 0.74 }, s);
  L.sheetText.textContent = "airing";
  L.sheetPegs = svgEl("g", {}, s);
  for (const f of [-0.42, 0, 0.42]) {
    const x = cx + sw * f, y = L.sheetGeo.y;
    svgEl("rect", { x: x - 3, y: y - 10, width: 6, height: 19, rx: 1.8, fill: C.peg, stroke: C.ink, "stroke-width": 1 }, L.sheetPegs);
  }
}
function updateSheet(t) {
  const { cx, sw, sh, y } = L.sheetGeo;
  const wind = reduce.matches ? 0 : Math.sin(t * 0.8) * 0.6 + Math.sin(t * 1.9 + 1) * 0.4;
  const pts = [];
  const N = 14;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const amp = reduce.matches ? 0 : 5 + 4 * wind;
    pts.push([cx - sw / 2 + sw * u + wind * 6 * Math.sin(u * 3), y + sh + amp * Math.sin(u * 9 + t * 2.4) * (0.4 + u * 0.6)]);
  }
  const left = `M${cx - sw / 2} ${y} L${cx + sw / 2} ${y} Q${cx + sw / 2 + wind * 6} ${y + sh / 2} ${pts[N][0]} ${pts[N][1]}`;
  let bottom = "";
  for (let i = N - 1; i >= 0; i--) bottom += ` L${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
  L.sheetPath.setAttribute("d", left + bottom + ` Q${cx - sw / 2 + wind * 4} ${y + sh / 2} ${cx - sw / 2} ${y}Z`);
  let hem = `M${pts[0][0]} ${pts[0][1] - 7}`;
  for (let i = 1; i <= N; i++) hem += ` L${pts[i][0].toFixed(1)} ${(pts[i][1] - 7).toFixed(1)}`;
  L.sheetHem.setAttribute("d", hem);
  L.sheetText.setAttribute("transform", `translate(${(wind * 3).toFixed(2)} 0) skewX(${(-wind * 2.2).toFixed(2)})`);
  const td = linePath(state.geo, 12 + wind * 1.5, state.geo.top.a, state.geo.top.b);
  L.topRope.setAttribute("d", td);
  L.topTwist.setAttribute("d", td);
}

function drawFarLine(g) {
  // a neighbour's line further up: tiny everyday laundry, for depth
  L.farItems = [];
  const gg = { ...g, A: g.far.a, B: g.far.b };
  const kinds = ["socks", "tee", "towel", "socks", "briefs", "tee"];
  const fills = [C.linen, C.salmon, C.linen, C.green, C.linen, C.salmon];
  kinds.forEach((k, i) => {
    const t = 0.14 + i * 0.145;
    const p = lineAt(gg, t, 10);
    const grp = svgEl("g", {}, L.far);
    svgEl("path", { d: SHAPES[k](24, k === "socks" ? 28 : 26), fill: fills[i], stroke: C.ink, "stroke-width": 1, "stroke-opacity": 0.6 }, grp);
    L.farItems.push({ el: grp, p, ph: i * 1.7 });
  });
}

// overlays (HTML) are positioned from the same geometry
function placeOverlays(g) {
  const hero = $(".hero");
  const set = (sel, x, y, w) => {
    const e = $(sel, hero);
    if (!e) return;
    if (!g.land) { e.style.cssText = ""; return; }
    e.style.left = x + "px"; e.style.top = y + "px"; if (w) e.style.width = w + "px";
  };
  const { W, H } = g;
  set(".plaque", 0.026 * W, 0.19 * H, Math.min(0.245 * W, 372));
  set(".drop", g.basket.x - 0.03 * W, g.balY + 22, 0.2 * W);
  set(".hosts", g.xR(0.17 * H) + 0.035 * W, 0.17 * H, W - g.xR(0.17 * H) - 0.05 * W);
  set(".verdict", g.xR(0.6 * H) + 0.02 * W, 0.6 * H, W - g.xR(0.6 * H) - 0.035 * W);
  // keep windows out from behind the overlays (measured after layout)
  if (g.land && !state.keepOutDone) {
    state.keepOutDone = true;
    const hr = hero.getBoundingClientRect();
    const box = (sel) => { const r = $(sel, hero).getBoundingClientRect(); return { x: r.left - hr.left - 12, y: r.top - hr.top - 12, w: r.width + 24, h: r.height + 24 }; };
    const bal = { x: 0, y: g.basket.y - 16, w: g.A.x + 20, h: g.balY - g.basket.y + 34 };
    state.keepOut = { left: [box(".plaque"), box(".drop"), bal], right: [box(".hosts"), box(".verdict")] };
    buildScene();
    rehang(true);
  }
}

// ───────────────────────────────── physics ─────────────────────────────────────
function rehang(instant = false) {
  const g = state.geo;
  const rep = state.report?.deployments[0];
  L.garments.replaceChildren();
  L.labels.replaceChildren();
  if (!rep) { state.garments = []; return; }
  const list = garmentsFor(rep, g.cap);
  const n = list.length;
  state.garments = list.map((gm, i) => {
    const d = drawGarment(L.garments, gm, i, g.gw, g.land);
    const ti = n === 1 ? 0.5 : 0.1 + (0.82 * i) / Math.max(1, n - 1);
    return { ...gm, ...d, ti, row: i % 3, p: instant ? 1 : 0, delay: instant ? 0 : 0.18 + (n - 1 - i) * 0.22, theta: 0, omega: 0, pegged: instant, flipAt: null, prevX: null };
  });
  state.hMax = Math.max(...state.garments.map((x) => x.h)) * 0.85;
  state.rowGap = (g.land ? 11 : 9.5) * 2.6 + 12;
  // labels hang in three straight rows under the lowest point of the line
  state.labelBase = Math.max(g.A.y, g.B.y) + state.hMax + 16;
  // farthest garment goes out first, so the line fills from the far wall back
  state.sagTarget = SAG0() + n * (g.land ? 4.2 : 3.2) + rep.findings.filter((f) => f.severity === "LEAK").length * 1.5;
  if (instant) {
    state.sag = state.sagTarget;
    for (const gm of state.garments) { gm.pegs.setAttribute("opacity", 1); if (gm.flip) gm.flip.classList.add("up"); }
  }
  updateBasket(rep);
}
function updateBasket(rep) {
  L.basketPile.replaceChildren();
  const home = rep.totals.home;
  const b = state.geo.basket;
  const r = rng(home + 3);
  const lumps = Math.min(6, Math.ceil(home / 2));
  for (let i = 0; i < lumps; i++) {
    const x = b.x + b.w * (0.14 + 0.72 * (i / Math.max(1, lumps - 1))), y = b.y + b.h * (0.16 - 0.1 * r());
    svgEl("ellipse", { cx: x, cy: y, rx: b.w * 0.11, ry: b.h * 0.12, fill: C.slate, stroke: C.ink, "stroke-width": 1 }, L.basketPile);
  }
  L.basketCount.textContent = home ? `${home} stay home` : "nothing kept back";
}

function pathPoint(gm, p) {
  // basket → up the post to the pulley → out along the line
  const g = state.geo;
  const b = { x: g.basket.x + g.basket.w * 0.6, y: g.basket.y + g.basket.h * 0.2 };
  const split = 0.22;
  if (p < split) {
    const u = p / split;
    return { x: b.x + (g.A.x - b.x) * u, y: b.y + (g.A.y + 6 - b.y) * u, slope: 0 };
  }
  const u = ((p - split) / (1 - split)) * gm.ti;
  const q = lineAt(g, u, state.sag);
  const q2 = lineAt(g, Math.min(1, u + 0.01), state.sag);
  return { x: q.x, y: q.y, slope: Math.atan2(q2.y - q.y, q2.x - q.x) };
}
const ease = (x) => 1 - Math.pow(1 - x, 3);

let last = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - (last || now)) / 1000);
  last = now;
  state.t += dt;
  step(dt);
  if (!reduce.matches || state.busy) requestAnimationFrame(frame);
}
function step(dt) {
  const g = state.geo;
  if (!g) return;
  const t = state.t;
  const still = reduce.matches;
  // the line: a damped spring toward the sag its load asks for
  const target = state.sagTarget ?? SAG0();
  if (still) state.sag = target;
  else {
    state.sagV += (-(state.sag - target) * 30 - state.sagV * 5.5) * dt;
    state.sag += state.sagV * dt;
  }
  const md = linePath(g, state.sag);
  L.mainRope.setAttribute("d", md);
  L.mainTwist.setAttribute("d", md);
  updateSheet(t);
  if (L.farItems) for (const f of L.farItems) f.el.setAttribute("transform", `translate(${f.p.x} ${f.p.y}) rotate(${still ? 0 : (Math.sin(t * 1.3 + f.ph) * 4).toFixed(2)})`);
  for (const gm of state.garments) {
    if (gm.reel) {
      gm.p = Math.max(0, gm.p - dt * 2.2 * (gm.reelSpeed ?? 1));
    } else if (gm.delay > 0) {
      gm.delay -= dt;
    } else if (gm.p < 1) {
      gm.p = still ? 1 : Math.min(1, gm.p + dt / (0.55 + gm.ti * 0.9));
      if (gm.p >= 1 && !gm.pegged) {
        gm.pegged = true;
        gm.omega += still ? 0 : 2.4 * (gm.sev === "LEAK" ? 1.4 : 1);
        gm.pegs.setAttribute("opacity", 1);
        if (gm.flip) gm.flipAt = t + 0.25;
        state.sagV += still ? 0 : 26;
      }
    }
    if (gm.flipAt && t >= gm.flipAt) { gm.flip.classList.add("up"); gm.flipAt = null; }
    const q = pathPoint(gm, gm.reel ? gm.p : ease(gm.p));
    // pendulum: gravity back to plumb, damping, wind; travelling drags it backwards
    const vx = gm.prevX == null ? 0 : (q.x - gm.prevX) / Math.max(dt, 1e-3);
    gm.prevX = q.x;
    if (!still) {
      const wind = 0.55 * Math.sin(t * 0.9 + gm.ti * 5) + 0.35 * Math.sin(t * 2.1 + gm.ti * 11) + (Math.sin(t * 0.23) > 0.85 ? 0.9 : 0);
      const alpha = -9 * Math.sin(gm.theta) - 2.2 * gm.omega + (gm.pegged ? wind * 0.9 : 0) - vx * 0.004;
      gm.omega += alpha * dt;
      gm.theta += gm.omega * dt;
      gm.theta = Math.max(-0.5, Math.min(0.5, gm.theta));
    } else gm.theta = 0;
    const tilt = gm.pegged ? q.slope * 0.8 : 0;
    const deg = ((gm.theta * (gm.pegged ? 0.32 : 1) + tilt) * 180) / Math.PI;
    gm.el.setAttribute("transform", `translate(${q.x.toFixed(1)} ${(q.y + 1).toFixed(1)}) rotate(${deg.toFixed(2)})`);
    gm.el.style.opacity = gm.p < 0.04 && !gm.pegged ? "0" : "1";
    const rad = (deg * Math.PI) / 180;
    const bx = q.x - Math.sin(rad) * gm.h * 0.82, by = q.y + 1 + Math.cos(rad) * gm.h * 0.82;
    const ly = state.labelBase + state.sag + (gm.row ?? 0) * state.rowGap;
    const lx = bx + (still ? 0 : Math.sin(t * 1.1 + gm.ti * 7) * 1.5);
    gm.lab.setAttribute("transform", `translate(${lx.toFixed(1)} ${ly.toFixed(1)})`);
    gm.thread.setAttribute("x1", bx.toFixed(1)); gm.thread.setAttribute("y1", by.toFixed(1));
    gm.thread.setAttribute("x2", lx.toFixed(1)); gm.thread.setAttribute("y2", ly.toFixed(1));
    const show = gm.pegged ? "1" : "0";
    if (gm.lab.style.opacity !== show) { gm.lab.style.opacity = show; gm.thread.style.opacity = show; }
  }
}

// ───────────────────────────────── the scanner, wired in ───────────────────────
async function run(host, { instant = false } = {}) {
  state.busy = true;
  const tree = state.tree;
  const rep = await scan(tree, { host, dir: state.dir === "." ? undefined : state.dir });
  // reel the old laundry back into the basket first
  const old = state.garments.filter((gm) => gm.p > 0);
  if (old.length && !reduce.matches && !instant) {
    old.forEach((gm, i) => { gm.reel = true; gm.reelSpeed = 1.6 + i * 0.12; gm.pegged = false; gm.pegs.setAttribute("opacity", 0); gm.flip?.classList.remove("up"); });
    state.sagTarget = SAG0();
    await new Promise((r) => setTimeout(r, 620));
  }
  state.host = host;
  state.report = rep;
  rehang(instant || reduce.matches);
  renderText(rep);
  if (reduce.matches) step(0);
  state.busy = false;
  if (reduce.matches) requestAnimationFrame(frame);
}

function renderText(rep) {
  const d = rep.deployments[0];
  const leaks = d.findings.filter((f) => f.severity === "LEAK");
  const risks = d.findings.filter((f) => f.severity === "RISK");
  const secrets = leaks.reduce((s, f) => s + Math.max(1, f.secrets.length), 0);
  const uploaded = d.fates.some((f) => f.fate === "uploaded") && d.totals.public === 0;
  const v = $(".verdict");
  v.classList.toggle("bad", leaks.length > 0);
  v.classList.toggle("ok", !leaks.length && !risks.length);
  const big = $(".verdict .big"), small = $(".verdict .small"), keep = $(".verdict .keep");
  const keys = leaks.reduce((n, f) => n + f.secrets.length, 0);
  const bare = leaks.filter((f) => !f.secrets.length);
  const one = bare.length === 1 ? SHORT[bare[0].rule]?.(bare[0]) ?? bare[0].title : "";
  const things = bare.length === 1 ? (/^[aeiou]/i.test(one) ? "an " : "a ") + one : `${bare.length} other files`;
  if (leaks.length && keys && bare.length) big.textContent = `${keys} key${keys === 1 ? "" : "s"} and ${things}, out on the line`;
  else if (leaks.length && keys) big.textContent = `${keys} key${keys === 1 ? "" : "s"} out on the line`;
  else if (leaks.length) big.textContent = `${bare.length === 1 ? things : bare.length + " private files"}, out on the line`;
  else if (uploaded && risks.length) big.textContent = `nothing served — ${risks.length} ride to the build machine`;
  else if (risks.length) big.textContent = `no keys hung out — ${risks.length} thing${risks.length === 1 ? "" : "s"} to look at`;
  else big.textContent = "nothing secret on the line";
  const dir = d.deployment.dir === "." ? "." : d.deployment.dir;
  small.innerHTML = "";
  const cmd = document.createElement("code");
  cmd.textContent = HOSTS[d.deployment.host].command.replace("<dir>", dir).replace("[dir]", dir === "." ? "" : dir).replace(/\s+\(.*/, "");
  const chip = (t) => { const e = document.createElement("span"); e.className = "nb"; e.textContent = t; return e; };
  const runs = document.createElement("span"); runs.className = "runs"; runs.append("$ ", cmd);
  // one unbreakable count line (no dangling "·" when the panel is narrow), then the command the host runs
  small.append(chip(`${d.totals.public + d.totals.uploaded} files ${uploaded ? "uploaded" : "public"} · ${d.totals.home} stay${d.totals.home === 1 ? "s" : ""} home`), runs);
  small.title = d.hostName;
  keep.textContent = d.remedy?.say ? "keep it home: " + d.remedy.say : "";
  const saved = $(".verdict .saved");
  const sv = d.savedByHost.map((x) => x.path);
  saved.textContent = sv.length ? `the host kept in the basket: ${sv.slice(0, 4).join(", ")}${sv.length > 4 ? ` +${sv.length - 4}` : ""}` : "";
  const src = $(".verdict .src");
  src.href = HOSTS[d.deployment.host].source;
  for (const b of document.querySelectorAll(".hosts button")) b.setAttribute("aria-pressed", String(b.dataset.host === d.deployment.host));
  $("#live").textContent = `${d.hostName}: ${big.textContent}. ${leaks.map((f) => f.path).join(", ")}`;
  const pre = $("#cli-out");
  if (pre) pre.textContent = `$ airing ${state.sample ? "swarm-landing" : state.tree.name} --host ${d.deployment.host}${dir !== "." ? " --dir " + dir : ""}\n\n` + formatScan(rep, plain, { root: state.sample ? "swarm-landing" : state.tree.name });
  fitVerdict();
  const label = $("#tree-name");
  if (label) label.textContent = state.sample ? "the sample project (a Vite app, deployed from its root)" : `“${state.tree.name}” — ${state.tree.files.length.toLocaleString()} files, read in this tab only`;
}

// host tags
function buildHosts() {
  const box = $(".hosts .tags");
  const short = { "cf-pages": "CF Pages", "cf-workers": "CF Workers", vercel: "Vercel", netlify: "Netlify", firebase: "Firebase", "github-pages": "GitHub Pages", "gh-pages": "gh-pages npm" };
  HOST_IDS.forEach((id, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.host = id;
    b.style.setProperty("--tilt", `${[-3, 2, -1.5, 3, -2.5, 1.5, -2][i]}deg`);
    b.textContent = short[id];
    b.title = HOSTS[id].name + " — " + HOSTS[id].skips;
    b.addEventListener("click", () => { if (!state.busy && id !== state.host) run(id); });
    box.append(b);
  });
}

// dropping a folder into the basket
function wireDrop() {
  const hero = $(".hero");
  const input = $("#pick");
  let depth = 0;
  hero.addEventListener("dragenter", (e) => { e.preventDefault(); depth++; hero.classList.add("dragging"); });
  hero.addEventListener("dragleave", () => { if (--depth <= 0) { depth = 0; hero.classList.remove("dragging"); } });
  hero.addEventListener("dragover", (e) => e.preventDefault());
  hero.addEventListener("drop", async (e) => {
    e.preventDefault();
    depth = 0;
    hero.classList.remove("dragging");
    const { root, files } = await readDropped(e.dataTransfer.items);
    await useFolder(root, files);
  });
  input.addEventListener("change", async () => {
    const list = [...input.files];
    if (!list.length) return;
    const root = list[0].webkitRelativePath.split("/")[0] || "your folder";
    await useFolder(root, list.slice(0, MAX_DROP).map((file) => ({ path: file.webkitRelativePath.split("/").slice(1).join("/") || file.name, file })));
    input.value = "";
  });
  $(".drop .reset").addEventListener("click", () => {
    state.tree = memTree("swarm-landing", SAMPLE); state.sample = true; state.dir = ".";
    $(".drop").classList.remove("mine");
    run("cf-pages");
  });
}
async function useFolder(root, files) {
  if (!files.length) return;
  state.tree = fileTree(root, files);
  state.sample = false;
  // let airing pick the host and dir from the folder's own config, as the CLI does
  const auto = await scan(state.tree, {});
  const first = auto.matrix ? null : auto.deployments[0];
  state.dir = first ? first.deployment.dir : ".";
  $(".drop").classList.add("mine");
  $(".drop .name").textContent = root;
  if (auto.matrix) {
    // no config: hang it for the host that would expose the most
    const worst = [...auto.deployments].sort((a, b) => b.findings.filter((f) => f.severity === "LEAK").length - a.findings.filter((f) => f.severity === "LEAK").length)[0];
    await run(worst.deployment.host);
  } else await run(first.deployment.host);
}

// copy buttons: the hero command, plus a peg-coloured "copy" on every code block
for (const pre of document.querySelectorAll("pre.code")) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "peg-copy"; b.textContent = "copy";
  b.dataset.copy = pre.textContent.split("\n").filter((l) => !l.startsWith("// ")).join("\n").replace(/^# after your build step\n/, "");
  b.setAttribute("aria-label", "copy this snippet");
  pre.append(b);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const t = document.createElement("textarea"); t.value = text; t.setAttribute("readonly", ""); t.style.cssText = "position:fixed;opacity:0";
    document.body.append(t); t.select(); const ok = document.execCommand("copy"); t.remove(); return ok;
  }
}
for (const b of document.querySelectorAll("[data-copy]")) {
  b.addEventListener("click", async () => {
    const ok = await copyText(b.dataset.copy);
    b.classList.toggle("done", ok); b.textContent = ok ? "pegged ✓" : "select + ⌘C";
    clearTimeout(b._t); b._t = setTimeout(() => { b.classList.remove("done"); b.textContent = "copy"; }, 1800);
  });
}

// the care-label table: every cell is hostFilter() deciding a real path
function careLabels() {
  const table = $("#care");
  if (!table) return;
  const paths = [".env", ".env.production", ".env.local", ".dev.vars", ".git/config", "node_modules/x/index.js", "assets/app.js.map", ".DS_Store"];
  const heads = [".env", ".env.production", ".env.local", ".dev.vars", ".git/", "node_modules/", "*.map", ".DS_Store"];
  const thead = table.createTHead().insertRow();
  const th0 = document.createElement("th"); th0.textContent = "host"; thead.append(th0);
  for (const h of heads) { const th = document.createElement("th"); th.scope = "col"; th.innerHTML = `<code>${h}</code>`; thead.append(th); }
  const tb = table.createTBody();
  const rows = HOST_IDS.flatMap((id) => (id === "vercel" ? [[id, "Vercel (static)", { vercelStatic: true }], [id, "Vercel (with a build)", { vercelStatic: false }]] : [[id, HOSTS[id].name, {}]]));
  for (const [id, name, opts] of rows) {
    const tr = tb.insertRow();
    const th = document.createElement("th"); th.scope = "row";
    th.innerHTML = `<a href="${HOSTS[id].source}">${name}</a>`;
    tr.append(th);
    const f = hostFilter(id, { opts });
    for (const p of paths) {
      const r = f(p);
      const td = tr.insertCell();
      td.className = r.fate;
      td.innerHTML = r.fate === "public" ? "<span>on the line</span>" : r.fate === "uploaded" ? "<span>uploaded</span>" : "<span>basket</span>";
      td.title = r.why ?? (r.fate === "public" ? "served at a public URL" : "");
    }
  }
}

// shutters open as their window scrolls into view
function shutters() {
  const wins = document.querySelectorAll(".win");
  if (reduce.matches || !("IntersectionObserver" in window)) { wins.forEach((w) => w.classList.add("open")); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("open"); io.unobserve(e.target); } }), { threshold: 0.6 });
  wins.forEach((w) => io.observe(w));
}

// ───────────────────────────────── boot ────────────────────────────────────────
// ?poster renders the share image (og.png / social-preview.png) from the live scene
if (new URLSearchParams(location.search).has("poster")) document.documentElement.classList.add("poster");
buildHosts();
wireDrop();
careLabels();
shutters();
buildScene();
await run("cf-pages", { instant: reduce.matches });
requestAnimationFrame(frame);
let rz;
addEventListener("resize", () => {
  clearTimeout(rz);
  rz = setTimeout(() => { state.keepOutDone = false; state.keepOut = null; buildScene(); rehang(true); if (reduce.matches) step(0); }, 180);
});
reduce.addEventListener?.("change", () => { rehang(true); requestAnimationFrame(frame); });


// Between floors: a real washing line, strung wall to wall, sagging as a catenary.
// Each floor hangs what it is about; the scarlet pair only appears where something is public.
const FLOOR_WASH = {
  hosts: [["tee", "linen", "index.html"], ["socks", "slate", "basket"], ["towel", "linen", "app.js"]],
  before: [["sheet", "linen", "DENIED"], ["socks", "slate", ".env stays"]],
  after: [["towel", "linen", "/index.html"], ["briefs", "scarlet", "/.env 200"], ["tee", "linen", "/app.js"]],
  ci: [["towel", "linen", "dist/"], ["socks", "slate", "fail-on: leak"]],
  foot: [["towel", "linen", "README"], ["sheet", "linen", "CIAO"], ["socks", "slate", "MIT"]],
};
const WASH = {
  tee: "M-17 0 L-7 0 Q0 5 7 0 L17 0 L26 9 L19 15 L14 11 L14 34 L-14 34 L-14 11 L-19 15 L-26 9Z",
  socks: "M-14 0 L-5 0 L-5 22 Q-5 28 -11 28 L-17 28 Q-19 23 -14 20Z M5 0 L14 0 L14 20 Q19 23 17 28 L11 28 Q5 28 5 22Z",
  towel: "M-15 0 L15 0 L15 36 L-15 36Z",
  briefs: "M-18 0 L18 0 L16 9 Q6 12 3 24 L-3 24 Q-6 12 -16 9Z",
  sheet: "M-34 0 L34 0 L34 30 L-34 30Z",
};
function floorLines() {
  for (const floor of document.querySelectorAll(".floor + .floor")) {
    const wash = FLOOR_WASH[floor.id] ?? [];
    let svg = floor.querySelector(":scope > svg.floor-line");
    if (!svg) { svg = document.createElementNS(NS, "svg"); svg.setAttribute("class", "floor-line"); svg.setAttribute("aria-hidden", "true"); floor.prepend(svg); }
    const wall = Math.round(innerWidth * (innerWidth <= 720 ? 0.04 : 0.07));
    const W = Math.max(240, floor.clientWidth - 2 * wall);
    svg.style.left = wall + "px"; svg.setAttribute("width", W);
    const H = 78, sag = Math.min(30, W * 0.03);
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("height", H);
    svg.replaceChildren();
    const y = (x) => 4 + sag * (1 - Math.cosh((x / W - 0.5) * 2.4) / Math.cosh(1.2)) / (1 - 1 / Math.cosh(1.2));
    let d = "M0 4";
    for (let x = 8; x <= W; x += 8) d += ` L${x.toFixed(1)} ${y(x).toFixed(1)}`;
    svgEl("path", { d, fill: "none", stroke: C.ink, "stroke-width": 1.6 }, svg);
    svgEl("path", { d, fill: "none", stroke: C.peg, "stroke-width": 1, "stroke-dasharray": "2 3" }, svg);
    const step = W / (wash.length + 1);
    wash.forEach(([kind, col, tag], i) => {
      const x = step * (i + 1) + (i % 2 ? 14 : -10);
      const g = svgEl("g", { class: "wash", transform: `translate(${x.toFixed(1)} ${y(x).toFixed(1)}) scale(${W > 900 ? 1.45 : 1})`, style: `--d:${(i * 0.7).toFixed(1)}s` }, svg);
      const sw = svgEl("g", { class: "sway" }, g);
      svgEl("path", { d: WASH[kind], fill: C[col], stroke: C.ink, "stroke-width": 1.2, "stroke-linejoin": "round" }, sw);
      if (kind === "sheet") { const t = svgEl("text", { x: 0, y: 20, "text-anchor": "middle", class: "rope-word" }, sw); t.textContent = tag; }
      else if (W < 600 && col === "scarlet") { const t = svgEl("text", { x: 0, y: 40, "text-anchor": "middle", class: "rope-tag hot" }, sw); t.textContent = tag; }
      else if (W >= 600) { const t = svgEl("text", { x: kind === "briefs" ? 24 : 22, y: kind === "briefs" ? 14 : 18, class: "rope-tag" + (col === "scarlet" ? " hot" : "") }, sw); t.textContent = tag; }
      for (const px of kind === "sheet" ? [-26, 26] : [-9, 9]) svgEl("rect", { x: px - 2.4, y: -7, width: 4.8, height: 13, rx: 1.4, fill: C.peg, stroke: C.ink, "stroke-width": 0.9 }, g);
    });
  }
}
floorLines();
let ropeT;
addEventListener("resize", () => { clearTimeout(ropeT); ropeT = setTimeout(floorLines, 150); });

// the verdict panel grows with the report: in the wide layout, lift it so it never runs into the street
function fitVerdict() {
  const hero = $(".hero"), v = $(".verdict"), hosts = $(".hosts");
  if (!hero?.classList.contains("land") || !state.geo) return;
  const H = state.geo.H, base = 0.6 * H;
  const floorTop = hosts.offsetTop + hosts.offsetHeight + 34;
  const top = Math.max(floorTop, Math.min(base, H - v.offsetHeight - 18));
  v.style.top = top + "px";
  // and keep the plaque off the basket on short screens
  const pl = $(".plaque"), g = state.geo;
  if (g.basket) {
    const want = Math.min(0.19 * H, g.basket.y - 14 - pl.offsetHeight);
    pl.style.top = Math.max(0.08 * H, want) + "px";
  }
}
addEventListener("resize", () => requestAnimationFrame(fitVerdict));
