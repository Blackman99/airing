import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";

const alnum = (n: number) => {
  const cs = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(randomBytes(n), (b) => cs[b % cs.length]).join("");
};
/** Secret-shaped values are generated at test time so no key-like string is ever committed. */
export const fake = {
  google: () => "AIza" + alnum(35),
  openai: () => "sk-proj-" + alnum(64),
  stripe: () => "sk_" + "live_" + alnum(28),
  anthropic: () => "sk-ant-api03-" + alnum(90),
};

export function writeTree(files: Record<string, string | Buffer>): string {
  const root = mkdtempSync(join(tmpdir(), "airing-"));
  for (const [p, c] of Object.entries(files)) {
    const abs = join(root, p);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, c);
  }
  return root;
}

/** The $90k shape: a Vite app whose project root gets deployed. */
export function vibeApp(extra: Record<string, string | Buffer> = {}) {
  const google = fake.google();
  const openai = fake.openai();
  const stripe = fake.stripe();
  const root = writeTree({
    ".env": `# local\nGOOGLE_API_KEY=${google}\nOPENAI_API_KEY="${openai}"\nVITE_APP_TITLE=Swarm Dashboard\nDATABASE_URL=postgres://app:hunter2hunter2@db.internal:5432/app\n`,
    ".env.example": "GOOGLE_API_KEY=\nOPENAI_API_KEY=your-key-here\n",
    ".dev.vars": `STRIPE_SECRET_KEY=${stripe}\n`,
    ".gitignore": ".env\n.dev.vars\nnode_modules\ndist\n",
    ".git/HEAD": "ref: refs/heads/main\n",
    ".git/config": "[core]\n\trepositoryformatversion = 0\n[remote \"origin\"]\n\turl = https://github.com/me/swarm.git\n",
    ".git/objects/ab/cdef0123": Buffer.alloc(300, 1),
    ".DS_Store": Buffer.concat([Buffer.from([0, 0, 0, 1]), Buffer.from("Bud1"), Buffer.alloc(64)]),
    "node_modules/left-pad/index.js": "module.exports = (s) => s;\n",
    "src/main.js": "console.log('hi')\n",
    "index.html": "<!doctype html><title>swarm</title><script type=module src=/src/main.js></script>\n",
    "package.json": JSON.stringify({ name: "swarm", scripts: { build: "vite build", dev: "vite" } }),
    "dist/index.html": "<!doctype html><title>swarm</title><script type=module src=/assets/index-3f2a.js></script>\n",
    "dist/assets/index-3f2a.js": `const k="${google}";fetch("https://generativelanguage.googleapis.com/?key="+k);\n//# sourceMappingURL=index-3f2a.js.map\n`,
    "dist/assets/index-3f2a.js.map": JSON.stringify({ version: 3, sources: ["../src/main.js", "../src/gemini.js"], sourcesContent: ["console.log('hi')", `export const KEY = "${google}";`], mappings: "AAAA" }),
    "backup.sql": "CREATE TABLE users (id int, email text);\nINSERT INTO users VALUES (1, 'a@b.c');\n",
    ".claude/settings.local.json": JSON.stringify({ permissions: { allow: ["Bash(npx wrangler pages deploy:*)"] } }),
    ...extra,
  });
  return { root, google, openai, stripe };
}
