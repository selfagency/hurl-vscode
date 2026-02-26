import { TextEdit, WorkspaceEdit } from 'vscode-languageserver/node';

import { getCaptures, getEntries, getVariableRefs, nodeAtPosition, parse } from '../analysis';

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Return a WorkspaceEdit that renames the variable under the cursor to `newName`,
 * or null if the cursor is not on a variable name.
 */
export function getRenameEdits(
  uri: string,
  text: string,
  line: number,
  col: number,
  newName: string
): WorkspaceEdit | null {
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
      return buildEdit(uri, current.text, newName, tree);
    }
    if (!current.parent) break;
    current = current.parent;
  }

  return null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildEdit(
  uri: string,
  name: string,
  newName: string,
  tree: ReturnType<typeof parse>
): WorkspaceEdit {
  const edits: TextEdit[] = [];

  // Rename all {{name}} usages
  const refs = getVariableRefs(tree).filter(r => r.name === name);
  for (const ref of refs) {
    edits.push(TextEdit.replace(
      { start: { line: ref.line, character: ref.col },
        end:   { line: ref.line, character: ref.col + name.length } },
      newName
    ));
  }

  // Rename all [Captures] definitions
  const captures = getCaptures(tree);
  const entries = getEntries(tree);
  for (const cap of captures.filter(c => c.name === name)) {
    const entry = entries.find(e => cap.line >= e.startLine && cap.line <= e.endLine);
    if (!entry) continue;
    edits.push(TextEdit.replace(
      { start: { line: cap.line, character: 0 },
        end:   { line: cap.line, character: name.length } },
      newName
    ));
  }

  return { changes: { [uri]: edits } };
}
