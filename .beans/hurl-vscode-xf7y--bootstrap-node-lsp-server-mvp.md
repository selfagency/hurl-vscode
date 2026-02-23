---
# hurl-vscode-xf7y
title: Bootstrap Node LSP server (MVP)
status: todo
type: feature
priority: P0
created_at: 2026-02-23T17:25:09Z
updated_at: 2026-02-23T17:25:09Z
---

Scaffold a Node/TypeScript language server using vscode-languageserver and a client using vscode-languageclient. Use existing tree-sitter-hurl.wasm via web-tree-sitter for parsing. Implement basic features: text sync, diagnostics (syntax), hover (doc snippets), simple completions, CodeLens for run actions. Files to add/modify: src/server.ts, src/client.ts, modify src/extension.ts to start language client, add package.json contributions, add basic unit/integration tests.
