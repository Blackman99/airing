**airing** tells you which `.env`, `.git`, keys and source maps your host would publish — before your coding agent deploys, and after the site is live. It reads the folder the way each host's CLI really does (`wrangler`, `vercel`, `netlify`, `firebase`, `gh-pages`, `upload-pages-artifact`), ported from their source and cross-checked in CI. It prints names, sizes and 8-character SHA-256 fingerprints — never a value.

Why now: one agent-deployed `.env` on Cloudflare Pages turned into a [$90k Gemini bill](https://x.com/JustLingonberry/status/2110824346168238204). `wrangler pages deploy .` uploads `.env`, Workers assets ship `.git/`, Vercel skips `.env.local` but not `.env`, and none of them read `.gitignore`.

### In v0.1.0
- `airing [dir]`: the real upload set for Cloudflare Pages, Cloudflare Workers assets, Vercel, Netlify, Firebase Hosting, GitHub Pages (Actions) and gh-pages. It detects host and deploy dir from wrangler / netlify / firebase / vercel config, `package.json` scripts and workflows, and shows an all-host matrix when nothing is configured. Each finding comes with one fix in the host's own terms (deploy `dist`, `.assetsignore`, `.vercelignore`, `hosting.ignore`).
- Content rules: env files, `.git/`, private keys, cloud credentials, npm/PyPI tokens, DB dumps, source maps with `sourcesContent`, provider keys compiled into bundles, and coding-agent settings (`.claude/`, …).
- `airing probe <url>`: about 40 well-known paths plus the source maps of the page's own scripts. It is soft-404 aware, so an SPA catch-all never counts, and every hit is content-validated.
- `airing guard -- <deploy cmd>`, `airing hook` (Claude Code `PreToolUse` deny with the fix), `airing mcp` (read-only: `scan_deploy`, `probe_url`, `host_rules`).
- GitHub Action `Blackman99/airing@v0`: it annotates files, writes a job summary and outputs `leaks` / `risks` / `json`.
- Exit codes: `0` clean, `1` would leak or is leaking, `2` usage or I/O error.

### Install
Not on the npm registry yet.
```bash
npx github:Blackman99/airing .
npm i -g https://github.com/Blackman99/airing/releases/latest/download/airing.tgz
```
Node 18.17+. Site, live demo and docs: https://blackman99.github.io/airing/
