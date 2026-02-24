---
# hurl-vscode-ga2s
title: 'i1zz: improve diagnostics/completions using AST and add CodeLens run actions'
status: scrapped
type: task
priority: P0
created_at: 2026-02-24T21:20:33Z
updated_at: 2026-02-24T23:05:14Z
parent: hurl-vscode-i1zz
---

Improve diagnostics and completions using the server-side AST and add CodeLens actions that execute runs.

Scope:
- Use the server-side parse tree to produce richer diagnostics (context-aware, node-based) rather than simple token matches.
- Provide completions derived from AST context (e.g., method names, options, HTTP methods) and prioritize high-quality suggestions.
- Add CodeLens run actions that trigger execution for requests found in the document; wire the CodeLens command to call back into the extension or server to run the request and show output.

Acceptance criteria:
- Diagnostics reflect AST-derived issues (e.g., invalid predicate usage) in tests.
- Completions include context-aware items and pass unit tests.
- CodeLens `Run` actions appear for executable blocks and invoke run behavior (smoke-tested).

Notes: make this bean a child of `hurl-vscode-i1zz`.
