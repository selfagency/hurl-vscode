---
# hurl-vscode-wwzb
title: '`src/providers/diagnostics.ts` (feature)'
status: completed
type: feature
priority: critical
created_at: 2026-02-24T22:55:08Z
updated_at: 2026-02-25T21:09:00Z
parent: hurl-vscode-3ywc
---

Implement diagnostics provider: AST ERROR/MISSING nodes, method casing warnings, undefined captures, missing URL errors, unknown option keys, malformed status codes. Hook into `documents.onDidChangeContent` and call `connection.sendDiagnostics`.
