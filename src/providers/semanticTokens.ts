import { SemanticTokens } from 'vscode-languageserver/node';
import { Query } from 'web-tree-sitter';
import { parse } from '../analysis';
import { highlights } from '../query';

// ── Token type legend ─────────────────────────────────────────────────────────
// Order matters: the index of each name is the integer sent in the encoded data.
// These names must match standard LSP SemanticTokenTypes where possible so that
// editors apply the correct theme colours.

export const TOKEN_TYPES: string[] = [
  'property',   // section headers, key_strings
  'comment',    // Hurl comments
  'string',     // value_string, quoted_string, json_string (and .special → string)
  'regexp',     // regex literals
  'operator',   // escape sequences, comparison operators, keyword.operator predicates
  'type',       // HTTP methods, multiline_string_type
  'function',   // query names (jsonpath, xpath, status, …)
  'decorator',  // filter keys (base64Decode, regex, …)
  'enumMember', // option keys (verbose, retry, …)
  'boolean',    // true / false
  'number',     // integers, floats, HTTP status codes
  'variable',   // variable_name inside {{…}}
];

/** Map from tree-sitter capture name (without @) to TOKEN_TYPES index. */
const CAPTURE_TO_TYPE: Record<string, number> = {
  property:           TOKEN_TYPES.indexOf('property'),
  comment:            TOKEN_TYPES.indexOf('comment'),
  string:             TOKEN_TYPES.indexOf('string'),
  'string.special':   TOKEN_TYPES.indexOf('string'),
  'string.regex':     TOKEN_TYPES.indexOf('regexp'),
  'string.escape':    TOKEN_TYPES.indexOf('operator'),
  type:               TOKEN_TYPES.indexOf('type'),
  'type.builtin':     TOKEN_TYPES.indexOf('type'),
  'function.builtin': TOKEN_TYPES.indexOf('function'),
  attribute:          TOKEN_TYPES.indexOf('decorator'),
  'constant.builtin': TOKEN_TYPES.indexOf('enumMember'),
  boolean:            TOKEN_TYPES.indexOf('boolean'),
  'keyword.operator': TOKEN_TYPES.indexOf('operator'),
  operator:           TOKEN_TYPES.indexOf('operator'),
  number:             TOKEN_TYPES.indexOf('number'),
  float:              TOKEN_TYPES.indexOf('number'),
  variable:           TOKEN_TYPES.indexOf('variable'),
};

// ── Internal types ────────────────────────────────────────────────────────────

interface TokenEntry {
  line: number;
  char: number;
  length: number;
  typeIndex: number;
}

// ── Query cache ───────────────────────────────────────────────────────────────
// The Query is compiled from the Language object. Because web-tree-sitter
// exposes the language on every parsed Tree (`tree.language`), we compile it
// lazily on the first call to getSemanticTokens.

let _query: Query | null = null;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Return LSP-encoded semantic tokens for the given Hurl source text.
 * Returns `{ data: [] }` if the document cannot be parsed.
 */
export function getSemanticTokens(text: string): SemanticTokens {
  if (!text) return { data: [] };

  let tree;
  try {
    tree = parse(text);
  } catch {
    return { data: [] };
  }

  // Compile the highlights query once using the Language from the parsed tree.
  // web-tree-sitter v0.26 exposes the Query constructor as `new Query(language, source)`.
  if (!_query) {
    _query = new Query(tree.language, highlights);
  }

  const captures = _query.captures(tree.rootNode);

  // Collect per-line token entries (multi-line nodes are split per line)
  const entries: TokenEntry[] = [];
  for (const capture of captures) {
    const typeIndex = CAPTURE_TO_TYPE[capture.name];
    if (typeIndex === undefined) continue; // unknown or intentionally excluded capture

    const { node } = capture;
    const startLine: number = node.startPosition.row;
    const endLine: number = node.endPosition.row;

    for (let line = startLine; line <= endLine; line++) {
      const startChar = line === startLine ? (node.startPosition.column as number) : 0;
      const endChar = line === endLine
        ? (node.endPosition.column as number)
        : (node.endIndex - node.startIndex + node.startPosition.column as number);
      const length = endChar - startChar;
      if (length <= 0) continue;
      entries.push({ line, char: startChar, length, typeIndex });
    }
  }

  // Sort ascending by line then char (required for delta encoding)
  entries.sort((a, b) => a.line !== b.line ? a.line - b.line : a.char - b.char);

  // Delta-encode into the flat 5-integer-per-token format required by LSP
  const data: number[] = [];
  let prevLine = 0;
  let prevChar = 0;

  for (const t of entries) {
    const deltaLine = t.line - prevLine;
    const deltaChar = deltaLine === 0 ? t.char - prevChar : t.char;
    data.push(deltaLine, deltaChar, t.length, t.typeIndex, 0); // 0 = no modifiers
    prevLine = t.line;
    prevChar = t.char;
  }

  return { data };
}

// ── Token modifiers legend ────────────────────────────────────────────────────
// No modifiers used currently; exported so server.ts can build the full legend.
export const TOKEN_MODIFIERS: string[] = [];
