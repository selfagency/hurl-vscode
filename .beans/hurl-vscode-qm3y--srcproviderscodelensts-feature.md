---
# hurl-vscode-qm3y
title: srcproviderscodelensts feature
status: completed
type: task
priority: normal
created_at: 2026-02-24T22:55:36Z
updated_at: 2026-02-24T22:59:06Z
parent: hurl-vscode-3ywc
---


Implement CodeLens provider: one ▶ Run lens per entry (1-based index, method line), one ▶ Run All at document start.

## Summary of Changes

- Created `src/test/codeLens.test.ts` (10 tests)
- Created `src/providers/codeLens.ts` with `getCodeLenses(uri, text): CodeLens[]`
- Uses `getEntries` from `analysis.ts`; returns empty array for empty/unparseable docs
- 82 unit tests passing total
