import { FoldingRange } from 'vscode-languageserver/node';
import type { Node as SyntaxNode } from 'web-tree-sitter';

import { parse } from '../analysis';

// ── Helpers ───────────────────────────────────────────────────────────────────

const FOLDABLE_TYPES = new Set([
  'entry',
  'captures_section',
  'asserts_section',
  'options_section',
  'form_params_section',
  'query_string_params_section',
  'multipart_form_data_section',
  'basic_auth_section',
  'cookies_section',
  'response'
]);

function collectFoldable(node: SyntaxNode, out: FoldingRange[]): void {
  if (FOLDABLE_TYPES.has(node.type)) {
    const startLine = node.startPosition.row;
    const endLine = node.endPosition.row;
    if (endLine > startLine) {
      out.push(FoldingRange.create(startLine, endLine));
    }
  }
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) collectFoldable(child, out);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Return folding ranges for all entries and their sections.
 * Each `entry` node folds, as does each response section inside it.
 */
export function getFoldingRanges(text: string): FoldingRange[] {
  if (!text) return [];

  let tree;
  try {
    tree = parse(text);
  } catch {
    return [];
  }

  const ranges: FoldingRange[] = [];
  collectFoldable(tree.rootNode, ranges);
  return ranges;
}
