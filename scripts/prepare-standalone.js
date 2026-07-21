'use strict';
// Runs after `next build` to complete the standalone output:
// - copies .next/static → .next/standalone/.next/static
// - copies public/      → .next/standalone/public
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const STANDALONE = path.join(ROOT, '.next', 'standalone');

console.log('[prepare-standalone] Copying static assets...');
fs.cpSync(path.join(ROOT, '.next', 'static'), path.join(STANDALONE, '.next', 'static'), { recursive: true });
fs.cpSync(path.join(ROOT, 'public'), path.join(STANDALONE, 'public'), { recursive: true });
console.log('[prepare-standalone] Done.');
