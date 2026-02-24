---
# hurl-vscode-tghx
title: Implement tree-sitter parsing in server
status: scrapped
type: feature
priority: P0
created_at: 2026-02-24T21:21:12Z
updated_at: 2026-02-24T23:02:15Z
---

Integrate the bundled `tree-sitter-hurl.wasm` into `src/server.ts` so the server builds a full AST for documents, exposing structured nodes for diagnostics and completions. Ensure wasm loading is performed when the server process starts (not at module import) and add tests.
