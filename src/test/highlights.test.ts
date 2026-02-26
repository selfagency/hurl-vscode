import * as assert from 'assert';
import { beforeAll, describe, it } from 'vitest';
import { DocumentHighlightKind } from 'vscode-languageserver/node';

import { initParser } from '../analysis';
import { getDocumentHighlights } from '../providers/highlights';
import { getWasmPath } from '../wasm';

beforeAll(async () => {
  await initParser(getWasmPath());
});

const text = [
  'GET https://example.org',
  '',
  'HTTP 200',
  '[Captures]',
  'tok: jsonpath "$.token"',        // line 4 — Write (definition)
  '',
  'GET https://api.example.org/{{tok}}', // line 6 — Read (usage)
  '',
  'HTTP 200',
].join('\n');

describe('getDocumentHighlights', () => {
  describe('cursor on a variable usage', () => {
    it('returns at least one highlight', () => {
      // cursor on `tok` in {{tok}} on line 6 (tok starts at col 32)
      const hls = getDocumentHighlights(text, 6, 30);
      assert.ok(hls.length >= 1, `expected highlights; got ${hls.length}`);
    });

    it('usage is highlighted with Read kind', () => {
      const hls = getDocumentHighlights(text, 6, 30);
      const usage = hls.find(h => h.range.start.line === 6);
      assert.ok(usage, 'expected highlight on line 6');
      assert.strictEqual(usage.kind, DocumentHighlightKind.Read);
    });

    it('definition is highlighted with Write kind', () => {
      const hls = getDocumentHighlights(text, 6, 30);
      const def = hls.find(h => h.range.start.line === 4);
      assert.ok(def, 'expected highlight on line 4 (definition)');
      assert.strictEqual(def.kind, DocumentHighlightKind.Write);
    });
  });

  describe('cursor not on a variable', () => {
    it('returns empty array for cursor on HTTP method', () => {
      const hls = getDocumentHighlights(text, 0, 1);
      assert.deepStrictEqual(hls, []);
    });

    it('returns empty array for empty document', () => {
      const hls = getDocumentHighlights('', 0, 0);
      assert.deepStrictEqual(hls, []);
    });
  });
});
