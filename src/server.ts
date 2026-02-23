import {
  CodeLens,
  CompletionItem,
  CompletionItemKind,
  createConnection,
  Diagnostic,
  DiagnosticSeverity,
  Hover,
  InitializeParams,
  ProposedFeatures,
  Range,
  TextDocuments,
  TextDocumentSyncKind
} from 'vscode-languageserver/node';

export function startServer(): void {
  const connection = createConnection(ProposedFeatures.all);
  const documents: any = new (TextDocuments as any)({} as any);

  connection.onInitialize((_params: InitializeParams) => {
    return {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        hoverProvider: true,
        completionProvider: { resolveProvider: false },
        codeLensProvider: { resolveProvider: false }
      }
    };
  });

  // Simple diagnostic: flag lines containing the word "ERROR" as errors
  documents.onDidChangeContent((change: any) => {
    const text = change.document.getText();
    const diagnostics: Diagnostic[] = [];
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const idx = line.indexOf('ERROR');
      if (idx !== -1) {
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: Range.create(i, idx, i, idx + 5),
          message: 'Found ERROR token (scaffold diagnostic)',
          source: 'hurl-scaffold'
        } as any);
      }
    }
    connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
  });

  connection.onHover((params: any) => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return null;
    return { contents: 'Hurl language server (scaffold)' } as any;
  });

  connection.onCompletion((_textDocumentPosition: any) => {
    // return a couple of placeholder completion items
    const items: CompletionItem[] = [
      { label: 'GET', kind: CompletionItemKind.Keyword },
      { label: 'POST', kind: CompletionItemKind.Keyword }
    ];
    return items;
  });

  connection.onCodeLens((params: any) => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];
    const lines = doc.getText().split(/\r?\n/);
    const lenses: CodeLens[] = [];
    // add a CodeLens "Run" for the first non-empty line as a scaffold
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().length > 0) {
        lenses.push({
          range: Range.create(i, 0, i, Math.min(80, lines[i].length)),
          data: { command: 'hurl.run', title: 'Run (scaffold)' }
        } as any);
        break;
      }
    }
    return lenses;
  });

  documents.listen(connection);
  connection.listen();
}

// If run directly, start the server
if (require.main === module) {
  startServer();
}
