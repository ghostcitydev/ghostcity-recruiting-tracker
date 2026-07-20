import Franchise from 'madden-franchise';
import { parseRef } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const pt = franchise.tables.find(t => t.name === 'Player');
await pt.readRecords(['TeamIndex', 'ProspectStarRating']);

let signed = 0, unsigned = 0;
const signedByTeam = {};
for (const r of pt.records) {
  if (r.isEmpty) continue;
  try {
    const star = r.ProspectStarRating;
    if (!star || star === 'Invalid') continue;
    const ti = r.TeamIndex;
    if (ti === 255 || ti == null) unsigned++;
    else { signed++; signedByTeam[ti] = (signedByTeam[ti] || 0) + 1; }
  } catch {}
}

console.log('Players with star ratings - signed (TeamIndex != 255):', signed);
console.log('Players with star ratings - unsigned (TeamIndex = 255):', unsigned);
console.log('Teams with signed star-rated players:', Object.keys(signedByTeam).length);

const sorted = Object.entries(signedByTeam).sort((a,b) => b[1] - a[1]).slice(0, 10);
console.log('Top 10 teams by signed star-rated players:', sorted);

// Check Recruit table entries
const rt = franchise.tables.find(t => t.name === 'Recruit');
await rt.readRecords(['Player', 'Class']);
let recruitSigned = 0, recruitUnsigned = 0;
for (const rec of rt.records) {
  if (rec.isEmpty) continue;
  const ref = parseRef(rec.Player);
  if (!ref) continue;
  try {
    const prec = pt.records[ref.row];
    if (!prec || prec.isEmpty) continue;
    const ti = prec.TeamIndex;
    if (ti === 255 || ti == null) recruitUnsigned++;
    else recruitSigned++;
  } catch {}
}
console.log('\nRecruit table entries -> signed players:', recruitSigned);
console.log('Recruit table entries -> unsigned players:', recruitUnsigned);

process.exit(0);
