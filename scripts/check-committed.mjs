import Franchise from 'madden-franchise';
import { parseRef } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const teamTable = franchise.tables.find(t => t.name === 'Team');
await teamTable.readRecords(['DisplayName', 'TeamIndex']);
const teamNames = new Map();
for (const r of teamTable.records) {
  if (r.isEmpty || !r.DisplayName) continue;
  teamNames.set(r.TeamIndex, r.DisplayName);
}

const rt = franchise.tables.find(t => t.name === 'Recruit');
await rt.readRecords();
const pt = franchise.tables.find(t => t.name === 'Player');
await pt.readRecords(['ProspectStarRating']);

// Check ALL RecruitTarget records for ScholarshipStatus and CommittedWeekNumber
const targetTable = franchise.tables.find(t => t.name === 'RecruitTarget');
await targetTable.readRecords();

const statusDist = {};
const weekDist = {};
for (const rec of targetTable.records) {
  if (rec.isEmpty) continue;
  const s = String(rec.ScholarshipStatus ?? 'null');
  const w = rec.CommittedWeekNumber ?? 'null';
  statusDist[s] = (statusDist[s] || 0) + 1;
  weekDist[w] = (weekDist[w] || 0) + 1;
}
console.log('ScholarshipStatus distribution:', statusDist);
console.log('CommittedWeekNumber distribution:', weekDist);

// Show samples of each status
for (const status of Object.keys(statusDist)) {
  const samples = targetTable.records.filter(r => !r.isEmpty && String(r.ScholarshipStatus) === status).slice(0, 2);
  console.log(`\n--- Status: ${status} ---`);
  for (const rec of samples) {
    const recruitRef = parseRef(rec.Recruit);
    if (!recruitRef) continue;
    const recruitRec = rt.records[recruitRef.row];
    if (!recruitRec) continue;
    console.log(`  RecruitStage=${recruitRec.RecruitStage}, CommittedWeek=${rec.CommittedWeekNumber}, Influence=${rec.ProspectInfluenceTotal}`);
  }
}

// Now count using CommittedWeekNumber > 0 as the filter for "signed to THIS team"
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

const perTeam = new Map();
for (let i = 0; i < rb.records.length; i++) {
  const rec = rb.records[i];
  if (rec.isEmpty) continue;

  const recruitsRef = parseRef(rec.Recruits);
  if (!recruitsRef) continue;
  const arrTable = await getTable(recruitsRef.tableId);
  const arrRec = arrTable.records[recruitsRef.row];

  let total = 0;
  const stars = { fiveStars: 0, fourStars: 0, threeStars: 0, twoStars: 0, oneStars: 0 };
  let hs = 0, transfer = 0;

  for (const f of Object.keys(arrRec.fields)) {
    try {
      const val = arrRec[f];
      const tRef = parseRef(val);
      if (!tRef) continue;
      const tgtTable = await getTable(tRef.tableId);
      const tgtRec = tgtTable.records[tRef.row];
      if (!tgtRec || tgtRec.isEmpty) continue;

      if ((tgtRec.CommittedWeekNumber ?? 0) === 0) continue;

      const recruitRef = parseRef(tgtRec.Recruit);
      if (!recruitRef) continue;
      const recruitRec = rt.records[recruitRef.row];
      if (!recruitRec || recruitRec.isEmpty) continue;

      total++;

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
      if (cls === 'HighSchool') hs++;
      else transfer++;
    } catch {}
  }

  perTeam.set(i, { total, ...stars, hs, transfer });
}

// Compare with in-game data: Minnesota (TeamIndex 28) should have 20 commits
// with 0 five, 8 four, 8 three, 4 two, 0 one
const sorted = [...perTeam.entries()].sort((a,b) => b[1].total - a[1].total).slice(0, 15);
console.log('\n--- Top 15 teams by COMMITTED recruits (CommittedWeekNumber > 0) ---');
for (const [idx, b] of sorted) {
  const teamName = teamNames.get(idx) ?? `Index ${idx}`;
  console.log(`  ${teamName} (${idx}): ${b.total} (5★=${b.fiveStars}, 4★=${b.fourStars}, 3★=${b.threeStars}, 2★=${b.twoStars}, 1★=${b.oneStars}) HS=${b.hs} XFER=${b.transfer}`);
}

// Check Minnesota specifically
const mnEntry = perTeam.get(28);
console.log('\nMinnesota (28):', mnEntry);

process.exit(0);
