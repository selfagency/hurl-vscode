---
# hurl-vscode-84cq
title: 'i1zz: add integration tests for server-client LSP behavior'
status: scrapped
type: task
priority: P0
created_at: 2026-02-24T21:20:11Z
updated_at: 2026-02-24T23:05:18Z
parent: hurl-vscode-i1zz
---

Add end-to-end integration tests that launch the language server and client inside a VS Code test host and assert basic LSP behavior.

Scope:
- Create tests under `src/test/integration/` that start the extension (VS Code test harness) and programmatically open a `.hurl` document.
- Verify the LanguageClient connects to the server and that server responses behave as expected: diagnostics emitted, hover returns content, completions contain placeholders, CodeLens are returned and commands execute.
- Reuse existing `src/test/runTest.ts` harness; add runner scripts and CI steps if needed.

Acceptance criteria:
- New integration tests pass in CI and locally via `npm test` (integration).
- Tests assert at least: diagnostics for "ERROR" token, hover returns scaffold text, completions include `GET`/`POST`, CodeLens command `hurl.run` is registered and callable.

Notes: mark this bean as child of `hurl-vscode-i1zz`.
