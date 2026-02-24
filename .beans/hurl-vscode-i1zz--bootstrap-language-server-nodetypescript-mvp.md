---
# hurl-vscode-i1zz
title: Bootstrap language server (Node/TypeScript) — MVP
status: completed
type: feature
priority: P0
created_at: 2026-02-23T17:25:11Z
updated_at: 2026-02-24T21:12:32Z
---

Scaffold a Node/TypeScript LSP server and client using vscode-languageserver / vscode-languageclient. Reuse bundled `tree-sitter-hurl.wasm` for parsing. Files: `src/server.ts`, `src/client.ts`, modify `src/extension.ts` to start client, add tests. Deliverable: basic diagnostics, hover, completions, CodeLens run actions. Estimated 1–2 weeks.

## Todo

- [in-progress] Create branch `feature/hurl-vscode-i1zz-bootstrap-lsp`
- [ ] Add scaffolding files: `src/server.ts`, `src/client.ts`
- [ ] Modify `src/extension.ts` to start language client
- [ ] Add minimal tree-sitter wasm loader and bundle asset
- [ ] Implement basic diagnostics, hover, completions, CodeLens run actions
- [ ] Write unit/integration tests for server and client (TDD)
- [ ] Run typecheck, build, and tests; fix issues
- [ ] Open draft PR and record URL in bean frontmatter

## Implementation — First steps (exact commands & validations)

Follow these steps in order. Validate at each checkpoint before continuing.

1. Create working branch (safe)

```bash
git checkout -b feature/hurl-vscode-i1zz-bootstrap-lsp
```

Validation: `git status --porcelain` should be empty and `git branch --show-current` prints the new branch name.

1. Install LSP dependencies (safe, add to package.json)

```bash
npm install --save vscode-languageclient vscode-languageserver
npm install --save-dev typescript @types/node
```

Validation: `package.json` updated and `node -e "console.log(require.resolve('vscode-languageclient'))"` exits without error.

1. Add minimal TypeScript scaffold (create files, keep handlers minimal)

- Create `src/server.ts` — exports a `startServer()` that initializes `vscode-languageserver` connection and registers placeholder handlers for diagnostics/hover/completion/CodeLens.
- Create `src/client.ts` — exports `createClient(context)` returning a `LanguageClient` configured to connect to the server (stdio or IPC).
- Update `src/extension.ts` — call `createClient(context)` and `client.start()` in `activate`, stop in `deactivate`.

Validation (compile-level):

```bash
npx tsc -p .
```

Expected: no new fatal type errors from the added files. If third-party types cause issues, prefer fixing imports or add `skipLibCheck` to `tsconfig.json` temporarily and record the change.

1. Add a smoke test for activation

- Add a small test under `src/test/` asserting `activate()` runs without throwing (or use existing test harness).

Run:

```bash
npm test
```

Validation: test harness runs; aim for the smoke test to pass (scaffold should not break existing tests).

1. Commit incremental changes

```bash
git add -A
git commit -m "feat(i1zz): scaffold LSP client/server files and start client (wip)"
git push --set-upstream origin feature/hurl-vscode-i1zz-bootstrap-lsp
```

Validation: `git log -1 --pretty=%B` shows the commit message and branch is pushed.

## Notes & Safety

- Keep handlers minimal to avoid introducing runtime/test complexity.
- Run typecheck and tests after each small change. Prefer many small commits.
- Do not implement full language features yet; this is the MVP bootstrap.

## Next actions (after you confirm or I run the steps)

- Apply the scaffold files and run `npx tsc` and `npm test` locally; update this bean with results and mark the scaffold step done.
- Continue implementing diagnostics/hover/completions and add tests (TDD).
