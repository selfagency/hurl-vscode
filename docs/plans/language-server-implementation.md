# Hurl Language Server — Complete Implementation Plan

## Context

The hurl-vscode extension has a bootstrapped LSP scaffold (`src/server.ts`) with placeholder implementations for diagnostics, hover, completions, and code lens. Tree-sitter parsing currently only runs on the client side (in `extension.ts`) for semantic tokens. This plan upgrades the server to a full production-quality language server covering all 20 VSCode programmatic language features, grounded in the Hurl 7.1.0 grammar and using the bundled `tree-sitter-hurl.wasm` binary.

---

## Architecture Overview

```
extension.ts (client host process)
  ├── createClient() → IPC transport → server.ts
  ├── hurl.hurl command (run file via CLI)
  └── hurl.run command (run single entry via CLI)

server.ts (separate Node.js child process)
  ├── analysis.ts       ← tree-sitter parser + AST utilities (shared)
  ├── completions.ts    ← textDocument/completion
  ├── hover.ts          ← textDocument/hover
  ├── diagnostics.ts    ← push diagnostics on document change
  ├── signatureHelp.ts  ← textDocument/signatureHelp
  ├── definition.ts     ← textDocument/definition
  ├── references.ts     ← textDocument/references
  ├── highlights.ts     ← textDocument/documentHighlight
  ├── symbols.ts        ← textDocument/documentSymbol + workspace/symbol
  ├── codeActions.ts    ← textDocument/codeAction
  ├── codeLens.ts       ← textDocument/codeLens
  ├── links.ts          ← textDocument/documentLink
  ├── formatting.ts     ← textDocument/formatting + rangeFormatting + onTypeFormatting
  ├── rename.ts         ← textDocument/rename + textDocument/prepareRename
  ├── folding.ts        ← textDocument/foldingRange
  └── semanticTokens.ts ← textDocument/semanticTokens/full (migrate from extension.ts)
```

**Key architectural decisions:**

- Tree-sitter is initialized **once** in the server process and shared across all providers
- The client-side semantic token provider in `extension.ts` is removed; replaced by server-side LSP semantic tokens
- All AST inspection goes through a single `analysis.ts` module for consistency
- The server re-parses on every document change event; no persistent incremental tree

---

## Infrastructure: `src/analysis.ts`

Central module initialized at server startup. Exports:

```typescript
// Parser initialization (call once)
export async function initParser(wasmPath: string): Promise<void>;

// Parse a document — returns tree-sitter Tree
export function parse(text: string): Tree;

// Structural extractions
export function getEntries(tree: Tree): EntryNode[];
export function getCaptures(tree: Tree): CaptureNode[]; // [Captures] section nodes
export function getVariableRefs(tree: Tree): VarRefNode[]; // {{varname}} template nodes
export function getCurrentSection(tree: Tree, line: number): SectionContext;
export function nodeAtPosition(tree: Tree, line: number, col: number): SyntaxNode | null;

// Lookup tables (static, exported as const)
export const HTTP_METHODS: string[]; // GET POST PUT DELETE PATCH HEAD OPTIONS CONNECT TRACE
export const SECTION_HEADERS: string[]; // [Options] [Query] [Form] [Multipart] [BasicAuth] [Cookies] [Asserts] [Captures]
export const QUERY_TYPES: QueryDef[]; // status, version, header, cookie, body, bytes, xpath, jsonpath, regex, sha256, md5, url, redirects, ip, variable, duration, certificate
export const PREDICATES: PredicateDef[]; // == != > >= < <= startsWith endsWith contains matches exists isBoolean isEmpty isFloat isInteger isIpv4 isIpv6 isIsoDate isList isNumber isObject isString isUuid
export const FILTERS: FilterDef[]; // base64Decode base64Encode count daysAfterNow daysBeforeNow decode first dateFormat htmlEscape htmlUnescape jsonpath last location nth regex replace replaceRegex split toDate toFloat toHex toInt toString urlDecode urlEncode urlQueryParam utf8Decode utf8Encode xpath
export const OPTION_KEYS: OptionKeyDef[]; // aws-sigv4 cacert cert key compressed connect-timeout delay http3 insecure ipv6 limit-rate location location-trusted max-redirs max-time output path-as-is retry retry-interval skip unix-socket user proxy variable verbose very-verbose repeat
export const TEMPLATE_FUNCTIONS: string[]; // newUuid newDate
export const HTTP_VERSIONS: string[]; // HTTP HTTP/1.0 HTTP/1.1 HTTP/2 HTTP/3
```

