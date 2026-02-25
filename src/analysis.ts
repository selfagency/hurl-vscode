import { Parser, Language } from 'web-tree-sitter';
import type { Node as SyntaxNode, Tree } from 'web-tree-sitter';

// ── Public types ──────────────────────────────────────────────────────────────

export interface EntryNode {
  node: SyntaxNode;
  method: string;
  url: string;
  startLine: number;
  endLine: number;
}

export interface CaptureNode {
  node: SyntaxNode;
  name: string;
  line: number;
}

export interface VarRefNode {
  node: SyntaxNode;
  name: string;
  line: number;
  col: number;
}

export type SectionContext =
  | { type: 'requestLine' }
  | { type: 'header' }
  | { type: 'section'; name: string }
  | { type: 'body' }
  | { type: 'responseLine' }
  | { type: 'unknown' };

export interface QueryDef {
  name: string;
  description: string;
  args?: string;
}

export interface PredicateDef {
  name: string;
  description: string;
}

export interface FilterDef {
  name: string;
  description: string;
}

export interface OptionKeyDef {
  name: string;
  description: string;
}

// ── Module state ──────────────────────────────────────────────────────────────

let _initialized = false;
let _parser: Parser | null = null;

// ── Initialisation ────────────────────────────────────────────────────────────

/**
 * Initialize the tree-sitter parser. Must be called once before `parse()`.
 * Subsequent calls replace the active parser (useful in tests).
 */
export async function initParser(wasmPath: string): Promise<void> {
  if (!_initialized) {
    await Parser.init();
    _initialized = true;
  }
  _parser = new Parser();
  const lang = await Language.load(wasmPath);
  _parser.setLanguage(lang);
}

// ── Parsing ───────────────────────────────────────────────────────────────────

/** Parse Hurl source text. Throws if `initParser` has not been called. */
export function parse(text: string): Tree {
  if (!_parser) throw new Error('Parser not initialized; call initParser() first');
  const tree = _parser.parse(text);
  if (!tree) throw new Error('Parser returned null tree');
  return tree;
}

// ── AST helpers ───────────────────────────────────────────────────────────────

function findNodes(node: SyntaxNode, type: string): SyntaxNode[] {
  const results: SyntaxNode[] = [];
  if (node.type === type) results.push(node);
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) results.push(...findNodes(child, type));
  }
  return results;
}

function findFirstChild(node: SyntaxNode, type: string): SyntaxNode | null {
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child?.type === type) return child;
  }
  return null;
}

// ── Structural extractions ────────────────────────────────────────────────────

/** Return all entries (each request + optional response block) in document order. */
export function getEntries(tree: Tree): EntryNode[] {
  return findNodes(tree.rootNode, 'entry').map(n => {
    const req = findFirstChild(n, 'request');
    let method = '';
    let url = '';
    if (req) {
      const methodNode = findFirstChild(req, 'method');
      const urlNode = findFirstChild(req, 'value_string');
      method = methodNode?.text?.trim() ?? '';
      url = urlNode?.text?.trim() ?? '';
    }
    return { node: n, method, url, startLine: n.startPosition.row, endLine: n.endPosition.row };
  });
}

/** Return all capture definitions (key in a `[Captures]` section) in document order. */
export function getCaptures(tree: Tree): CaptureNode[] {
  return findNodes(tree.rootNode, 'capture').map(n => {
    const keyNode = findFirstChild(n, 'key_string');
    return { node: n, name: keyNode?.text?.trim() ?? '', line: n.startPosition.row };
  });
}

/** Return all `{{varname}}` template references in document order. */
export function getVariableRefs(tree: Tree): VarRefNode[] {
  return findNodes(tree.rootNode, 'variable_name').map(n => ({
    node: n,
    name: n.text,
    line: n.startPosition.row,
    col: n.startPosition.column
  }));
}

/** Return the deepest syntax node that covers the given (line, col) position. */
export function nodeAtPosition(tree: Tree, line: number, col: number): SyntaxNode | null {
  return tree.rootNode.descendantForPosition({ row: line, column: col });
}

// Section type → display name map (tree-sitter node type → Hurl section name)
const SECTION_NODE_TO_NAME: Record<string, string> = {
  captures_section: 'Captures',
  asserts_section: 'Asserts',
  options_section: 'Options',
  form_params_section: 'FormParams',
  query_string_params_section: 'QueryStringParams',
  multipart_form_data_section: 'MultipartFormData',
  basic_auth_section: 'BasicAuth',
  cookies_section: 'Cookies'
};

/**
 * Identify the section context at the given line number.
 * Useful for context-aware completions.
 */
