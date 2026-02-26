import * as assert from 'assert';
import { beforeAll, describe, it } from 'vitest';

import { initParser } from '../analysis';
import { getSignatureHelp } from '../providers/signatureHelp';
import { getWasmPath } from '../wasm';

beforeAll(async () => {
  await initParser(getWasmPath());
});

describe('getSignatureHelp', () => {
  it('returns null for empty document', () => {
    assert.strictEqual(getSignatureHelp('', 0, 0), null);
  });

  it('returns null when not in [Asserts] or [Captures]', () => {
    const text = 'GET https://example.org\n\nHTTP 200\n';
    assert.strictEqual(getSignatureHelp(text, 0, 4), null);
  });

  it('returns signature help for jsonpath query', () => {
    const text = [
      'GET https://example.org',
      '',
      'HTTP 200',
      '[Asserts]',
      'jsonpath "',   // line 4 — cursor after opening quote
    ].join('\n');
    const help = getSignatureHelp(text, 4, 10);
    assert.ok(help, 'expected signature help for jsonpath');
    assert.ok(help.signatures.length > 0, 'expected at least one signature');
    assert.ok(
      help.signatures[0].label.includes('jsonpath'),
      `expected jsonpath in signature; got: ${help.signatures[0].label}`
    );
  });

  it('returns signature help for header query', () => {
    const text = [
      'GET https://example.org',
      '',
      'HTTP 200',
      '[Asserts]',
      'header "',   // line 4
    ].join('\n');
    const help = getSignatureHelp(text, 4, 8);
    assert.ok(help, 'expected signature help for header');
    assert.ok(help.signatures[0].label.includes('header'));
  });
});
