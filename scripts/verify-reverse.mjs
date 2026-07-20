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

// For each signed recruit, find the team whose influence >= CommitScore
let hasCommit = 0, noCommit = 0;
const perTeam = new Map();

for (const rec of signed) {
  const cs = rec.CommitScore;
  const tslRef = parseRef(rec.TopSchoolsList);
  if (!tslRef) { noCommit++; continue; }
  const tslTable = await getTable(tslRef.tableId);
  const tslRec = tslTable.records[tslRef.row];

  // Find school with influence >= CommitScore AND highest influence
  let bestTeamId = -1;
  let bestInfluence = -1;
  let teamsAbove = 0;

  for (const f of Object.keys(tslRec.fields)) {
    try {
      const ref = parseRef(tslRec[f]);
      if (!ref) continue;
      const schoolRec = ptsTable.records[ref.row];
      if (!schoolRec) continue;
      const inf = schoolRec.TeamInfluence ?? 0;
      if (inf >= cs) {
        teamsAbove++;
        if (inf > bestInfluence) {
          bestInfluence = inf;
          bestTeamId = schoolRec.TeamId;
        }
      }
    } catch {}
  }

  if (bestTeamId >= 0) {
    hasCommit++;
    if (!perTeam.has(bestTeamId)) {
      perTeam.set(bestTeamId, { total: 0, fiveStars: 0, fourStars: 0, threeStars: 0, twoStars: 0, oneStars: 0 });
    }
    const b = perTeam.get(bestTeamId);
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
  } else {
    noCommit++;
  }
}

console.log(`Signed with commit (influence >= CommitScore): ${hasCommit}`);
console.log(`Signed without commit (no team >= CommitScore): ${noCommit}`);
console.log(`Total: ${hasCommit + noCommit}`);

// Check Minnesota and Tennessee
const mn = perTeam.get(28);
console.log('\nMinnesota (28):', mn, '| Expected: 20 (0/8/8/4/0)');
const tn = perTeam.get(16);
console.log('Tennessee (16):', tn, '| Expected: 22 (0/20/2/0/0)');

// Show sorted
const sorted = [...perTeam.entries()].sort((a,b) => b[1].total - a[1].total);
console.log('\nTop 15:');
for (const [ti, b] of sorted.slice(0, 15)) {
  const name = teamByIndex.get(ti) ?? `Index ${ti}`;
  console.log(`  ${name}: ${b.total} (5★=${b.fiveStars}, 4★=${b.fourStars}, 3★=${b.threeStars}, 2★=${b.twoStars}, 1★=${b.oneStars})`);
}
console.log('\nBottom 5:');
for (const [ti, b] of sorted.slice(-5)) {
  const name = teamByIndex.get(ti) ?? `Index ${ti}`;
  console.log(`  ${name}: ${b.total} (5★=${b.fiveStars}, 4★=${b.fourStars}, 3★=${b.threeStars}, 2★=${b.twoStars}, 1★=${b.oneStars})`);
}

process.exit(0);
