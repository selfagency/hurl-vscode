import { CodeAction, CodeActionKind, Diagnostic, TextEdit, WorkspaceEdit } from 'vscode-languageserver/node';

import { HTTP_METHODS } from '../analysis';

// ── Helpers ───────────────────────────────────────────────────────────────────

const LOWER_METHODS = new Set(HTTP_METHODS.map(m => m.toLowerCase()));

// Regex to detect the "method casing" diagnostic message pattern
const METHOD_MSG_RE = /HTTP method "([a-zA-Z]+)" should be uppercase/;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Return CodeAction items for the given diagnostics in the document.
 * Only diagnostics that have a known quick fix are returned.
 */
export function getCodeActions(
  uri: string,
  text: string,
  diagnostics: Diagnostic[]
): CodeAction[] {
  if (!text || diagnostics.length === 0) return [];

  const actions: CodeAction[] = [];

  for (const diag of diagnostics) {
    // Quick fix: convert lowercase method to uppercase
    const methodMatch = diag.message.match(METHOD_MSG_RE);
    if (methodMatch) {
      const lower = methodMatch[1];
      if (LOWER_METHODS.has(lower.toLowerCase())) {
        const upper = lower.toUpperCase();
        const edit: WorkspaceEdit = {
          changes: {
            [uri]: [TextEdit.replace(diag.range, upper)]
          }
        };
        actions.push({
          title: `Convert to \`${upper}\``,
          kind: CodeActionKind.QuickFix,
          diagnostics: [diag],
          edit
        });
      }
    }
  }

  return actions;
}
