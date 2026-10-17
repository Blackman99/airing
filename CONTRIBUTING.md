# Contributing

Thanks for helping keep people's laundry indoors.

```bash
npm ci
npm test          # unit, CLI, probe and upstream cross-check tests
npm run build     # dist/ and site/app.js are committed — rebuild before you push
```

## Ground rules

- **Host rules come from source, not docs.** If you change what a host uploads, link the upstream line in `src/hosts.ts` and add (or extend) a cross-check in `test/upstream.test.ts` that runs the real library or a verbatim copy of its walker.
- **Never print a value.** Findings carry names, sizes, a shape like `AIza…(39 chars)` and an 8-char SHA-256 fingerprint. Tests assert that values never appear in output.
- **No key-shaped strings in the repo.** Fixtures build fake keys at runtime (`test/helpers.ts`), so push protection and scanners stay quiet.
- **Probe is GET-only** and must stay polite: one request per path, a clear User-Agent, no crawling.

## Layout

| path | what |
| --- | --- |
| `src/hosts.ts` | each host's upload filter |
| `src/detect.ts` | config + command parsing → deployments |
| `src/rules.ts`, `src/providers.ts` | what counts as LEAK / RISK |
| `src/scan.ts` | per-deployment report and the one remedy |
| `src/probe.ts` | live-site probe |
| `src/cli.ts`, `src/mcp.ts`, `src/action.ts` | entry points |
| `site/`, `site-src/` | landing page (the scanner runs in the browser) and docs |
