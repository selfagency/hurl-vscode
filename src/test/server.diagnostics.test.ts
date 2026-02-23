import * as assert from 'assert';

suite('LSP Server (scaffold) - exports', () => {
  test('server exports startServer', () => {
    const server = require('../server');
    assert.strictEqual(typeof server.startServer, 'function');
  });
});
