import { Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver/node';
import type { Node as SyntaxNode } from 'web-tree-sitter';

import { HTTP_METHODS, getCaptures, getEntries, getVariableRefs, parse } from '../analysis';

// ── Helpers ───────────────────────────────────────────────────────────────────

function nodeRange(node: SyntaxNode): Range {
  return Range.create(
    node.startPosition.row,
    node.startPosition.column,
    node.endPosition.row,
    node.endPosition.column
  );
}

function findNodes(node: SyntaxNode, type: string): SyntaxNode[] {
  const results: SyntaxNode[] = [];
  if (node.type === type) results.push(node);
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) results.push(...findNodes(child, type));
  }
  return results;
}

const LOWER_METHODS = new Set(HTTP_METHODS.map(m => m.toLowerCase()));

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Run all diagnostic checks on the given Hurl source text and return
 * an array of LSP Diagnostic objects. Returns [] (not throws) on parse failure.
 */
export function getDiagnostics(text: string): Diagnostic[] {
  let tree;
  try {
    tree = parse(text);
  } catch {
    return [];
  }

  const diags: Diagnostic[] = [];

  checkSyntaxErrors(tree.rootNode, diags);
  checkMethodCasing(text, diags);
  checkUndefinedVariables(tree.rootNode, diags);
  checkUnknownOptionKeys(tree.rootNode, diags);
  checkMalformedStatus(tree.rootNode, diags);

  return diags;
}

// ── Check: syntax errors ──────────────────────────────────────────────────────

function checkSyntaxErrors(root: SyntaxNode, diags: Diagnostic[]): void {
  walkForErrors(root, diags);
}

function walkForErrors(node: SyntaxNode, diags: Diagnostic[]): void {
  // Options-section errors are reported by checkUnknownOptionKeys as warnings
  if (node.type === 'options_section') return;

  if (node.isError) {
    diags.push({
      severity: DiagnosticSeverity.Error,
      range: nodeRange(node),
      message: 'Syntax error',
      source: 'hurl'
    });
    return; // Don't descend — avoids duplicate child-level reports
  }

  if (node.isMissing) {
    diags.push({
      severity: DiagnosticSeverity.Error,
      range: Range.create(
        node.startPosition.row,
        node.startPosition.column,
        node.startPosition.row,
        node.startPosition.column + 1
      ),
      message: `Missing ${node.type}`,
      source: 'hurl'
    });
    return;
  }

  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) walkForErrors(child, diags);
  }
}

// ── Check: method casing ──────────────────────────────────────────────────────

// Text-based because the grammar only tokenises fully-uppercase methods;
// mixed-case like "Get" is lexed as a single-char method node ("G") + URL prefix.
function checkMethodCasing(text: string, diags: Diagnostic[]): void {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^([a-zA-Z]+)\s/);
    if (!match) continue;
    const word = match[1];
    if (LOWER_METHODS.has(word.toLowerCase()) && word !== word.toUpperCase()) {
      diags.push({
        severity: DiagnosticSeverity.Warning,
        range: Range.create(i, 0, i, word.length),
        message: `HTTP method "${word}" should be uppercase (${word.toUpperCase()})`,
        source: 'hurl'
      });
    }
  }
}

// ── Check: undefined variables ────────────────────────────────────────────────

function checkUndefinedVariables(root: SyntaxNode, diags: Diagnostic[]): void {
  const tree = root.tree;
  const captures = getCaptures(tree);
  const entries = getEntries(tree);
  const refs = getVariableRefs(tree);

  // Map entry index → set of variable names defined in that entry's [Captures]
  const capturesByEntry = new Map<number, Set<string>>();
  for (let i = 0; i < entries.length; i++) {
    const { startLine, endLine } = entries[i];
    const names = new Set(
      captures.filter(c => c.line >= startLine && c.line <= endLine).map(c => c.name)
    );
    capturesByEntry.set(i, names);
  }

  for (const ref of refs) {
    // Find the LAST entry whose startLine is at or before this ref's line.
    // Using "last start ≤ ref.line" avoids boundary ambiguity when entry N ends
    // on the same line that entry N+1 begins.
    let entryIdx = -1;
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].startLine <= ref.line) {
        entryIdx = i;
        break;
      }
    }

    // Accumulate captures defined in all entries BEFORE this one
    const visible = new Set<string>();
    for (let i = 0; i < entryIdx; i++) {
      const ec = capturesByEntry.get(i);
      if (ec) for (const n of ec) visible.add(n);
    }

    if (!visible.has(ref.name)) {
      diags.push({
        severity: DiagnosticSeverity.Warning,
        range: Range.create(ref.line, ref.col, ref.line, ref.col + ref.name.length),
        message: `Undefined variable "${ref.name}" — no [Captures] definition found before this usage`,
        source: 'hurl'
      });
    }
  }
}

// ── Check: unknown option keys ────────────────────────────────────────────────

// Unknown option keys are not parsed by tree-sitter (they become ERROR nodes
// inside options_section). We look for those ERROR children and report them
// as warnings rather than generic syntax errors.
function checkUnknownOptionKeys(root: SyntaxNode, diags: Diagnostic[]): void {
  const optionsSections = findNodes(root, 'options_section');
  for (const section of optionsSections) {
    for (let i = 0; i < section.childCount; i++) {
      const child = section.child(i);
      if (!child) continue;

      if (child.isError) {
        // The error text is the full "key: value" line; extract the key
        const keyMatch = child.text.trim().match(/^([^\s:]+)/);
        const key = keyMatch ? keyMatch[1] : child.text.trim();
        diags.push({
          severity: DiagnosticSeverity.Warning,
          range: nodeRange(child),
          message: `Unknown [Options] key "${key}"`,
          source: 'hurl'
        });
      }
    }
  }
}

// ── Check: malformed status ───────────────────────────────────────────────────

function checkMalformedStatus(root: SyntaxNode, diags: Diagnostic[]): void {
  const statusNodes = findNodes(root, 'status');
  for (const s of statusNodes) {
    const code = parseInt(s.text.trim(), 10);
    if (isNaN(code) || code < 100 || code > 599) {
      diags.push({
        severity: DiagnosticSeverity.Error,
        range: nodeRange(s),
        message: `Invalid HTTP status code "${s.text.trim()}" — must be between 100 and 599`,
        source: 'hurl'
      });
    }
  }
}
