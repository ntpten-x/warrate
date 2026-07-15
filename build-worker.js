const esbuild = require('esbuild');
const path = require('path');

const builtins = [
  'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console',
  'constants', 'crypto', 'dgram', 'diagnostics_channel', 'dns', 'domain',
  'events', 'fs', 'http', 'http2', 'https', 'inspector', 'module', 'net',
  'os', 'path', 'perf_hooks', 'process', 'punycode', 'querystring', 'readline',
  'repl', 'stream', 'string_decoder', 'sys', 'timers', 'tls', 'trace_events',
  'tty', 'url', 'util', 'v8', 'vm', 'wasi', 'worker_threads', 'zlib'
];

const alias = {};
const external = ['cloudflare:*', 'pg-cloudflare', 'expo-sqlite'];

for (const builtin of builtins) {
  alias[builtin] = `node:${builtin}`;
  external.push(`node:${builtin}`);
}

esbuild.build({
  entryPoints: ['.open-next/worker.js'],
  bundle: true,
  outfile: '.open-next/assets/_worker.js',
  platform: 'browser',
  format: 'esm',
  target: 'esnext',
  alias: alias,
  external: external,
  logLevel: 'info',
}).catch(() => process.exit(1));
