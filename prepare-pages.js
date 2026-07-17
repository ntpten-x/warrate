const fs = require('fs');
const path = require('path');

const srcDir = '.open-next';
const destDir = path.join('.open-next', 'assets');

// 1. Copy worker.js to assets/_worker.js and fix relative imports
let workerContent = fs.readFileSync(path.join(srcDir, 'worker.js'), 'utf8');
// Fix relative imports: "./cloudflare/..." -> "../cloudflare/..."
workerContent = workerContent.replace(/(["'])\.\//g, '$1../');
fs.writeFileSync(path.join(destDir, '_worker.js'), workerContent, 'utf8');

// 2. Rewrite require("fs") to require("node:fs") in server-functions and MINIFY
const esbuild = require('esbuild');

function rewriteNodeImports(dir) {
  if (!fs.existsSync(dir)) return;
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
      
      // Replace pg with pg-cloudflare to reduce bundle size and use Edge-compatible driver
      if (content.includes('require("pg")') || content.includes("require('pg')")) {
        content = content.replaceAll('require("pg")', 'require("pg-cloudflare")');
        content = content.replaceAll("require('pg')", "require('pg-cloudflare')");
        changed = true;
      }
      
      // Also prevent large unused drivers in TypeORM from being bundled
      const unusedDrivers = ['mysql', 'mysql2', 'oracledb', 'mssql', 'sqlite3', 'sql.js', 'react-native-sqlite-storage', 'expo-sqlite'];
      for (const driver of unusedDrivers) {
        if (content.includes(`require("${driver}")`) || content.includes(`require('${driver}')`)) {
          content = content.replaceAll(`require("${driver}")`, 'undefined');
          content = content.replaceAll(`require('${driver}')`, 'undefined');
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
      }

      // Minify the file in place to reduce size
      try {
        esbuild.buildSync({
          entryPoints: [fullPath],
          outfile: fullPath,
          minify: true,
          keepNames: true,
          allowOverwrite: true,
          target: 'esnext'
        });
      } catch (err) {
        console.error('Failed to minify:', fullPath, err.message);
      }
    }
  }
}

rewriteNodeImports(path.join(srcDir, 'server-functions'));

console.log('Prepared .open-next/assets for Cloudflare Pages deployment!');

