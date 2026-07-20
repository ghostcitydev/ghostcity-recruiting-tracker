import Franchise from 'madden-franchise';
import { parseRef } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

// Get team names by TeamIndex
const teamTable = franchise.tables.find(t => t.name === 'Team');
await teamTable.readRecords(['DisplayName', 'TeamIndex']);
const teamNames = new Map();
for (const r of teamTable.records) {
  if (r.isEmpty || !r.DisplayName) continue;
  teamNames.set(r.TeamIndex, r.DisplayName);
}

// RecruitingBoard has one record per team with a Recruits array ref
const rb = franchise.tables.find(t => t.name === 'RecruitingBoard');
await rb.readRecords();

const tableCache = new Map();
async function getTable(id) {
  if (!tableCache.has(id)) {
    const t = franchise.getTableById(id);
    await t.readRecords();
    tableCache.set(id, t);
  }
  return tableCache.get(id);
}

// Recruit table for star/class info
const rt = franchise.tables.find(t => t.name === 'Recruit');
await rt.readRecords();

const pt = franchise.tables.find(t => t.name === 'Player');
await pt.readRecords(['ProspectStarRating']);

// Check first few boards
let boardsChecked = 0;
for (const rec of rb.records) {
  if (rec.isEmpty) continue;
  if (boardsChecked >= 5) break;

  const recruitsRef = parseRef(rec.Recruits);
  if (!recruitsRef) { console.log('No recruits ref'); continue; }

  const arrTable = await getTable(recruitsRef.tableId);
  const arrRec = arrTable.records[recruitsRef.row];

  // The array record has numbered fields pointing to RecruitTarget entries
  const fields = Object.keys(arrRec.fields);
  const targets = [];
  for (const f of fields) {
    try {
      const val = arrRec[f];
      const tRef = parseRef(val);
      if (tRef) targets.push({ field: f, ...tRef });
    } catch {}
  }

  // For each target, check what it points to
  if (targets.length > 0) {
    const firstTarget = targets[0];
    const targetTable = await getTable(firstTarget.tableId);
    const targetRec = targetTable.records[firstTarget.row];
    console.log(`Board ${boardsChecked} -> ${targets.length} recruit slots, first target table: ${targetTable.name}`);
    console.log('  Target fields:', Object.keys(targetRec.fields));

    // Get the Recruit ref from the target
    const recruitRef = parseRef(targetRec.Recruit);
    if (recruitRef) {
      const recruitRec = rt.records[recruitRef.row];
      if (recruitRec && !recruitRec.isEmpty) {
        const playerRef = parseRef(recruitRec.Player);
        const playerRec = playerRef ? pt.records[playerRef.row] : null;
        console.log(`  Recruit Stage: ${recruitRec.RecruitStage}, Class: ${recruitRec.Class}`);
        console.log(`  Player Star: ${playerRec?.ProspectStarRating}`);
        console.log(`  ScholarshipStatus: ${targetRec.ScholarshipStatus}`);
      }
    }
  }

  boardsChecked++;
}

// Now count per-team signed recruits properly
console.log('\n--- Counting per-team signed recruits ---');
const perTeam = new Map();

for (let boardIdx = 0; boardIdx < rb.records.length; boardIdx++) {
  const rec = rb.records[boardIdx];
  if (rec.isEmpty) continue;

  const recruitsRef = parseRef(rec.Recruits);
  if (!recruitsRef) continue;

  const arrTable = await getTable(recruitsRef.tableId);
  const arrRec = arrTable.records[recruitsRef.row];

  let signedCount = 0;
  const stars = { fiveStars: 0, fourStars: 0, threeStars: 0, twoStars: 0, oneStars: 0 };
  let hsCount = 0, transferCount = 0;

  for (const f of Object.keys(arrRec.fields)) {
    try {
      const val = arrRec[f];
      const tRef = parseRef(val);
      if (!tRef) continue;

      const targetTable = await getTable(tRef.tableId);
      const targetRec = targetTable.records[tRef.row];
      if (!targetRec || targetRec.isEmpty) continue;

      // Check ScholarshipStatus or if the recruit is signed
      const status = targetRec.ScholarshipStatus;
      const recruitRef = parseRef(targetRec.Recruit);
      if (!recruitRef) continue;

      const recruitRec = rt.records[recruitRef.row];
      if (!recruitRec || recruitRec.isEmpty) continue;

      const stage = recruitRec.RecruitStage;
      if (stage !== 'Signed') continue;

      signedCount++;

      const playerRef = parseRef(recruitRec.Player);
      if (playerRef) {
        const prec = pt.records[playerRef.row];
        if (prec) {
          const star = prec.ProspectStarRating;
          if (star === 'FIVE_STAR') stars.fiveStars++;
          else if (star === 'FOUR_STAR') stars.fourStars++;
          else if (star === 'THREE_STAR') stars.threeStars++;
          else if (star === 'TWO_STAR') stars.twoStars++;
          else if (star === 'ONE_STAR') stars.oneStars++;
        }
      }

      const cls = recruitRec.Class ?? '';
      if (cls === 'HighSchool') hsCount++;
      else transferCount++;
    } catch {}
  }

  if (signedCount > 0) {
    perTeam.set(boardIdx, { total: signedCount, ...stars, hs: hsCount, transfer: transferCount });
  }
}

const sorted = [...perTeam.entries()].sort((a,b) => b[1].total - a[1].total).slice(0, 15);
console.log('Top 15 teams by signed recruits (board index):');
for (const [idx, b] of sorted) {
  const teamName = teamNames.get(idx) ?? `Index ${idx}`;
  console.log(`  ${teamName}: ${b.total} (5★=${b.fiveStars}, 4★=${b.fourStars}, 3★=${b.threeStars}, 2★=${b.twoStars}, 1★=${b.oneStars}) HS=${b.hs} XFER=${b.transfer}`);
}

process.exit(0);
