---
# hurl-vscode-i1zz
title: Bootstrap language server (Node/TypeScript) — MVP
status: in-progress
type: feature
priority: P0
created_at: 2026-02-23T17:25:11Z
updated_at: 2026-02-23T17:25:11Z
---

Scaffold a Node/TypeScript LSP server and client using vscode-languageserver / vscode-languageclient. Reuse bundled `tree-sitter-hurl.wasm` for parsing. Files: `src/server.ts`, `src/client.ts`, modify `src/extension.ts` to start client, add tests. Deliverable: basic diagnostics, hover, completions, CodeLens run actions. Estimated 1–2 weeks.
