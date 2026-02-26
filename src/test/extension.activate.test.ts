import * as assert from 'assert';
import { describe, it, vi } from 'vitest';

// Lightweight vscode mock for the Node test environment
vi.mock('vscode', () => {
  const EventEmitter = class {
    event = () => ({ dispose: () => {} });
    fire() {}
    dispose() {}
  };
  return {
    EventEmitter,
    TreeItem: class {
      constructor(public resourceUri: unknown, public collapsibleState: unknown) {}
    },
    TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
    ThemeIcon: { File: {}, Folder: {} },
    commands: { registerCommand: () => ({ dispose() {} }) },
    window: {
      createWebviewPanel: () => ({
        webview: { html: '', onDidReceiveMessage: () => ({ dispose() {} }), postMessage: () => {} }
      }),
      registerTreeDataProvider: () => ({ dispose() {} }),
      activeTextEditor: undefined
    },
    workspace: {
      createFileSystemWatcher: () => ({
        onDidCreate: () => ({ dispose() {} }),
        onDidDelete: () => ({ dispose() {} }),
        onDidChange: () => ({ dispose() {} }),
        dispose() {}
      }),
      findFiles: async () => [],
      workspaceFolders: []
    },
    Uri: {
      file: (p: string) => ({ fsPath: p }),
      parse: (s: string) => ({ fsPath: s.replace('file://', '') })
    },
    env: { clipboard: { writeText: async () => {} } },
    Disposable: class { dispose() {} }
  };
});

// Mock vscode-languageclient so it doesn't require the real vscode at import time
vi.mock('vscode-languageclient/node', () => ({
  LanguageClient: class {
    start() {}
    stop() { return Promise.resolve(); }
  },
  TransportKind: { ipc: 0 }
}));

// Mock ansi-to-html (used by queryBuilder.ts)
vi.mock('ansi-to-html', () => ({
  default: class { toHtml(s: string) { return s; } }
}));

import * as ext from '../extension';

describe('Extension Activation Smoke', () => {
  it('activate() does not throw', () => {
    assert.doesNotThrow(() => (ext as any).activate({ subscriptions: [] } as any));
  });
});
