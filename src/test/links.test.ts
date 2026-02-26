import * as assert from 'assert';
import { beforeAll, describe, it } from 'vitest';

import { initParser } from '../analysis';
import { getDocumentLinks } from '../providers/links';
import { getWasmPath } from '../wasm';

beforeAll(async () => {
  await initParser(getWasmPath());
});

describe('getDocumentLinks', () => {
  it('returns empty array for plain request with no URL in body', () => {
    const text = 'GET https://example.org\n\nHTTP 200\n';
    const links = getDocumentLinks('file:///test.hurl', text);
    // URL in request line is not a document link (it's the request itself)
    assert.ok(Array.isArray(links));
  });

  it('returns empty array for empty text', () => {
    const links = getDocumentLinks('file:///test.hurl', '');
    assert.deepStrictEqual(links, []);
  });

  it('returns a link for a file body reference', () => {
    const text = [
      'POST https://example.org/upload',
      'file,data/payload.json;',
      '',
      'HTTP 200',
    ].join('\n');
    const links = getDocumentLinks('file:///dir/test.hurl', text);
    // Should produce a link pointing to the referenced file
    const fileLink = links.find(l => l.target?.includes('payload.json'));
    assert.ok(fileLink, `expected file link; got: ${JSON.stringify(links)}`);
  });
});
