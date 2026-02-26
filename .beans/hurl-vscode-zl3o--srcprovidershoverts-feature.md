---
# hurl-vscode-zl3o
title: '`src/providers/hover.ts` (feature)'
status: completed
type: feature
priority: high
created_at: 2026-02-24T22:55:24Z
updated_at: 2026-02-26T17:01:00Z
parent: hurl-vscode-3ywc
---

Implement hover provider: method node descriptions, query/filter/predicate documentation, option_key descriptions, variable definition locations, HTTP status descriptions. Use nodeAtPosition from `analysis.ts` and return markdown formatted content.

## Summary of Changes

- Created `src/test/hover.test.ts` (12 tests, TDD Red phase first)
- Created `src/providers/hover.ts` with `getHover(text, line, col): Hover | null`

### Implementation strategy

Walk the ancestor chain from the node at cursor position, checking for:

- `method` node → HTTP method description markdown
- `variable_name` node → "Defined at line N" using `getCaptures` / `getEntries`, or "Undefined variable"
- `status` node → HTTP status code description when in response line context; query type hover when in `[Asserts]` context (disambiguated via `getCurrentSection`)
- `key_string` with `parent.type === 'option'` → option key description

Text-based fallback for query types, filters, and predicates: the grammar emits anonymous keyword nodes whose `.text` matches the lookup table keys. When node is a leaf (`childCount === 0`) and text matches a known keyword in the current section context ([Asserts]/[Captures]/[Options]), return the relevant hover.

All 64 unit tests pass (12 new hover tests + 52 existing).
