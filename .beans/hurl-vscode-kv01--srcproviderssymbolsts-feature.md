---
# hurl-vscode-kv01
title: '`src/providers/symbols.ts` (feature)'
status: completed
type: feature
priority: high
created_at: 2026-02-24T22:55:32Z
updated_at: 2026-02-24T22:59:01Z
parent: hurl-vscode-3ywc
---

Document and workspace symbols: build hierarchical document symbols (entries → sections) and workspace symbols across open `.hurl` files (METHOD URL names).

## Summary of Changes

- Created `src/test/symbols.test.ts` (12 tests)
- Created `src/providers/symbols.ts` with `getDocumentSymbols(text): DocumentSymbol[]`
- Hierarchical: entry (Function) → sections (Namespace) → captures (Variable)
- Sections are found via `findDescendants` (not direct children — sections nest under `response`)
- 94 unit tests passing total