export function getCurrentSection(tree: Tree, line: number): SectionContext {
  const node = nodeAtPosition(tree, line, 0);
  if (!node) return { type: 'unknown' };

  let current: SyntaxNode | null = node;
  while (current) {
    const t = current.type;

    if (t === 'method') return { type: 'requestLine' };

    if (t === 'request' && current.startPosition.row === line) return { type: 'requestLine' };

    // `header` appears both as an HTTP request header container (child of `request`)
    // and as the keyword in a `header_query`. Only treat it as a header context when
    // it is a direct child of `request`, not when inside a query.
    if (t === 'header' && current.parent?.type === 'request') return { type: 'header' };

    if (t in SECTION_NODE_TO_NAME) return { type: 'section', name: SECTION_NODE_TO_NAME[t] };

    if (t === 'response' && current.startPosition.row === line) return { type: 'responseLine' };

    if (t === 'body') return { type: 'body' };

    current = current.parent;
  }

  return { type: 'unknown' };
}

// ── Lookup tables ─────────────────────────────────────────────────────────────

export const HTTP_METHODS: string[] = [
  'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'CONNECT', 'TRACE'
];

export const SECTION_HEADERS: string[] = [
  '[Options]',
  '[QueryStringParams]',
  '[FormParams]',
  '[MultipartFormData]',
  '[BasicAuth]',
  '[Cookies]',
  '[Asserts]',
  '[Captures]'
];

export const QUERY_TYPES: QueryDef[] = [
  { name: 'status', description: 'HTTP response status code' },
  { name: 'version', description: 'HTTP response version (e.g. HTTP/1.1)' },
  { name: 'header', description: 'HTTP response header value', args: '"<name>"' },
  { name: 'cookie', description: 'Cookie value from the response', args: '"<name>"' },
  { name: 'body', description: 'HTTP response body as a string' },
  { name: 'bytes', description: 'HTTP response body as raw bytes' },
  { name: 'xpath', description: 'XPath 1.0 query on an XML/HTML response body', args: '"<expression>"' },
  { name: 'jsonpath', description: 'JSONPath query on a JSON response body', args: '"<expression>"' },
  { name: 'regex', description: 'Regex applied to the response body; returns first capture group', args: '"<pattern>"' },
  { name: 'sha256', description: 'SHA-256 hash of the response body as bytes' },
  { name: 'md5', description: 'MD5 hash of the response body as bytes' },
  { name: 'url', description: 'Effective URL after all redirects' },
  { name: 'redirects', description: 'List of redirect URLs followed during the request' },
  { name: 'ip', description: 'Server IP address used for the connection' },
  { name: 'variable', description: 'Value of a named variable', args: '"<name>"' },
  { name: 'duration', description: 'Total request duration in milliseconds' },
  { name: 'certificate', description: 'SSL certificate field', args: '"Subject" | "Issuer" | "Start-Date" | "Expire-Date" | "Serial-Number"' }
];

export const PREDICATES: PredicateDef[] = [
  { name: '==', description: 'Equal to' },
  { name: '!=', description: 'Not equal to' },
  { name: '>', description: 'Greater than' },
  { name: '>=', description: 'Greater than or equal' },
  { name: '<', description: 'Less than' },
  { name: '<=', description: 'Less than or equal' },
  { name: 'startsWith', description: 'String starts with the given value' },
  { name: 'endsWith', description: 'String ends with the given value' },
  { name: 'contains', description: 'String or collection contains the given value' },
  { name: 'matches', description: 'String matches the given regex pattern' },
  { name: 'exists', description: 'Value is not null (exists)' },
  { name: 'isBoolean', description: 'Value is a boolean' },
  { name: 'isEmpty', description: 'Value is an empty string or empty collection' },
  { name: 'isFloat', description: 'Value is a float' },
  { name: 'isInteger', description: 'Value is an integer' },
  { name: 'isIpv4', description: 'Value is a valid IPv4 address' },
  { name: 'isIpv6', description: 'Value is a valid IPv6 address' },
  { name: 'isIsoDate', description: 'Value is an ISO 8601 date string' },
  { name: 'isList', description: 'Value is a list/array' },
  { name: 'isNumber', description: 'Value is a number (integer or float)' },
  { name: 'isObject', description: 'Value is a JSON object' },
  { name: 'isString', description: 'Value is a string' },
  { name: 'isUuid', description: 'Value is a UUID' }
];

