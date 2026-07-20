import Franchise from 'madden-franchise';
import { parseRef } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const rt = franchise.tables.find(t => t.name === 'Recruit');
await rt.readRecords();
const pt = franchise.tables.find(t => t.name === 'Player');
await pt.readRecords(['ProspectStarRating', 'PLYR_OVERALLRATING']);

// Check QualityModifier distribution
const qmDist = {};
for (const r of rt.records) {
  if (r.isEmpty) continue;
  const qm = r.QualityModifier ?? 'null';
  qmDist[qm] = (qmDist[qm] || 0) + 1;
}
console.log('QualityModifier distribution:', qmDist);

// Check QualityModifier vs ProspectStarRating
console.log('\nQualityModifier vs ProspectStarRating for signed recruits:');
const crossTab = {};
const signed = rt.records.filter(r => !r.isEmpty && r.RecruitStage === 'Signed');
for (const rec of signed) {
  const qm = rec.QualityModifier ?? 'null';
  const playerRef = parseRef(rec.Player);
  if (!playerRef) continue;
  const prec = pt.records[playerRef.row];
  if (!prec) continue;
  const star = prec.ProspectStarRating ?? 'null';
  const key = `${qm}/${star}`;
  crossTab[key] = (crossTab[key] || 0) + 1;
}
console.log(crossTab);

// Check if there's an overall rating field that correlates with game stars
console.log('\nChecking PLYR_OVERALLRATING for signed HS recruits:');
const hsOnly = signed.filter(r => r.Class === 'HighSchool');
const ovrByStar = {};
for (const rec of hsOnly.slice(0, 200)) {
  const playerRef = parseRef(rec.Player);
  if (!playerRef) continue;
  const prec = pt.records[playerRef.row];
  if (!prec) continue;
  const ovr = prec.PLYR_OVERALLRATING;
  const star = prec.ProspectStarRating;
  if (!ovrByStar[star]) ovrByStar[star] = [];
  ovrByStar[star].push(ovr);
}
for (const [star, ovrs] of Object.entries(ovrByStar)) {
  const sorted = ovrs.sort((a,b) => b-a);
  const avg = sorted.reduce((a,b) => a+b, 0) / sorted.length;
  console.log(`  ${star}: count=${sorted.length}, avg OVR=${avg.toFixed(1)}, range=[${sorted[sorted.length-1]}-${sorted[0]}]`);
}

// Check NationalRank vs QualityModifier
console.log('\nNationalRank ranges by QualityModifier:');
const rankByQM = {};
for (const rec of signed) {
  const qm = rec.QualityModifier ?? 'null';
  const rank = rec.NationalRank ?? 0;
  if (!rankByQM[qm]) rankByQM[qm] = [];
  rankByQM[qm].push(rank);
}
for (const [qm, ranks] of Object.entries(rankByQM)) {
  const sorted = ranks.sort((a,b) => a-b);
  console.log(`  ${qm}: count=${sorted.length}, rank range=[${sorted[0]}-${sorted[sorted.length-1]}]`);
}

process.exit(0);
