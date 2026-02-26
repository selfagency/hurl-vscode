---
# hurl-vscode-bulp
title: Query Builder webview — `src/webview/queryBuilder.ts` (feature)
status: completed
type: feature
priority: normal
created_at: 2026-02-24T22:56:06Z
updated_at: 2026-02-26T22:50:00Z
parent: hurl-vscode-zpbd
branch: feat/zpbd-editor-ux-tools
---

## Summary of Changes

- `src/webview/queryBuilder.utils.ts` — `FLAG_DEFS` (26 flags), `buildHurlArgs`, `generateNonce` (no vscode dep, unit tested)
- `src/webview/queryBuilder.ts` — `openQueryBuilder(context, opts)` creates a webview panel with:
  - Flag builder: `<select>` dropdown + active flag list with inline editing and delete
  - Entry range inputs (pre-populated and editable when called from CodeLens)
  - Live command preview
  - Run via `execFile('hurl', args)` — argument array, no shell injection
  - `--report-json` → parses assertion failures from JSON report
  - ANSI output via `ansi-to-html`
  - Copy command to clipboard
  - CSP with per-request nonce (`default-src 'none'`)
- `src/extension.ts` — `hurl.run` and `hurl.hurl` commands delegate to `openQueryBuilder`
