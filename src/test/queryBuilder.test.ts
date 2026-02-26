import * as assert from 'assert';
import { describe, it } from 'vitest';

import { FLAG_DEFS, buildHurlArgs, generateNonce } from '../webview/queryBuilder.utils';

describe('generateNonce', () => {
  it('returns a non-empty string', () => {
    assert.ok(generateNonce().length > 0);
  });

  it('returns different values on successive calls', () => {
    assert.notStrictEqual(generateNonce(), generateNonce());
  });

  it('returns a lowercase hex string', () => {
    assert.match(generateNonce(), /^[0-9a-f]+$/);
  });
});

describe('buildHurlArgs', () => {
  it('has the file path as the first argument', () => {
    const args = buildHurlArgs('/test.hurl', [], '/tmp/report');
    assert.strictEqual(args[0], '/test.hurl');
  });

  it('includes --report-json followed by the report path', () => {
    const args = buildHurlArgs('/test.hurl', [], '/tmp/report');
    const idx = args.indexOf('--report-json');
    assert.ok(idx !== -1, '--report-json not found');
    assert.strictEqual(args[idx + 1], '/tmp/report');
  });

  it('includes --from-entry and --to-entry when both are provided', () => {
    const args = buildHurlArgs('/test.hurl', [], '/tmp/r', 2, 3);
    const fromIdx = args.indexOf('--from-entry');
    const toIdx = args.indexOf('--to-entry');
    assert.ok(fromIdx !== -1, '--from-entry not found');
    assert.ok(toIdx !== -1, '--to-entry not found');
    assert.strictEqual(args[fromIdx + 1], '2');
    assert.strictEqual(args[toIdx + 1], '3');
  });

  it('uses fromEntry for both --from-entry and --to-entry when toEntry is omitted', () => {
    const args = buildHurlArgs('/test.hurl', [], '/tmp/r', 5);
    const fromIdx = args.indexOf('--from-entry');
    const toIdx = args.indexOf('--to-entry');
    assert.strictEqual(args[fromIdx + 1], '5');
    assert.strictEqual(args[toIdx + 1], '5');
  });

  it('omits --from-entry and --to-entry when fromEntry is not provided', () => {
    const args = buildHurlArgs('/test.hurl', [], '/tmp/r');
    assert.ok(!args.includes('--from-entry'));
    assert.ok(!args.includes('--to-entry'));
  });

  it('includes a boolean flag without a value argument', () => {
    const args = buildHurlArgs('/test.hurl', [{ name: 'verbose', type: 'boolean', value: '' }], '/tmp/r');
    assert.ok(args.includes('--verbose'));
    // The element after --verbose must not be an empty string
    const idx = args.indexOf('--verbose');
    assert.notStrictEqual(args[idx + 1], '');
  });

  it('includes a string flag with its value', () => {
    const args = buildHurlArgs('/test.hurl', [{ name: 'variable', type: 'string', value: 'foo=bar' }], '/tmp/r');
    const idx = args.indexOf('--variable');
    assert.ok(idx !== -1, '--variable not found');
    assert.strictEqual(args[idx + 1], 'foo=bar');
  });

  it('omits a string flag when its value is empty', () => {
    const args = buildHurlArgs('/test.hurl', [{ name: 'user', type: 'string', value: '' }], '/tmp/r');
    assert.ok(!args.includes('--user'));
  });

  it('handles multiple flags in order', () => {
    const flags = [
      { name: 'verbose', type: 'boolean' as const, value: '' },
      { name: 'variable', type: 'string' as const, value: 'key=val' }
    ];
    const args = buildHurlArgs('/test.hurl', flags, '/tmp/r');
    const verboseIdx = args.indexOf('--verbose');
    const varIdx = args.indexOf('--variable');
    assert.ok(verboseIdx !== -1);
    assert.ok(varIdx !== -1);
    assert.ok(verboseIdx < varIdx, '--verbose should appear before --variable');
  });
});

describe('FLAG_DEFS', () => {
  it('is a non-empty array', () => {
    assert.ok(FLAG_DEFS.length > 0);
  });

  it('has a verbose boolean flag', () => {
    const def = FLAG_DEFS.find(f => f.name === 'verbose');
    assert.ok(def, 'verbose flag not found');
    assert.strictEqual(def?.type, 'boolean');
  });

  it('has a variable string flag marked as repeatable', () => {
    const def = FLAG_DEFS.find(f => f.name === 'variable');
    assert.ok(def, 'variable flag not found');
    assert.strictEqual(def?.type, 'string');
    assert.strictEqual(def?.repeatable, true);
  });

  it('every flag has a non-empty name, valid type, and non-empty description', () => {
    for (const def of FLAG_DEFS) {
      assert.ok(def.name.length > 0, `flag has empty name`);
      assert.ok(
        ['boolean', 'string', 'number'].includes(def.type),
        `flag "${def.name}" has invalid type "${def.type}"`
      );
      assert.ok(def.description.length > 0, `flag "${def.name}" has empty description`);
    }
  });

  it('has no duplicate flag names', () => {
    const names = FLAG_DEFS.map(f => f.name);
    const unique = new Set(names);
    assert.strictEqual(unique.size, names.length, 'duplicate flag names found');
  });
});
