import Convert from 'ansi-to-html';
import { execFile } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import { ActiveFlag, FLAG_DEFS, buildHurlArgs, generateNonce } from './queryBuilder.utils';

export { FLAG_DEFS, buildHurlArgs, generateNonce };
export type { ActiveFlag };

// ── Public API ─────────────────────────────────────────────────────────────────

export interface QueryBuilderOpts {
  /** VS Code URI string (file:///...) for the .hurl file to run. */
  uri: string;
  /**
   * 1-based entry index from CodeLens (▶ Run).
   * When set, --from-entry and --to-entry are pre-populated and the run scope
   * is locked to this single entry (values are still editable by the user).
   * When absent, the whole file runs (▶ Run All).
   */
  entryIndex?: number;
}

export function openQueryBuilder(context: vscode.ExtensionContext, opts: QueryBuilderOpts): void {
  const filePath = vscode.Uri.parse(opts.uri).fsPath;
  const title = opts.entryIndex !== undefined
    ? `Hurl: entry ${opts.entryIndex}`
    : `Hurl: ${path.basename(filePath)}`;

  const panel = vscode.window.createWebviewPanel(
    'hurl.queryBuilder',
    title,
    vscode.ViewColumn.Beside,
    { enableScripts: true, localResourceRoots: [] }
  );

  const nonce = generateNonce();
  panel.webview.html = getWebviewContent(filePath, opts.entryIndex, nonce);

  const convert = new Convert({ escapeXML: true });

  panel.webview.onDidReceiveMessage(async (msg: unknown) => {
    const m = msg as { type: string; activeFlags?: ActiveFlag[]; fromEntry?: number; toEntry?: number; command?: string };

    if (m.type === 'run') {
      const reportDir = path.join(os.tmpdir(), `hurl-run-${crypto.randomUUID()}`);
      fs.mkdirSync(reportDir, { recursive: true });

      const args = buildHurlArgs(
        filePath,
        m.activeFlags ?? [],
        reportDir,
        m.fromEntry,
        m.toEntry
      );

      execFile('hurl', args, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        let html = '';

        if (stdout) {
          html += `<pre>${convert.toHtml(stdout)}</pre>`;
        }
        if (stderr) {
          html += `<pre style="color:var(--vscode-errorForeground)">${convert.toHtml(stderr)}</pre>`;
        }
        if (!stdout && !stderr && error) {
          html += `<pre style="color:var(--vscode-errorForeground)">${escapeHtml(error.message)}</pre>`;
        }

        // Parse JSON report if present
        const reportFile = path.join(reportDir, 'report.json');
        if (fs.existsSync(reportFile)) {
          try {
            const raw = fs.readFileSync(reportFile, 'utf-8');
            const report = JSON.parse(raw) as { entries?: { asserts?: { success: boolean; expression?: string; actual?: string; expected?: string }[] }[] };
            const failures = (report.entries ?? []).flatMap(e =>
              (e.asserts ?? []).filter(a => !a.success)
            );
            if (failures.length > 0) {
              html += `<hr><strong>${failures.length} assertion failure${failures.length > 1 ? 's' : ''}:</strong>`;
              for (const f of failures) {
                html += `<div class="failure">`;
                if (f.expression) html += `<div>assert: <code>${escapeHtml(f.expression)}</code></div>`;
                if (f.actual !== undefined) html += `<div>actual: <code>${escapeHtml(String(f.actual))}</code></div>`;
                if (f.expected !== undefined) html += `<div>expected: <code>${escapeHtml(String(f.expected))}</code></div>`;
                html += `</div>`;
              }
            }
          } catch {
            // Ignore JSON parse errors
          }
          try { fs.rmSync(reportDir, { recursive: true, force: true }); } catch { /* ignore */ }
        }

        void panel.webview.postMessage({ type: 'output', html });
      });

    } else if (m.type === 'copy') {
      if (typeof m.command === 'string') {
        await vscode.env.clipboard.writeText(m.command);
        void vscode.window.showInformationMessage('Hurl command copied to clipboard');
      }
    }
  }, undefined, context.subscriptions);
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Safely embed a value as a JS literal inside a <script> tag. */
function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/<\//g, '<\\/');
}

