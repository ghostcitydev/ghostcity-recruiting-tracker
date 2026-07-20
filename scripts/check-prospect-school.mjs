import Franchise from 'madden-franchise';
import { parseRef } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

// Find ProspectTargetSchool table
const ptsTable = franchise.tables.find(t => t.name === 'ProspectTargetSchool');
if (!ptsTable) { console.log('No ProspectTargetSchool table'); process.exit(1); }
await ptsTable.readRecords();

const nonEmpty = ptsTable.records.filter(r => !r.isEmpty);
console.log('ProspectTargetSchool records:', nonEmpty.length);
console.log('Fields:', Object.keys(nonEmpty[0].fields));

// Show first few
for (const rec of nonEmpty.slice(0, 5)) {
  console.log('\n---');
  for (const f of Object.keys(rec.fields)) {
    try { console.log(`  ${f}: ${rec[f]}`); } catch { console.log(`  ${f}: [error]`); }
  }
}

// Check if there's a Team reference and a Committed flag
const teamTable = franchise.tables.find(t => t.name === 'Team');
await teamTable.readRecords(['DisplayName', 'TeamIndex']);
const teamByIndex = new Map();
for (const r of teamTable.records) {
  if (r.isEmpty) continue;
  try { if (r.DisplayName) teamByIndex.set(r.TeamIndex, r.DisplayName); } catch {}
}

// Check IsCommitted or similar field distribution
const statusFields = {};
for (const rec of nonEmpty) {
  for (const f of Object.keys(rec.fields)) {
    if (!statusFields[f]) statusFields[f] = {};
    try {
      const v = String(rec[f]);
      statusFields[f][v] = (statusFields[f][v] || 0) + 1;
    } catch {}
  }
}
// Show distributions for non-ref fields (small cardinality)
for (const [field, dist] of Object.entries(statusFields)) {
  const values = Object.keys(dist);
  if (values.length <= 20 && values.length > 0) {
    console.log(`\n${field} distribution:`, dist);
  }
}

process.exit(0);
