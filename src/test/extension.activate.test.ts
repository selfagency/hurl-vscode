import * as assert from 'assert';

suite('Extension Activation Smoke', () => {
  test('activate() does not throw', () => {
    const ext = require('../extension');
    assert.doesNotThrow(() => ext.activate({ subscriptions: [] } as any));
  });
});
