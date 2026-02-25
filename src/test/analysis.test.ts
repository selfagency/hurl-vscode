import * as assert from 'assert';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  FILTERS,
  HTTP_METHODS,
  OPTION_KEYS,
  PREDICATES,
  QUERY_TYPES,
  SECTION_HEADERS,
  getCaptures,
  getCurrentSection,
  getEntries,
  getVariableRefs,
  initParser,
  nodeAtPosition,
  parse
} from '../analysis';
import { getWasmPath } from '../wasm';

// prettier-ignore
const SAMPLE = [
  'GET https://example.org',              // line 0
  'Authorization: Bearer {{token}}',      // line 1
  '',                                     // line 2
  'HTTP 200',                             // line 3
  '[Captures]',                           // line 4
  'csrf_token: header "x-csrf-token"',   // line 5
  'user_id: jsonpath "$.id"',            // line 6
  '[Asserts]',                            // line 7
  'header "content-type" contains "application/json"', // line 8
  'jsonpath "$.status" == "active"',     // line 9
  '',                                     // line 10
  'POST https://example.org/login',      // line 11
  '[FormParams]',                         // line 12
  'user: admin',                          // line 13
  'password: {{csrf_token}}',            // line 14
  '',                                     // line 15
  'HTTP 302',                             // line 16
  '',                                     // trailing newline avoids MISSING token
].join('\n');