`SectionContext` identifies whether the cursor is in: request line, headers, a named section, body, response line, or assert/capture line. Used to contextualize completions.

**WASM initialization**: The server uses `path.join(__dirname, '../tree-sitter-hurl.wasm')` (same relative location as `wasm.ts` already handles). The existing `src/wasm.ts` helper is reused by the server.

---

## Feature Implementations

### 1. Diagnostics (`src/diagnostics.ts`)

**LSP**: Push via `connection.sendDiagnostics` on `documents.onDidChangeContent`

Detects:

- **Syntax errors**: Walk tree-sitter AST for `ERROR` nodes or `MISSING` nodes → mark as errors with the node's range
- **Method casing**: Method node not all-uppercase → warning, suggest fix
- **Undefined variables**: `{{varname}}` where `varname` has no defining `[Captures]` entry earlier in the file → warning (cannot validate cross-file captures)
- **Missing required URL**: Entry with method but no URL node → error
- **Unknown option keys**: Keys in `[Options]` sections not in `OPTION_KEYS` → warning
- **Malformed status**: `HTTP` line with non-numeric or out-of-range (100–599) status → error

### 2. Completions (`src/completions.ts`)

**LSP**: `connection.onCompletion` + `connection.onCompletionResolve`

Context detection via `getCurrentSection()` + preceding tokens on line:

