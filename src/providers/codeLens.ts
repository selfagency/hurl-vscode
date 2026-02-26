import { CodeLens, Range } from 'vscode-languageserver/node';

import { getEntries, parse } from '../analysis';

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Return CodeLens items for the given Hurl document.
 *
 * - One `▶ Run` lens per entry, placed on the method line.
 *   Arguments: `[uri, entryIndex]` where `entryIndex` is 1-based (maps to
 *   `hurl --from-entry N --to-entry N`).
 * - One `▶ Run All` lens at the very start of the document.
 */
export function getCodeLenses(uri: string, text: string): CodeLens[] {
  if (!text) return [];

  let tree;
  try {
    tree = parse(text);
  } catch {
    return [];
  }

  const entries = getEntries(tree);
  if (entries.length === 0) return [];

  const lenses: CodeLens[] = [];

  // ▶ Run All — always at position 0:0
  lenses.push({
    range: Range.create(0, 0, 0, 0),
    command: {
      title: '▶ Run All',
      command: 'hurl.run',
      arguments: [uri]
    }
  });

  // ▶ Run — one per entry, on the method line (entry.startLine)
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const line = entry.startLine;
    lenses.push({
      range: Range.create(line, 0, line, 0),
      command: {
        title: '▶ Run',
        command: 'hurl.run',
        arguments: [uri, i + 1] // 1-based entry index
      }
    });
  }

  return lenses;
}
