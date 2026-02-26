import * as assert from 'assert';
import { beforeAll, describe, it } from 'vitest';

import { initParser } from '../analysis';
import { getFoldingRanges } from '../providers/folding';
import { getWasmPath } from '../wasm';

beforeAll(async () => {
  await initParser(getWasmPath());
});

describe('getFoldingRanges', () => {
  const singleEntry = 'GET https://example.org\n\nHTTP 200\n';

  it('returns at least one folding range for a single entry', () => {
    const ranges = getFoldingRanges(singleEntry);
    assert.ok(ranges.length >= 1, 'expected at least one range');
  });

  it('entry range starts at line 0', () => {
    const ranges = getFoldingRanges(singleEntry);
    const entry = ranges.find(r => r.startLine === 0);
    assert.ok(entry, 'expected range starting at line 0');
  });

  it('returns empty array for empty text', () => {
    assert.deepStrictEqual(getFoldingRanges(''), []);
  });

  describe('multiple entries', () => {
    const text = [
      'GET https://example.org',   // 0
      '',                           // 1
      'HTTP 200',                   // 2
      '',                           // 3
      'POST https://example.org',  // 4
      '',                           // 5
      'HTTP 201',                   // 6
    ].join('\n');

    it('returns one range per entry', () => {
      const ranges = getFoldingRanges(text);
      const entryRanges = ranges.filter(r => r.startLine === 0 || r.startLine === 4);
      assert.strictEqual(entryRanges.length, 2, `expected 2 entry ranges; got: ${JSON.stringify(ranges)}`);
    });
  });

  describe('entry with sections', () => {
    const text = [
      'GET https://example.org',      // 0
      '',                              // 1
      'HTTP 200',                      // 2
      '[Captures]',                    // 3
      'tok: jsonpath "$.token"',       // 4
      '',                              // 5
      '[Asserts]',                     // 6
      'status == 200',                 // 7
    ].join('\n');

    it('includes section folding ranges', () => {
      const ranges = getFoldingRanges(text);
      // Expect a range starting at line 3 ([Captures]) and one at line 6 ([Asserts])
      const captureRange = ranges.find(r => r.startLine === 3);
      const assertRange = ranges.find(r => r.startLine === 6);
      assert.ok(captureRange, `expected [Captures] range at line 3; got: ${JSON.stringify(ranges)}`);
      assert.ok(assertRange, `expected [Asserts] range at line 6; got: ${JSON.stringify(ranges)}`);
    });
  });
});
