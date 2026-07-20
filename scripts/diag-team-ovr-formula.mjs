import Franchise from 'madden-franchise';
import { tableByName } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SACSTATE-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const teamTable = tableByName(franchise, 'Team');
await teamTable.readRecords();
await teamTable.readRecords([
  'DisplayName', 'TeamIndex', 'TeamPrestige', 'PrestigeRank',
  'TEAM_RATINGOVR', 'TEAM_RATINGOFF', 'TEAM_RATINGDEF',
  'TEAM_RATINGQB', 'TEAM_RATINGRB', 'TEAM_RATINGWR', 'TEAM_RATINGTE', 'TEAM_RATINGOL',
  'TEAM_RATINGDL', 'TEAM_RATINGLB', 'TEAM_RATINGDB', 'TEAM_RATINGST',
]);

const playerTable = tableByName(franchise, 'Player');
await playerTable.readRecords(['TeamIndex', 'OverallRating', 'Position']);

const POSITION_GROUPS = {
  QB: 'QB', HB: 'RB', FB: 'RB', WR: 'WR', TE: 'TE',
  LT: 'OL', LG: 'OL', C: 'OL', RG: 'OL', RT: 'OL',
  LE: 'DL', RE: 'DL', DT: 'DL', NT: 'DL',
  LOLB: 'LB', MLB: 'LB', ROLB: 'LB', OLB: 'LB',
  CB: 'DB', FS: 'DB', SS: 'DB', S: 'DB',
  K: 'ST', P: 'ST', LS: 'ST',
};

// Group player OVRs per team per position group
const byTeam = new Map(); // idx -> { all: [], groups: { QB: [], RB: [], ... }, starters: { ... } }
for (const p of playerTable.records) {
  if (p.isEmpty) continue;
  if (p.TeamIndex === 255) continue;
  const grp = POSITION_GROUPS[p.Position];
  if (!grp) continue;
  if (typeof p.OverallRating !== 'number') continue;
  const rec = byTeam.get(p.TeamIndex) ?? { all: [], groups: {} };
  rec.all.push(p.OverallRating);
  (rec.groups[grp] = rec.groups[grp] ?? []).push(p.OverallRating);
  byTeam.set(p.TeamIndex, rec);
}

const rows = [];
for (const t of teamTable.records) {
  if (t.isEmpty) continue;
  if (t.PrestigeRank === 255) continue;
  const data = byTeam.get(t.TeamIndex);
  if (!data) continue;
  const meanAll = data.all.reduce((a, b) => a + b, 0) / data.all.length;
  // For each group, take top-1 (starter) and mean-of-top-3 as candidates
  const starterOvr = grp => {
    const arr = (data.groups[grp] ?? []).slice().sort((a, b) => b - a);
    return arr[0] ?? 0;
  };
  const topN = (grp, n) => {
    const arr = (data.groups[grp] ?? []).slice().sort((a, b) => b - a).slice(0, n);
    return arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  };
  rows.push({
    name: t.DisplayName,
    prestige: t.TeamPrestige,
    meanAll: Math.round(meanAll),
    topRoster: topN('QB', 200), // meaningless — replace below
    ovrTeam: t.TEAM_RATINGOVR,
    offTeam: t.TEAM_RATINGOFF,
    defTeam: t.TEAM_RATINGDEF,
    // Position group ratings from Team table
    qb: t.TEAM_RATINGQB, rb: t.TEAM_RATINGRB, wr: t.TEAM_RATINGWR, te: t.TEAM_RATINGTE, ol: t.TEAM_RATINGOL,
    dl: t.TEAM_RATINGDL, lb: t.TEAM_RATINGLB, db: t.TEAM_RATINGDB, st: t.TEAM_RATINGST,
    // Starter OVRs (from player data)
    sQB: starterOvr('QB'), sRB: starterOvr('RB'), sWR: starterOvr('WR'), sTE: starterOvr('TE'), sOL: starterOvr('OL'),
    sDL: starterOvr('DL'), sLB: starterOvr('LB'), sDB: starterOvr('DB'), sST: starterOvr('ST'),
    // Top-N per group (proxy for starter depth)
    t1QB: topN('QB', 1), t3OL: topN('OL', 5), t5DL: topN('DL', 4), t5LB: topN('LB', 4), t5DB: topN('DB', 5),
  });
}

// Sort by prestige for readability
rows.sort((a, b) => b.prestige - a.prestige);

// Show: does TEAM_RATINGQB = starter QB OVR?
console.log('=== Does TEAM_RATINGQB match starter QB OVR? ===');
console.log('team, prestige, starterQB, TEAM_RATINGQB, diff');
for (const r of rows.slice(0, 10)) console.log(`  ${r.name}, ${r.prestige}, ${r.sQB}, ${r.qb}, ${r.qb - r.sQB}`);
for (const r of rows.slice(-10)) console.log(`  ${r.name}, ${r.prestige}, ${r.sQB}, ${r.qb}, ${r.qb - r.sQB}`);

// TEAM_RATINGOL vs top-5 OL mean
console.log('\n=== Does TEAM_RATINGOL match top-5 OL mean? ===');
for (const r of rows.slice(0, 5)) console.log(`  ${r.name}, top5=${r.t3OL}, TEAM_RATINGOL=${r.ol}, diff=${r.ol - r.t3OL}`);
for (const r of rows.slice(-5)) console.log(`  ${r.name}, top5=${r.t3OL}, TEAM_RATINGOL=${r.ol}, diff=${r.ol - r.t3OL}`);

// Prestige boost hypothesis: TEAM_RATINGOVR = meanAll + prestigeBoost
console.log('\n=== Prestige vs TEAM_RATINGOVR (holding meanAll constant) ===');
console.log('team, prestige, meanAll, ovrTeam, boost = ovrTeam - meanAll');
for (const r of rows) console.log(`  ${r.name}, ${r.prestige}, ${r.meanAll}, ${r.ovrTeam}, boost=${r.ovrTeam - r.meanAll}`);

// Correlate prestige with boost (linear fit)
const boosts = rows.map(r => ({ prestige: r.prestige, boost: r.ovrTeam - r.meanAll }));
const byPrestige = new Map();
for (const b of boosts) {
  const arr = byPrestige.get(b.prestige) ?? [];
  arr.push(b.boost);
  byPrestige.set(b.prestige, arr);
}
console.log('\n=== Avg boost per prestige level ===');
for (const [p, arr] of [...byPrestige].sort((a, b) => a[0] - b[0])) {
  const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
  console.log(`  prestige=${p}: n=${arr.length}, avg boost=${avg.toFixed(1)}, range=[${Math.min(...arr)}, ${Math.max(...arr)}]`);
}
