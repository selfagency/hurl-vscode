import * as assert from 'assert';
import { describe, it, vi } from 'vitest';
import * as client from '../client';

// Mock 'vscode' to allow importing client and languageclient in node test env
vi.mock('vscode', () => ({
  ExtensionContext: class {},
  workspace: { asRelativePath: () => '' },
  Uri: { file: (p: string) => ({ fsPath: p }) }
}));
// Mock vscode-languageclient to avoid it requiring 'vscode' at import time
vi.mock('vscode-languageclient/node', () => ({
  LanguageClient: class {},
  TransportKind: { ipc: 0 }
}));

describe('LSP Client (scaffold) - exports', () => {
  it('client exports createClient', () => {
    assert.strictEqual(typeof (client as any).createClient, 'function');
  });
});
