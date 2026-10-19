# Roadmap

## v0.1 — today
- `airing [dir]`: upload set per host from real CLI semantics — Cloudflare Pages, Workers assets, Vercel, Netlify, Firebase Hosting, GitHub Pages (Actions), gh-pages
- Auto-detects host and deploy dir from wrangler.toml/json(c), netlify.toml, firebase.json, vercel.json/.vercel, package.json scripts and GitHub workflows; all-host matrix when nothing is configured
- `airing probe <url>`: ~40 well-known paths + source maps of the page's scripts, soft-404 aware
- `airing guard -- <deploy cmd>`, `airing hook` (Claude Code PreToolUse), `airing mcp` (read-only), GitHub Action
- Upstream cross-check tests against @vercel/client, glob, tinyglobby, GNU tar and copies of wrangler/netlify walkers

## v0.2
- Old deployments stay live: list Cloudflare Pages `<hash>.<project>.pages.dev` and Vercel preview URLs with the host APIs and probe them too
- Surge: shipped in v0.2.0 (`--host surge`, `.surgeignore`, cross-checked against surge-ignore and the surge-stream walker)
- Render static sites, Azure Static Web Apps, AWS Amplify / `aws s3 sync`
- `--watch` for agents that deploy in a loop

## v0.3
- `airing --fix`: write the `.assetsignore` / `.vercelignore` / `hosting.ignore` lines, or switch the deploy dir, as a reviewable diff
- Framework awareness: which `VITE_` / `NEXT_PUBLIC_` variables end up compiled into the bundle

## v1.0
- Stable JSON schema and SARIF output for code scanning
- Rules versioned per host CLI version, with a CI job that fails when an upstream walker changes
