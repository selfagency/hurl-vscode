import { Hover, MarkupContent } from 'vscode-languageserver/node';
import type { Node as SyntaxNode, Tree } from 'web-tree-sitter';

import {
  FILTERS,
  OPTION_KEYS,
  PREDICATES,
  QUERY_TYPES,
  getCaptures,
  getEntries,
  getCurrentSection,
  nodeAtPosition,
  parse
} from '../analysis';

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Return hover content for the given cursor position, or null if no hover applies.
 * Returns null when the document cannot be parsed or no recognized construct is found.
 */
export function getHover(text: string, line: number, col: number): Hover | null {
  if (!text) return null;

  let tree: Tree;
  try {
    tree = parse(text);
  } catch {
    return null;
  }

  const node = nodeAtPosition(tree, line, col);
  if (!node) return null;

  // Walk up the ancestor chain checking for well-known node types first
  let current: SyntaxNode | null = node;
  while (current) {
    const t = current.type;

    if (t === 'method') {
      return buildMethodHover(current.text.trim());
    }

    if (t === 'variable_name') {
      return buildVariableHover(current.text, tree, current.startPosition.row);
    }

    // `status` appears both as the HTTP status code number in a response line
    // (parent: `response`) and as the `status` query keyword in [Asserts].
    // Distinguish by checking which section context we are in.
    if (t === 'status') {
      const ctx = getCurrentSection(tree, line);
      if (ctx.type === 'section' && ctx.name === 'Asserts') {
        return buildQueryTypeHover('status');
      }
      return buildStatusCodeHover(current.text.trim());
    }

    // Known option key inside an `option` node
    if (t === 'key_string' && current.parent?.type === 'option') {
      return buildOptionKeyHover(current.text.trim());
    }

    current = current.parent;
  }

  // Text-based fallback: the grammar may use anonymous keyword nodes whose
  // type matches the keyword text. Check the leaf node's text against the
  // lookup tables within the relevant section context.
  if (node.childCount === 0) {
    const leafText = node.text?.trim();
    if (leafText) {
      const section = getCurrentSection(tree, line);

      if (section.type === 'section' && (section.name === 'Asserts' || section.name === 'Captures')) {
        const query = QUERY_TYPES.find(q => q.name === leafText);
        if (query) return buildQueryTypeHover(query.name);

        const filter = FILTERS.find(f => f.name === leafText);
        if (filter) return buildFilterHover(filter.name);

        const pred = PREDICATES.find(p => p.name === leafText);
        if (pred) return buildPredicateHover(pred.name);
      }

      if (section.type === 'section' && section.name === 'Options') {
        const opt = OPTION_KEYS.find(o => o.name === leafText);
        if (opt) return buildOptionKeyHover(opt.name);
      }
    }
  }

  return null;
}

// ── Hover builders ────────────────────────────────────────────────────────────

function md(value: string): MarkupContent {
  return { kind: 'markdown', value };
}

function buildMethodHover(method: string): Hover {
  const descriptions: Record<string, string> = {
    GET: 'Retrieves a resource. Safe and idempotent — does not modify data.',
    POST: 'Submits data to create or process a resource. May cause side effects.',
    PUT: 'Replaces a resource entirely at the target URI. Idempotent.',
    PATCH: 'Applies partial modifications to a resource.',
    DELETE: 'Deletes the specified resource. Idempotent.',
    HEAD: 'Like GET but returns only response headers with no body. Useful for checking existence.',
    OPTIONS: 'Returns the HTTP methods supported by the server for the specified URL.',
    CONNECT: 'Establishes a network tunnel through the proxy (used for HTTPS via HTTP proxy).',
    TRACE: 'Echoes the received request back to the sender for diagnostic purposes.'
  };
  const desc = descriptions[method] ?? `HTTP ${method} method`;
  return { contents: md(`**\`${method}\`** — HTTP Method\n\n${desc}`) };
}

