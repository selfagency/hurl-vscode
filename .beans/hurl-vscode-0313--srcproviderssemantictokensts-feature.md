---
# hurl-vscode-0313
title: srcproviderssemantictokensts feature
status: completed
type: task
priority: high
created_at: 2026-02-24T22:55:50Z
updated_at: 2026-02-24T22:59:21Z
parent: hurl-vscode-mpze
---

Migrate semantic token generation from `extension.ts` into the server: reuse highlights query in `src/query.ts`, expose `textDocument/semanticTokens/full` from the server and remove client-side provider registration.

## Summary of Changes

- Created `src/test/semanticTokens.test.ts` (8 tests)
- Created `src/providers/semanticTokens.ts` exporting `getSemanticTokens`, `TOKEN_TYPES`, `TOKEN_MODIFIERS`

### Key implementation details

- `new Query(tree.language, highlights)` — web-tree-sitter v0.26 uses constructor form, not `language.query()`; cached after first call
- `CAPTURE_TO_TYPE` maps highlights capture names to `TOKEN_TYPES` indices; unmapped captures (punctuation, variable) are ignored
- Multi-line tokens split per line (required by LSP encoding)
- Tokens sorted by position then delta-encoded into the 5-int-per-token format
- 72 unit tests passing total
