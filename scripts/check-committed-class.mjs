import Franchise from 'madden-franchise';
import { parseRef, tableByName } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const teamTable = tableByName(franchise, 'Team');
await teamTable.readRecords(['DisplayName', 'TeamIndex', 'CommittedPlayers']);

const pt = tableByName(franchise, 'Player');
await pt.readRecords(['ProspectStarRating', 'SchoolYear']);

// Build reverse map: player row -> recruit record
const rt = tableByName(franchise, 'Recruit');
await rt.readRecords(['Player', 'Class', 'RecruitStage']);
const playerToRecruit = new Map();
for (const rec of rt.records) {
  if (rec.isEmpty) continue;
  const ref = parseRef(rec.Player);
  if (ref) playerToRecruit.set(ref.row, rec);
}

console.log('Reverse map size:', playerToRecruit.size);

const tableCache = new Map();
async function getTable(id) {
  if (!tableCache.has(id)) {
    const t = franchise.getTableById(id);
    await t.readRecords();
    tableCache.set(id, t);
  }
  return tableCache.get(id);
}

// Check Minnesota
for (const r of teamTable.records) {
  if (r.isEmpty || !r.DisplayName || r.DisplayName !== 'Minnesota') continue;

  const cpRef = parseRef(r.CommittedPlayers);
  if (!cpRef) continue;
  const cpTable = await getTable(cpRef.tableId);
  const cpRec = cpTable.records[cpRef.row];

  console.log('Minnesota committed:');
  let total = 0;
  for (const f of Object.keys(cpRec.fields)) {
    try {
      const val = cpRec[f];
      const ref = parseRef(val);
      if (!ref) continue;
      const prec = pt.records[ref.row];
      if (!prec || prec.isEmpty) continue;

      const recruit = playerToRecruit.get(ref.row);
      total++;
      if (total <= 5) {
        console.log(`  Player row=${ref.row}: star=${prec.ProspectStarRating}, schoolYear=${prec.SchoolYear}, class=${recruit?.Class ?? 'no recruit record'}, stage=${recruit?.RecruitStage ?? 'N/A'}`);
      }
    } catch {}
  }
  console.log(`  Total: ${total}`);
  break;
}

// Count how many committed players have vs don't have recruit records
let withRecruit = 0, withoutRecruit = 0;
for (const r of teamTable.records) {
  if (r.isEmpty || !r.DisplayName) continue;
  const cpRef = parseRef(r.CommittedPlayers);
  if (!cpRef) continue;
  const cpTable = await getTable(cpRef.tableId);
  const cpRec = cpTable.records[cpRef.row];

  for (const f of Object.keys(cpRec.fields)) {
    try {
      const val = cpRec[f];
      const ref = parseRef(val);
      if (!ref) continue;
      const prec = pt.records[ref.row];
      if (!prec || prec.isEmpty) continue;
      if (playerToRecruit.has(ref.row)) withRecruit++;
      else withoutRecruit++;
    } catch {}
  }
}
console.log(`\nCommitted players with recruit record: ${withRecruit}`);
console.log(`Committed players without recruit record: ${withoutRecruit}`);

process.exit(0);
