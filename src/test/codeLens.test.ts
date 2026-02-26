import * as assert from 'assert';
import { beforeAll, describe, it } from 'vitest';
import type { CodeLens } from 'vscode-languageserver/node';

import { initParser } from '../analysis';
import { getCodeLenses } from '../providers/codeLens';
import { getWasmPath } from '../wasm';

beforeAll(async () => {
  await initParser(getWasmPath());
});

const isRun    = (l: CodeLens) => l.command?.title === '▶ Run';
const isRunAll = (l: CodeLens) => l.command?.title === '▶ Run All';

describe('getCodeLenses', () => {
  describe('single entry', () => {
    const text = 'GET https://example.org\n\nHTTP 200\n';

    it('returns a Run lens for the entry', () => {
      const lenses = getCodeLenses('file:///test.hurl', text);
      assert.ok(lenses.some(isRun), 'expected a ▶ Run lens');
    });

    it('Run lens is on line 0 (method line)', () => {
      const lenses = getCodeLenses('file:///test.hurl', text);
      const runLens = lenses.find(isRun);
      assert.ok(runLens, 'expected ▶ Run lens');
      assert.strictEqual(runLens.range.start.line, 0);
    });

    it('Run lens command passes uri and entryIndex=1', () => {
      const lenses = getCodeLenses('file:///test.hurl', text);
      const runLens = lenses.find(isRun);
      assert.ok(runLens?.command?.arguments, 'expected command with arguments');
      assert.strictEqual(runLens.command!.arguments![0], 'file:///test.hurl');
      assert.strictEqual(runLens.command!.arguments![1], 1); // 1-based entry index
    });

    it('returns a Run All lens', () => {
      const lenses = getCodeLenses('file:///test.hurl', text);
      assert.ok(lenses.some(isRunAll), 'expected a ▶ Run All lens');
    });

    it('Run All lens is at line 0', () => {
      const lenses = getCodeLenses('file:///test.hurl', text);
      const runAll = lenses.find(isRunAll);
      assert.ok(runAll);
      assert.strictEqual(runAll.range.start.line, 0);
    });
  });

  describe('multiple entries', () => {
    const text = [
      'GET https://example.org',
      '',
      'HTTP 200',
      '',
      'POST https://example.org/users',
      '',
      'HTTP 201',
      '',
      'DELETE https://example.org/users/1',
      '',
      'HTTP 204',
    ].join('\n');

    it('returns one Run lens per entry', () => {
      const lenses = getCodeLenses('file:///test.hurl', text);
      assert.strictEqual(lenses.filter(isRun).length, 3);
    });

    it('Run lenses have 1-based entry indices', () => {
      const lenses = getCodeLenses('file:///test.hurl', text);
      const indices = lenses
        .filter(isRun)
        .map((l: CodeLens) => l.command!.arguments![1] as number)
        .sort((a: number, b: number) => a - b);
      assert.deepStrictEqual(indices, [1, 2, 3]);
    });

    it('Run lenses are on the method lines', () => {
      const lenses = getCodeLenses('file:///test.hurl', text);
      const lines = lenses
        .filter(isRun)
        .map((l: CodeLens) => l.range.start.line)
        .sort((a: number, b: number) => a - b);
      assert.deepStrictEqual(lines, [0, 4, 8]);
    });

    it('returns exactly one Run All lens', () => {
      const lenses = getCodeLenses('file:///test.hurl', text);
      assert.strictEqual(lenses.filter(isRunAll).length, 1);
    });
  });

  describe('empty document', () => {
    it('returns empty array for empty text', () => {
      const lenses = getCodeLenses('file:///test.hurl', '');
      assert.deepStrictEqual(lenses, []);
    });
  });
});
