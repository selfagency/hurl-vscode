---
title: Add tree-sitter wasm loader and include tree-sitter-hurl.wasm in package
labels: ["area:lsp", "priority:P0"]
---

Description
-----------

Add a small helper to resolve and load the bundled `tree-sitter-hurl.wasm` via `context.asAbsolutePath` and ensure the `.wasm` file is included in the extension package. This is required by the LSP scaffold (bean `hurl-vscode-i1zz`).

Acceptance criteria
- Add `src/wasm.ts` with a `getWasmPath(context)` helper that returns the absolute path to the wasm file and a test-friendly fallback when run outside of VS Code.
- Ensure package includes `tree-sitter-hurl.wasm` in the published extension (update `package.json` `files` or bundling instructions if necessary).
- Add unit test verifying `getWasmPath` returns a path that exists when running in real extension and returns fallback in test environment.

Notes
- Repo has issues disabled; this file serves as local task tracking and can be converted to a GitHub issue later.
