---
# hurl-vscode-zpbd
title: Editor UX & Tools (epic)
status: completed
type: epic
priority: normal
created_at: 2026-02-24T22:54:51Z
updated_at: 2026-02-26T22:50:00Z
parent: hurl-vscode-48s3
branch: feat/zpbd-editor-ux-tools
---

## Todo

- [x] `src/fileTree.ts` + `src/fileTree.utils.ts` — HurlFileTreeProvider (t1zi)
- [x] `src/webview/queryBuilder.ts` + `src/webview/queryBuilder.utils.ts` — Query Builder webview (bulp)
- [x] Update `src/extension.ts` — wire file tree, query builder commands, remove client-side semantic tokens
- [x] Update `package.json` — views contribution, command titles
- [x] Unit tests for pure functions

## Summary of Changes

### `src/fileTree.ts` + `src/fileTree.utils.ts`

`HurlFileTreeProvider` implements `vscode.TreeDataProvider<HurlFileItem>`:

- `getChildren()` calls `vscode.workspace.findFiles('**/*.hurl')`, groups results via `groupByDirectory`, and either shows files directly (all at workspace root) or shows directory nodes
- `HurlFileItem` extends `vscode.TreeItem` with `vscode.open` command on click and themed icons
- `FileSystemWatcher` on `**/*.hurl` fires `onDidChangeTreeData` on create/delete/change
- Pure `groupByDirectory(filePaths)` helper in `fileTree.utils.ts` (no vscode dep, unit tested)
- `package.json`: `"views": { "explorer": [{ "id": "hurl.fileTree", "name": "Hurl Files" }] }` + `viewsWelcome`

### `src/webview/queryBuilder.ts` + `src/webview/queryBuilder.utils.ts`

Query Builder webview panel opened by `hurl.run` (CodeLens) and `hurl.hurl` (command palette):

- Flag builder UI: dropdown of all supported hurl flags, inline editing, per-flag delete
- Live command preview updates as flags/entry range change
- Runs `hurl` via `execFile` (argument array — no shell injection) with `--report-json`
- Parses JSON assertion failures and renders them in the output pane (ANSI via `ansi-to-html`)
- Copy command to clipboard button
- CSP: `default-src 'none'`; scripts/styles gated by nonce
- Pure helpers in `queryBuilder.utils.ts` (no vscode dep, unit tested): `FLAG_DEFS`, `buildHurlArgs`, `generateNonce`

### `src/extension.ts`

Removed: client-side semantic token provider, `parserInit()`, `web-tree-sitter` imports, old `hurl.hurl` inline exec, old `hurl.run` stub.

Added: `HurlFileTreeProvider` registration, `hurl.run` → `openQueryBuilder`, `hurl.hurl` → `openQueryBuilder`.
