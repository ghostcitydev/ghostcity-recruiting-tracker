import Franchise from 'madden-franchise';
import { parseRef } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const teamTable = franchise.tables.find(t => t.name === 'Team');
await teamTable.readRecords(['DisplayName', 'TeamIndex', 'CommittedPlayers', 'TopClassRank', 'LastWeekCommittedRecruits', 'TopClassConferenceRank']);

const pt = franchise.tables.find(t => t.name === 'Player');
await pt.readRecords(['ProspectStarRating']);

const rt = franchise.tables.find(t => t.name === 'Recruit');
await rt.readRecords();

const tableCache = new Map();
async function getTable(id) {
  if (!tableCache.has(id)) {
    const t = franchise.getTableById(id);
    await t.readRecords();
    tableCache.set(id, t);
  }
  return tableCache.get(id);
}

// Find Minnesota and Tennessee
for (const r of teamTable.records) {
  if (r.isEmpty) continue;
  try {
    const name = r.DisplayName;
    if (name !== 'Minnesota' && name !== 'Tennessee' && name !== 'Utah') continue;

    console.log(`\n=== ${name} (TeamIndex=${r.TeamIndex}) ===`);
    console.log(`  TopClassRank: ${r.TopClassRank}`);
    console.log(`  TopClassConferenceRank: ${r.TopClassConferenceRank}`);
    console.log(`  LastWeekCommittedRecruits: ${r.LastWeekCommittedRecruits}`);

    const cpRef = parseRef(r.CommittedPlayers);
    console.log(`  CommittedPlayers ref: ${cpRef ? `tableId=${cpRef.tableId}, row=${cpRef.row}` : 'null'}`);

    if (cpRef) {
      const cpTable = await getTable(cpRef.tableId);
      const cpRec = cpTable.records[cpRef.row];
      console.log(`  CommittedPlayers table: ${cpTable.name}`);
      const fields = Object.keys(cpRec.fields);
      console.log(`  Fields count: ${fields.length}`);

      // Count how many entries are valid refs
      let commitCount = 0;
      const stars = { FIVE_STAR: 0, FOUR_STAR: 0, THREE_STAR: 0, TWO_STAR: 0, ONE_STAR: 0 };
      const classes = {};

      for (const f of fields) {
        try {
          const val = cpRec[f];
          const ref = parseRef(val);
          if (!ref) continue;

          // This ref could point to Player or Recruit
          const refTable = await getTable(ref.tableId);
          const refRec = refTable.records[ref.row];
          if (!refRec || refRec.isEmpty) continue;

          commitCount++;

          // Check if it's a Player
          if (refTable.name === 'Player') {
            const star = refRec.ProspectStarRating;
            if (star && stars[star] !== undefined) stars[star]++;
          }
          // Check if it's a Recruit
          if (refTable.name === 'Recruit') {
            const cls = refRec.Class ?? 'unknown';
            classes[cls] = (classes[cls] || 0) + 1;
            // Get Player star from recruit
            const playerRef = parseRef(refRec.Player);
            if (playerRef) {
              const prec = pt.records[playerRef.row];
              if (prec) {
                const star = prec.ProspectStarRating;
                if (star && stars[star] !== undefined) stars[star]++;
              }
            }
          }

          if (commitCount <= 3) {
            console.log(`    Slot ${f}: table=${refTable.name}, row=${ref.row}`);
          }
        } catch {}
      }

      console.log(`  Total committed entries: ${commitCount}`);
      console.log(`  Stars:`, stars);
      console.log(`  Classes:`, classes);
    }
  } catch {}
}

process.exit(0);
