import * as assert from 'assert';
import { beforeAll, describe, it } from 'vitest';
import type { Diagnostic } from 'vscode-languageserver/node';
import { DiagnosticSeverity } from 'vscode-languageserver/node';

import { initParser } from '../analysis';
import { getDiagnostics } from '../providers/diagnostics';
import { getWasmPath } from '../wasm';

beforeAll(async () => {
  await initParser(getWasmPath());
});

describe('getDiagnostics', () => {
  describe('syntax errors', () => {
    it('returns no diagnostics for a valid hurl document', () => {
      const text = `GET https://example.org\n\nHTTP 200\n`;
      const diags = getDiagnostics(text);
      assert.deepStrictEqual(diags, []);
    });

    it('reports an error for an ERROR node in the AST', () => {
      // Lowercase method: tree-sitter cannot tokenize it → creates an ERROR node
      const text = `get https://example.org\n`;
      const diags = getDiagnostics(text);
      assert.ok(diags.length > 0, 'expected at least one diagnostic');
      assert.ok(
        diags.some(d => d.severity === DiagnosticSeverity.Error),
        `expected an error-severity diagnostic; got: ${JSON.stringify(diags)}`
      );
    });
  });

  describe('method casing', () => {
    it('warns when an HTTP method is not all-uppercase', () => {
      const text = `get https://example.org\n\nHTTP 200\n`;
      const diags = getDiagnostics(text);
      const warn = diags.find(d => d.severity === DiagnosticSeverity.Warning && d.message.toLowerCase().includes('method'));
      assert.ok(warn, `expected a method-casing warning; got: ${JSON.stringify(diags)}`);
    });

    it('does not warn when method is uppercase', () => {
      const text = `GET https://example.org\n\nHTTP 200\n`;
      const diags = getDiagnostics(text);
      assert.ok(
        !diags.some(d => d.message.toLowerCase().includes('uppercase')),
        'unexpected method-casing warning'
      );
    });
  });

  describe('undefined variables', () => {
    it('warns on {{varname}} with no preceding [Captures] definition', () => {
      const text = `GET https://example.org/{{undefined_var}}\n\nHTTP 200\n`;
      const diags = getDiagnostics(text);
      const warn = diags.find(d => d.severity === DiagnosticSeverity.Warning && d.message.includes('undefined_var'));
      assert.ok(warn, `expected an undefined-variable warning; got: ${JSON.stringify(diags)}`);
    });

    it('does not warn when variable is defined in a preceding [Captures] section', () => {
      const text = [
        'GET https://example.org',
        '',
        'HTTP 200',
        '[Captures]',
        'my_token: jsonpath "$.token"',
        '',
        'GET https://example.org/{{my_token}}',
        '',
        'HTTP 200',
        '',
      ].join('\n');
      const diags = getDiagnostics(text);
      const undef = diags.filter(d => d.severity === DiagnosticSeverity.Warning && d.message.includes('my_token'));
      assert.deepStrictEqual(undef, [], `unexpected undefined-variable warning for my_token`);
    });
  });

  describe('unknown option keys', () => {
    it('warns on an unknown key in [Options]', () => {
      const text = `GET https://example.org\n[Options]\nnotarealkey: true\n\nHTTP 200\n`;
      const diags = getDiagnostics(text);
      const warn = diags.find(d => d.severity === DiagnosticSeverity.Warning && d.message.includes('notarealkey'));
      assert.ok(warn, `expected unknown-option warning; got: ${JSON.stringify(diags)}`);
    });

    it('does not warn on known option keys', () => {
      const text = `GET https://example.org\n[Options]\nverbose: true\n\nHTTP 200\n`;
      const diags = getDiagnostics(text);
      const warn = diags.find(d => d.message.includes('verbose') && d.message.toLowerCase().includes('unknown'));
      assert.ok(!warn, 'unexpected warning for known option key "verbose"');
    });
  });

  describe('malformed status', () => {
    it('reports an error for a status code outside 100–599', () => {
      const text = `GET https://example.org\n\nHTTP 99\n`;
      const diags = getDiagnostics(text);
      const err = diags.find(d => d.severity === DiagnosticSeverity.Error && d.message.toLowerCase().includes('status'));
      assert.ok(err, `expected a status-range error; got: ${JSON.stringify(diags)}`);
    });

    it('does not error for a status code in 100–599', () => {
      const text = `GET https://example.org\n\nHTTP 200\n`;
      const diags = getDiagnostics(text);
      const err = diags.find(d => d.severity === DiagnosticSeverity.Error && d.message.toLowerCase().includes('status'));
      assert.ok(!err, `unexpected status error for 200: ${JSON.stringify(diags)}`);
    });
  });

  describe('return shape', () => {
    it('each diagnostic has required LSP fields', () => {
      const text = `get https://example.org\n\nHTTP 200\n`;
      const diags = getDiagnostics(text);
      assert.ok(diags.length > 0);
      for (const d of diags) {
        const typed = d as Diagnostic;
        assert.ok(typed.range, 'missing range');
        assert.ok(typed.message, 'missing message');
        assert.ok(typeof typed.severity === 'number', 'missing severity');
      }
    });
  });
});