function buildVariableHover(name: string, tree: Tree, refLine: number): Hover {
  const captures = getCaptures(tree);
  const entries = getEntries(tree);

  // Find the last entry whose startLine is at or before the reference line
  let entryIdx = -1;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].startLine <= refLine) { entryIdx = i; break; }
  }

  // Collect captures defined in all entries before the ref's entry
  for (let i = 0; i < entryIdx; i++) {
    const e = entries[i];
    const cap = captures.find(
      c => c.name === name && c.line >= e.startLine && c.line <= e.endLine
    );
    if (cap) {
      return {
        contents: md(`**\`{{${name}}}\`** — Captured variable\n\nDefined at line ${cap.line + 1}`)
      };
    }
  }

  return {
    contents: md(`**\`{{${name}}}\`** — Undefined variable\n\nNo \`[Captures]\` definition found before this usage.`)
  };
}

function buildStatusCodeHover(code: string): Hover {
  const STATUS_CODES: Record<number, string> = {
    100: 'Continue', 101: 'Switching Protocols', 102: 'Processing', 103: 'Early Hints',
    200: 'OK', 201: 'Created', 202: 'Accepted', 203: 'Non-Authoritative Information',
    204: 'No Content', 205: 'Reset Content', 206: 'Partial Content', 207: 'Multi-Status',
    208: 'Already Reported', 226: 'IM Used',
    300: 'Multiple Choices', 301: 'Moved Permanently', 302: 'Found', 303: 'See Other',
    304: 'Not Modified', 307: 'Temporary Redirect', 308: 'Permanent Redirect',
    400: 'Bad Request', 401: 'Unauthorized', 402: 'Payment Required', 403: 'Forbidden',
    404: 'Not Found', 405: 'Method Not Allowed', 406: 'Not Acceptable',
    407: 'Proxy Authentication Required', 408: 'Request Timeout', 409: 'Conflict',
    410: 'Gone', 411: 'Length Required', 412: 'Precondition Failed',
    413: 'Content Too Large', 414: 'URI Too Long', 415: 'Unsupported Media Type',
    416: 'Range Not Satisfiable', 417: 'Expectation Failed', 418: "I'm a Teapot",
    421: 'Misdirected Request', 422: 'Unprocessable Content', 423: 'Locked',
    424: 'Failed Dependency', 425: 'Too Early', 426: 'Upgrade Required',
    428: 'Precondition Required', 429: 'Too Many Requests',
    431: 'Request Header Fields Too Large', 451: 'Unavailable For Legal Reasons',
    500: 'Internal Server Error', 501: 'Not Implemented', 502: 'Bad Gateway',
    503: 'Service Unavailable', 504: 'Gateway Timeout', 505: 'HTTP Version Not Supported',
    506: 'Variant Also Negotiates', 507: 'Insufficient Storage', 508: 'Loop Detected',
    510: 'Not Extended', 511: 'Network Authentication Required'
  };

  const n = parseInt(code, 10);
  const label = STATUS_CODES[n] ?? 'Unknown Status Code';
  const cls =
    n < 200 ? 'Informational' :
    n < 300 ? 'Success' :
    n < 400 ? 'Redirection' :
    n < 500 ? 'Client Error' :
    'Server Error';

  return { contents: md(`**${n} ${label}** — HTTP Status\n\n*${cls}*`) };
}

function buildQueryTypeHover(name: string): Hover {
  const def = QUERY_TYPES.find(q => q.name === name);
  if (!def) return { contents: md(`**${name}** — Hurl query`) };
  const syntax = def.args ? `\n\n**Syntax:** \`${def.name} ${def.args}\`` : '';
  return { contents: md(`**\`${def.name}\`** — Query\n\n${def.description}${syntax}`) };
}

function buildFilterHover(name: string): Hover {
  const def = FILTERS.find(f => f.name === name);
  if (!def) return { contents: md(`**${name}** — Hurl filter`) };
  return { contents: md(`**\`${def.name}\`** — Filter\n\n${def.description}`) };
}

function buildPredicateHover(name: string): Hover {
  const def = PREDICATES.find(p => p.name === name);
  if (!def) return { contents: md(`**${name}** — Hurl predicate`) };
  return { contents: md(`**\`${def.name}\`** — Predicate\n\n${def.description}`) };
}

function buildOptionKeyHover(name: string): Hover {
  const def = OPTION_KEYS.find(o => o.name === name);
  if (!def) return { contents: md(`**${name}** — Hurl option`) };
  return { contents: md(`**\`${def.name}\`** — Option\n\n${def.description}`) };
}
