import Franchise from 'madden-franchise';
import { parseRef, tableByName } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const teamTable = tableByName(franchise, 'Team');
await teamTable.readRecords(['DisplayName', 'TeamIndex']);

const pt = tableByName(franchise, 'Player');
await pt.readRecords(['ProspectStarRating', 'FirstName', 'LastName', 'Position']);

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

// Look at RecruitingBoard for Minnesota
const rbTable = tableByName(franchise, 'RecruitingBoard');
await rbTable.readRecords();

// Find Minnesota's TeamIndex
let mnIdx = null;
for (const r of teamTable.records) {
  if (r.DisplayName === 'Minnesota') { mnIdx = r.TeamIndex; break; }
}
console.log('Minnesota TeamIndex:', mnIdx);

// Find team index → board index mapping
// RecruitingBoard has 138 records, one per team
for (const rec of rbTable.records) {
  if (rec.isEmpty) continue;
  // Check all fields
  const fields = Object.keys(rec.fields);
  // Look at first record to understand the structure
  if (rec === rbTable.records.find(r => !r.isEmpty)) {
    console.log('RecruitingBoard fields:', fields.join(', '));
    for (const f of fields.slice(0, 5)) {
      try { console.log(`  ${f}: ${rec[f]}`); } catch(e) { console.log(`  ${f}: ERROR`); }
    }
  }
}

// Let's check the structure more carefully
// Each RecruitingBoard record has a RecruitTarget[] array
// Let's find Minnesota's board and count signed targets
let boardIdx = 0;
for (const rec of rbTable.records) {
  if (rec.isEmpty) continue;

  // Check if this board belongs to Minnesota
  let teamRef;
  try { teamRef = rec.Team; } catch { teamRef = null; }
  let teamIdx;
  try { teamIdx = rec.TeamIndex; } catch { teamIdx = null; }

  // Try to find the right record
  const rtRef = parseRef(rec.RecruitTargets);
  if (!rtRef) continue;

  const rtTable = await getTable(rtRef.tableId);
  const rtRec = rtTable.records[rtRef.row];

  // Count signed targets for this board
  let signed = 0;
  let total = 0;
  const stars = { FIVE_STAR: 0, FOUR_STAR: 0, THREE_STAR: 0, TWO_STAR: 0, ONE_STAR: 0 };

  for (const f of Object.keys(rtRec.fields)) {
    try {
      const val = rtRec[f];
      const ref = parseRef(val);
      if (!ref) continue;

      const targetTable = await getTable(ref.tableId);
      const targetRec = targetTable.records[ref.row];
      if (!targetRec || targetRec.isEmpty) continue;

      // Get the recruit reference from this target
      let recruitRef;
      try { recruitRef = parseRef(targetRec.Recruit); } catch { continue; }
      if (!recruitRef) continue;

      const recruit = rt.records[recruitRef.row];
      if (!recruit || recruit.isEmpty) continue;

      total++;
      if (recruit.RecruitStage === 'Signed') {
        signed++;
        const playerRef = parseRef(recruit.Player);
        if (playerRef) {
          const prec = pt.records[playerRef.row];
          if (prec) stars[prec.ProspectStarRating]++;
        }
      }
    } catch {}
  }

  if (signed >= 15) {
    console.log(`\nBoard ${boardIdx}: total targets=${total}, signed=${signed}, stars: 5★=${stars.FIVE_STAR} 4★=${stars.FOUR_STAR} 3★=${stars.THREE_STAR} 2★=${stars.TWO_STAR} 1★=${stars.ONE_STAR}`);
  }
  boardIdx++;
}

process.exit(0);
