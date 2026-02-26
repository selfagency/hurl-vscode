---
# hurl-vscode-3ywc
title: Core LSP Providers
status: completed
type: epic
priority: critical
created_at: 2026-02-24T22:58:48Z
updated_at: 2026-02-26T22:05:00Z
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
- [x] `src/providers/rename.ts` — variable rename
- [x] `src/providers/folding.ts` — folding ranges
- [ ] `src/providers/formatting.ts` — format/range-format/on-type-format (deferred)
- [x] `src/providers/codeActions.ts` — quick fixes
- [x] `src/providers/links.ts` — document links
- [x] `src/providers/signatureHelp.ts` — query signatures
- [x] `src/providers/index.ts` — barrel exports
- [x] Wire `src/server.ts` with full capabilities + all providers
- [x] Unit tests for each provider

## Summary of Changes

Implemented 14 LSP providers (all except `formatting.ts`, deferred) as pure functions in `src/providers/`, each with a dedicated unit test file. 128 unit tests passing.

### Providers delivered

| File | Description |
| --- | --- |
| `diagnostics.ts` | Syntax errors, HTTP method casing, undefined variable warnings |
| `completions.ts` | Context-aware completions for methods, queries, filters, predicates, options, variables |
| `hover.ts` | Hover docs for methods, query types, filters, predicates, option keys, variables |
| `semanticTokens.ts` | Full semantic token encoding using tree-sitter-hurl highlights query |
| `codeLens.ts` | ▶ Run / ▶ Run All lenses per entry |
| `symbols.ts` | Hierarchical document symbols (entry → section → capture) |
| `definition.ts` | Go-to-definition for variables and relative file paths |
| `references.ts` | All `{{var}}` usages with optional declaration inclusion |
| `highlights.ts` | Document highlights: Read (usages) / Write (captures) |
| `rename.ts` | Rename all usages + capture definition |
| `folding.ts` | Folding ranges for entries, responses, and all section types |
| `codeActions.ts` | Quick-fix for lowercase HTTP method diagnostic |
| `links.ts` | Document links for `file,<path>;` body references |
| `signatureHelp.ts` | Signature help for query expressions in `[Asserts]`/`[Captures]` |
| `index.ts` | Barrel re-exports for all providers |

### server.ts

Rewrote `src/server.ts` to wire all providers to a full-capability LSP connection using `TextDocuments<TextDocument>` (added `vscode-languageserver-textdocument@1.0.11` as direct dev dependency). Capabilities declared: completions, hover, semanticTokens, codeLens, documentSymbols, definition, references, documentHighlights, rename, foldingRanges, codeActions, documentLinks, signatureHelp, diagnostics (push).

### Key implementation notes

- `web-tree-sitter` v0.26: uses `new Query(language, source)` constructor — `language.query()` does not exist
- `links.ts`: hurl grammar uses `filename` node (inside `oneline_file`), not `file_value`
- `signatureHelp.ts`: added `textSectionMatch` text-based backward scan fallback for incomplete lines that produce ERROR nodes, preventing `getCurrentSection` from returning the correct section
- `symbols.ts`: sections are nested under `response` inside `entry` — requires `findDescendants` not `findChildren`
