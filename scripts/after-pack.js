'use strict';
// electron-builder afterPack hook.
// Replaces the npm-installed better-sqlite3 in the standalone output with the
// Electron-rebuilt version from node_modules/ (rebuilt by @electron/rebuild).
const fs = require('fs');
const path = require('path');

exports.default = async function afterPack(context) {
  const root = context.packager.projectDir;
  const standaloneModules = path.join(context.appOutDir, 'resources', 'standalone', 'node_modules');

  const packages = [
    'better-sqlite3',
    'bindings',
    'file-uri-to-path',
    path.join('@prisma', 'adapter-better-sqlite3'),
    path.join('@prisma', 'driver-adapter-utils'),
  ];

  for (const pkg of packages) {
    const src = path.join(root, 'node_modules', pkg);
    const dst = path.join(standaloneModules, pkg);
    if (fs.existsSync(src)) {
      fs.cpSync(src, dst, { recursive: true, force: true });
      console.log(`[afterPack] Synced ${pkg}`);
    }
  }
};
