import * as vscode from 'vscode';

import { groupByDirectory } from './fileTree.utils';

export { groupByDirectory };

// ── Tree item ──────────────────────────────────────────────────────────────────

export class HurlFileItem extends vscode.TreeItem {
  constructor(
    readonly resourceUri: vscode.Uri,
    readonly itemType: 'file' | 'directory'
  ) {
    super(
      resourceUri,
      itemType === 'directory'
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None
    );
    if (itemType === 'file') {
      this.command = { command: 'vscode.open', title: 'Open', arguments: [resourceUri] };
      this.iconPath = vscode.ThemeIcon.File;
    } else {
      this.iconPath = vscode.ThemeIcon.Folder;
    }
  }
}

// ── Tree provider ──────────────────────────────────────────────────────────────

export class HurlFileTreeProvider implements vscode.TreeDataProvider<HurlFileItem>, vscode.Disposable {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private readonly watcher: vscode.FileSystemWatcher;

  constructor() {
    this.watcher = vscode.workspace.createFileSystemWatcher('**/*.hurl');
    this.watcher.onDidCreate(() => this._onDidChangeTreeData.fire(undefined));
    this.watcher.onDidDelete(() => this._onDidChangeTreeData.fire(undefined));
    this.watcher.onDidChange(() => this._onDidChangeTreeData.fire(undefined));
  }

  getTreeItem(element: HurlFileItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: HurlFileItem): Promise<HurlFileItem[]> {
    if (element?.itemType === 'file') return [];

    const files = await vscode.workspace.findFiles('**/*.hurl');
    const filePaths = files.map(f => f.fsPath);
    const grouped = groupByDirectory(filePaths);

    if (!element) {
      if (grouped.size === 0) return [];

      const rootFolders = (vscode.workspace.workspaceFolders ?? []).map(f => f.uri.fsPath);
      const dirs = [...grouped.keys()].sort();

      // If all files sit directly in the workspace root, skip the directory node
      if (dirs.length === 1 && rootFolders.includes(dirs[0])) {
        return (grouped.get(dirs[0]) ?? [])
          .sort()
          .map(fp => new HurlFileItem(vscode.Uri.file(fp), 'file'));
      }

      return dirs.map(dir => new HurlFileItem(vscode.Uri.file(dir), 'directory'));
    }

    // Directory node: list its .hurl files
    const dirFiles = grouped.get(element.resourceUri.fsPath) ?? [];
    return dirFiles.sort().map(fp => new HurlFileItem(vscode.Uri.file(fp), 'file'));
  }

  dispose(): void {
    this.watcher.dispose();
    this._onDidChangeTreeData.dispose();
  }
}
