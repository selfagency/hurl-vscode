import * as crypto from 'crypto';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HurlFlagDef {
  name: string;
  type: 'boolean' | 'string' | 'number';
  description: string;
  repeatable?: boolean;
}

export interface ActiveFlag {
  name: string;
  type: 'boolean' | 'string' | 'number';
  value: string;
}

// ── Flag definitions ───────────────────────────────────────────────────────────

export const FLAG_DEFS: HurlFlagDef[] = [
  { name: 'verbose',          type: 'boolean', description: 'Enable verbose output' },
  { name: 'very-verbose',     type: 'boolean', description: 'Enable very verbose output' },
  { name: 'insecure',         type: 'boolean', description: 'Allow insecure SSL connections' },
  { name: 'compressed',       type: 'boolean', description: 'Request compressed response' },
  { name: 'location',         type: 'boolean', description: 'Follow redirects' },
  { name: 'location-trusted', type: 'boolean', description: 'Follow redirects, sending credentials' },
  { name: 'ipv6',             type: 'boolean', description: 'Resolve names to IPv6 addresses' },
  { name: 'http3',            type: 'boolean', description: 'Use HTTP/3' },
  { name: 'path-as-is',       type: 'boolean', description: 'Do not normalize the path in the URL' },
  { name: 'variable',         type: 'string',  description: 'Define a variable (name=value)', repeatable: true },
  { name: 'user',             type: 'string',  description: 'User credentials (user:password)' },
  { name: 'proxy',            type: 'string',  description: 'Use this proxy (protocol://host[:port])' },
  { name: 'cacert',           type: 'string',  description: 'CA certificate file' },
  { name: 'cert',             type: 'string',  description: 'Client certificate file and password' },
  { name: 'key',              type: 'string',  description: 'Client certificate private key' },
  { name: 'unix-socket',      type: 'string',  description: 'Unix domain socket path' },
  { name: 'aws-sigv4',        type: 'string',  description: 'AWS SigV4 provider[:region[:service[:token]]]' },
  { name: 'output',           type: 'string',  description: 'Write output to file (use - for stdout)' },
  { name: 'connect-timeout',  type: 'number',  description: 'Connection timeout (seconds)' },
  { name: 'max-time',         type: 'number',  description: 'Maximum transfer time (seconds)' },
  { name: 'max-redirs',       type: 'number',  description: 'Maximum number of redirects' },
  { name: 'retry',            type: 'number',  description: 'Number of retries on transient errors' },
  { name: 'retry-interval',   type: 'number',  description: 'Duration between retries (milliseconds)' },
  { name: 'delay',            type: 'number',  description: 'Delay before each request (milliseconds)' },
  { name: 'limit-rate',       type: 'number',  description: 'Limit transfer speed (bytes/second)' },
  { name: 'repeat',           type: 'number',  description: 'Repeat the file N times' },
];

// ── Pure helpers ───────────────────────────────────────────────────────────────

/** Returns a cryptographically random 32-character hex string for use as a CSP nonce. */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Build the argument array for a `hurl` CLI invocation.
 *
 * Arguments are returned as an array (never shell-concatenated) so callers can
 * pass them directly to `child_process.execFile`, preventing shell injection.
 */
export function buildHurlArgs(
  filePath: string,
  activeFlags: ActiveFlag[],
  reportPath: string,
  fromEntry?: number,
  toEntry?: number
): string[] {
  const args: string[] = [filePath];

  if (fromEntry !== undefined) {
    args.push('--from-entry', String(fromEntry));
    args.push('--to-entry', String(toEntry ?? fromEntry));
  }

  for (const flag of activeFlags) {
    if (flag.type === 'boolean') {
      args.push(`--${flag.name}`);
    } else if (flag.value !== '') {
      args.push(`--${flag.name}`, flag.value);
    }
  }

  args.push('--report-json', reportPath);
  return args;
}
