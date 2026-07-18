// build-css.js
// CSS files ඔක්කොම bundle.css ට merge කරනවා (order matters!)
const fs = require('fs');
const path = require('path');

const root = __dirname;
const manifestPath = path.join(root, 'css/main.css');
const manifest = fs.readFileSync(manifestPath, 'utf8');
const files = [...manifest.matchAll(/@import\s+url\(["'](.+?)["']\)\s*;/g)]
  .map(([, importPath]) => path.posix.join('css', importPath.replace(/^\.\//, '')));

if (files.length === 0) {
  throw new Error('No CSS imports found in css/main.css');
}

let combined = `/* CeylonSwift — Bundled CSS | Built: ${new Date().toISOString()} */\n\n`;
let totalBytes = 0;

for (const file of files) {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Skipped (not found): ${file}`);
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf8').replace(/[ \t]+$/gm, '').trimEnd();
  totalBytes += Buffer.byteLength(content, 'utf8');
  combined += `/* ── ${file} ── */\n${content}\n\n`;
}

const outPath = path.join(root, 'css/bundle.css');
combined = `${combined.trimEnd()}\n`;
fs.writeFileSync(outPath, combined, 'utf8');

const kb = (totalBytes / 1024).toFixed(1);
console.log(`✅ CSS bundle created → css/bundle.css`);
console.log(`📦 Total size: ${kb} KB (${files.length} files merged)`);
console.log(`🔧 Now running PostCSS minification...`);
