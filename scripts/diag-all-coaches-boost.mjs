import Franchise from 'madden-franchise';
import { parseRef, tableByName } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SACSTATE-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

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

function coachStats(coachRef) {
  if (!coachRef) return { spent: 0, owned: 0, level: 0 };
  const coach = coachTable.records[coachRef.row];
  if (!coach || coach.isEmpty) return { spent: 0, owned: 0, level: 0 };
  const ttRef = parseRef(coach.ActiveTalentTree);
  if (!ttRef) return { spent: 0, owned: 0, level: coach.Level ?? 0 };
  const ttRec = activeTable.records[ttRef.row];
  if (!ttRec || ttRec.isEmpty) return { spent: 0, owned: 0, level: coach.Level ?? 0 };
  const listRef = parseRef(ttRec.TalentSubTreeStatusList);
  if (!listRef) return { spent: 0, owned: 0, level: coach.Level ?? 0 };
  const listRec = listTable.records[listRef.row];
  if (!listRec || listRec.isEmpty) return { spent: 0, owned: 0, level: coach.Level ?? 0 };

  let spent = 0, owned = 0;
  for (const f of listFields) {
    const subRef = parseRef(listRec[f]);
    if (!subRef) continue;
    const subRec = subTable.records[subRef.row];
    if (!subRec || subRec.isEmpty) continue;
    spent += subRec.CoachPointsSpent ?? 0;
    for (const sf of subFields) {
      if (sf.startsWith('TalentStatus') && subRec[sf] === 'Owned') owned++;
    }
  }
  return { spent, owned, level: coach.Level ?? 0 };
}

const teamTable = tableByName(franchise, 'Team');
await teamTable.readRecords();
await teamTable.readRecords([
  'DisplayName', 'PrestigeRank', 'TeamPrestige',
  'HeadCoach', 'OffensiveCoordinator', 'DefensiveCoordinator', 'SpecialTeamsCoach',
  'TEAM_RATINGOVR', 'TeamIndex',
]);

const playerTable = tableByName(franchise, 'Player');
await playerTable.readRecords(['TeamIndex', 'OverallRating']);
const sums = new Map(), counts = new Map();
for (const p of playerTable.records) {
  if (p.isEmpty || p.TeamIndex === 255) continue;
  if (typeof p.OverallRating !== 'number') continue;
  sums.set(p.TeamIndex, (sums.get(p.TeamIndex) ?? 0) + p.OverallRating);
  counts.set(p.TeamIndex, (counts.get(p.TeamIndex) ?? 0) + 1);
}

const rows = [];
for (const t of teamTable.records) {
  if (t.isEmpty || t.PrestigeRank === 255) continue;
  const mean = sums.get(t.TeamIndex) / counts.get(t.TeamIndex);
  if (!mean) continue;
  const hc = coachStats(parseRef(t.HeadCoach));
  const oc = coachStats(parseRef(t.OffensiveCoordinator));
  const dc = coachStats(parseRef(t.DefensiveCoordinator));
  const st = coachStats(parseRef(t.SpecialTeamsCoach));
  const totalSpent = hc.spent + oc.spent + dc.spent + st.spent;
  const totalOwned = hc.owned + oc.owned + dc.owned + st.owned;
  const totalLevel = hc.level + oc.level + dc.level + st.level;
  rows.push({
    name: t.DisplayName,
    prestige: t.TeamPrestige,
    boost: t.TEAM_RATINGOVR - Math.round(mean),
    hcLevel: hc.level, hcSpent: hc.spent, hcOwned: hc.owned,
    totalLevel, totalSpent, totalOwned,
  });
}

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

const bs = rows.map(r => r.boost);
console.log(`n=${rows.length}, boost mean=${(bs.reduce((a,b)=>a+b,0)/bs.length).toFixed(1)}, range=[${Math.min(...bs)}, ${Math.max(...bs)}]`);
console.log(`\nPearson r values (correlate with boost):`);
console.log(`  team prestige:     ${corr(rows.map(r => r.prestige), bs).toFixed(3)}`);
console.log(`  HC level:          ${corr(rows.map(r => r.hcLevel), bs).toFixed(3)}`);
console.log(`  HC spent:          ${corr(rows.map(r => r.hcSpent), bs).toFixed(3)}`);
console.log(`  HC owned:          ${corr(rows.map(r => r.hcOwned), bs).toFixed(3)}`);
console.log(`  ALL coaches level: ${corr(rows.map(r => r.totalLevel), bs).toFixed(3)}`);
console.log(`  ALL coaches spent: ${corr(rows.map(r => r.totalSpent), bs).toFixed(3)}`);
console.log(`  ALL coaches owned: ${corr(rows.map(r => r.totalOwned), bs).toFixed(3)}`);

// Bucket by total-owned to see step change
console.log(`\n=== Boost vs ALL COACHES totalOwned (buckets of 40) ===`);
const bucket = new Map();
for (const r of rows) {
  const b = Math.floor(r.totalOwned / 40) * 40;
  const arr = bucket.get(b) ?? [];
  arr.push(r.boost);
  bucket.set(b, arr);
}
for (const [b, arr] of [...bucket].sort((a, b) => a[0] - b[0])) {
  console.log(`  ${b}-${b + 39}: n=${arr.length}, avg=${(arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1)}, [${Math.min(...arr)}, ${Math.max(...arr)}]`);
}

// Show the same-level outliers: Kent State vs Tulsa etc.
console.log(`\n=== Same-HC-level pairs with different boosts ===`);
const outliers = [
  ['Kent State', 'Tulsa'],
  ['Charlotte', 'Sam Houston'],
  ['NIU', 'Kennesaw St.'],
];
for (const [a, b] of outliers) {
  const ra = rows.find(r => r.name === a);
  const rb = rows.find(r => r.name === b);
  if (!ra || !rb) continue;
  console.log(`  ${a} vs ${b}:`);
  console.log(`    ${a}: HC L${ra.hcLevel} spent=${ra.hcSpent} owned=${ra.hcOwned} | ALL spent=${ra.totalSpent} owned=${ra.totalOwned} lvl=${ra.totalLevel} | boost=${ra.boost}`);
  console.log(`    ${b}: HC L${rb.hcLevel} spent=${rb.hcSpent} owned=${rb.hcOwned} | ALL spent=${rb.totalSpent} owned=${rb.totalOwned} lvl=${rb.totalLevel} | boost=${rb.boost}`);
}
