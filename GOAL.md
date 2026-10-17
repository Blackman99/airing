# Goal

**Tell you — before your agent deploys a site, and after it is live — whether your `.env`, `.git`, keys or source maps are, or would be, publicly downloadable from it.**

## Who it's for

People who let a coding agent (Claude Code, Codex, Cursor, Cline…) build and ship static sites and front-ends to Cloudflare, Vercel, Netlify, Firebase or GitHub Pages, and who would not know which host skips `.env` and which serves it.

## What "done" looks like

- One command answers "what goes public?" for the folder you are about to deploy, per host, using that host CLI's **actual** upload rules (ported from source and cross-checked against the real libraries in CI), not documentation.
- The agent is stopped *before* a leaking deploy runs (Claude Code hook, `guard --`, MCP), with one concrete fix.
- After deploy, a probe confirms what a stranger can download — without false positives on SPA catch-alls.
- It never prints, stores or sends a secret value. Names, sizes and 8-character SHA-256 fingerprints only.

## Not goals

- A general secret scanner for repositories (use gitleaks / trufflehog for history).
- A web vulnerability scanner. The probe only GETs well-known paths on sites you own.
- Fixing your build. airing tells you what to ignore or which directory to deploy; it does not rewrite config (yet — see ROADMAP).
