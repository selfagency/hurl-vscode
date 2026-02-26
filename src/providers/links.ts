import * as path from 'path';
import { DocumentLink, Range } from 'vscode-languageserver/node';
import type { Node as SyntaxNode } from 'web-tree-sitter';

import { parse } from '../analysis';

// ── Helpers ───────────────────────────────────────────────────────────────────

function findDescendants(node: SyntaxNode, type: string): SyntaxNode[] {
  const out: SyntaxNode[] = [];
  if (node.type === type) out.push(node);
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) out.push(...findDescendants(child, type));
  }
  return out;
}

/** Convert a document URI to a filesystem directory path. */
function dirFromUri(uri: string): string {
  // Strip file:// scheme
  const fspath = uri.startsWith('file://') ? uri.slice(7) : uri;
  return path.dirname(fspath);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Return DocumentLink items for `file,<path>` body references in the document.
 * The link target resolves the path relative to the document's directory.
 */
export function getDocumentLinks(uri: string, text: string): DocumentLink[] {
  if (!text) return [];

  let tree;
  try {
    tree = parse(text);
  } catch {
    return [];
  }

  const dir = dirFromUri(uri);
  const links: DocumentLink[] = [];

  // `file_value` nodes contain the file path in a `file,<path>;` body
  const fileValues = findDescendants(tree.rootNode, 'filename');
  for (const fv of fileValues) {
    const filePath = fv.text?.trim();
    if (!filePath) continue;

    // Resolve relative to the document directory
    const resolved = path.resolve(dir, filePath);
    const target = `file://${resolved}`;

    links.push(
      DocumentLink.create(
        Range.create(
          fv.startPosition.row,
          fv.startPosition.column,
          fv.endPosition.row,
          fv.endPosition.column
        ),
        target
      )
    );
  }

  return links;
}