| Context                                           | Completions                                                  |
| ------------------------------------------------- | ------------------------------------------------------------ |
| Line start, after blank line                      | HTTP_METHODS + `#` (comment)                                 |
| After `HTTP` in response line                     | Status codes (100–599 with descriptions)                     |
| Line start in `[Options]`                         | OPTION_KEYS                                                  |
| Line start in `[Asserts]`                         | QUERY_TYPES                                                  |
| Line start in `[Captures]`                        | `<varname>:` + QUERY_TYPES                                   |
| After query type in `[Asserts]`                   | FILTERS then PREDICATES                                      |
| After filter in `[Asserts]`                       | FILTERS (chainable) then PREDICATES                          |
| After `{{`                                        | Variable names captured earlier in file + TEMPLATE_FUNCTIONS |
| In section header position `[`                    | SECTION_HEADERS                                              |
| After method                                      | URL (no static completions, but trigger `https://`)          |
| In `[Form]` / `[Query]`                           | `key: value` pattern (no static completions)                 |
| In multiline string type position (after ` ``` `) | `json`, `xml`, `graphql`, `base64`, `hex`, `oneline`         |

`onCompletionResolve` adds `documentation` (markdown) from the lookup tables.

### 3. Hover (`src/hover.ts`)

**LSP**: `connection.onHover`

Node detection via `nodeAtPosition()`:

- `method` node → markdown: HTTP method description + link to MDN
- `query_name` node (xpath, jsonpath, etc.) → description of that query type + example
- `filter_key` node → description of filter + input/output types + example
- `predicate_name` node → description + example from docs
- `option_key` node → description of the option
- `variable_name` in `{{...}}` → "Defined at line N" or "Undefined variable"
- `version` node → HTTP version description
- `status` in response line → HTTP status code description (e.g. 200 → "OK — Standard response for successful HTTP requests")

Hover content is formatted as markdown with code examples from the Hurl docs.

### 4. Signature Help (`src/signatureHelp.ts`)

**LSP**: `connection.onSignatureHelp`, trigger characters: `"`, space

Activates in `[Asserts]` and `[Captures]` sections when cursor is after a query type keyword. Shows the query's argument format:

- `header` → `header "<header-name>"`
- `cookie` → `cookie "<cookie-name>"`
- `xpath` → `xpath "<xpath-expression>"`
- `jsonpath` → `jsonpath "<jsonpath-expression>"`
- `regex` → `regex /<pattern>/` or `regex "<pattern>"`
- `certificate` → `certificate "<field>"` (Subject, Issuer, Start-Date, Expire-Date, Serial-Number)
- `variable` → `variable "<name>"`

### 5. Go to Definition (`src/definition.ts`)

**LSP**: `connection.onDefinition`

- Cursor on `variable_name` inside `{{...}}` → jump to the `[Captures]` line that defines it (same file only; warn if undefined)
- Cursor on a `file_value` or `file,<path>` body → jump to the referenced file (resolve relative to document)

### 6. Find References (`src/references.ts`)

**LSP**: `connection.onReferences`

- Cursor on variable name (in `[Captures]` definition or `{{...}}` usage) → all `{{varname}}` occurrences in the same document
- `includeDeclaration` param respected

### 7. Document Highlights (`src/highlights.ts`)

**LSP**: `connection.onDocumentHighlight`

- Cursor on any `variable_name` → highlight all definitions (Write kind) and usages (Read kind) in the document
- Cursor on a section header keyword (e.g., `[Asserts]`) → highlight all occurrences of that section in the file

### 8. Document Symbols (`src/symbols.ts`)

**LSP**: `connection.onDocumentSymbol`

Builds hierarchical symbol tree:

```
▶ GET https://example.org  (SymbolKind.Function, covers entire entry)
  ▶ [Captures]             (SymbolKind.Namespace)
    • csrf_token           (SymbolKind.Variable)
  ▶ [Asserts]              (SymbolKind.Namespace)
▶ POST https://example.org/login  (SymbolKind.Function)
  ...
```

Entry name = `METHOD URL`.

### 9. Workspace Symbols (`src/symbols.ts`)

**LSP**: `connection.onWorkspaceSymbol`

Returns all entries (requests) across all open `.hurl` documents in the workspace. Symbol name = `METHOD URL`. Allows Ctrl+T search across files.

### 10. Code Actions (`src/codeActions.ts`)

**LSP**: `connection.onCodeAction`

| Trigger                    | Action                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| Method not uppercase       | "Convert to uppercase" quick fix                                                                     |
| Undefined variable warning | "Create capture for `{{varname}}`" — inserts `[Captures]\nvarname: body` snippet after current entry |
| ERROR node diagnostic      | "Report issue" (opens GitHub issues URL)                                                             |
| Option key warning         | "Remove unknown option"                                                                              |
| Section can be sorted      | "Sort section keys" (for `[Query]`, `[Form]`)                                                        |

### 11. Code Lens (`src/codeLens.ts`)

**LSP**: `connection.onCodeLens`

One lens per `entry` node:

- `▶ Run` — `hurl.run` command with `{ uri, entryIndex }` (1-based entry index, run with `--from-entry N --to-entry N`)
- `▶ Run All` lens at line 0 of the document

The `hurl.run` command in `extension.ts` opens the **Query Builder Webview** (see §17) pre-populated with the entry index.

### 12. Document Links (`src/links.ts`)

**LSP**: `connection.onDocumentLinks`

Walks the AST for:

- `file_value` nodes (in `file,<path>;` bodies and `[Multipart]` file fields) → links to resolved file path
- URL string in request line → clickable HTTP URL

### 13. Document Formatting (`src/formatting.ts`)

**LSP**: `connection.onDocumentFormatting` + `connection.onDocumentRangeFormatting` + `connection.onDocumentOnTypeFormatting` (trigger: `\n`)

Formatting rules:

- HTTP method is uppercase
- Single space between method and URL
- Single blank line between entries
- Section headers flush to column 0 with no extra spaces: `[Options]` not `[ Options ]`
- Key-value pairs in sections: single space after `:`, no trailing whitespace
- Consistent indentation (none — Hurl uses no indentation by convention)
- Strip trailing whitespace from all lines
- Ensure file ends with a single newline

On-type formatting (on `\n`): after typing a complete `METHOD URL` line, if the previous section had no blank line separator, insert one.

### 14. Rename (`src/rename.ts`)

**LSP**: `connection.onRenameRequest` + `connection.onPrepareRename`

`onPrepareRename`: returns the range of the variable name if cursor is on a `variable_name` node; otherwise returns null (rename not available).

`onRenameRequest`: renames all occurrences of the variable — the capture definition key and every `{{varname}}` usage — within the document. Returns a `WorkspaceEdit` with all text edits.

### 15. Folding Ranges (`src/folding.ts`)

**LSP**: `connection.onFoldingRanges`

Fold regions:

- Each `entry` (request + optional response) — kind: Region
- Each `request_section` or `response_section` body — kind: Region
- Multiline string bodies (` ``` ` ... ` ``` `) — kind: Region
- Comment blocks (consecutive `#` lines) — kind: Comment

### 16. Semantic Tokens (`src/semanticTokens.ts`)

**LSP**: `connection.onRequest('textDocument/semanticTokens/full', ...)`

Migrate the existing client-side tree-sitter semantic token logic from `extension.ts` into the server. Same `highlights` query from `src/query.ts` and same `symbolTypeMap`. Return `SemanticTokens` via the LSP protocol.

Token types legend:

```
property, comment, string, regexp, operator, type, function,
decorator, enumMember, boolean, number, variable
```

Remove the `vscode.languages.registerDocumentSemanticTokensProvider` call from `extension.ts` after migration.

---

### 17. Query Builder Webview (`src/webview/queryBuilder.ts`)

**Not LSP** — VSCode Webview API (`vscode.window.createWebviewPanel`)

Opens when `hurl.run` is invoked (from CodeLens or command palette). Provides a UI to construct and execute a `hurl` CLI invocation:

**UI layout:**

```
┌─────────────────────────────────────────────────────┐
│  hurl <file>  --from-entry 2 --to-entry 2           │
│                                                     │
│  Flags  [+ Add flag ▼]                              │
│  ┌─────────────────────────────────────┐            │
│  │ --verbose              [×]          │            │
│  │ --insecure             [×]          │            │
│  │ --variable foo=bar     [×]          │            │
│  └─────────────────────────────────────┘            │
│                                                     │
│  [▶ Run]  [Copy Command]                            │
│                                                     │
│  ── Output ──────────────────────────────────────── │
│  HTTP/1.1 200 OK                                    │
│  ...                                                │
└─────────────────────────────────────────────────────┘
```

**Flag selector behavior:**

- A `<select>` dropdown lists all supported CLI flags not yet added; selecting one appends it to the active flags list and removes it from the dropdown (no duplicates)
- The active flags list renders each flag as an editable row:
  - Value flags show an inline `<input>` that can be clicked to edit the value in-place
  - Boolean flags show a read-only label (no value field)
  - Every row has a `[×]` delete button that removes the flag and returns it to the dropdown
- `--from-entry` / `--to-entry` (when set by CodeLens) are shown as locked rows — value is editable but the delete button is hidden

**Execution and output:**

- Always appends `--report-json /tmp/hurl-run-<uuid>.json` to the invocation
- Runs the command via `child_process.exec` with the constructed argument array
- After completion reads and parses the JSON report file, then deletes it
- Displays stdout/stderr (ANSI-converted) in the output pane
- If the JSON report contains failures, renders them as formatted error blocks with the entry index, assert expression, and actual vs expected values
- If `--from-entry` / `--to-entry` are set (single-entry run), they are locked and cannot be removed (only edited)

**Implementation notes:**

- Webview HTML served as a template string; uses VSCode's `getNonce()` for CSP
- State is managed in the webview (plain JS, no framework needed)
- Communication uses `panel.webview.postMessage` / `window.addEventListener('message')`
- Reuses `ansi-to-html` (already a dependency) for colorized output

### 18. Hurl File Tree (`src/fileTree.ts`)

**Not LSP** — VSCode `TreeDataProvider` API

Registers a `hurl.fileTree` view in the Explorer sidebar showing all `.hurl` files in the workspace.

**Behavior:**

- Recursively finds all `**/*.hurl` files using `vscode.workspace.findFiles`
- Groups by directory (tree structure mirrors folder hierarchy)
- Clicking a file calls `vscode.window.showTextDocument` to open it in the editor
- Refreshes when files are created/deleted (watches via `vscode.workspace.createFileSystemWatcher`)
- Shows file icon next to each file name

**Registration in `package.json`:**

```json
"contributes": {
  "views": {
    "explorer": [
      {
        "id": "hurl.fileTree",
        "name": "Hurl Files"
      }
    ]
  },
  "viewsWelcome": [
    {
      "view": "hurl.fileTree",
      "contents": "No .hurl files found in the workspace."
    }
  ]
}
```

**Implementation:** `src/fileTree.ts` exports a `HurlFileTreeProvider` class implementing `vscode.TreeDataProvider<HurlFileItem>`. Registered in `extension.ts` via `vscode.window.registerTreeDataProvider('hurl.fileTree', provider)`.

---

## Files to Create

| File                              | Purpose                                                   |
| --------------------------------- | --------------------------------------------------------- |
| `src/analysis.ts`                 | Tree-sitter init, parse, AST utilities, all lookup tables |
| `src/providers/completions.ts`    | Completion items with context                             |
| `src/providers/hover.ts`          | Hover documentation                                       |
| `src/providers/diagnostics.ts`    | AST-based diagnostics                                     |
| `src/providers/signatureHelp.ts`  | Query signature help                                      |
| `src/providers/definition.ts`     | Go to definition                                          |
| `src/providers/references.ts`     | Find all references                                       |
| `src/providers/highlights.ts`     | Document highlights                                       |
| `src/providers/symbols.ts`        | Document + workspace symbols                              |
| `src/providers/codeActions.ts`    | Quick fix actions                                         |
| `src/providers/codeLens.ts`       | Per-entry run lens                                        |
| `src/providers/links.ts`          | Document links                                            |
| `src/providers/formatting.ts`     | Format/range-format/on-type-format                        |
| `src/providers/rename.ts`         | Variable rename                                           |
| `src/providers/folding.ts`        | Folding ranges                                            |
| `src/providers/semanticTokens.ts` | Semantic tokens (migrated from extension.ts)              |
| `src/webview/queryBuilder.ts`     | Query builder webview panel controller                    |
| `src/fileTree.ts`                 | Hurl file tree `TreeDataProvider`                         |

---

## Files to Modify

### `src/server.ts`

Replace scaffold with full capability declaration and provider wiring:

```typescript
capabilities: {
  textDocumentSync: TextDocumentSyncKind.Incremental,
  completionProvider: { resolveProvider: true, triggerCharacters: ['[', '{', ' ', ':'] },
  hoverProvider: true,
  signatureHelpProvider: { triggerCharacters: ['"', ' '] },
  definitionProvider: true,
  referencesProvider: true,
  documentHighlightProvider: true,
  documentSymbolProvider: true,
  workspaceSymbolProvider: true,
  codeActionProvider: true,
  codeLensProvider: { resolveProvider: false },
  documentLinkProvider: { resolveProvider: false },
  documentFormattingProvider: true,
  documentRangeFormattingProvider: true,
  documentOnTypeFormattingProvider: { firstTriggerCharacter: '\n' },
  renameProvider: { prepareProvider: true },
  foldingRangeProvider: true,
  semanticTokensProvider: {
    legend: { tokenTypes: [...], tokenModifiers: [] },
    full: true
  }
}
```

Wire each handler to the appropriate provider module.

### `src/extension.ts`

- Remove `vscode.languages.registerDocumentSemanticTokensProvider` registration (now server-side)
- Remove `parserInit()` and tree-sitter imports (no longer needed client-side)
- Update `hurl.run` command to open the Query Builder Webview (`src/webview/queryBuilder.ts`) pre-populated with `{ uri, entryIndex }` — no direct `exec` call here
- Update `hurl.hurl` command to open the Query Builder Webview with no entry index (run all)
- Register the `HurlFileTreeProvider` from `src/fileTree.ts`

### `src/client.ts`

- Ensure `LanguageClientOptions.documentSelector` includes both `scheme: 'file'` and `scheme: 'untitled'`
- Add `initializationOptions` if needed for workspace root

### `package.json`

- Add `"semanticTokensProvider"` to `contributes` (not needed — server declares it via LSP capabilities)
- Update `contributes.commands` to include `hurl.run` with title "Run Hurl Entry"
- Add `"engines.vscode": "^1.74.0"` (already present, keep)

### `src/wasm.ts`

- No changes needed; existing `getWasmPath()` is reused by `analysis.ts`

---

## Test Strategy

### Unit Tests (vitest, `src/test/`)

- `analysis.parse.test.ts` — parse known Hurl snippets; assert entry count, capture names, variable refs
- `completions.test.ts` — mock tree-sitter, assert completion items per context
- `diagnostics.test.ts` — assert diagnostics for malformed methods, undefined variables, ERROR nodes
- `hover.test.ts` — assert hover content for known node types
- `folding.test.ts` — assert fold range start/end for entries and sections
- `formatting.test.ts` — assert text edits for casing, spacing, trailing whitespace
- `rename.test.ts` — assert workspace edits rename all occurrences
- `codeLens.test.ts` — assert one lens per entry with correct line/command

### Integration Tests (`@vscode/test-electron`)

- Open a fixture `.hurl` file; assert semantic token provider resolves
- Trigger completion at known position; assert completions include expected items
- Trigger hover over `GET`; assert hover contains method documentation
- Trigger `Go to Definition` on a `{{varname}}`; assert jumps to capture line
- Trigger rename on a variable; assert all occurrences updated

### Manual Verification

1. `pnpm run compile` — must succeed with no TypeScript errors
2. Open any `.hurl` file in VSCode; confirm:
   - Syntax highlighting works (semantic tokens)
   - Completions appear on method line and in `[Asserts]`
   - Hover over `GET` shows docs
   - Code lens "Run" appears per entry
   - Outline view shows entries and captures
   - Folding works for entries and sections
   - Format document normalizes casing and spacing
3. `pnpm run test` — all unit and integration tests pass

---

## Implementation Sequence

1. **`src/analysis.ts`** — foundational; all other providers depend on it
2. **`src/providers/diagnostics.ts`** + wire in server — unblocks immediate value
3. **`src/providers/completions.ts`** + resolve — highest developer-facing impact
4. **`src/providers/hover.ts`** — quick win from lookup tables
5. **`src/providers/semanticTokens.ts`** + remove client-side — cleans architecture
6. **`src/providers/codeLens.ts`** — per-entry lens (prerequisite for webview)
7. **`src/webview/queryBuilder.ts`** + update `hurl.run` / `hurl.hurl` commands — enables execution with flag builder and JSON report output
8. **`src/fileTree.ts`** + register in `extension.ts` — Hurl file browser in sidebar
9. **`src/providers/symbols.ts`** — enables outline and workspace search
10. **`src/providers/definition.ts` + `references.ts` + `highlights.ts`** — variable navigation
11. **`src/providers/rename.ts`** — depends on references
12. **`src/providers/folding.ts`** — structural navigation
13. **`src/providers/formatting.ts`** — formatting full/range/on-type
14. **`src/providers/codeActions.ts`** — quick fixes
15. **`src/providers/links.ts`** — document links
16. **`src/providers/signatureHelp.ts`** — query signatures
17. **Tests** — unit + integration for each provider
