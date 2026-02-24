import * as assert from 'assert';
import { describe, it } from 'vitest';

describe('LSP Server (scaffold) - exports', () => {
  it('server exports startServer', () => {
    const server = require('../server');
    assert.strictEqual(typeof server.startServer, 'function');
  });
});
