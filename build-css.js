// build-css.js
// CSS files ඔක්කොම bundle.css ට merge කරනවා (order matters!)
const fs = require('fs');
const path = require('path');

const files = [
  // 1. Base — සියල්ලටම foundation
  'css/base/variables.css',
  'css/base/reset.css',
  'css/base/typography.css',

  // 2. Layout — page structure
  'css/layout/header.css',
  'css/layout/navigation.css',
  'css/layout/layout.css',

  // 3. Components — reusable UI
  'css/components/buttons.css',
  'css/components/forms.css',
  'css/components/modals.css',
  'css/components/components.css',
  'css/components/components-late.css',
  'css/components/device-simulator.css',
  'css/components/google-auth.css',

  // 4. Pages — page-specific styles
  'css/pages/dashboard.css',
  'css/pages/tracking.css',
  'css/pages/home.css',
  'css/pages/login.css',

  // 5. Utilities — overrides last (highest priority)
  'css/utilities/themes.css',
  'css/utilities/utilities.css',
];

const root = __dirname;
let combined = `/* CeylonSwift — Bundled CSS | Built: ${new Date().toISOString()} */\n\n`;
let totalBytes = 0;

for (const file of files) {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Skipped (not found): ${file}`);
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  totalBytes += Buffer.byteLength(content, 'utf8');
  combined += `/* ── ${file} ── */\n${content}\n\n`;
}

const outPath = path.join(root, 'css/bundle.css');
fs.writeFileSync(outPath, combined, 'utf8');

const kb = (totalBytes / 1024).toFixed(1);
console.log(`✅ CSS bundle created → css/bundle.css`);
console.log(`📦 Total size: ${kb} KB (${files.length} files merged)`);
console.log(`🔧 Now running PostCSS minification...`);
