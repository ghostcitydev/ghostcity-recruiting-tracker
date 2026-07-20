import Franchise from 'madden-franchise';
import { tableByName } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-LIBERTY-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

for (const name of ['CareerCoachStats', 'SeasonCoachStats', 'CoachAccomplishment']) {
  const t = franchise.tables.find(tt => tt.name === name);
  if (!t) { console.log(`${name}: NOT FOUND`); continue; }
  await t.readRecords();
  const fields = t.offsetTable.map(o => o.name);
  console.log(`\n=== ${name} (cap ${t.header.recordCapacity}) ===`);
  console.log(`Fields (${fields.length}): ${fields.join(', ')}`);

  // Sample first non-empty record
  await t.readRecords(fields);
  for (const r of t.records) {
    if (r.isEmpty) continue;
    console.log(`\nSample record (row ${r.index}):`);
    for (const f of fields) {
      const v = r[f];
      if (v == null || v === '' || v === 0 || v === false) continue;
      if (typeof v === 'string' && v.length > 40) continue;
      console.log(`  ${f} = ${v}`);
    }
    break;
  }
}
