---
# hurl-vscode-nrjf
title: wasm initialization wasmts reuse task
status: todo
type: task
priority: high
created_at: 2026-02-24T22:54:50Z
updated_at: 2026-02-24T22:58:26Z
parent: hurl-vscode-9i2s
---

Reuse `src/wasm.ts` in the server process; implement reliable path resolution (path.join(__dirname, '../tree-sitter-hurl.wasm')) and ensure parser init on server startup. Add tests for parser initialization.
