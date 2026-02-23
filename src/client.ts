import * as path from 'path';
import { ExtensionContext } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';

export function createClient(context: ExtensionContext): LanguageClient {
  const serverModule =
    context && typeof (context as any).asAbsolutePath === 'function'
      ? (context as any).asAbsolutePath(path.join('out', 'server.js'))
      : path.join(__dirname, 'server.js');

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc, options: { execArgv: ['--nolazy', '--inspect=6010'] } }
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'hurl' }],
    synchronize: {}
  };

  const client = new LanguageClient('hurlLanguageServer', 'Hurl Language Server', serverOptions, clientOptions);
  return client;
}
