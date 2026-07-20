import Franchise from 'madden-franchise';
import { parseRef, tableByName } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SACSTATE-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

// Load coach and talent tree tables
const coachTable = franchise.tables.find(t => t.name === 'Coach');
await coachTable.readRecords();
await coachTable.readRecords(['Level', 'ActiveTalentTree']);

const activeTable = franchise.tables.find(t => t.name === 'ActiveTalentTree');
await activeTable.readRecords();
await activeTable.readRecords(['TalentSubTreeStatusList']);

const listTable = franchise.tables.find(t => t.name === 'TalentSubTreeStatus[]');
await listTable.readRecords();
const listFields = listTable.offsetTable.map(o => o.name);
await listTable.readRecords(listFields);

const subTable = franchise.tables.find(t => t.name === 'TalentSubTreeStatus');
await subTable.readRecords();
const subFields = subTable.offsetTable.map(o => o.name);
await subTable.readRecords(subFields);

// For each coach: sum CoachPointsSpent across all 13 subtrees, count Owned talents
function coachStats(coach) {
  const ttRef = parseRef(coach.ActiveTalentTree);
  if (!ttRef) return null;
  const ttRec = activeTable.records[ttRef.row];
  if (!ttRec || ttRec.isEmpty) return null;
  const listRef = parseRef(ttRec.TalentSubTreeStatusList);
  if (!listRef) return null;
  const listRec = listTable.records[listRef.row];
  if (!listRec || listRec.isEmpty) return null;

  let totalSpent = 0, totalOwned = 0;
  for (const f of listFields) {
    const subRef = parseRef(listRec[f]);
    if (!subRef) continue;
    const subRec = subTable.records[subRef.row];
    if (!subRec || subRec.isEmpty) continue;
    totalSpent += subRec.CoachPointsSpent ?? 0;
    for (const sf of subFields) {
      if (sf.startsWith('TalentStatus') && subRec[sf] === 'Owned') totalOwned++;
    }
  }
  return { totalSpent, totalOwned };
}

// Team-level context
const teamTable = tableByName(franchise, 'Team');
await teamTable.readRecords();
await teamTable.readRecords(['DisplayName', 'PrestigeRank', 'HeadCoach', 'TEAM_RATINGOVR']);

const playerTable = tableByName(franchise, 'Player');
await playerTable.readRecords(['TeamIndex', 'OverallRating']);
const sums = new Map(), counts = new Map();
for (const p of playerTable.records) {
  if (p.isEmpty || p.TeamIndex === 255) continue;
  if (typeof p.OverallRating !== 'number') continue;
  sums.set(p.TeamIndex, (sums.get(p.TeamIndex) ?? 0) + p.OverallRating);
  counts.set(p.TeamIndex, (counts.get(p.TeamIndex) ?? 0) + 1);
}
await teamTable.readRecords(['TeamIndex']);

const rows = [];
for (const t of teamTable.records) {
  if (t.isEmpty || t.PrestigeRank === 255) continue;
  const mean = sums.get(t.TeamIndex) / counts.get(t.TeamIndex);
  if (!mean) continue;
  const ref = parseRef(t.HeadCoach);
  const coach = ref ? coachTable.records[ref.row] : null;
  if (!coach || coach.isEmpty) continue;
  const stats = coachStats(coach);
  if (!stats) continue;
  rows.push({
    name: t.DisplayName,
    boost: t.TEAM_RATINGOVR - Math.round(mean),
    coachLevel: coach.Level,
    spent: stats.totalSpent,
    owned: stats.totalOwned,
  });
}

// Correlate boost with totalSpent
const bucketSize = 100;
const spentBuckets = new Map();
for (const r of rows) {
  const b = Math.floor(r.spent / bucketSize) * bucketSize;
  const arr = spentBuckets.get(b) ?? [];
  arr.push(r.boost);
  spentBuckets.set(b, arr);
}
console.log('=== Boost vs total CoachPointsSpent (bucketed by 100) ===');
console.log('spent, n, avgBoost, range');
for (const [b, arr] of [...spentBuckets].sort((a, b) => a[0] - b[0])) {
  const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
  console.log(`  ${b}-${b + bucketSize - 1}: n=${arr.length}, avg=${avg.toFixed(1)}, [${Math.min(...arr)}, ${Math.max(...arr)}]`);
}

// Also correlate with totalOwned
const ownedBuckets = new Map();
for (const r of rows) {
  const b = Math.floor(r.owned / 20) * 20;
  const arr = ownedBuckets.get(b) ?? [];
  arr.push(r.boost);
  ownedBuckets.set(b, arr);
}
console.log('\n=== Boost vs totalOwned talents (bucketed by 20) ===');
for (const [b, arr] of [...ownedBuckets].sort((a, b) => a[0] - b[0])) {
  console.log(`  ${b}-${b + 19}: n=${arr.length}, avg=${(arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1)}`);
}

// Sample: high spent + high boost, low spent + low boost
rows.sort((a, b) => b.spent - a.spent);
console.log('\n=== Top 10 CoachPointsSpent ===');
for (const r of rows.slice(0, 10)) console.log(`  ${r.name} lvl=${r.coachLevel} spent=${r.spent} owned=${r.owned} boost=${r.boost}`);
console.log('\n=== Bottom 10 CoachPointsSpent ===');
for (const r of rows.slice(-10)) console.log(`  ${r.name} lvl=${r.coachLevel} spent=${r.spent} owned=${r.owned} boost=${r.boost}`);

// Pearson correlation
function corr(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  return num / Math.sqrt(dx * dy);
}
console.log(`\nPearson r(spent, boost) = ${corr(rows.map(r => r.spent), rows.map(r => r.boost)).toFixed(3)}`);
console.log(`Pearson r(owned, boost) = ${corr(rows.map(r => r.owned), rows.map(r => r.boost)).toFixed(3)}`);
console.log(`Pearson r(level, boost) = ${corr(rows.map(r => r.coachLevel), rows.map(r => r.boost)).toFixed(3)}`);
