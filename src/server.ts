import {
  CompletionItem,
  createConnection,
  InitializeParams,
  ProposedFeatures,
  SemanticTokensRequest,
  TextDocuments,
  TextDocumentSyncKind
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { initParser } from './analysis';
import {
  getCodeActions,
  getCodeLenses,
  getCompletions,
  getDefinition,
  getDiagnostics,
  getFoldingRanges,
  getDocumentHighlights,
  getHover,
  getDocumentLinks,
  getReferences,
  getRenameEdits,
  getSemanticTokens,
  getSignatureHelp,
  getDocumentSymbols,
  resolveCompletion,
  TOKEN_TYPES,
  TOKEN_MODIFIERS
} from './providers';
import { getWasmPath } from './wasm';

export function startServer(): void {
  const connection = createConnection(ProposedFeatures.all);
  const documents = new TextDocuments(TextDocument);

  connection.onInitialize((_params: InitializeParams) => {
    return {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        completionProvider: { resolveProvider: true, triggerCharacters: ['[', '{'] },
        hoverProvider: true,
        semanticTokensProvider: {
          legend: { tokenTypes: TOKEN_TYPES, tokenModifiers: TOKEN_MODIFIERS },
          full: true
        },
        codeLensProvider: { resolveProvider: false },
        documentSymbolProvider: true,
        definitionProvider: true,
        referencesProvider: true,
        documentHighlightProvider: true,
        renameProvider: true,
        foldingRangeProvider: true,
        codeActionProvider: true,
        documentLinkProvider: { resolveProvider: false },
        signatureHelpProvider: { triggerCharacters: ['"', ' '] }
      }
    };
  });

  connection.onInitialized(async () => {
    try {
      await initParser(getWasmPath());
    } catch (err) {
      connection.console.error(`Failed to initialise tree-sitter parser: ${err}`);
    }
  });

  documents.onDidChangeContent(change => {
    const diags = getDiagnostics(change.document.getText());
    void connection.sendDiagnostics({ uri: change.document.uri, diagnostics: diags });
  });

  connection.onCompletion(params => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];
    const { line, character } = params.position;
    return getCompletions(doc.getText(), line, character);
  });

  connection.onCompletionResolve((item: CompletionItem) => resolveCompletion(item));

  connection.onHover(params => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return null;
    const { line, character } = params.position;
    return getHover(doc.getText(), line, character);
  });

  connection.onRequest(SemanticTokensRequest.type, params => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return { data: [] };
    return getSemanticTokens(doc.getText());
  });

  connection.onCodeLens(params => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];
    return getCodeLenses(params.textDocument.uri, doc.getText());
  });

  connection.onDocumentSymbol(params => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];
    return getDocumentSymbols(doc.getText());
  });

  connection.onDefinition(params => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return null;
    const { line, character } = params.position;
    return getDefinition(params.textDocument.uri, doc.getText(), line, character);
  });

  connection.onReferences(params => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];
    const { line, character } = params.position;
    return getReferences(
      params.textDocument.uri,
      doc.getText(),
      line,
      character,
      params.context.includeDeclaration
    );
  });

  connection.onDocumentHighlight(params => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];
    const { line, character } = params.position;
    return getDocumentHighlights(doc.getText(), line, character);
  });

  connection.onRenameRequest(params => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return null;
    const { line, character } = params.position;
    return getRenameEdits(
      params.textDocument.uri,
      doc.getText(),
      line,
      character,
      params.newName
    );
  });

  connection.onFoldingRanges(params => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];
    return getFoldingRanges(doc.getText());
  });

  connection.onCodeAction(params => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];
    return getCodeActions(
      params.textDocument.uri,
      doc.getText(),
      params.context.diagnostics
    );
  });

  connection.onDocumentLinks(params => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];
    return getDocumentLinks(params.textDocument.uri, doc.getText());
  });

  connection.onSignatureHelp(params => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return null;
    const { line, character } = params.position;
    return getSignatureHelp(doc.getText(), line, character);
  });

  documents.listen(connection);
  connection.listen();
}

if (require.main === module) {
  startServer();
}
