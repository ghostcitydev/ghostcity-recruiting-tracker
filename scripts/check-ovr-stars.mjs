import Franchise from 'madden-franchise';
import { parseRef, tableByName } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const teamTable = tableByName(franchise, 'Team');
await teamTable.readRecords(['DisplayName', 'CommittedPlayers']);

const pt = tableByName(franchise, 'Player');
await pt.readRecords(['ProspectStarRating', 'OverallRating', 'FirstName', 'LastName', 'Position']);

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

// Minnesota committed players with OVR
for (const r of teamTable.records) {
  if (r.isEmpty || r.DisplayName !== 'Minnesota') continue;

  const cpRef = parseRef(r.CommittedPlayers);
  if (!cpRef) continue;
  const cpTable = await getTable(cpRef.tableId);
  const cpRec = cpTable.records[cpRef.row];

  console.log('Minnesota CommittedPlayers with OVR:');
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
      console.log(`  ${i}. ${prec.FirstName} ${prec.LastName} (${prec.Position}) OVR=${prec.OverallRating} star=${prec.ProspectStarRating} class=${recruit?.Class ?? 'NONE'}`);
    } catch {}
  }
  break;
}

// Now do the same for Tennessee
for (const r of teamTable.records) {
  if (r.isEmpty || r.DisplayName !== 'Tennessee') continue;

  const cpRef = parseRef(r.CommittedPlayers);
  if (!cpRef) continue;
  const cpTable = await getTable(cpRef.tableId);
  const cpRec = cpTable.records[cpRef.row];

  console.log('\nTennessee CommittedPlayers with OVR:');
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
      console.log(`  ${i}. ${prec.FirstName} ${prec.LastName} (${prec.Position}) OVR=${prec.OverallRating} star=${prec.ProspectStarRating} class=${recruit?.Class ?? 'NONE'}`);
    } catch {}
  }
  break;
}

process.exit(0);
