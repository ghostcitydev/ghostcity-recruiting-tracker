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

const signed = rt.records.filter(r => !r.isEmpty && r.RecruitStage === 'Signed');

// Count Class distribution among signed
const classDist = {};
for (const r of signed) {
  const c = r.Class ?? 'null';
  classDist[c] = (classDist[c] || 0) + 1;
}
console.log('Class distribution among Signed:', classDist);

// Try HS only with highest influence
const perTeamHS = new Map();
const hsOnly = signed.filter(r => r.Class === 'HighSchool');
console.log(`\nHS-only signed: ${hsOnly.length}`);

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

  if (!perTeamHS.has(bestTeamId)) {
    perTeamHS.set(bestTeamId, { total: 0, fiveStars: 0, fourStars: 0, threeStars: 0, twoStars: 0, oneStars: 0 });
  }
  const b = perTeamHS.get(bestTeamId);
  b.total++;
  const playerRef = parseRef(rec.Player);
  if (playerRef) {
    const prec = pt.records[playerRef.row];
    if (prec) {
      const star = prec.ProspectStarRating;
      if (star === 'FIVE_STAR') b.fiveStars++;
      else if (star === 'FOUR_STAR') b.fourStars++;
      else if (star === 'THREE_STAR') b.threeStars++;
      else if (star === 'TWO_STAR') b.twoStars++;
      else if (star === 'ONE_STAR') b.oneStars++;
    }
  }
}

const mn = perTeamHS.get(28);
console.log('\nMinnesota HS-only:', mn, '| Expected: 20 (0/8/8/4/0)');
const tn = perTeamHS.get(16);
console.log('Tennessee HS-only:', tn, '| Expected: 22 (0/20/2/0/0)');

const sorted = [...perTeamHS.entries()].sort((a,b) => b[1].total - a[1].total);
console.log('\nTop 15 HS-only:');
for (const [ti, b] of sorted.slice(0, 15)) {
  const name = teamByIndex.get(ti) ?? `Index ${ti}`;
  console.log(`  ${name}: ${b.total} (5★=${b.fiveStars}, 4★=${b.fourStars}, 3★=${b.threeStars}, 2★=${b.twoStars}, 1★=${b.oneStars})`);
}

// Show total and average
const totalHS = [...perTeamHS.values()].reduce((s, b) => s + b.total, 0);
console.log(`\nTotal HS signed: ${totalHS}, avg per team: ${(totalHS / perTeamHS.size).toFixed(1)}`);

process.exit(0);
