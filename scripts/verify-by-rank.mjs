import Franchise from 'madden-franchise';
import { parseRef } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const teamTable = franchise.tables.find(t => t.name === 'Team');
await teamTable.readRecords(['DisplayName', 'TeamIndex']);
const teamByIndex = new Map();
for (const r of teamTable.records) {
  if (r.isEmpty) continue;
  try { if (r.DisplayName) teamByIndex.set(r.TeamIndex, r.DisplayName); } catch {}
}

const ptsTable = franchise.tables.find(t => t.name === 'ProspectTargetSchool');
await ptsTable.readRecords();
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

// Rank-based star assignment (game-like cutoffs)
function rankToStar(rank) {
  if (rank <= 32) return 5;
  if (rank <= 350) return 4;
  if (rank <= 1200) return 3;
  if (rank <= 2600) return 2;
  return 1;
}

const signed = rt.records.filter(r => !r.isEmpty && r.RecruitStage === 'Signed');
const hsOnly = signed.filter(r => r.Class === 'HighSchool');

// Show NationalRank distribution for HS signed
const rankBuckets = [0, 0, 0, 0, 0];
for (const r of hsOnly) {
  const rank = r.NationalRank ?? 9999;
  const star = rankToStar(rank);
  rankBuckets[5 - star]++;
}
console.log('HS signed by rank-based stars:', {
  '5star': rankBuckets[0], '4star': rankBuckets[1], '3star': rankBuckets[2], '2star': rankBuckets[3], '1star': rankBuckets[4]
});

// Now assign recruits to teams via highest influence and count by rank-based stars
const perTeam = new Map();

for (const rec of hsOnly) {
  const tslRef = parseRef(rec.TopSchoolsList);
  if (!tslRef) continue;
  const tslTable = await getTable(tslRef.tableId);
  const tslRec = tslTable.records[tslRef.row];

  let bestTeamId = -1, bestInf = -1;
  for (const f of Object.keys(tslRec.fields)) {
    try {
      const ref = parseRef(tslRec[f]);
      if (!ref) continue;
      const schoolRec = ptsTable.records[ref.row];
      if (!schoolRec) continue;
      if (schoolRec.TeamInfluence > bestInf) {
        bestInf = schoolRec.TeamInfluence;
        bestTeamId = schoolRec.TeamId;
      }
    } catch {}
  }
  if (bestTeamId < 0) continue;

  if (!perTeam.has(bestTeamId)) {
    perTeam.set(bestTeamId, { total: 0, fiveStars: 0, fourStars: 0, threeStars: 0, twoStars: 0, oneStars: 0 });
  }
  const b = perTeam.get(bestTeamId);
  b.total++;
  const rank = rec.NationalRank ?? 9999;
  const star = rankToStar(rank);
  if (star === 5) b.fiveStars++;
  else if (star === 4) b.fourStars++;
  else if (star === 3) b.threeStars++;
  else if (star === 2) b.twoStars++;
  else b.oneStars++;
}

// Expected: Minnesota 20 (0/8/8/4/0), Tennessee 22 (0/20/2/0/0)
const mn = perTeam.get(28);
console.log('\nMinnesota rank-based:', mn, '| Expected: 20 (0/8/8/4/0)');
const tn = perTeam.get(16);
console.log('Tennessee rank-based:', tn, '| Expected: 22 (0/20/2/0/0)');

// Try different cutoffs
for (const cutoffs of [
  [30, 300, 1000, 2000],
  [32, 350, 1200, 2600],
  [35, 400, 1300, 2800],
  [25, 250, 1000, 2500],
]) {
  const mnStars = [0,0,0,0,0];
  const tnStars = [0,0,0,0,0];
  let mnTotal = 0, tnTotal = 0;

  for (const rec of hsOnly) {
    const tslRef = parseRef(rec.TopSchoolsList);
    if (!tslRef) continue;
    const tslTable = await getTable(tslRef.tableId);
    const tslRec = tslTable.records[tslRef.row];

    let bestTeamId = -1, bestInf = -1;
    for (const f of Object.keys(tslRec.fields)) {
      try {
        const ref = parseRef(tslRec[f]);
        if (!ref) continue;
        const schoolRec = ptsTable.records[ref.row];
        if (!schoolRec) continue;
        if (schoolRec.TeamInfluence > bestInf) {
          bestInf = schoolRec.TeamInfluence;
          bestTeamId = schoolRec.TeamId;
        }
      } catch {}
    }

    const rank = rec.NationalRank ?? 9999;
    let star;
    if (rank <= cutoffs[0]) star = 0;
    else if (rank <= cutoffs[1]) star = 1;
    else if (rank <= cutoffs[2]) star = 2;
    else if (rank <= cutoffs[3]) star = 3;
    else star = 4;

    if (bestTeamId === 28) { mnTotal++; mnStars[star]++; }
    if (bestTeamId === 16) { tnTotal++; tnStars[star]++; }
  }

  console.log(`\nCutoffs [${cutoffs}]:`);
  console.log(`  MN: ${mnTotal} (${mnStars.join('/')})`);
  console.log(`  TN: ${tnTotal} (${tnStars.join('/')})`);
}

process.exit(0);
