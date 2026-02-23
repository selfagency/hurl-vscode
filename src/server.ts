import { createConnection, ProposedFeatures, TextDocuments } from 'vscode-languageserver/node';

export function startServer(): void {
  const connection = createConnection(ProposedFeatures.all);
  const documents: any = new TextDocuments();

  connection.onInitialize(() => {
    return {
      capabilities: {
        textDocumentSync: documents.syncKind,
        hoverProvider: true,
        completionProvider: { resolveProvider: false },
        codeLensProvider: { resolveProvider: false }
      }
    };
  });

  documents.onDidChangeContent((change: any) => {
    // placeholder: respond with empty diagnostics
    connection.sendDiagnostics({ uri: change.document.uri, diagnostics: [] });
  });

  documents.listen(connection);
  connection.listen();
}

// If run directly, start the server
if (require.main === module) {
  startServer();
}
