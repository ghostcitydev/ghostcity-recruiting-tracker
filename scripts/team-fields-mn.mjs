import Franchise from 'madden-franchise';
import { parseRef, tableByName } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const teamTable = tableByName(franchise, 'Team');
await teamTable.readRecords();

// Find Minnesota and dump ALL fields
for (const rec of teamTable.records) {
  if (rec.isEmpty || rec.DisplayName !== 'Minnesota') continue;

  const fields = Object.keys(rec.fields);
  console.log(`Minnesota has ${fields.length} fields`);

  for (const f of fields) {
    try {
      const val = rec[f];
      // Skip long references, just show the field name and value
      const str = String(val);
      if (str.length > 80) continue;
      // Filter to interesting ones (recruit/class/commit/transfer/portal)
      const fl = f.toLowerCase();
      if (fl.includes('recruit') || fl.includes('class') || fl.includes('commit') ||
          fl.includes('transfer') || fl.includes('portal') || fl.includes('sign') ||
          fl.includes('roster') || fl.includes('scholarship') || fl.includes('prospect') ||
          fl.includes('star') || fl.includes('total')) {
        console.log(`  ${f}: ${val}`);
      }
    } catch {}
  }

  // Also show all fields with numeric values between 15-30 that might be the "20" count
  console.log('\nFields with value 20:');
  for (const f of fields) {
    try {
      const val = rec[f];
      if (val === 20) console.log(`  ${f}: ${val}`);
    } catch {}
  }

  console.log('\nAll fields with values 15-30:');
  for (const f of fields) {
    try {
      const val = rec[f];
      if (typeof val === 'number' && val >= 15 && val <= 30) {
        console.log(`  ${f}: ${val}`);
      }
    } catch {}
  }

  break;
}

process.exit(0);
