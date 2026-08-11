'use strict';

// Next.js does not always remove stale files from .next/standalone between
// builds. A previous packaged dist/ or public/other mods copy can otherwise be
// nested inside the next portable EXE, multiplying its size on every build.
const fs = require('fs');
const path = require('path');

const standalone = path.join(__dirname, '..', '.next', 'standalone');
fs.rmSync(standalone, { recursive: true, force: true });
console.log('[clean-standalone] Removed stale standalone output.');
