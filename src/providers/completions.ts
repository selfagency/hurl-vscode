import { CompletionItem, CompletionItemKind } from 'vscode-languageserver/node';

import {
  FILTERS,
  HTTP_METHODS,
  OPTION_KEYS,
  PREDICATES,
  QUERY_TYPES,
  SECTION_HEADERS,
  TEMPLATE_FUNCTIONS,
  getCaptures,
  getCurrentSection,
  nodeAtPosition,
  parse
} from '../analysis';

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Return context-aware completion items for the given (line, col) cursor position.
 * Returns [] when the document cannot be parsed or the context is unknown.
 */
export function getCompletions(text: string, line: number, col: number): CompletionItem[] {
  let tree;
  try {
    tree = parse(text);
  } catch {
    return [];
  }

  // 1. Variable template: cursor is inside `{{`
  if (isInsideTemplate(text, line, col)) {
    return templateCompletions(tree, line);
  }

  // 2. Section header: line starts with `[`
  const lineText = text.split(/\r?\n/)[line] ?? '';
  if (lineText.trimStart().startsWith('[')) {
    return sectionHeaderCompletions();
  }

  // 3. Context based on section
  const ctx = getCurrentSection(tree, line);

  switch (ctx.type) {
    case 'requestLine':
      return methodCompletions();

    case 'section':
      return sectionCompletions(ctx.name, lineText, col);

    case 'header':
      return []; // No static completions for request headers

    case 'responseLine':
      return []; // No static completions for response status lines

    case 'unknown':
    default:
      // Empty lines (e.g. at the end of a section) return a root-level node.
      // Fall back to a backward text scan for the nearest section header.
      const nearestSection = findNearestSection(text, line);
      if (nearestSection) return sectionCompletions(nearestSection, lineText, col);
      return methodCompletions();
  }
}

// ── Context detection ─────────────────────────────────────────────────────────

/** Returns true when the cursor is inside a `{{...}}` template expression. */
function isInsideTemplate(text: string, line: number, col: number): boolean {
  const lineText = text.split(/\r?\n/)[line] ?? '';
  const before = lineText.slice(0, col);
  // Check if there's an unclosed `{{` to the left of the cursor
  const lastOpen = before.lastIndexOf('{{');
  if (lastOpen === -1) return false;
  const lastClose = before.lastIndexOf('}}');
  return lastClose < lastOpen;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const HTTP_METHOD_SET = new Set(HTTP_METHODS);

/**
 * Scan backward from `line` to find the nearest Hurl section header (e.g. `[Asserts]`).
 * Stops and returns null if a request method line is encountered first (new entry boundary).
 */
function findNearestSection(text: string, line: number): string | null {
  const lines = text.split(/\r?\n/);
  for (let i = line - 1; i >= 0; i--) {
    const l = lines[i].trim();
    const sectionMatch = l.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) return sectionMatch[1]; // e.g. "Asserts", "Captures"
    // A request method line signals a new entry — stop scanning
    const firstWord = l.split(/\s+/)[0];
    if (firstWord && HTTP_METHOD_SET.has(firstWord.toUpperCase()) && firstWord === firstWord.toUpperCase()) break;
  }
  return null;
}

// ── Completion builders ───────────────────────────────────────────────────────

function methodCompletions(): CompletionItem[] {
  return HTTP_METHODS.map(m => ({
    label: m,
    kind: CompletionItemKind.Keyword,
    detail: 'HTTP method'
  }));
}

function sectionHeaderCompletions(): CompletionItem[] {
  return SECTION_HEADERS.map(s => ({
    label: s,
    kind: CompletionItemKind.Module,
    detail: 'Hurl section'
  }));
}

