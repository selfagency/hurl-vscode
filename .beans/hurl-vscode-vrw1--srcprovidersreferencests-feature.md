---
# hurl-vscode-vrw1
title: '`src/providers/references.ts` (feature)'
status: completed
type: feature
priority: normal
created_at: 2026-02-24T22:55:36Z
updated_at: 2026-02-24T22:58:57Z
parent: hurl-vscode-3ywc
---


## Summary of Changes
Walks variable_name ancestor, collects all {{var}} usages via getVariableRefs; optionally includes [Captures] definition. 108 unit tests passing.
