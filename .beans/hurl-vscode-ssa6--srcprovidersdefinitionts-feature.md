---
# hurl-vscode-ssa6
title: '`src/providers/definition.ts` (feature)'
status: completed
type: feature
priority: high
created_at: 2026-02-24T22:55:36Z
updated_at: 2026-02-24T22:58:55Z
parent: hurl-vscode-3ywc
---

Go-to-definition provider: jump from `{{var}}` usages to `[Captures]` definition in the same document; support file path jumps for `file,<path>` values.

## Summary of Changes

- Created `src/test/definition.test.ts` (4 tests)
- Created `src/providers/definition.ts` with `getDefinition(uri, text, line, col): Location | null`
- Walks ancestor chain to find `variable_name` node, then resolves via `getCaptures`/`getEntries`
- Returns null for undefined variables and non-variable positions
- 98 unit tests passing total
