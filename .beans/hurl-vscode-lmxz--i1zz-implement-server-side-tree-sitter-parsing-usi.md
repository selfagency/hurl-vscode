---
# hurl-vscode-lmxz
title: 'i1zz: implement server-side tree-sitter parsing using bundled wasm'
status: scrapped
type: task
priority: P0
created_at: 2026-02-24T21:20:27Z
updated_at: 2026-02-24T23:02:29Z
parent: hurl-vscode-i1zz
---

Implement full tree-sitter parsing inside the language server process, reusing the bundled `tree-sitter-hurl.wasm`.

Scope:
- Initialize web-tree-sitter (or appropriate Node binding) within `src/server.ts` using the packaged `tree-sitter-hurl.wasm`.
- Parse documents on change and store the parse tree/AST in memory for each open document.
- Expose APIs/handlers that use the AST (e.g., for diagnostics, semantic tokens, completions).

Acceptance criteria:
- Server initializes the parser without error when run in the extension host.
- Documents are parsed and a non-empty AST is produced for typical `.hurl` content.
- Performance is reasonable for typical file sizes (basic smoke check in tests).

Notes: make this bean a child of `hurl-vscode-i1zz`.
