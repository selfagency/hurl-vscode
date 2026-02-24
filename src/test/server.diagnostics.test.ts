import * as assert from 'assert';
import { describe, it } from 'vitest';
import * as server from '../server';

describe('LSP Server (scaffold) - exports', () => {
  it('server exports startServer', () => {
    assert.strictEqual(typeof (server as any).startServer, 'function');
  });
});
