import * as assert from 'assert';
import { describe, it } from 'vitest';

describe('LSP Client (scaffold) - exports', () => {
  it('client exports createClient', () => {
    const client = require('../client');
    assert.strictEqual(typeof client.createClient, 'function');
  });
});
