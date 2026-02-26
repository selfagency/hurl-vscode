import { Location, Range } from 'vscode-languageserver/node';

import { getCaptures, getEntries, nodeAtPosition, parse } from '../analysis';

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Return the definition Location for the symbol at the given position, or null.
 *
 * - `variable_name` inside `{{...}}` → the `[Captures]` line that defines it
 *   (same-file only; returns null if undefined or before this entry)
 */
export function getDefinition(
  uri: string,
  text: string,
  line: number,
  col: number
): Location | null {
  if (!text) return null;

  let tree;
  try {
    tree = parse(text);
  } catch {
    return null;
  }

  const node = nodeAtPosition(tree, line, col);
  if (!node) return null;

  // Walk up to find a variable_name node
  let current = node;
  while (current) {
    if (current.type === 'variable_name') {
      return resolveVariable(uri, current.text, tree, line);
    }
    current = current.parent!;
    if (!current) break;
  }

  return null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveVariable(
  uri: string,
  name: string,
  tree: ReturnType<typeof parse>,
  refLine: number
): Location | null {
  const captures = getCaptures(tree);
  const entries = getEntries(tree);

  // Find the entry that contains this reference
  let entryIdx = -1;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].startLine <= refLine) { entryIdx = i; break; }
  }

  // Look for the capture in all entries before the reference entry
  for (let i = 0; i < entryIdx; i++) {
    const e = entries[i];
    const cap = captures.find(
      c => c.name === name && c.line >= e.startLine && c.line <= e.endLine
    );
    if (cap) {
      return Location.create(
        uri,
        Range.create(cap.line, 0, cap.line, name.length)
      );
    }
  }

  return null;
}