export const FILTERS: FilterDef[] = [
  { name: 'base64Decode', description: 'Decode a base64 string to bytes' },
  { name: 'base64Encode', description: 'Encode bytes to a base64 string' },
  { name: 'count', description: 'Return the number of elements in a collection' },
  { name: 'daysAfterNow', description: 'Number of days between the value and now (positive if in the future)' },
  { name: 'daysBeforeNow', description: 'Number of days between the value and now (positive if in the past)' },
  { name: 'decode', description: 'Decode bytes using the specified charset', },
  { name: 'first', description: 'Return the first element of a collection' },
  { name: 'dateFormat', description: 'Format a date using strftime format string' },
  { name: 'htmlEscape', description: 'Escape HTML special characters (&, <, >, ", \')' },
  { name: 'htmlUnescape', description: 'Unescape HTML entities back to characters' },
  { name: 'jsonpath', description: 'Apply a JSONPath expression to a JSON value' },
  { name: 'last', description: 'Return the last element of a collection' },
  { name: 'location', description: 'Return the URL from a Location header after redirect' },
  { name: 'nth', description: 'Return the Nth element of a collection (0-based)' },
  { name: 'regex', description: 'Apply a regex and return the first capture group' },
  { name: 'replace', description: 'Replace all occurrences of a literal string' },
  { name: 'replaceRegex', description: 'Replace matches of a regex pattern' },
  { name: 'split', description: 'Split a string into a list using a separator' },
  { name: 'toDate', description: 'Parse a string into a date using strptime format' },
  { name: 'toFloat', description: 'Parse a string as a float number' },
  { name: 'toHex', description: 'Convert bytes to a lowercase hex string' },
  { name: 'toInt', description: 'Parse a string as an integer' },
  { name: 'toString', description: 'Convert a value to its string representation' },
  { name: 'urlDecode', description: 'Percent-decode a URL-encoded string' },
  { name: 'urlEncode', description: 'Percent-encode a string for use in a URL' },
  { name: 'urlQueryParam', description: 'Extract the value of a query parameter from a URL' },
  { name: 'utf8Decode', description: 'Decode bytes as a UTF-8 string' },
  { name: 'utf8Encode', description: 'Encode a string as UTF-8 bytes' },
  { name: 'xpath', description: 'Apply an XPath 1.0 expression to an XML value' }
];

export const OPTION_KEYS: OptionKeyDef[] = [
  { name: 'aws-sigv4', description: 'AWS SigV4 signing: "provider1[:provider2[:region[:service]]]"' },
  { name: 'cacert', description: 'CA certificate bundle file for peer verification' },
  { name: 'cert', description: 'Client certificate file (PEM/DER)' },
  { name: 'key', description: 'Client private key file' },
  { name: 'compressed', description: 'Request a compressed response (Accept-Encoding)' },
  { name: 'connect-timeout', description: 'Maximum time in seconds to wait for a connection' },
  { name: 'delay', description: 'Delay in milliseconds before this request is sent' },
  { name: 'follow-redirect', description: 'Follow HTTP 3xx redirects' },
  { name: 'follow-redirect-trusted', description: 'Follow redirects, sending credentials to all hosts' },
  { name: 'http1.0', description: 'Use HTTP/1.0 protocol' },
  { name: 'http1.1', description: 'Use HTTP/1.1 protocol' },
  { name: 'http2', description: 'Use HTTP/2 protocol' },
  { name: 'http3', description: 'Use HTTP/3 protocol' },
  { name: 'insecure', description: 'Skip SSL/TLS certificate verification' },
  { name: 'ipv6', description: 'Resolve names to IPv6 addresses' },
  { name: 'limit-rate', description: 'Maximum transfer rate in bytes/second' },
  { name: 'location', description: 'Follow HTTP redirects (alias for follow-redirect)' },
  { name: 'location-trusted', description: 'Follow redirects sending credentials (alias)' },
  { name: 'max-redirs', description: 'Maximum number of redirects to follow' },
  { name: 'max-time', description: 'Maximum total time for the request in seconds' },
  { name: 'output', description: 'Write response body to this file' },
  { name: 'path-as-is', description: 'Do not normalize /../ and /./ sequences in the URL path' },
  { name: 'proxy', description: 'Use this proxy server (e.g. http://proxy:3128)' },
  { name: 'repeat', description: 'Repeat this entry N times' },
  { name: 'retry', description: 'Number of retry attempts on failure' },
  { name: 'retry-interval', description: 'Milliseconds to wait between retries' },
  { name: 'skip', description: 'Skip this entry (do not execute)' },
  { name: 'unix-socket', description: 'Connect via this Unix domain socket path' },
  { name: 'user', description: 'HTTP authentication credentials as "user:password"' },
  { name: 'variable', description: 'Set a variable: "name=value"' },
  { name: 'verbose', description: 'Enable verbose output for this entry' },
  { name: 'very-verbose', description: 'Enable very verbose output for this entry' }
];

export const TEMPLATE_FUNCTIONS: string[] = ['newUuid', 'newDate'];

export const HTTP_VERSIONS: string[] = ['HTTP', 'HTTP/1.0', 'HTTP/1.1', 'HTTP/2', 'HTTP/3'];
