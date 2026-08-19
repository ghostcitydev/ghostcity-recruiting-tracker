'use strict';
// Runs after `next build` to complete the standalone output:
// - copies .next/static → .next/standalone/.next/static
// - copies public/      → .next/standalone/public
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const STANDALONE = path.join(ROOT, '.next', 'standalone');

console.log('[prepare-standalone] Copying static assets...');
// Output tracing can conservatively copy dynamically referenced project files
// into standalone. Never ship prior build artifacts, local database contents,
// environment secrets, or the upstream reference-app folder.
for (const generatedPath of [
  path.join(STANDALONE, 'dist'),
  path.join(STANDALONE, 'backups'),
  path.join(STANDALONE, 'archive'),
  path.join(STANDALONE, 'extracts'),
  path.join(STANDALONE, 'public'),
  path.join(STANDALONE, 'dev.db'),
  path.join(STANDALONE, '.env'),
]) {
  fs.rmSync(generatedPath, { recursive: true, force: true });
}
fs.cpSync(path.join(ROOT, '.next', 'static'), path.join(STANDALONE, '.next', 'static'), { recursive: true });
// The upstream desktop apps and source archives under public/other mods are
// development references, not runtime assets. Embedded workflows use the
// runners below; Transfer Wave's one required source file is copied as an
// Electron extraResource. Excluding this directory prevents several GB of
// duplicate packages from being compressed into every portable build.
const publicRoot = path.join(ROOT, 'public');
const otherModsRoot = path.join(publicRoot, 'other mods');
fs.cpSync(publicRoot, path.join(STANDALONE, 'public'), {
  recursive: true,
  filter: (source) => path.resolve(source) !== path.resolve(otherModsRoot),
});
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
