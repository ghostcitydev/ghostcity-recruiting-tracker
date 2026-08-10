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
fs.cpSync(path.join(ROOT, 'lib', 'embeddedMods'), path.join(STANDALONE, 'embeddedMods'), { recursive: true });
// Fang's runner is dynamically loaded from `lib/embeddedMods` by the import
// route. Turbopack does not reliably trace its JSON data assets, so keep a
// complete copy beside that loader too.
fs.cpSync(
  path.join(ROOT, 'lib', 'embeddedMods'),
  path.join(STANDALONE, 'lib', 'embeddedMods'),
  { recursive: true }
);
// `madden-franchise` is externalized by Next, but its schema lookup JSON is
// not always included by standalone tracing. Copy the runtime data explicitly
// so packaged PocketScout/import routes can resolve slotsLookup.json.
const franchiseData = path.join(ROOT, 'node_modules', 'madden-franchise', 'data');
const standaloneFranchiseData = path.join(STANDALONE, 'node_modules', 'madden-franchise', 'data');
fs.cpSync(franchiseData, standaloneFranchiseData, { recursive: true });
console.log('[prepare-standalone] Done.');
