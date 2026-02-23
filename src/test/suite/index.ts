import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export function run(): Promise<void> {
  // prefer running tests against the source test folder so vitest runs TS/JS sources
  const projectRoot = path.resolve(__dirname, '..', '..', '..');
  const testsRoot = path.resolve(projectRoot, 'src', 'test');

  return new Promise((resolve, reject) => {
    // Prefer using the local vitest binary if available (robust inside extension host)
    const binName = process.platform === 'win32' ? 'vitest.cmd' : 'vitest';
    const localBin = path.resolve(__dirname, '..', '..', '..', 'node_modules', '.bin', binName);
    let cmd: string;
    let args: string[];
    if (fs.existsSync(localBin)) {
      cmd = localBin;
      args = ['run', '--reporter', 'dot', '--dir', testsRoot];
    } else {
      // fallback to npx which should pick up local install
      cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      args = ['vitest', 'run', '--reporter', 'dot', '--dir', testsRoot];
    }
    const p = spawn(cmd, args, { stdio: 'inherit' });

    p.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`vitest exited with code ${code}`));
    });
    p.on('error', (err) => reject(err));
  });
}
