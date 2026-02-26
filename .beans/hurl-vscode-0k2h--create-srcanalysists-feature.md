---
# hurl-vscode-0k2h
title: Create `src/analysis.ts` (feature)
status: completed
type: feature
priority: normal
created_at: 2026-02-24T22:54:51Z
updated_at: 2026-02-26T22:15:00Z
parent: hurl-vscode-9i2s
---

## Summary of Changes

Delivered as part of epic hurl-vscode-3ywc. `src/analysis.ts` implements tree-sitter parser init (`initParser`), `parse`, `nodeAtPosition`, `getEntries`, `getCaptures`, `getVariableRefs`, `getCurrentSection`, `findDescendants`, and all static lookup tables (HTTP_METHODS, QUERY_TYPES, FILTERS, PREDICATES, OPTION_KEYS, etc.). 257 analysis unit tests passing.
