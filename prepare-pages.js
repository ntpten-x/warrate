const fs = require('fs');
const path = require('path');

const srcDir = '.open-next';
const destDir = path.join('.open-next', 'assets');

// Copy worker.js to assets/_worker.js
fs.copyFileSync(
  path.join(srcDir, 'worker.js'),
  path.join(destDir, '_worker.js')
);

// Directories to copy
const dirsToCopy = ['cloudflare', 'middleware', 'server-functions', '.build'];

for (const dir of dirsToCopy) {
  const src = path.join(srcDir, dir);
  const dest = path.join(destDir, dir);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
  }
}

// Rewrite require("fs") to require("node:fs") in all output files
function rewriteNodeImports(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      rewriteNodeImports(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.cjs') || fullPath.endsWith('.mjs')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      const replacements = ['fs', 'path', 'os', 'crypto', 'stream', 'util', 'url', 'net', 'tls', 'http', 'https', 'zlib', 'events', 'buffer', 'child_process'];
      for (const mod of replacements) {
        const reqStr1 = `require("${mod}")`;
        const reqStr2 = `require('${mod}')`;
        if (content.includes(reqStr1) || content.includes(reqStr2)) {
          content = content.replaceAll(reqStr1, `require("node:${mod}")`);
          content = content.replaceAll(reqStr2, `require('node:${mod}')`);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  }
}
rewriteNodeImports(destDir);


console.log('Prepared .open-next/assets for Cloudflare Pages deployment!');