function templateCompletions(tree: ReturnType<typeof parse>, line: number): CompletionItem[] {
  const captures = getCaptures(tree);

  // Only offer captures defined BEFORE this line
  const visibleCaptures = captures.filter(c => c.line < line);
  const captureItems: CompletionItem[] = visibleCaptures.map(c => ({
    label: c.name,
    kind: CompletionItemKind.Variable,
    detail: `Captured variable (line ${c.line + 1})`
  }));

  const funcItems: CompletionItem[] = TEMPLATE_FUNCTIONS.map(f => ({
    label: f,
    kind: CompletionItemKind.Function,
    detail: 'Template function'
  }));

  return [...captureItems, ...funcItems];
}

function sectionCompletions(sectionName: string, lineText: string, col: number): CompletionItem[] {
  const trimmed = lineText.trimStart();

  switch (sectionName) {
    case 'Asserts':
      return assertsCompletions(trimmed, col);

    case 'Captures':
      return capturesCompletions(trimmed);

    case 'Options':
      return optionKeyCompletions();

    default:
      return []; // FormParams, QueryStringParams, etc. — no static completions
  }
}

function assertsCompletions(lineText: string, _col: number): CompletionItem[] {
  // If the line already has a query keyword, offer filters then predicates
  const queryNames = QUERY_TYPES.map(q => q.name);
  const firstWord = lineText.split(/\s+/)[0] ?? '';

  if (queryNames.includes(firstWord)) {
    // After query type: offer filters (chainable) then predicates
    return [
      ...FILTERS.map(f => ({
        label: f.name,
        kind: CompletionItemKind.Function,
        detail: `Filter — ${f.description}`
      })),
      ...PREDICATES.map(p => ({
        label: p.name,
        kind: CompletionItemKind.Operator,
        detail: `Predicate — ${p.description}`
      }))
    ];
  }

  // At line start: offer query types
  return QUERY_TYPES.map(q => ({
    label: q.name,
    kind: CompletionItemKind.EnumMember,
    detail: q.description,
    ...(q.args ? { insertText: `${q.name} ${q.args}` } : {})
  }));
}

function capturesCompletions(_lineText: string): CompletionItem[] {
  // Offer query types (the RHS of a capture line)
  return QUERY_TYPES.map(q => ({
    label: q.name,
    kind: CompletionItemKind.EnumMember,
    detail: q.description,
    ...(q.args ? { insertText: `${q.name} ${q.args}` } : {})
  }));
}

function optionKeyCompletions(): CompletionItem[] {
  return OPTION_KEYS.map(o => ({
    label: o.name,
    kind: CompletionItemKind.Property,
    detail: o.description
  }));
}

// ── resolveCompletion ─────────────────────────────────────────────────────────

/** Enrich a completion item with full markdown documentation on resolve. */
export function resolveCompletion(item: CompletionItem): CompletionItem {
  // Look up additional docs from lookup tables
  const queryDef = QUERY_TYPES.find(q => q.name === item.label);
  if (queryDef) {
    return {
      ...item,
      documentation: {
        kind: 'markdown',
        value: `**${queryDef.name}** query\n\n${queryDef.description}${queryDef.args ? `\n\n**Syntax:** \`${queryDef.name} ${queryDef.args}\`` : ''}`
      }
    };
  }

  const filterDef = FILTERS.find(f => f.name === item.label);
  if (filterDef) {
    return {
      ...item,
      documentation: {
        kind: 'markdown',
        value: `**${filterDef.name}** filter\n\n${filterDef.description}`
      }
    };
  }

  const predicateDef = PREDICATES.find(p => p.name === item.label);
  if (predicateDef) {
    return {
      ...item,
      documentation: {
        kind: 'markdown',
        value: `**${predicateDef.name}** predicate\n\n${predicateDef.description}`
      }
    };
  }

  const optionDef = OPTION_KEYS.find(o => o.name === item.label);
  if (optionDef) {
    return {
      ...item,
      documentation: {
        kind: 'markdown',
        value: `**${optionDef.name}**\n\n${optionDef.description}`
      }
    };
  }

  return item;
}

// Re-export nodeAtPosition so server.ts can use it for trigger character detection
export { nodeAtPosition };
