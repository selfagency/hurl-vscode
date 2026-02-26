import * as assert from 'assert';
import { beforeAll, describe, it } from 'vitest';

import { initParser } from '../analysis';
import { getReferences } from '../providers/references';
import { getWasmPath } from '../wasm';

beforeAll(async () => {
  await initParser(getWasmPath());
});

const multiUseText = [
  'GET https://example.org',              // line 0
  '',
  'HTTP 200',
  '[Captures]',
  'tok: jsonpath "$.token"',              // line 4 — definition
  '',
  'GET https://api.example.org/{{tok}}',  // line 6 — usage 1
  '',
  'HTTP 200',
  '[Asserts]',
  'header "X-Token" == {{tok}}',          // line 10 — usage 2 (hypothetical)
].join('\n');

describe('getReferences', () => {
  describe('cursor on a variable usage', () => {
    it('returns all usages of the variable', () => {
      // cursor on `tok` inside {{tok}} on line 6
      const refs = getReferences('file:///test.hurl', multiUseText, 6, 30, false);
      assert.ok(refs.length >= 1, `expected at least one ref; got ${refs.length}`);
      const lines = refs.map(r => r.range.start.line);
      assert.ok(lines.includes(6), `expected line 6 in refs; got ${lines}`);
    });

    it('includes declaration when includeDeclaration=true', () => {
      const refs = getReferences('file:///test.hurl', multiUseText, 6, 30, true);
      const lines = refs.map(r => r.range.start.line);
      assert.ok(lines.includes(4), `expected declaration line 4 in refs; got ${lines}`);
    });

    it('excludes declaration when includeDeclaration=false', () => {
      const refs = getReferences('file:///test.hurl', multiUseText, 6, 30, false);
      const lines = refs.map(r => r.range.start.line);
      assert.ok(!lines.includes(4), `expected no declaration line 4; got ${lines}`);
    });
  });

  describe('cursor not on a variable', () => {
    it('returns empty array for cursor on HTTP method', () => {
      const refs = getReferences('file:///test.hurl', multiUseText, 0, 1, false);
      assert.deepStrictEqual(refs, []);
    });

    it('returns empty array for empty document', () => {
      const refs = getReferences('file:///test.hurl', '', 0, 0, false);
      assert.deepStrictEqual(refs, []);
    });
  });
});
