import { DocumentHighlight, DocumentHighlightKind, Range } from 'vscode-languageserver/node';

import { getCaptures, getEntries, getVariableRefs, nodeAtPosition, parse } from '../analysis';

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Return document highlights for the symbol at the given cursor position.
 *
 * - `variable_name` in `{{...}}` → all usages (Read) + all definitions (Write)
 * - Other positions → []
 */
export function getDocumentHighlights(
  text: string,
  line: number,
  col: number
): DocumentHighlight[] {
  if (!text) return [];

  let tree;
  try {
    tree = parse(text);
  } catch {
    return [];
  }

  const node = nodeAtPosition(tree, line, col);
  if (!node) return [];

  // Walk up to find a variable_name node
  let current = node;
  while (current) {
    if (current.type === 'variable_name') {
      return highlightVariable(current.text, tree);
    }
    if (!current.parent) break;
    current = current.parent;
  }

  return [];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function highlightVariable(
  name: string,
  tree: ReturnType<typeof parse>
): DocumentHighlight[] {
  const highlights: DocumentHighlight[] = [];

  // Usages: all {{name}} variable references → Read
  const refs = getVariableRefs(tree).filter(r => r.name === name);
  for (const ref of refs) {
    highlights.push({
      range: Range.create(ref.line, ref.col, ref.line, ref.col + name.length),
      kind: DocumentHighlightKind.Read
    });
  }

  // Definitions: [Captures] entries that define this name → Write
  const captures = getCaptures(tree);
  const entries = getEntries(tree);
  for (const cap of captures.filter(c => c.name === name)) {
    const entry = entries.find(e => cap.line >= e.startLine && cap.line <= e.endLine);
    if (!entry) continue;
    highlights.push({
      range: Range.create(cap.line, 0, cap.line, name.length),
      kind: DocumentHighlightKind.Write
    });
  }

  return highlights;
}
