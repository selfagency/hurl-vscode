import * as assert from 'assert';
import { beforeAll, describe, it } from 'vitest';
import { CodeActionKind } from 'vscode-languageserver/node';

import { initParser } from '../analysis';
import { getCodeActions } from '../providers/codeActions';
import { getWasmPath } from '../wasm';

beforeAll(async () => {
  await initParser(getWasmPath());
});

describe('getCodeActions', () => {
  it('returns empty array for empty text', () => {
    const actions = getCodeActions('file:///test.hurl', '', []);
    assert.deepStrictEqual(actions, []);
  });

  it('returns a quick fix for a lowercase method diagnostic', () => {
    const text = 'get https://example.org\n\nHTTP 200\n';
    // Diagnostic for method casing at line 0
    const diag = {
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } },
      message: 'HTTP method "get" should be uppercase (GET)',
      source: 'hurl'
    };
    const actions = getCodeActions('file:///test.hurl', text, [diag]);
    assert.ok(actions.length > 0, 'expected at least one code action');
    const fix = actions.find(a => a.title.includes('GET') || a.title.toLowerCase().includes('uppercase'));
    assert.ok(fix, `expected uppercase fix; got: ${JSON.stringify(actions.map(a => a.title))}`);
    assert.strictEqual(fix.kind, CodeActionKind.QuickFix);
  });

  it('returns empty array when no matching diagnostics', () => {
    const text = 'GET https://example.org\n\nHTTP 200\n';
    const actions = getCodeActions('file:///test.hurl', text, []);
    assert.deepStrictEqual(actions, []);
  });
});
