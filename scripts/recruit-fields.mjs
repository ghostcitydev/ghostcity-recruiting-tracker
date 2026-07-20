import Franchise from 'madden-franchise';
import { parseRef, tableByName } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const rt = tableByName(franchise, 'Recruit');
await rt.readRecords();

// Show all fields from first non-empty recruit
for (const rec of rt.records) {
  if (rec.isEmpty) continue;
  const fields = Object.keys(rec.fields);
  console.log(`Recruit table has ${fields.length} fields:`);
  for (const f of fields) {
    try {
      const val = rec[f];
      const s = String(val);
      if (s.length > 60) console.log(`  ${f}: [ref/long]`);
      else console.log(`  ${f}: ${val}`);
    } catch(e) {
      console.log(`  ${f}: ERROR`);
    }
  }
  break;
}

// Also check Player table for star-related fields
const pt = tableByName(franchise, 'Player');
await pt.readRecords();
const prec = pt.records.find(r => !r.isEmpty);
const fields = Object.keys(prec.fields);
const starFields = fields.filter(f => f.toLowerCase().includes('star') || f.toLowerCase().includes('prospect') || f.toLowerCase().includes('rating'));
console.log('\nPlayer star/prospect/rating fields:');
for (const f of starFields) {
  try { console.log(`  ${f}: ${prec[f]}`); } catch { console.log(`  ${f}: ERROR`); }
}

process.exit(0);
