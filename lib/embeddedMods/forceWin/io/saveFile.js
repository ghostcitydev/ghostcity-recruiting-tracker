// Opens a CFB 27 save and resolves the handful of tables the Force Win
// engine needs. Mirrors the open/backup/write conventions already used by
// lib/embeddedMods/pipeline/io/saveFile.js and lib/rebalanceSave.ts
// (Franchise.create + franchise.save(), 'RLT Backups' folder next to the
// save) rather than the standalone Ace's CFB Toolkit's own service layer.
const fs = require('fs');
const path = require('path');
const Franchise = require('madden-franchise');

// Verified CFB 27 table Unique IDs (schema-defined, stable across saves --
// distinct from the runtime tableId embedded in binary references). Carried
// over as-is from Ace's CFB Toolkit 0.9.3's forceWin/runner.js TABLE_UIDS.
const TABLE_UIDS = Object.freeze({
  seasonInfo: 3123991521,
  seasonGame: 4049338978,
  team: 3359508968,
  coach: 1860529246,
  rivalry: 1822870912,
  scheduleNeutralStadium: 2588978308,
  player: 1612938518,
  depthChart: 302004547,
  depthChartPlayers: 524492698
});

async function openSave(savePath) {
  return Franchise.create(savePath);
}

function tableByUniqueId(franchise, uniqueId) {
  const table = franchise.tables.find(candidate =>
    candidate.uniqueId === uniqueId || (candidate.header && candidate.header.uniqueId === uniqueId));
  if (!table) throw new Error(`Required game table (Unique ID ${uniqueId}) was not found in this save.`);
  return table;
}

async function readForceWinTables(franchise, keys = Object.keys(TABLE_UIDS)) {
  const tables = Object.fromEntries(keys.map(key => [key, tableByUniqueId(franchise, TABLE_UIDS[key])]));
  await Promise.all(Object.values(tables).map(table => table.readRecords()));
  return tables;
}

function nextBackupPath(savePath, backupDir) {
  const resolvedBackupDir = backupDir || path.join(path.dirname(savePath), 'RLT Backups');
  const base = path.basename(savePath);
  const date = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(resolvedBackupDir, `${base}.gc-rlt-pre-force-win.${date}.bak`);
}

async function createBackup(savePath, backupDir) {
  const target = nextBackupPath(savePath, backupDir);
  await fs.promises.mkdir(path.dirname(target), { recursive: true });
  await fs.promises.copyFile(savePath, target);
  return target;
}

module.exports = { TABLE_UIDS, openSave, tableByUniqueId, readForceWinTables, createBackup, nextBackupPath };
