---
# hurl-vscode-crlj
title: Expand tests to integration server-client LSP
status: scrapped
type: test
priority: P0
created_at: 2026-02-24T21:20:57Z
updated_at: 2026-02-24T23:05:10Z
parent: hurl-vscode-i1zz
---

Add integration tests that launch the language server and client inside the VS Code test host and assert LSP behaviour (diagnostics, hover, completions, CodeLens). Reuse `src/test/runTest.ts` and `@vscode/test-electron`. Add CI workflow step to run integration tests on PRs.
