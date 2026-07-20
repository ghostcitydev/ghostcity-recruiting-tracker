import Franchise from 'madden-franchise';
import { parseRef, tableByName } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const teamTable = tableByName(franchise, 'Team');
await teamTable.readRecords([
  'DisplayName', 'TeamIndex', 'CommittedPlayers', 'TopClassRank',
  'LastWeekCommittedRecruits', 'TopClassConferenceRank',
]);

const pt = tableByName(franchise, 'Player');
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

const targets = ['Minnesota', 'Tennessee', 'Utah', 'Colorado', 'Oregon State'];
for (const r of teamTable.records) {
  if (r.isEmpty || !r.DisplayName) continue;
  const name = r.DisplayName;
  if (!targets.includes(name)) continue;

  console.log(`\n${name} (${r.TeamIndex}): TopClassRank=${r.TopClassRank}, Committed=${r.LastWeekCommittedRecruits}`);

  const cpRef = parseRef(r.CommittedPlayers);
  if (cpRef) {
    const cpTable = await getTable(cpRef.tableId);
    const cpRec = cpTable.records[cpRef.row];
    console.log(`  CommittedPlayers table: ${cpTable.name}, fields: ${Object.keys(cpRec.fields).length}`);

    let total = 0;
    const stars = { FIVE_STAR: 0, FOUR_STAR: 0, THREE_STAR: 0, TWO_STAR: 0, ONE_STAR: 0 };

    for (const f of Object.keys(cpRec.fields)) {
      try {
        const val = cpRec[f];
        const ref = parseRef(val);
        if (!ref) continue;
        const prec = pt.records[ref.row];
        if (!prec || prec.isEmpty) continue;
        total++;
        const star = prec.ProspectStarRating;
        if (star in stars) stars[star]++;
      } catch {}
    }

    console.log(`  Total: ${total}, Stars: 5★=${stars.FIVE_STAR} 4★=${stars.FOUR_STAR} 3★=${stars.THREE_STAR} 2★=${stars.TWO_STAR} 1★=${stars.ONE_STAR}`);
  } else {
    console.log('  CommittedPlayers: null');
  }
}

process.exit(0);
