import * as assert from 'assert';
import { beforeAll, describe, it } from 'vitest';

import { initParser } from '../analysis';
import { TOKEN_TYPES, getSemanticTokens } from '../providers/semanticTokens';
import { getWasmPath } from '../wasm';

beforeAll(async () => {
  await initParser(getWasmPath());
});

/** Decode a flat SemanticTokens data array into structured token objects. */
function decodeTokens(data: number[]): Array<{ line: number; char: number; length: number; typeIndex: number }> {
  const out = [];
  let line = 0;
  let char = 0;
  for (let i = 0; i < data.length; i += 5) {
    const deltaLine = data[i];
    const deltaChar = data[i + 1];
    const length = data[i + 2];
    const typeIndex = data[i + 3];
    line += deltaLine;
    char = deltaLine > 0 ? deltaChar : char + deltaChar;
    out.push({ line, char, length, typeIndex });
  }
  return out;
}

describe('TOKEN_TYPES legend', () => {
  it('contains expected token type names', () => {
    assert.ok(TOKEN_TYPES.includes('type'), 'expected type in legend');
    assert.ok(TOKEN_TYPES.includes('comment'), 'expected comment in legend');
    assert.ok(TOKEN_TYPES.includes('string'), 'expected string in legend');
    assert.ok(TOKEN_TYPES.includes('number'), 'expected number in legend');
  });
});

describe('getSemanticTokens', () => {
  it('returns empty data for empty document', () => {
    const result = getSemanticTokens('');
    assert.deepStrictEqual(result.data, []);
  });

  it('data length is always a multiple of 5', () => {
    const texts = [
      'GET https://example.org\n\nHTTP 200\n',
      '# comment\nGET https://example.org\n\nHTTP 200\n',
      'POST https://api.example.org\n[Options]\nverbose: true\n\nHTTP 201\n'
    ];
    for (const text of texts) {
      const result = getSemanticTokens(text);
      assert.strictEqual(
        result.data.length % 5, 0,
        `data length ${result.data.length} is not a multiple of 5 for: ${JSON.stringify(text)}`
      );
    }
  });

  it('produces at least one token for a valid document', () => {
    const text = 'GET https://example.org\n\nHTTP 200\n';
    const result = getSemanticTokens(text);
    assert.ok(result.data.length >= 5, 'expected at least one token (5 integers)');
  });

  it('GET method gets the type token type', () => {
    const text = 'GET https://example.org\n\nHTTP 200\n';
    const result = getSemanticTokens(text);
    const tokens = decodeTokens(result.data);
    const typeIdx = TOKEN_TYPES.indexOf('type');
    // The GET method node is matched by `(method) @type.builtin` → type token
    const methodToken = tokens.find(t => t.line === 0 && t.char === 0 && t.typeIndex === typeIdx);
    assert.ok(methodToken, `expected type token for GET at line 0 col 0; tokens: ${JSON.stringify(tokens)}`);
    assert.strictEqual(methodToken.length, 3); // 'GET' is 3 chars
  });

  it('comment gets the comment token type', () => {
    const text = '# This is a comment\nGET https://example.org\n\nHTTP 200\n';
    const result = getSemanticTokens(text);
    const tokens = decodeTokens(result.data);
    const commentIdx = TOKEN_TYPES.indexOf('comment');
    const commentToken = tokens.find(t => t.line === 0 && t.typeIndex === commentIdx);
    assert.ok(commentToken, `expected comment token on line 0; tokens: ${JSON.stringify(tokens)}`);
  });

  it('status code 200 gets the number token type', () => {
    const text = 'GET https://example.org\n\nHTTP 200\n';
    const result = getSemanticTokens(text);
    const tokens = decodeTokens(result.data);
    const numberIdx = TOKEN_TYPES.indexOf('number');
    // status is `(status) @number` in highlights.scm, on line 2: `HTTP 200`
    // '200' starts at col 5
    const statusToken = tokens.find(t => t.line === 2 && t.char === 5 && t.typeIndex === numberIdx);
    assert.ok(statusToken, `expected number token for 200 at line 2 col 5; tokens: ${JSON.stringify(tokens)}`);
  });

  it('tokens are sorted by position (ascending line then char)', () => {
    const text = 'GET https://example.org\n\nHTTP 200\n';
    const result = getSemanticTokens(text);
    const tokens = decodeTokens(result.data);
    for (let i = 1; i < tokens.length; i++) {
      const prev = tokens[i - 1];
      const curr = tokens[i];
      const ordered =
        curr.line > prev.line ||
        (curr.line === prev.line && curr.char >= prev.char);
      assert.ok(
        ordered,
        `tokens out of order at index ${i}: ${JSON.stringify(prev)} then ${JSON.stringify(curr)}`
      );
    }
  });
});
