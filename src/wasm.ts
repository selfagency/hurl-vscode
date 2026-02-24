import * as path from 'path';
import { ExtensionContext } from 'vscode';

export function getWasmPath(context?: ExtensionContext): string {
  if (context && typeof (context as any).asAbsolutePath === 'function') {
    // when running in VS Code extension host
    return (context as any).asAbsolutePath('tree-sitter-hurl.wasm');
  }
  // test / node fallback: resolve relative to compiled out dir or source dir
  // __dirname will be src at TS time, out at compiled JS time; handle both
  return path.resolve(__dirname, '..', 'tree-sitter-hurl.wasm');
}
