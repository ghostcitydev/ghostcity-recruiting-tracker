import Franchise from 'madden-franchise';
import { parseRef, tableByName } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const teamTable = tableByName(franchise, 'Team');
await teamTable.readRecords(['DisplayName', 'TeamIndex', 'CommittedPlayers']);

const pt = tableByName(franchise, 'Player');
await pt.readRecords(['ProspectStarRating', 'SchoolYear', 'FirstName', 'LastName', 'Position', 'Age']);

const rt = tableByName(franchise, 'Recruit');
await rt.readRecords(['Player', 'Class', 'RecruitStage']);
const playerToRecruit = new Map();
for (const rec of rt.records) {
  if (rec.isEmpty) continue;
  const ref = parseRef(rec.Player);
  if (ref) playerToRecruit.set(ref.row, rec);
}

const tableCache = new Map();
async function getTable(id) {
  if (!tableCache.has(id)) {
    const t = franchise.getTableById(id);
    await t.readRecords();
    tableCache.set(id, t);
  }
  return tableCache.get(id);
}

// Check Minnesota in detail
for (const r of teamTable.records) {
  if (r.isEmpty || r.DisplayName !== 'Minnesota') continue;

  const cpRef = parseRef(r.CommittedPlayers);
  if (!cpRef) continue;
  const cpTable = await getTable(cpRef.tableId);
  const cpRec = cpTable.records[cpRef.row];

  console.log('Minnesota CommittedPlayers:');
  let i = 0;
  for (const f of Object.keys(cpRec.fields)) {
    try {
      const val = cpRec[f];
      const ref = parseRef(val);
      if (!ref) continue;
      const prec = pt.records[ref.row];
      if (!prec || prec.isEmpty) continue;

      i++;
      const recruit = playerToRecruit.get(ref.row);
      console.log(`  ${i}. ${prec.FirstName} ${prec.LastName} (${prec.Position}) row=${ref.row} star=${prec.ProspectStarRating} schoolYear=${prec.SchoolYear} age=${prec.Age} | recruit: class=${recruit?.Class ?? 'NONE'} stage=${recruit?.RecruitStage ?? 'NONE'}`);
    } catch {}
  }
  console.log(`  Total: ${i}`);
  break;
}

// Also check Tennessee
for (const r of teamTable.records) {
  if (r.isEmpty || r.DisplayName !== 'Tennessee') continue;

  const cpRef = parseRef(r.CommittedPlayers);
  if (!cpRef) continue;
  const cpTable = await getTable(cpRef.tableId);
  const cpRec = cpTable.records[cpRef.row];

  console.log('\nTennessee CommittedPlayers:');
  let i = 0;
  let hasRecruit = 0, noRecruit = 0;
  for (const f of Object.keys(cpRec.fields)) {
    try {
      const val = cpRec[f];
      const ref = parseRef(val);
      if (!ref) continue;
      const prec = pt.records[ref.row];
      if (!prec || prec.isEmpty) continue;

      i++;
      const recruit = playerToRecruit.get(ref.row);
      if (recruit) hasRecruit++; else noRecruit++;
      if (i <= 5 || !recruit) {
        console.log(`  ${i}. ${prec.FirstName} ${prec.LastName} (${prec.Position}) star=${prec.ProspectStarRating} schoolYear=${prec.SchoolYear} | recruit: class=${recruit?.Class ?? 'NONE'} stage=${recruit?.RecruitStage ?? 'NONE'}`);
      }
    } catch {}
  }
  console.log(`  Total: ${i}, withRecruit: ${hasRecruit}, noRecruit: ${noRecruit}`);
  break;
}

process.exit(0);