function getWebviewContent(filePath: string, fromEntry: number | undefined, nonce: string): string {
  const flagDefsJs = safeJson(FLAG_DEFS);
  const fromEntryJs = safeJson(fromEntry ?? null);
  const filePathJs = safeJson(filePath);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>Hurl Query Builder</title>
  <style nonce="${nonce}">
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 16px 20px;
      margin: 0;
    }
    h2 { font-size: 1em; font-weight: 600; margin: 0 0 6px; }
    .file-path {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 0.85em;
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border, transparent);
      padding: 5px 8px;
      border-radius: 3px;
      margin-bottom: 14px;
      word-break: break-all;
    }
    .section { margin-bottom: 14px; }
    .entry-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .entry-row label { min-width: 100px; font-size: 0.9em; }
    input[type="number"] { width: 72px; }
    input, select, button {
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, transparent);
      padding: 4px 7px;
      border-radius: 3px;
      font-size: inherit;
      font-family: inherit;
    }
    select { cursor: pointer; width: 100%; }
    .flag-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 0;
      border-bottom: 1px solid var(--vscode-panel-border, #333);
    }
    .flag-name { font-family: var(--vscode-editor-font-family, monospace); font-size: 0.85em; min-width: 150px; }
    .flag-value { flex: 1; }
    .flag-del {
      background: none;
      border: none;
      color: var(--vscode-foreground);
      cursor: pointer;
      opacity: 0.55;
      padding: 2px 6px;
      border-radius: 3px;
    }
    .flag-del:hover { opacity: 1; background: var(--vscode-toolbar-hoverBackground, rgba(127,127,127,.2)); }
    .actions { display: flex; gap: 8px; margin-bottom: 14px; }
    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 5px 14px;
      border-radius: 3px;
      cursor: pointer;
    }
    .btn-primary:hover { background: var(--vscode-button-hoverBackground); }
    .btn-secondary {
      background: var(--vscode-button-secondaryBackground, var(--vscode-input-background));
      color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
      border: 1px solid var(--vscode-input-border, transparent);
      padding: 5px 14px;
      border-radius: 3px;
      cursor: pointer;
    }
    .btn-secondary:hover { opacity: 0.8; }
    .cmd-preview {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 0.8em;
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border, transparent);
      padding: 6px 8px;
      border-radius: 3px;
      margin-bottom: 14px;
      word-break: break-all;
      white-space: pre-wrap;
    }
    #output {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 0.82em;
      background: var(--vscode-terminal-background, var(--vscode-editor-background));
      border: 1px solid var(--vscode-panel-border, #333);
      padding: 10px;
      border-radius: 3px;
      min-height: 60px;
      overflow-x: auto;
    }
    #output pre { margin: 0; white-space: pre-wrap; }
    .failure {
      border-left: 3px solid var(--vscode-errorForeground, #f44);
      padding: 4px 8px;
      margin: 6px 0;
      font-size: 0.9em;
    }
  </style>
</head>
<body>

<div class="file-path">${escapeHtml(filePath)}</div>

${fromEntry !== undefined ? `
<div class="section">
  <h2>Entry Range</h2>
  <div class="entry-row">
    <label for="from-entry">From entry</label>
    <input type="number" id="from-entry" value="${fromEntry}" min="1">
  </div>
  <div class="entry-row">
    <label for="to-entry">To entry</label>
    <input type="number" id="to-entry" value="${fromEntry}" min="1">
  </div>
</div>
` : ''}

<div class="section">
  <h2>Flags</h2>
  <select id="flag-select" aria-label="Add flag"></select>
  <div id="flags-list" style="margin-top:8px"></div>
</div>

<div class="section">
  <h2>Command Preview</h2>
  <div class="cmd-preview" id="cmd-preview" aria-live="polite">hurl ${escapeHtml(filePath)}</div>
</div>

<div class="actions">
  <button class="btn-primary" id="run-btn">&#9654; Run</button>
  <button class="btn-secondary" id="copy-btn">Copy Command</button>
</div>

<h2>Output</h2>
<div id="output" aria-live="polite"></div>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const FLAG_DEFS = ${flagDefsJs};
  const FROM_ENTRY = ${fromEntryJs};
  const FILE_PATH = ${filePathJs};

  let activeFlags = [];

  function updateFlagSelect() {
    const sel = document.getElementById('flag-select');
    const usedNonRepeatable = new Set(
      activeFlags
        .filter(f => !FLAG_DEFS.find(d => d.name === f.name)?.repeatable)
        .map(f => f.name)
    );
    sel.innerHTML = '<option value="">— Add flag —</option>';
    FLAG_DEFS.forEach(def => {
      if (!usedNonRepeatable.has(def.name)) {
        const opt = document.createElement('option');
        opt.value = def.name;
        opt.textContent = '--' + def.name + '  (' + def.description + ')';
        sel.appendChild(opt);
      }
    });
  }

  function updateFlagsList() {
    const list = document.getElementById('flags-list');
    list.innerHTML = '';
    activeFlags.forEach((flag, idx) => {
      const row = document.createElement('div');
      row.className = 'flag-row';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'flag-name';
      nameSpan.textContent = '--' + flag.name;
      row.appendChild(nameSpan);

      if (flag.type !== 'boolean') {
        const inp = document.createElement('input');
        inp.className = 'flag-value';
        inp.type = flag.type === 'number' ? 'number' : 'text';
        inp.value = flag.value;
        inp.placeholder = 'value';
        inp.addEventListener('input', () => {
          activeFlags[idx].value = inp.value;
          updateCmdPreview();
        });
        row.appendChild(inp);
      } else {
        const spacer = document.createElement('span');
        spacer.className = 'flag-value';
        row.appendChild(spacer);
      }

      const del = document.createElement('button');
      del.className = 'flag-del';
      del.textContent = '✕';
      del.title = 'Remove flag';
      del.setAttribute('aria-label', 'Remove --' + flag.name);
      del.addEventListener('click', () => {
        activeFlags.splice(idx, 1);
        updateAll();
      });
      row.appendChild(del);
      list.appendChild(row);
    });
  }

  function getEntryArgs() {
    if (FROM_ENTRY === null) return [];
    const from = document.getElementById('from-entry')?.value ?? String(FROM_ENTRY);
    const to   = document.getElementById('to-entry')?.value   ?? String(FROM_ENTRY);
    return ['--from-entry', from, '--to-entry', to];
  }

  function updateCmdPreview() {
    const parts = ['hurl'];
    getEntryArgs().forEach(a => parts.push(a));
    activeFlags.forEach(f => {
      if (f.type === 'boolean') {
        parts.push('--' + f.name);
      } else if (f.value) {
        const v = f.value.includes(' ') ? '"' + f.value + '"' : f.value;
        parts.push('--' + f.name, v);
      }
    });
    parts.push(FILE_PATH.includes(' ') ? '"' + FILE_PATH + '"' : FILE_PATH);
    document.getElementById('cmd-preview').textContent = parts.join(' ');
  }

  function updateAll() {
    updateFlagSelect();
    updateFlagsList();
    updateCmdPreview();
  }

  document.getElementById('flag-select').addEventListener('change', e => {
    const name = e.target.value;
    if (!name) return;
    const def = FLAG_DEFS.find(d => d.name === name);
    if (!def) return;
    activeFlags.push({ name: def.name, type: def.type, value: '' });
    e.target.value = '';
    updateAll();
  });

  document.getElementById('run-btn').addEventListener('click', () => {
    document.getElementById('output').textContent = 'Running\u2026';
    const fromEntry = FROM_ENTRY !== null
      ? parseInt(document.getElementById('from-entry')?.value ?? String(FROM_ENTRY), 10)
      : undefined;
    const toEntry = FROM_ENTRY !== null
      ? parseInt(document.getElementById('to-entry')?.value ?? String(FROM_ENTRY), 10)
      : undefined;
    vscode.postMessage({ type: 'run', activeFlags, fromEntry, toEntry });
  });

  document.getElementById('copy-btn').addEventListener('click', () => {
    vscode.postMessage({ type: 'copy', command: document.getElementById('cmd-preview').textContent });
  });

  window.addEventListener('message', event => {
    const msg = event.data;
    if (msg.type === 'output') {
      document.getElementById('output').innerHTML = msg.html || '<em>No output.</em>';
    }
  });

  // Sync entry fields to command preview
  ['from-entry', 'to-entry'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateCmdPreview);
  });

  updateAll();
</script>
</body>
</html>`;
}
