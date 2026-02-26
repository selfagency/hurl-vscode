import * as assert from 'assert';
import { beforeAll, describe, it } from 'vitest';

import { initParser } from '../analysis';
import { getDefinition } from '../providers/definition';
import { getWasmPath } from '../wasm';

beforeAll(async () => {
  await initParser(getWasmPath());
});

// Sample with a variable captured in entry 1 and used in entry 2
const capturedText = [
  'GET https://example.org',          // line 0
  '',                                   // line 1
  'HTTP 200',                           // line 2
  '[Captures]',                         // line 3
  'my_token: jsonpath "$.token"',       // line 4
  '',                                   // line 5
  'GET https://example.org/{{my_token}}', // line 6
  '',                                   // line 7
  'HTTP 200',                           // line 8
].join('\n');

describe('getDefinition', () => {
  describe('variable reference → capture definition', () => {
    it('returns a location pointing to the capture line', () => {
      // Cursor on `my_token` inside {{my_token}} on line 6, col ~28
      const loc = getDefinition('file:///test.hurl', capturedText, 6, 28);
      assert.ok(loc, 'expected a location for defined variable');
      assert.strictEqual(loc.uri, 'file:///test.hurl');
      // The capture `my_token` is on line 4
      assert.strictEqual(loc.range.start.line, 4);
    });

    it('returns null for undefined variable', () => {
      const text = 'GET https://example.org/{{unknown}}\n\nHTTP 200\n';
      const loc = getDefinition('file:///test.hurl', text, 0, 28);
      assert.strictEqual(loc, null);
    });
  });

  describe('cursor not on a variable_name', () => {
    it('returns null when cursor is on the HTTP method', () => {
      const loc = getDefinition('file:///test.hurl', capturedText, 0, 1);
      assert.strictEqual(loc, null);
    });

    it('returns null for empty document', () => {
      const loc = getDefinition('file:///test.hurl', '', 0, 0);
      assert.strictEqual(loc, null);
    });
  });
});
