---
title: Improve CodeLens run actions and wire extension command
labels: ["area:lsp", "priority:P1"]
---

Description
-----------

Improve the scaffold CodeLens implementation to expose actionable "Run" commands in the editor:

- Register a command (e.g. `hurl.run`) in `src/extension.ts` that accepts a document URI and range or data, and executes a placeholder action.
- Update the server CodeLens `data` payload to include the command and arguments required for the client to execute the command.
- Add tests verifying CodeLens items are provided and that the command can be resolved/invoked (mocked).

Acceptance criteria

- `extension.ts` registers `hurl.run` command and handles invocation safely.
- Server returns CodeLens items with `data` that the client can turn into commands.
- Tests cover CodeLens presence and command registration.

Notes

- This is the next step after basic folding of diagnostics and completions; relates to bean `hurl-vscode-i1zz`.
