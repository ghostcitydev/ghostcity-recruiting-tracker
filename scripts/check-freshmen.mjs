import Franchise from 'madden-franchise';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const pt = franchise.tables.find(t => t.name === 'Player');
await pt.readRecords(['TeamIndex', 'ProspectStarRating', 'SchoolYear', 'RedshirtStatus', 'PLYR_CONSECYEARSWITHTEAM', 'Age']);

// SchoolYear distribution for star-rated players on teams
const schoolYearDist = {};
const redshirtDist = {};
const consecYearDist = {};

const freshmen = [];

for (const r of pt.records) {
  if (r.isEmpty) continue;
  try {
    const star = r.ProspectStarRating;
    if (!star || star === 'Invalid') continue;
    const ti = r.TeamIndex;
    if (ti === 255 || ti == null) continue;

    const sy = String(r.SchoolYear ?? 'null');
    const rs = String(r.RedshirtStatus ?? 'null');
    const cy = r.PLYR_CONSECYEARSWITHTEAM ?? 'null';

    schoolYearDist[sy] = (schoolYearDist[sy] || 0) + 1;
    redshirtDist[rs] = (redshirtDist[rs] || 0) + 1;
    consecYearDist[cy] = (consecYearDist[cy] || 0) + 1;

    if (sy === 'Freshman' || sy === '0' || cy === 0) {
      freshmen.push({ TeamIndex: ti, Star: star, SchoolYear: sy, Redshirt: rs, ConsecYears: cy, Age: r.Age });
    }
  } catch {}
}

console.log('SchoolYear distribution:', schoolYearDist);
console.log('RedshirtStatus distribution:', redshirtDist);
console.log('ConsecYearsWithTeam distribution:', consecYearDist);
console.log('\nFreshmen count:', freshmen.length);
if (freshmen.length > 0) {
  console.log('Sample freshmen:');
  console.table(freshmen.slice(0, 10));

  // Star distribution among freshmen
  const starDist = {};
  for (const f of freshmen) {
    starDist[f.Star] = (starDist[f.Star] || 0) + 1;
  }
  console.log('Freshmen star distribution:', starDist);

  // Per-team count
  const teamCounts = {};
  for (const f of freshmen) {
    teamCounts[f.TeamIndex] = (teamCounts[f.TeamIndex] || 0) + 1;
  }
  const sorted = Object.entries(teamCounts).sort((a,b) => b[1] - a[1]).slice(0, 10);
  console.log('Top 10 teams by freshmen:', sorted);
}

process.exit(0);
