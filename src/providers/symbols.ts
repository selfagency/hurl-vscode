import { DocumentSymbol, Range, SymbolKind } from 'vscode-languageserver/node';
import type { Node as SyntaxNode } from 'web-tree-sitter';

import { getEntries, parse } from '../analysis';

// ── Helpers ───────────────────────────────────────────────────────────────────

function nodeRange(node: SyntaxNode): Range {
  return Range.create(
    node.startPosition.row,
    node.startPosition.column,
    node.endPosition.row,
    node.endPosition.column
  );
}

function findChildren(node: SyntaxNode, type: string): SyntaxNode[] {
  const out: SyntaxNode[] = [];
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child?.type === type) out.push(child);
  }
  return out;
}

function findDescendants(node: SyntaxNode, type: string): SyntaxNode[] {
  const out: SyntaxNode[] = [];
  if (node.type === type) out.push(node);
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) out.push(...findDescendants(child, type));
  }
  return out;
}

// Maps tree-sitter section node types to their display name
const SECTION_DISPLAY: Record<string, string> = {
  captures_section:           '[Captures]',
  asserts_section:            '[Asserts]',
  options_section:            '[Options]',
  form_params_section:        '[FormParams]',
  query_string_params_section:'[QueryStringParams]',
  multipart_form_data_section:'[MultipartFormData]',
  basic_auth_section:         '[BasicAuth]',
  cookies_section:            '[Cookies]'
};

const SECTION_TYPES = Object.keys(SECTION_DISPLAY);

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Return a hierarchical DocumentSymbol tree for the given Hurl source text.
 *
 * Structure:
 *   ▶ GET https://example.org  (Function)
 *     ▶ [Captures]             (Namespace)
 *       • csrf_token           (Variable)
 *     ▶ [Asserts]              (Namespace)
 */
export function getDocumentSymbols(text: string): DocumentSymbol[] {
  if (!text) return [];

  let tree;
  try {
    tree = parse(text);
  } catch {
    return [];
  }

  const entries = getEntries(tree);
  if (entries.length === 0) return [];

  return entries.map((entry, _i) => {
    const label = [entry.method, entry.url].filter(Boolean).join(' ') || 'entry';
    const entryRange = nodeRange(entry.node);

    // Build children: one DocumentSymbol per section inside this entry
    const sectionChildren: DocumentSymbol[] = [];

    for (const sectionType of SECTION_TYPES) {
      const sections = findDescendants(entry.node, sectionType);
      for (const section of sections) {
        const sectionName = SECTION_DISPLAY[sectionType];
        const grandchildren: DocumentSymbol[] = [];

        // [Captures]: each `capture` node contributes a Variable child
        if (sectionType === 'captures_section') {
          const captures = findDescendants(section, 'capture');
          for (const cap of captures) {
            const keyNode = findChildren(cap, 'key_string')[0];
            const capName = keyNode?.text?.trim() ?? 'capture';
            grandchildren.push(
              DocumentSymbol.create(
                capName,
                undefined,
                SymbolKind.Variable,
                nodeRange(cap),
                nodeRange(keyNode ?? cap)
              )
            );
          }
        }

        sectionChildren.push(
          DocumentSymbol.create(
            sectionName,
            undefined,
            SymbolKind.Namespace,
            nodeRange(section),
            nodeRange(section),
            grandchildren.length > 0 ? grandchildren : undefined
          )
        );
      }
    }

    return DocumentSymbol.create(
      label,
      undefined,
      SymbolKind.Function,
      entryRange,
      entryRange,
      sectionChildren.length > 0 ? sectionChildren : undefined
    );
  });
}
