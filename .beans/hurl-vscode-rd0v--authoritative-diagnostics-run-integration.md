---
# hurl-vscode-rd0v
title: Authoritative diagnostics & run integration
status: scrapped
type: feature
priority: P1
created_at: 2026-02-23T17:25:16Z
updated_at: 2026-02-24T23:02:06Z
---

Integrate authoritative diagnostics and run-by-entry. Decide binary strategy (bundle @orangeopensource/hurl vs require system binary). Implement runner helpers to spawn `hurl --from-entry/--to-entry --json` and map errors/asserts to LSP Diagnostics and Problems. Provide CodeLens 'Run Entry' that shows results via TextDocumentContentProvider or Webview, add decorations/gutter pass-fail indicators, and workspace consent gating for network runs. Files: src/run.ts, extend src/server.ts, modify package.json for postinstall/binary handling, integration tests to verify Problems mapping.
