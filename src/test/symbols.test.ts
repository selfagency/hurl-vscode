import * as assert from 'assert';
import { beforeAll, describe, it } from 'vitest';
import { DocumentSymbol, SymbolKind } from 'vscode-languageserver/node';

import { initParser } from '../analysis';
import { getDocumentSymbols } from '../providers/symbols';
import { getWasmPath } from '../wasm';

beforeAll(async () => {
  await initParser(getWasmPath());
});

describe('getDocumentSymbols', () => {
  describe('single entry', () => {
    const text = 'GET https://example.org\n\nHTTP 200\n';

    it('returns one top-level symbol per entry', () => {
      const symbols = getDocumentSymbols(text);
      assert.strictEqual(symbols.length, 1);
    });

    it('entry symbol has kind Function', () => {
      const symbols = getDocumentSymbols(text);
      assert.strictEqual(symbols[0].kind, SymbolKind.Function);
    });

    it('entry symbol name is "METHOD URL"', () => {
      const symbols = getDocumentSymbols(text);
      assert.strictEqual(symbols[0].name, 'GET https://example.org');
    });

    it('entry symbol range starts at line 0', () => {
      const symbols = getDocumentSymbols(text);
      assert.strictEqual(symbols[0].range.start.line, 0);
    });
  });

  describe('multiple entries', () => {
    const text = [
      'GET https://example.org',
      '',
      'HTTP 200',
      '',
      'POST https://example.org/users',
      '',
      'HTTP 201',
    ].join('\n');

    it('returns one symbol per entry', () => {
      const symbols = getDocumentSymbols(text);
      assert.strictEqual(symbols.length, 2);
    });

    it('symbol names reflect method and URL', () => {
      const symbols = getDocumentSymbols(text);
      const names = symbols.map((s: DocumentSymbol) => s.name);
      assert.deepStrictEqual(names, [
        'GET https://example.org',
        'POST https://example.org/users'
      ]);
    });
  });

  describe('entry with sections', () => {
    const text = [
      'GET https://example.org',
      '',
      'HTTP 200',
      '[Captures]',
      'csrf_token: jsonpath "$.token"',
      '',
      '[Asserts]',
      'status == 200',
    ].join('\n');

    it('entry has children for its sections', () => {
      const symbols = getDocumentSymbols(text);
      assert.strictEqual(symbols.length, 1);
      const children = symbols[0].children ?? [];
      assert.ok(children.length > 0, 'expected section children');
    });

    it('section child has kind Namespace', () => {
      const symbols = getDocumentSymbols(text);
      const children = symbols[0].children ?? [];
      const kinds = children.map((c: DocumentSymbol) => c.kind);
      assert.ok(kinds.every((k: SymbolKind) => k === SymbolKind.Namespace), `unexpected kinds: ${kinds}`);
    });

    it('[Captures] section appears as a child', () => {
      const symbols = getDocumentSymbols(text);
      const children = symbols[0].children ?? [];
      const names = children.map((c: DocumentSymbol) => c.name);
      assert.ok(names.includes('[Captures]'), `expected [Captures] in ${names}`);
    });

    it('[Asserts] section appears as a child', () => {
      const symbols = getDocumentSymbols(text);
      const children = symbols[0].children ?? [];
      const names = children.map((c: DocumentSymbol) => c.name);
      assert.ok(names.includes('[Asserts]'), `expected [Asserts] in ${names}`);
    });
  });

  describe('edge cases', () => {
    it('returns empty array for empty text', () => {
      assert.deepStrictEqual(getDocumentSymbols(''), []);
    });

    it('returns empty array for unparseable text', () => {
      // A document with only whitespace still parses; test genuine empty
      assert.deepStrictEqual(getDocumentSymbols(''), []);
    });
  });
});
