import * as path from 'path';

/**
 * Group an array of absolute file paths by their parent directory.
 * Insertion order within each directory is preserved.
 */
export function groupByDirectory(filePaths: string[]): Map<string, string[]> {
  const dirs = new Map<string, string[]>();
  for (const fp of filePaths) {
    const dir = path.dirname(fp);
    const list = dirs.get(dir);
    if (list) {
      list.push(fp);
    } else {
      dirs.set(dir, [fp]);
    }
  }
  return dirs;
}
