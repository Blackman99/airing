// The sample project on the landing page's line (and in the README / demo GIF).
const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
// A vibe-coded Vite app deployed from its project root, like the one in the
// $90k Gemini thread. Key-shaped values are made up at runtime so nothing
// key-like is committed to this repo.
const rand = (n, abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789") => {
  let s = "";
  const r = rng(42 + n);
  for (let i = 0; i < n; i++) s += abc[Math.floor(r() * abc.length)];
  return s;
};
const FAKE = {
  google: "AIza" + "Sy" + rand(33, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-"),
  openai: "sk-" + "proj-" + rand(64),
  stripe: "sk_" + "live_" + rand(40),
};
export const SAMPLE = {
  ".env": `# local only!!\nVITE_APP_TITLE=Swarm\nGOOGLE_API_KEY=${FAKE.google}\nOPENAI_API_KEY=${FAKE.openai}\nSTRIPE_SECRET_KEY=${FAKE.stripe}\nDATABASE_URL=postgres://swarm:${rand(14)}@db.swarm.dev:5432/prod\n`,
  ".env.example": "GOOGLE_API_KEY=\nOPENAI_API_KEY=\n",
  ".gitignore": "node_modules\n.env\ndist\n",
  ".git/HEAD": "ref: refs/heads/main\n",
  ".git/config": "[remote \"origin\"]\n\turl = https://github.com/swarm/landing.git\n",
  ".git/index": "x".repeat(18_000),
  ".git/objects/pack/pack-9c1e.pack": "x".repeat(410_000),
  ".claude/settings.local.json": '{ "permissions": { "allow": ["Bash(wrangler pages deploy:*)"] } }\n',
  ".DS_Store": "x".repeat(6148),
  "README.md": "# Swarm\n",
  "index.html": "<!doctype html><title>Swarm</title><div id=root></div>",
  "package.json": '{ "name": "swarm", "scripts": { "build": "vite build", "deploy": "wrangler pages deploy ." } }',
  "vite.config.ts": "export default {}\n",
  "src/main.tsx": "import App from './App'\n",
  "src/App.tsx": "export default function App() { return null }\n",
  "public/favicon.svg": "<svg xmlns='http://www.w3.org/2000/svg'/>",
  "dist/index.html": "<!doctype html><script type=module src=/assets/index-8f3a.js></script>",
  "dist/assets/index-8f3a.js": `const g="${FAKE.google}";fetch("https://generativelanguage.googleapis.com/v1beta/models?key="+g);\n//# sourceMappingURL=index-8f3a.js.map\n`,
  "dist/assets/index-8f3a.js.map": JSON.stringify({ version: 3, sources: ["../src/App.tsx"], sourcesContent: ["export default function App() { /* the whole app */ }"], mappings: "AAAA" }),
  "backup.sql": "-- pg_dump\nCREATE TABLE users (email text, stripe_customer text);\nINSERT INTO users VALUES ('a@b.co','cus_1');\n",
  "node_modules/react/index.js": "module.exports = {}\n".repeat(300),
  "node_modules/vite/package.json": '{"name":"vite"}',
};
