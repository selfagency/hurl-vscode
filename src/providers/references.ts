import { Location, Range } from 'vscode-languageserver/node';

import { getCaptures, getEntries, getVariableRefs, nodeAtPosition, parse } from '../analysis';

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Return all locations where the variable under the cursor is referenced.
 * When `includeDeclaration` is true, also includes the `[Captures]` definition.
 * Returns [] if the cursor is not on a variable name or the document is empty.
 */
export function getReferences(
  uri: string,
  text: string,
  line: number,
  col: number,
  includeDeclaration: boolean
): Location[] {
  if (!text) return [];

  let tree;
  try {
    tree = parse(text);
  } catch {
    return [];
  }

  const node = nodeAtPosition(tree, line, col);
  if (!node) return [];

  // Walk up to find the variable_name node
  let current = node;
  while (current) {
    if (current.type === 'variable_name') {
      return collectRefs(uri, current.text, tree, includeDeclaration);
    }
    if (!current.parent) break;
    current = current.parent;
  }

  return [];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function collectRefs(
  uri: string,
  name: string,
  tree: ReturnType<typeof parse>,
  includeDeclaration: boolean
): Location[] {
  const locations: Location[] = [];

  // All {{name}} usages in the document
  const refs = getVariableRefs(tree).filter(r => r.name === name);
  for (const ref of refs) {
    locations.push(
      Location.create(uri, Range.create(ref.line, ref.col, ref.line, ref.col + name.length))
    );
  }

  // Optionally include the capture definition(s)
  if (includeDeclaration) {
    const captures = getCaptures(tree);
    const entries = getEntries(tree);
    for (const cap of captures.filter(c => c.name === name)) {
      // Find the entry that owns this capture
      const entry = entries.find(e => cap.line >= e.startLine && cap.line <= e.endLine);
      if (!entry) continue;
      locations.push(
        Location.create(uri, Range.create(cap.line, 0, cap.line, name.length))
      );
    }
  }

  return locations;
}