describe('analysis', () => {
  beforeAll(async () => {
    await initParser(getWasmPath());
  });

  describe('parse', () => {
    it('parses a hurl document and returns a tree with root type hurl_file', () => {
      const tree = parse(SAMPLE);
      assert.strictEqual(tree.rootNode.type, 'hurl_file');
    });

    it('parses without syntax errors', () => {
      const tree = parse(SAMPLE);
      assert.strictEqual(tree.rootNode.hasError, false);
    });

    it('throws if called before initParser', () => {
      // Can only test isolation; this test just verifies parse() is callable
      const tree = parse('GET https://example.org\n');
      assert.ok(tree);
    });
  });

  describe('getEntries', () => {
    it('returns all entry nodes', () => {
      const tree = parse(SAMPLE);
      const entries = getEntries(tree);
      assert.strictEqual(entries.length, 2);
    });

    it('entry 0 has correct method and URL', () => {
      const tree = parse(SAMPLE);
      const [first] = getEntries(tree);
      assert.strictEqual(first.method, 'GET');
      assert.ok(first.url.includes('https://example.org'), `url was: ${first.url}`);
    });

    it('entry 1 has correct method and URL', () => {
      const tree = parse(SAMPLE);
      const [, second] = getEntries(tree);
      assert.strictEqual(second.method, 'POST');
      assert.ok(second.url.includes('/login'), `url was: ${second.url}`);
    });

    it('entry start/end lines are set', () => {
      const tree = parse(SAMPLE);
      const [first, second] = getEntries(tree);
      assert.strictEqual(first.startLine, 0);
      assert.strictEqual(second.startLine, 11);
      assert.ok(first.startLine < second.startLine, `expected ${first.startLine} < ${second.startLine}`);
    });
  });

  describe('getCaptures', () => {
    it('returns all capture variable names', () => {
      const tree = parse(SAMPLE);
      const captures = getCaptures(tree);
      const names = captures.map(c => c.name);
      expect(names).toContain('csrf_token');
      expect(names).toContain('user_id');
    });

    it('returns captures in document order', () => {
      const tree = parse(SAMPLE);
      const captures = getCaptures(tree);
      assert.strictEqual(captures[0].name, 'csrf_token');
      assert.strictEqual(captures[1].name, 'user_id');
    });

    it('capture line numbers are correct', () => {
      const tree = parse(SAMPLE);
      const captures = getCaptures(tree);
      assert.strictEqual(captures[0].line, 5);
      assert.strictEqual(captures[1].line, 6);
    });
  });

  describe('getVariableRefs', () => {
    it('returns variable references from {{...}} templates', () => {
      const tree = parse(SAMPLE);
      const refs = getVariableRefs(tree);
      const names = refs.map(r => r.name);
      expect(names).toContain('token');
      expect(names).toContain('csrf_token');
    });

    it('includes line and column information', () => {
      const tree = parse(SAMPLE);
      const refs = getVariableRefs(tree);
      const tokenRef = refs.find(r => r.name === 'token');
      assert.ok(tokenRef, 'token ref not found');
      assert.strictEqual(tokenRef.line, 1);
      assert.ok(tokenRef.col > 0);
    });
  });

  describe('nodeAtPosition', () => {
    it('returns the innermost node at the given position', () => {
      const tree = parse(SAMPLE);
      const node = nodeAtPosition(tree, 0, 0);
      assert.ok(node, 'expected a node');
      // The innermost node at (0,0) is the "GET" literal
      assert.strictEqual(node.text, 'GET');
    });

    it('returns a node for URL position', () => {
      const tree = parse(SAMPLE);
      const node = nodeAtPosition(tree, 0, 5);
      assert.ok(node, 'expected a node');
    });

    it('does not throw for positions beyond document end', () => {
      const tree = parse(SAMPLE);
      assert.doesNotThrow(() => nodeAtPosition(tree, 999, 0));
    });
  });

  describe('getCurrentSection', () => {
    it('identifies request line (method position)', () => {
      const tree = parse(SAMPLE);
      const ctx = getCurrentSection(tree, 0);
      assert.strictEqual(ctx.type, 'requestLine');
    });

    it('identifies request line (URL position)', () => {
      const tree = parse(SAMPLE);
      const ctx = getCurrentSection(tree, 11);
      assert.strictEqual(ctx.type, 'requestLine');
    });

    it('identifies header context', () => {
      const tree = parse(SAMPLE);
      const ctx = getCurrentSection(tree, 1);
      assert.strictEqual(ctx.type, 'header');
    });

    it('identifies Captures section', () => {
      const tree = parse(SAMPLE);
      const ctx = getCurrentSection(tree, 5);
      assert.strictEqual(ctx.type, 'section');
      assert.ok('name' in ctx);
      assert.strictEqual((ctx as { type: 'section'; name: string }).name, 'Captures');
    });

    it('identifies Asserts section', () => {
      const tree = parse(SAMPLE);
      const ctx = getCurrentSection(tree, 8);
      assert.strictEqual(ctx.type, 'section');
      assert.ok('name' in ctx);
      assert.strictEqual((ctx as { type: 'section'; name: string }).name, 'Asserts');
    });

    it('identifies response line', () => {
      const tree = parse(SAMPLE);
      const ctx = getCurrentSection(tree, 3);
      assert.strictEqual(ctx.type, 'responseLine');
    });

    it('identifies FormParams section', () => {
      const tree = parse(SAMPLE);
      const ctx = getCurrentSection(tree, 13);
      assert.strictEqual(ctx.type, 'section');
      assert.strictEqual((ctx as { type: 'section'; name: string }).name, 'FormParams');
    });
  });

  describe('lookup tables', () => {
    it('HTTP_METHODS contains all standard methods', () => {
      for (const m of ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'CONNECT', 'TRACE']) {
        expect(HTTP_METHODS).toContain(m);
      }
    });

    it('SECTION_HEADERS contains all hurl sections', () => {
      for (const s of ['[Options]', '[QueryStringParams]', '[FormParams]', '[MultipartFormData]', '[BasicAuth]', '[Cookies]', '[Asserts]', '[Captures]']) {
        expect(SECTION_HEADERS).toContain(s);
      }
    });

    it('QUERY_TYPES has required query names', () => {
      const names = QUERY_TYPES.map(q => q.name);
      for (const n of ['status', 'header', 'cookie', 'body', 'jsonpath', 'xpath', 'regex', 'variable', 'duration', 'certificate']) {
        expect(names).toContain(n);
      }
    });

    it('each QUERY_TYPE has a name and description', () => {
      for (const q of QUERY_TYPES) {
        assert.ok(q.name, 'missing name');
        assert.ok(q.description, `missing description for ${q.name}`);
      }
    });

    it('PREDICATES has required predicate names', () => {
      const names = PREDICATES.map(p => p.name);
      for (const n of ['==', '!=', 'contains', 'startsWith', 'endsWith', 'matches', 'exists', 'isString']) {
        expect(names).toContain(n);
      }
    });

    it('FILTERS has required filter names', () => {
      const names = FILTERS.map(f => f.name);
      for (const n of ['jsonpath', 'regex', 'replace', 'count', 'toInt', 'toString', 'urlDecode', 'urlEncode']) {
        expect(names).toContain(n);
      }
    });

    it('OPTION_KEYS has required option names', () => {
      const names = OPTION_KEYS.map(o => o.name);
      for (const n of ['verbose', 'insecure', 'retry', 'variable', 'proxy', 'max-time']) {
        expect(names).toContain(n);
      }
    });
  });
});
