import * as assert from 'assert';
import { beforeAll, describe, it } from 'vitest';

import { initParser } from '../analysis';
import { getHover } from '../providers/hover';
import { getWasmPath } from '../wasm';

beforeAll(async () => {
  await initParser(getWasmPath());
});

function hoverText(hover: ReturnType<typeof getHover>): string {
  if (!hover) return '';
  if (typeof hover.contents === 'string') return hover.contents;
  if ('value' in hover.contents) return hover.contents.value;
  return '';
}

describe('getHover', () => {
  describe('HTTP method', () => {
    it('returns hover content for GET method', () => {
      const text = `GET https://example.org\n\nHTTP 200\n`;
      const hover = getHover(text, 0, 1); // cursor on 'G' in GET
      assert.ok(hover, 'expected hover result for GET');
      const val = hoverText(hover);
      assert.ok(
        val.toLowerCase().includes('get'),
        `expected GET description in hover; got: ${val}`
      );
    });

    it('returns hover content for POST method', () => {
      const text = `POST https://example.org\n\nHTTP 201\n`;
      const hover = getHover(text, 0, 1);
      assert.ok(hover, 'expected hover result for POST');
      const val = hoverText(hover);
      assert.ok(
        val.toLowerCase().includes('post'),
        `expected POST description in hover; got: ${val}`
      );
    });

    it('hover content is markdown', () => {
      const text = `GET https://example.org\n\nHTTP 200\n`;
      const hover = getHover(text, 0, 0);
      assert.ok(hover);
      // Contents should be a MarkupContent with kind 'markdown'
      assert.ok(
        typeof hover.contents === 'object' && 'kind' in hover.contents,
        'expected MarkupContent object'
      );
      assert.strictEqual((hover.contents as { kind: string }).kind, 'markdown');
    });
  });

  describe('variable reference', () => {
    const capturedText = [
      'GET https://example.org',
      '',
      'HTTP 200',
      '[Captures]',
      'my_token: jsonpath "$.token"',
      '',
      'GET https://example.org/{{my_token}}',
      '',
      'HTTP 200',
    ].join('\n');

    it('returns "Defined at line N" for a known captured variable', () => {
      // Line 6: `GET https://example.org/{{my_token}}`
      // `{{` is at col 24, `my_token` starts at col 26
      const hover = getHover(capturedText, 6, 28);
      assert.ok(hover, 'expected hover for defined variable');
      const val = hoverText(hover);
      assert.ok(
        val.includes('my_token'),
        `expected variable name in hover; got: ${val}`
      );
      assert.ok(
        val.toLowerCase().includes('line') || /\d+/.test(val),
        `expected line reference in hover; got: ${val}`
      );
    });

    it('returns undefined indicator for an unknown variable', () => {
      const text = `GET https://example.org/{{unknown_var}}\n\nHTTP 200\n`;
      // `{{` is at col 24, `unknown_var` starts at col 26
      const hover = getHover(text, 0, 28);
      assert.ok(hover, 'expected hover for undefined variable');
      const val = hoverText(hover);
      assert.ok(
        val.toLowerCase().includes('undefined') || val.toLowerCase().includes('unknown'),
        `expected undefined indicator; got: ${val}`
      );
    });
  });

  describe('status code', () => {
    it('returns hover for HTTP 200 status code', () => {
      const text = `GET https://example.org\n\nHTTP 200\n`;
      // Line 2: `HTTP 200` — cursor on '200' at col 5
      const hover = getHover(text, 2, 5);
      assert.ok(hover, 'expected hover for status code');
      const val = hoverText(hover);
      assert.ok(
        val.includes('200') || val.toLowerCase().includes('ok'),
        `expected 200/OK in hover; got: ${val}`
      );
    });

    it('returns hover for HTTP 404 status code', () => {
      const text = `GET https://example.org\n\nHTTP 404\n`;
      const hover = getHover(text, 2, 5);
      assert.ok(hover, 'expected hover for 404');
      const val = hoverText(hover);
      assert.ok(
        val.includes('404') || val.toLowerCase().includes('not found'),
        `expected 404/Not Found in hover; got: ${val}`
      );
    });
  });

  describe('query types in [Asserts]', () => {
    it('returns hover for status query keyword', () => {
      const text = [
        'GET https://example.org',
        '',
        'HTTP 200',
        '[Asserts]',
        'status == 200',
      ].join('\n');
      // Line 4: `status == 200`, cursor on 'status' at col 0
      const hover = getHover(text, 4, 0);
      assert.ok(hover, 'expected hover for status query');
      const val = hoverText(hover);
      assert.ok(
        val.toLowerCase().includes('status'),
        `expected status description; got: ${val}`
      );
    });

    it('returns hover for jsonpath query keyword', () => {
      const text = [
        'GET https://example.org',
        '',
        'HTTP 200',
        '[Asserts]',
        'jsonpath "$.name" == "Alice"',
      ].join('\n');
      const hover = getHover(text, 4, 2);
      assert.ok(hover, 'expected hover for jsonpath query');
      const val = hoverText(hover);
      assert.ok(
        val.toLowerCase().includes('jsonpath'),
        `expected jsonpath description; got: ${val}`
      );
    });
  });

  describe('option keys in [Options]', () => {
    it('returns hover for verbose option key', () => {
      const text = [
        'GET https://example.org',
        '[Options]',
        'verbose: true',
        '',
        'HTTP 200',
      ].join('\n');
      // Line 2: `verbose: true`, cursor on 'verbose' at col 0
      const hover = getHover(text, 2, 3);
      assert.ok(hover, 'expected hover for verbose option');
      const val = hoverText(hover);
      assert.ok(
        val.toLowerCase().includes('verbose'),
        `expected verbose description; got: ${val}`
      );
    });
  });

  describe('null cases', () => {
    it('returns null on a blank line', () => {
      const text = `GET https://example.org\n\nHTTP 200\n`;
      const hover = getHover(text, 1, 0);
      assert.strictEqual(hover, null);
    });

    it('returns null when document cannot be parsed', () => {
      const hover = getHover('', 0, 0);
      assert.strictEqual(hover, null);
    });
  });
});
