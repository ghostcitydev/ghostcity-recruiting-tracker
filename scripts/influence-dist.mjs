import Franchise from 'madden-franchise';
import { parseRef } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const teamByIndex = new Map();
const teamTable = franchise.tables.find(t => t.name === 'Team');
await teamTable.readRecords(['DisplayName', 'TeamIndex']);
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

// For each signed recruit, get highest influence and gap to #2
const infData = [];
for (const rec of signed) {
  const tslRef = parseRef(rec.TopSchoolsList);
  if (!tslRef) continue;
  const tslTable = await getTable(tslRef.tableId);
  const tslRec = tslTable.records[tslRef.row];

  const schools = [];
  for (const f of Object.keys(tslRec.fields)) {
    try {
      const ref = parseRef(tslRec[f]);
      if (!ref) continue;
      const schoolRec = ptsTable.records[ref.row];
      if (!schoolRec) continue;
      schools.push({ teamId: schoolRec.TeamId, inf: schoolRec.TeamInfluence });
    } catch {}
  }

  schools.sort((a, b) => b.inf - a.inf);
  if (schools.length >= 2) {
    infData.push({
      topInf: schools[0].inf,
      secondInf: schools[1].inf,
      gap: schools[0].inf - schools[1].inf,
      topTeam: schools[0].teamId,
      cls: rec.Class,
      cs: rec.CommitScore,
    });
  }
}

// Distribution of top influence values
const buckets = { '<50': 0, '50-99': 0, '100-199': 0, '200-299': 0, '300-399': 0, '400-499': 0, '500+': 0 };
for (const d of infData) {
  if (d.topInf < 50) buckets['<50']++;
  else if (d.topInf < 100) buckets['50-99']++;
  else if (d.topInf < 200) buckets['100-199']++;
  else if (d.topInf < 300) buckets['200-299']++;
  else if (d.topInf < 400) buckets['300-399']++;
  else if (d.topInf < 500) buckets['400-499']++;
  else buckets['500+']++;
}
console.log('Top influence distribution:', buckets);

// Distribution of gap (top - second)
const gapBuckets = { '0': 0, '1-10': 0, '11-50': 0, '51-100': 0, '100+': 0 };
for (const d of infData) {
  if (d.gap === 0) gapBuckets['0']++;
  else if (d.gap <= 10) gapBuckets['1-10']++;
  else if (d.gap <= 50) gapBuckets['11-50']++;
  else if (d.gap <= 100) gapBuckets['51-100']++;
  else gapBuckets['100+']++;
}
console.log('Gap (top - second) distribution:', gapBuckets);

// Try counting with topInf >= CommitScore
const perTeam = new Map();
let counted = 0;
for (const d of infData) {
  if (d.topInf < d.cs) continue;
  counted++;
  if (!perTeam.has(d.topTeam)) perTeam.set(d.topTeam, { total: 0 });
  perTeam.get(d.topTeam).total++;
}
console.log(`\nWith topInf >= CommitScore: ${counted} recruits, avg ${(counted/perTeam.size).toFixed(1)} per team`);

// Check Minnesota and Tennessee
console.log('MN (28):', perTeam.get(28)?.total ?? 0, '| Expected: 20');
console.log('TN (16):', perTeam.get(16)?.total ?? 0, '| Expected: 22');

// Actually, let me also check with just the gap — if gap is large enough, it's a committed recruit
const sorted = [...perTeam.entries()].sort((a,b) => b[1].total - a[1].total);
console.log('\nTop 10:');
for (const [ti, b] of sorted.slice(0, 10)) {
  console.log(`  ${teamByIndex.get(ti) ?? ti}: ${b.total}`);
}

// Let me also check: relationship between topInf >= CommitScore and gap
// Maybe the correct filter is: gap > some threshold
for (const minGap of [0, 20, 50, 100, 150, 200]) {
  const teamCounts = new Map();
  let total = 0;
  for (const d of infData) {
    if (d.gap <= minGap) continue;
    total++;
    if (!teamCounts.has(d.topTeam)) teamCounts.set(d.topTeam, 0);
    teamCounts.set(d.topTeam, teamCounts.get(d.topTeam) + 1);
  }
  const mn = teamCounts.get(28) ?? 0;
  const tn = teamCounts.get(16) ?? 0;
  console.log(`Gap > ${minGap}: total=${total}, avg=${(total/teamCounts.size).toFixed(1)}, MN=${mn}, TN=${tn}`);
}

process.exit(0);
