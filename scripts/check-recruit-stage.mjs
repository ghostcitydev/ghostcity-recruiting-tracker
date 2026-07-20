import Franchise from 'madden-franchise';
import { parseRef } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const rt = franchise.tables.find(t => t.name === 'Recruit');
await rt.readRecords();

// RecruitStage distribution
const stageDist = {};
for (const rec of rt.records) {
  if (rec.isEmpty) continue;
  const stage = String(rec.RecruitStage ?? 'null');
  stageDist[stage] = (stageDist[stage] || 0) + 1;
}
console.log('RecruitStage distribution:', stageDist);

// For signed recruits, check their Player -> TeamIndex
const pt = franchise.tables.find(t => t.name === 'Player');
await pt.readRecords(['TeamIndex', 'ProspectStarRating']);

// Show sample of each stage
for (const stage of Object.keys(stageDist)) {
  const samples = rt.records.filter(r => !r.isEmpty && String(r.RecruitStage) === stage).slice(0, 3);
  console.log(`\n--- Stage: ${stage} (${stageDist[stage]} total) ---`);
  for (const rec of samples) {
    const ref = parseRef(rec.Player);
    if (!ref) { console.log('  No player ref'); continue; }
    const prec = pt.records[ref.row];
    const ti = prec?.TeamIndex ?? 'null';
    const star = prec?.ProspectStarRating ?? 'null';
    const cls = rec.Class ?? 'null';
    console.log(`  TeamIndex=${ti}, Star=${star}, Class=${cls}, NationalRank=${rec.NationalRank}`);
  }
}

// For signed recruits, count per team
const signedByTeam = new Map();
const signedRecruits = rt.records.filter(r => !r.isEmpty && String(r.RecruitStage).toLowerCase().includes('sign'));
console.log('\n--- Signed recruit details ---');
for (const rec of signedRecruits.slice(0, 5)) {
  const ref = parseRef(rec.Player);
  if (!ref) continue;
  const prec = pt.records[ref.row];
  console.log(`  TeamIndex=${prec?.TeamIndex}, Star=${prec?.ProspectStarRating}, Class=${rec.Class}`);
}

// Count signed per team
for (const rec of signedRecruits) {
  const ref = parseRef(rec.Player);
  if (!ref) continue;
  const prec = pt.records[ref.row];
  if (!prec) continue;
  const ti = prec.TeamIndex;
  if (!signedByTeam.has(ti)) signedByTeam.set(ti, { total: 0, fiveStars: 0, fourStars: 0, threeStars: 0, twoStars: 0, oneStars: 0 });
  const b = signedByTeam.get(ti);
  b.total++;
  const star = prec.ProspectStarRating;
  if (star === 'FIVE_STAR') b.fiveStars++;
  else if (star === 'FOUR_STAR') b.fourStars++;
  else if (star === 'THREE_STAR') b.threeStars++;
  else if (star === 'TWO_STAR') b.twoStars++;
  else if (star === 'ONE_STAR') b.oneStars++;
}

// Show top teams
const sorted = [...signedByTeam.entries()].sort((a,b) => b[1].total - a[1].total).slice(0, 10);
console.log('\nTop 10 teams by signed recruits:');
for (const [ti, b] of sorted) {
  console.log(`  TeamIndex=${ti}: ${b.total} total (5★=${b.fiveStars}, 4★=${b.fourStars}, 3★=${b.threeStars}, 2★=${b.twoStars}, 1★=${b.oneStars})`);
}

process.exit(0);
