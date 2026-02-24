import * as assert from 'assert';
import { describe, it } from 'vitest';

describe('Extension Activation Smoke', () => {
  it('activate() does not throw', () => {
    const ext = require('../extension');
    assert.doesNotThrow(() => ext.activate({ subscriptions: [] } as any));
  });
});
