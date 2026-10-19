**airing** tells you which `.env`, `.git`, keys and source maps your host would publish — before your coding agent deploys, and after the site is live. It reads the folder the way each host's CLI really does (`wrangler`, `vercel`, `netlify`, `firebase`, `gh-pages`, `upload-pages-artifact`, `surge`), ported from their source and cross-checked in CI. It prints names, sizes and 8-character SHA-256 fingerprints — never a value.

### New in v0.2.0: Surge, the eighth host
- `--host surge` and the all-host matrix: what `surge <dir> <domain>` would publish. Rules are ported from the Surge CLI's own source (surge 0.45 / surge-stream 0.23 `getFiles` + `ignorer`): `.git`, every dotfile and dot-directory, `*.*~`, `node_modules` and `bower_components` stay home, but `backup.sql`, keys and `*.map` ship.
- `.surgeignore` is read the way Surge reads it, including `!` re-includes — a `!.env` line puts your `.env` back on the line, and airing flags it. Fixes and remedies name `.surgeignore`.
- Cross-checked in CI: the real `surge-ignore@0.3.0` list through the `ignore` library with a verbatim copy of the surge-stream walker, against four `.surgeignore` variants (none, `!.env`, `!.well-known`, `!.git`).
- `airing guard`, the Claude Code hook and `package.json` script detection recognise `surge <dir> <domain>`, `surge publish <dir>`, `surge -p <dir> -d <domain>` and bare `surge`, and skip `surge list|teardown|login…`.
- The all-host matrix stays within 120 columns with 8 hosts (long labels shorten as `dist/…/index-8f3a.js (1 secret)`).
- Landing: a Surge sign and a Surge row in the rules table; docs and README host tables updated; demo GIF re-recorded.

### Everything else (since v0.1.0)
- `airing [dir]`: the real upload set for Cloudflare Pages, Cloudflare Workers assets, Vercel, Netlify, Firebase Hosting, GitHub Pages (Actions), gh-pages and Surge, auto-detected from config, `package.json` scripts and workflows. Each finding comes with one fix in the host's own terms.
- `airing probe <url>` (soft-404 aware, content-validated), `airing guard -- <deploy cmd>`, `airing hook` (Claude Code `PreToolUse`), `airing mcp` (read-only: `scan_deploy`, `probe_url`, `host_rules`), GitHub Action `Blackman99/airing@v0`.
- Exit codes: `0` clean, `1` would leak or is leaking, `2` usage or I/O error.

### Install
Not on the npm registry yet.
```bash
npx github:Blackman99/airing .
npm i -g https://github.com/Blackman99/airing/releases/latest/download/airing.tgz
```
Node 18.17+. Site, live demo and docs: https://blackman99.github.io/airing/
