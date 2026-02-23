---
# hurl-vscode-arbh
title: Authoritative diagnostics & run integration
status: in-progress
type: feature
priority: P1
created_at: 2026-02-23T17:25:18Z
updated_at: 2026-02-23T17:25:18Z
---

Add authoritative diagnostics by spawning the `hurl` binary (`--json`/`--error-format`) and map errors to LSP Diagnostics. Implement run-on-demand CodeLens that executes entries (`--from-entry/--to-entry`) and shows results in a virtual document or Webview. Files: `src/run.ts`, extend `src/server.ts`. Decide binary strategy (bundle vs require). Estimated 1 week.
