import Franchise from 'madden-franchise';
import { parseRef } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const teamTable = franchise.tables.find(t => t.name === 'Team');
await teamTable.readRecords(['DisplayName', 'TeamIndex', 'CommittedPlayers', 'TopClassRank', 'LastWeekCommittedRecruits']);

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

let checked = 0;
for (const r of teamTable.records) {
  if (r.isEmpty) continue;
  let name;
  try { name = r.DisplayName; } catch { continue; }
  if (!name) continue;

  const topRank = r.TopClassRank ?? 0;
  const committed = r.LastWeekCommittedRecruits ?? 0;

  if (checked < 5 || name === 'Minnesota' || name === 'Tennessee' || name === 'Utah') {
    console.log(`${name} (${r.TeamIndex}): TopClassRank=${topRank}, LastWeekCommitted=${committed}`);

    const cpRef = parseRef(r.CommittedPlayers);
    if (cpRef) {
      const cpTable = await getTable(cpRef.tableId);
      const cpRec = cpTable.records[cpRef.row];
      const fields = Object.keys(cpRec.fields);

      let count = 0;
      for (const f of fields) {
        try {
          const val = cpRec[f];
          const ref = parseRef(val);
          if (ref) {
            const refTable = await getTable(ref.tableId);
            const refRec = refTable.records[ref.row];
            if (refRec && !refRec.isEmpty) count++;
          }
        } catch {}
      }
      console.log(`  CommittedPlayers: ${cpTable.name}, ${fields.length} slots, ${count} non-empty`);
    }
  }
  checked++;
}

process.exit(0);
