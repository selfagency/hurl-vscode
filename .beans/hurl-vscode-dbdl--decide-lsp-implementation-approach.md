---
# hurl-vscode-dbdl
title: Decide LSP implementation approach
status: todo
type: task
priority: P0
created_at: 2026-02-23T17:25:03Z
updated_at: 2026-02-23T17:25:03Z
---

Decide initial LSP implementation for vscode-hurl. Options: (A) Node/TypeScript LSP using bundled tree-sitter WASM (recommended MVP), (B) Rust LSP using hurl_core (authoritative but higher packaging cost), (C) Hybrid approach. Evaluate distribution, developer familiarity, maintainability, and CI/release implications. Deliverable: decision documented in repo and linked here; list chosen architecture and next steps.
