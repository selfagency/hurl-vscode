import * as vscode from 'vscode';

import { createClient } from './client';
import { HurlFileTreeProvider } from './fileTree';
import { openQueryBuilder } from './webview/queryBuilder';

export function activate(context: vscode.ExtensionContext) {
  // Start the LSP language client
  try {
    const client = createClient(context);
    client.start();
    context.subscriptions.push({ dispose: () => void client.stop() } as vscode.Disposable);
  } catch (e) {
    console.error('Failed to start language client:', e);
  }

  // Hurl Files sidebar tree
  const treeProvider = new HurlFileTreeProvider();
  vscode.window.registerTreeDataProvider('hurl.fileTree', treeProvider);
  context.subscriptions.push(treeProvider);

  // hurl.run — invoked by CodeLens (▶ Run and ▶ Run All)
  context.subscriptions.push(
    vscode.commands.registerCommand('hurl.run', (uri: string, entryIndex?: number) => {
      openQueryBuilder(context, { uri, entryIndex });
    })
  );

  // hurl.hurl — invoked from command palette (run the active file)
  context.subscriptions.push(
    vscode.commands.registerCommand('hurl.hurl', () => {
      const doc = vscode.window.activeTextEditor?.document;
      if (!doc) return;
      openQueryBuilder(context, { uri: doc.uri.toString() });
    })
  );
}

export function deactivate() {}
