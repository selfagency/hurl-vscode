import { ParameterInformation, SignatureHelp, SignatureInformation } from 'vscode-languageserver/node';

import { QUERY_TYPES, getCurrentSection, parse } from '../analysis';

// ── Signature definitions ─────────────────────────────────────────────────────

// Queries that take a string argument — these activate signature help
const QUERY_SIGNATURES: Record<string, SignatureInformation> = {};

for (const q of QUERY_TYPES) {
  if (!q.args) continue;
  QUERY_SIGNATURES[q.name] = SignatureInformation.create(
    `${q.name} ${q.args}`,
    q.description,
    ParameterInformation.create(q.args)
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Scan backward from `line` to find the nearest section header. */
function textSectionMatch(text: string, line: number): boolean {
  const lines = text.split(/\r?\n/);
  for (let i = line; i >= 0; i--) {
    const t = lines[i].trim();
    if (t === '[Asserts]' || t === '[Captures]') return true;
    // Stop at a bare HTTP method line (start of a new entry)
    if (/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|CONNECT|TRACE)\s/.test(t)) return false;
  }
  return false;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Return SignatureHelp when the cursor is after a query type keyword that
 * accepts a string argument (jsonpath, xpath, header, cookie, regex, certificate,
 * variable), in an [Asserts] or [Captures] section.
 *
 * Returns null when not applicable.
 */
export function getSignatureHelp(
  text: string,
  line: number,
  col: number
): SignatureHelp | null {
  if (!text) return null;

  let tree;
  try {
    tree = parse(text);
  } catch {
    return null;
  }

  // Only activate inside [Asserts] or [Captures] sections.
  // Use AST-based detection first; fall back to text scan when the incomplete
  // line produces an ERROR node that prevents section resolution.
  const section = getCurrentSection(tree, line);
  const sectionOk = section.type === 'section' &&
    (section.name === 'Asserts' || section.name === 'Captures');
  if (!sectionOk && !textSectionMatch(text, line)) return null;

  // Find the query keyword on this line by scanning left from the cursor
  const lines = text.split(/\r?\n/);
  const lineText = lines[line] ?? '';
  const prefix = lineText.slice(0, col).trimStart();

  // Extract the first word on the line — the query keyword
  const wordMatch = prefix.match(/^(\w+)/);
  if (!wordMatch) return null;
  const keyword = wordMatch[1];

  const sig = QUERY_SIGNATURES[keyword];
  if (!sig) return null;

  return {
    signatures: [sig],
    activeSignature: 0,
    activeParameter: 0
  };
}
