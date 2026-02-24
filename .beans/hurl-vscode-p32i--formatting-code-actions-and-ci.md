---
# hurl-vscode-p32i
title: Formatting, code actions, and CI
status: scrapped
type: chore
priority: P2
created_at: 2026-02-23T17:25:28Z
updated_at: 2026-02-24T23:03:35Z
---

Integrate formatting (hurlfmt) and provide code actions/quick-fixes for common parse errors. Add 'Format Document' support using hurlfmt (spawn), implement code actions in LSP server, and add CI workflows to run unit and integration tests and validate binary download if bundling. Files: integrate hurlfmt runner, add CI YAML, tests for code actions and formatting.
