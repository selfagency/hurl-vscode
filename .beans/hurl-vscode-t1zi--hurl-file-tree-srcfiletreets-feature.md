---
# hurl-vscode-t1zi
title: Hurl File Tree — `src/fileTree.ts` (feature)
status: completed
type: feature
priority: normal
created_at: 2026-02-24T22:55:55Z
updated_at: 2026-02-26T22:50:00Z
parent: hurl-vscode-zpbd
branch: feat/zpbd-editor-ux-tools
---

Implement `HurlFileTreeProvider` for explorer view: list `**/*.hurl`, group by directory, open on click, watch FS changes, show icons.

## Summary of Changes

- `src/fileTree.utils.ts` — pure `groupByDirectory` function (no vscode dep, unit tested)
- `src/fileTree.ts` — `HurlFileItem` (TreeItem with click command + icons) and `HurlFileTreeProvider` (TreeDataProvider with FileSystemWatcher)
- `package.json` — added `views.explorer` entry for `hurl.fileTree` and `viewsWelcome`
- `src/extension.ts` — registered provider via `vscode.window.registerTreeDataProvider`
