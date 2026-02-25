import * as assert from 'assert';
import { beforeAll, describe, it } from 'vitest';
import { CompletionItemKind } from 'vscode-languageserver/node';

import { initParser } from '../analysis';
import { getCompletions } from '../providers/completions';
import { getWasmPath } from '../wasm';

beforeAll(async () => {
  await initParser(getWasmPath());
});

function labels(items: ReturnType<typeof getCompletions>): string[] {
  return items.map(i => (typeof i.label === 'string' ? i.label : ''));
}

describe('getCompletions', () => {
  describe('method line (start of entry)', () => {
    it('suggests HTTP methods at the start of a blank line after an entry', () => {
      // Position is at the start of line 3 (empty line = new entry start)
      const text = `GET https://example.org\n\nHTTP 200\n\n`;
      const items = getCompletions(text, 4, 0);
      const ls = labels(items);
      for (const m of ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']) {
        assert.ok(ls.includes(m), `expected "${m}" in completions; got: ${ls.join(', ')}`);
      }
    });

    it('method completions have Keyword kind', () => {
      const text = `\n`;
      const items = getCompletions(text, 0, 0);
      const methods = items.filter(i => labels([i]).some(l => ['GET', 'POST'].includes(l)));
      assert.ok(methods.length > 0);
      for (const m of methods) {
        assert.strictEqual(m.kind, CompletionItemKind.Keyword);
      }
    });
  });

  describe('[Asserts] section', () => {
    it('suggests query types at line start in [Asserts]', () => {
      const text = [
        'GET https://example.org',
        '',
        'HTTP 200',
        '[Asserts]',
        '',  // line 4 — cursor here
      ].join('\n');
      const items = getCompletions(text, 4, 0);
      const ls = labels(items);
      for (const q of ['status', 'header', 'jsonpath', 'xpath', 'body']) {
        assert.ok(ls.includes(q), `expected "${q}"; got: ${ls.join(', ')}`);
      }
    });
  });

  describe('[Captures] section', () => {
    it('suggests query types in [Captures] section', () => {
      const text = [
        'GET https://example.org',
        '',
        'HTTP 200',
        '[Captures]',
        '',  // line 4
      ].join('\n');
      const items = getCompletions(text, 4, 0);
      const ls = labels(items);
      for (const q of ['header', 'jsonpath', 'xpath', 'body', 'cookie']) {
        assert.ok(ls.includes(q), `expected "${q}"; got: ${ls.join(', ')}`);
      }
    });
  });

  describe('[Options] section', () => {
    it('suggests option keys in [Options] section', () => {
      const text = [
        'GET https://example.org',
        '[Options]',
        '',  // line 2
        '',
        'HTTP 200',
      ].join('\n');
      const items = getCompletions(text, 2, 0);
      const ls = labels(items);
      for (const o of ['verbose', 'insecure', 'retry', 'proxy']) {
        assert.ok(ls.includes(o), `expected "${o}"; got: ${ls.join(', ')}`);
      }
    });
  });

  describe('variable template ({{...}})', () => {
    it('suggests captured variable names inside {{', () => {
      const text = [
        'GET https://example.org',
        '',
        'HTTP 200',
        '[Captures]',
        'my_token: jsonpath "$.token"',
        '',
        'GET https://example.org/{{',  // line 6, col 26
      ].join('\n');
      const items = getCompletions(text, 6, 26);
      const ls = labels(items);
      assert.ok(ls.includes('my_token'), `expected "my_token"; got: ${ls.join(', ')}`);
    });
  });

  describe('section headers', () => {
    it('suggests section headers after a response line', () => {
      const text = [
        'GET https://example.org',
        '',
        'HTTP 200',
        '[',  // line 3, col 1
      ].join('\n');
      const items = getCompletions(text, 3, 1);
      const ls = labels(items);
      for (const s of ['[Captures]', '[Asserts]', '[Options]']) {
        assert.ok(ls.includes(s), `expected "${s}"; got: ${ls.join(', ')}`);
      }
    });
  });

  describe('return shape', () => {
    it('each item has a label and kind', () => {
      const text = `GET https://example.org\n\nHTTP 200\n\n`;
      const items = getCompletions(text, 4, 0);
      assert.ok(items.length > 0);
      for (const item of items) {
        assert.ok(item.label, 'missing label');
        assert.ok(typeof item.kind === 'number', 'missing kind');
      }
    });
  });
});
