import * as assert from 'assert';
import { describe, it } from 'vitest';

import { groupByDirectory } from '../fileTree.utils';

describe('groupByDirectory', () => {
  it('groups files by parent directory', () => {
    const files = ['/workspace/a.hurl', '/workspace/b.hurl', '/workspace/sub/c.hurl'];
    const result = groupByDirectory(files);
    assert.deepStrictEqual(result.get('/workspace'), ['/workspace/a.hurl', '/workspace/b.hurl']);
    assert.deepStrictEqual(result.get('/workspace/sub'), ['/workspace/sub/c.hurl']);
    assert.strictEqual(result.size, 2);
  });

  it('returns empty map for empty input', () => {
    assert.strictEqual(groupByDirectory([]).size, 0);
  });

  it('handles a single file', () => {
    const result = groupByDirectory(['/workspace/test.hurl']);
    assert.deepStrictEqual(result.get('/workspace'), ['/workspace/test.hurl']);
    assert.strictEqual(result.size, 1);
  });

  it('preserves insertion order within a directory', () => {
    const files = ['/workspace/z.hurl', '/workspace/a.hurl'];
    const result = groupByDirectory(files);
    assert.deepStrictEqual(result.get('/workspace'), ['/workspace/z.hurl', '/workspace/a.hurl']);
  });

  it('handles files in deeply nested directories', () => {
    const files = ['/a/b/c/d.hurl', '/a/b/e.hurl'];
    const result = groupByDirectory(files);
    assert.deepStrictEqual(result.get('/a/b/c'), ['/a/b/c/d.hurl']);
    assert.deepStrictEqual(result.get('/a/b'), ['/a/b/e.hurl']);
  });
});
