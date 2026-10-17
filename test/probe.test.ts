import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { probe } from "../src/probe.js";
import { fake } from "./helpers.js";

function serve(handler: (path: string) => { status: number; body: string | Buffer; type?: string } ): Promise<{ url: string; server: Server; hits: string[] }> {
  const hits: string[] = [];
  return new Promise((res) => {
    const server = createServer((req, rsp) => {
      const path = new URL(req.url!, "http://x").pathname;
      hits.push(`${req.method} ${path}`);
      const r = handler(path);
      rsp.writeHead(r.status, { "content-type": r.type ?? "application/octet-stream" });
      rsp.end(r.body);
    }).listen(0, "127.0.0.1", () => {
      const a = server.address() as { port: number };
      res({ url: `http://127.0.0.1:${a.port}/`, server, hits });
    });
  });
}

const INDEX = `<!doctype html><html><head><script type="module" src="/assets/app-1.js"></script></head><body>app</body></html>`;

test("SPA fallback (200 for everything) yields no false positives", async () => {
  const s = await serve((p) => (p === "/assets/app-1.js" ? { status: 200, body: "console.log(1)", type: "text/javascript" } : { status: 200, body: INDEX, type: "text/html" }));
  try {
    const r = await probe(s.url, { timeoutMs: 3000 });
    assert.deepEqual(r.findings, []);
    assert.equal(r.worst, "CLEAN");
    assert.match(r.notFound.note, /SPA fallback/);
    assert.ok(s.hits.every((h) => h.startsWith("GET ")), "GET only");
  } finally {
    s.server.close();
  }
});

test("finds the leaks a real static host would serve, without printing values", async () => {
  const google = fake.google();
  const openai = fake.openai();
  const files: Record<string, string> = {
    "/": INDEX,
    "/.env": `GOOGLE_API_KEY=${google}\nOPENAI_API_KEY=${openai}\nVITE_TITLE=x\n`,
    "/.git/config": "[core]\n\tbare = false\n[remote \"origin\"]\n\turl = https://me:ghp_" + "x".repeat(36) + "@github.com/me/app.git\n",
    "/.git/HEAD": "ref: refs/heads/main\n",
    "/backup.sql": "CREATE TABLE t (a int);",
    "/assets/app-1.js": `fetch("x?key=${openai}");\n//# sourceMappingURL=app-1.js.map`,
    "/assets/app-1.js.map": JSON.stringify({ version: 3, sources: ["a.ts"], sourcesContent: ["export const a = 1"], mappings: "" }),
  };
  const s = await serve((p) => (files[p] !== undefined ? { status: 200, body: files[p], type: p === "/" ? "text/html" : "text/plain" } : { status: 404, body: "not found", type: "text/plain" }));
  try {
    const r = await probe(s.url, { timeoutMs: 3000 });
    const got = r.findings.map((f) => `${f.severity} ${f.rule} ${f.path}`).sort();
    assert.deepEqual(got, ["LEAK db-dump /backup.sql", "LEAK env-file /.env", "LEAK git-dir /.git/config", "LEAK inline-secret /assets/app-1.js", "RISK source-map /assets/app-1.js.map"]);
    const env = r.findings.find((f) => f.path === "/.env")!;
    assert.deepEqual(env.secrets.map((x) => x.name), ["GOOGLE_API_KEY", "OPENAI_API_KEY"]);
    assert.match(r.findings.find((f) => f.rule === "git-dir")!.detail, /embeds a token/);
    const json = JSON.stringify(r);
    assert.ok(!json.includes(google) && !json.includes(openai) && !json.includes("x".repeat(36)));
    assert.equal(r.worst, "LEAK");
  } finally {
    s.server.close();
  }
});

test("unreachable site is an error, not a clean bill", async () => {
  const r = await probe("http://127.0.0.1:9/", { timeoutMs: 1500 });
  assert.ok(r.errors.length >= 1);
  assert.equal(r.findings.length, 0);
});
