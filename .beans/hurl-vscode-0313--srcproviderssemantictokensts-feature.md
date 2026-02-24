---
# hurl-vscode-0313
title: srcproviderssemantictokensts feature
status: todo
type: task
priority: high
created_at: 2026-02-24T22:55:50Z
updated_at: 2026-02-24T22:59:21Z
parent: hurl-vscode-mpze
---

Migrate semantic token generation from `extension.ts` into the server: reuse highlights query in `src/query.ts`, expose `textDocument/semanticTokens/full` from the server and remove client-side provider registration.
