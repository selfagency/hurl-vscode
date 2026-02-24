import * as assert from 'assert';
import { describe, it, vi } from 'vitest';

// Provide a lightweight 'vscode' mock for node test environment
vi.mock('vscode', () => ({
  SemanticTokensLegend: class {
    constructor() {}
  },
  SemanticTokensBuilder: class {
    push() {}
    build() {
      return {};
    }
  },
  languages: { registerDocumentSemanticTokensProvider: () => ({ dispose() {} }) },
  commands: { registerCommand: () => ({ dispose() {} }) },
  window: { createWebviewPanel: () => ({ webview: { html: '' } }), activeTextEditor: undefined },
  workspace: { openTextDocument: async () => null },
  Position: class {},
  Range: class {},
  Disposable: class {
    dispose() {}
  }
}));

// Mock vscode-languageclient to avoid it requiring 'vscode' at import time
vi.mock('vscode-languageclient/node', () => ({
  LanguageClient: class {
    start() {
      return;
    }
    stop() {
      return Promise.resolve();
    }
  },
  TransportKind: { ipc: 0 }
}));

// Mock web-tree-sitter so parserInit in extension.ts does not call real wasm
vi.mock('web-tree-sitter', () => {
  const ParserMock: any = function ParserMock(this: any) {
    this.parse = (_text: string) => ({ rootNode: {} });
    this.setLanguage = (_lang: any) => {};
  };
  ParserMock.init = async () => {};
  ParserMock.Language = {
    load: async (_path: string) => ({
      query: (_q: any) => ({ captures: () => [] })
    })
  };
  // Return an object with both default and named exports to satisfy import styles
  return { default: ParserMock, init: ParserMock.init, Language: ParserMock.Language };
});

import * as ext from '../extension';

describe('Extension Activation Smoke', () => {
  it('activate() does not throw', () => {
    assert.doesNotThrow(() => (ext as any).activate({ subscriptions: [] } as any));
  });
});
