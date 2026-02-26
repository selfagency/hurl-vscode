---
# hurl-vscode-3ywc
title: Core LSP Providers
status: in-progress
type: epic
priority: critical
created_at: 2026-02-24T22:58:48Z
updated_at: 2026-02-25T21:14:02Z
parent: hurl-vscode-48s3
---

## Todo

- [x] `src/analysis.ts` — tree-sitter init, parse, AST utilities, lookup tables
- [x] `src/providers/diagnostics.ts` — syntax errors, method casing, undefined vars
- [x] `src/providers/completions.ts` — context-aware completions
- [x] `src/providers/hover.ts` — hover docs for methods, queries, filters, predicates
- [x] `src/providers/semanticTokens.ts` — migrate from extension.ts
- [x] `src/providers/codeLens.ts` — Run/Run All per entry
- [x] `src/providers/symbols.ts` — document + workspace symbols
- [x] `src/providers/definition.ts` — go-to-definition for variables and file paths
- [x] `src/providers/references.ts` — find all references
- [x] `src/providers/highlights.ts` — document highlights
- [ ] `src/providers/rename.ts` — variable rename
- [ ] `src/providers/folding.ts` — folding ranges
- [ ] `src/providers/formatting.ts` — format/range-format/on-type-format
- [ ] `src/providers/codeActions.ts` — quick fixes
- [ ] `src/providers/links.ts` — document links
- [ ] `src/providers/signatureHelp.ts` — query signatures
- [ ] `src/providers/index.ts` — barrel exports
- [ ] Wire `src/server.ts` with full capabilities + all providers
- [ ] Unit tests for each provider
