import Franchise from 'madden-franchise';
import { parseRef } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });
const teamTable = franchise.tables.find(t => t.name === 'Team');
await teamTable.readRecords();

const pt = franchise.tables.find(t => t.name === 'Player');
await pt.readRecords(['ProspectStarRating']);

const tableCache = new Map();
async function getTable(id) {
  if (!tableCache.has(id)) {
    const t = franchise.getTableById(id);
    await t.readRecords();
    tableCache.set(id, t);
  }
  return tableCache.get(id);
}

const targets = ['Minnesota', 'Tennessee', 'Utah', 'New Mexico St.'];
let count = 0;
for (const r of teamTable.records) {
  if (r.isEmpty) continue;
  let name;
  try { name = r.DisplayName; } catch { continue; }
  if (!name) continue;

  if (!targets.includes(name) && count >= 2) { count++; continue; }

  const topRank = r.TopClassRank;
  const committed = r.LastWeekCommittedRecruits;
  console.log(`\n${name} (${r.TeamIndex}): TopClassRank=${topRank}, Committed=${committed}`);

  // Check CommittedPlayers
  const cpRef = parseRef(r.CommittedPlayers);
  if (cpRef) {
    const cpTable = await getTable(cpRef.tableId);
    const cpRec = cpTable.records[cpRef.row];
    const fields = Object.keys(cpRec.fields);

    let total = 0;
    const stars = { FIVE_STAR: 0, FOUR_STAR: 0, THREE_STAR: 0, TWO_STAR: 0, ONE_STAR: 0, other: 0 };

    for (const f of fields) {
      try {
        const val = cpRec[f];
        const ref = parseRef(val);
        if (!ref) continue;
        // These should be Player refs
        const prec = pt.records[ref.row];
        if (!prec || prec.isEmpty) continue;
        total++;
        const star = prec.ProspectStarRating;
        if (star in stars) stars[star]++;
        else stars.other++;
      } catch {}
    }

    console.log(`  CommittedPlayers: ${total} players, stars=${JSON.stringify(stars)}`);
  } else {
    console.log(`  CommittedPlayers: null ref`);
  }

  count++;
}

console.log('\nTotal teams:', count);
process.exit(0);
