import * as assert from 'assert';
import { beforeAll, describe, it } from 'vitest';

import { initParser } from '../analysis';
import { getRenameEdits } from '../providers/rename';
import { getWasmPath } from '../wasm';

beforeAll(async () => {
  await initParser(getWasmPath());
});

const text = [
  'GET https://example.org',
  '',
  'HTTP 200',
  '[Captures]',
  'tok: jsonpath "$.token"',        // line 4
  '',
  'GET https://api.example.org/{{tok}}', // line 6
  '',
  'HTTP 200',
].join('\n');

describe('getRenameEdits', () => {
  it('returns a WorkspaceEdit when cursor is on variable usage', () => {
    // tok starts at col 30 in line 6
    const edit = getRenameEdits('file:///test.hurl', text, 6, 30, 'new_name');
    assert.ok(edit, 'expected WorkspaceEdit');
  });

  it('includes an edit for the usage site', () => {
    const edit = getRenameEdits('file:///test.hurl', text, 6, 30, 'new_name');
    const edits = edit?.changes?.['file:///test.hurl'] ?? [];
    const usageEdit = edits.find(e => e.range.start.line === 6);
    assert.ok(usageEdit, 'expected edit on line 6 (usage)');
    assert.strictEqual(usageEdit.newText, 'new_name');
  });

  it('includes an edit for the capture definition', () => {
    const edit = getRenameEdits('file:///test.hurl', text, 6, 30, 'new_name');
    const edits = edit?.changes?.['file:///test.hurl'] ?? [];
    const defEdit = edits.find(e => e.range.start.line === 4);
    assert.ok(defEdit, 'expected edit on line 4 (definition)');
    assert.strictEqual(defEdit.newText, 'new_name');
  });

  it('returns null when cursor is not on a variable', () => {
    const edit = getRenameEdits('file:///test.hurl', text, 0, 1, 'new_name');
    assert.strictEqual(edit, null);
  });

  it('returns null for empty document', () => {
    const edit = getRenameEdits('file:///test.hurl', '', 0, 0, 'new_name');
    assert.strictEqual(edit, null);
  });
});
