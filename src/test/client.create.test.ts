import * as assert from 'assert';

suite('LSP Client (scaffold) - exports', () => {
  test('client exports createClient', () => {
    const client = require('../client');
    assert.strictEqual(typeof client.createClient, 'function');
  });
});
