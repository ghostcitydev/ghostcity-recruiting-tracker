import Franchise from 'madden-franchise';

const savePath = String.raw`C:\Users\User\Documents\EA SPORTS College Football 27\saves\DYNASTY-JUL16-04h24m23-AUTOSAVE`;
const franchise = await Franchise.create(savePath, { autoParse: true });

// Check recruit classes
const tables = franchise.tables.filter(t => t.name === 'Recruit');
const recruitTable = tables.sort((a, b) => b.header.recordCapacity - a.header.recordCapacity)[0];
await recruitTable.readRecords(['Class', 'NationalRank', 'Player']);

const classCounts = {};
let nonEmpty = 0;
for (const rec of recruitTable.records) {
  if (rec.isEmpty) continue;
  nonEmpty++;
  const cls = rec.Class;
  classCounts[cls] = (classCounts[cls] || 0) + 1;
}
console.log('Total non-empty recruits:', nonEmpty);
console.log('Class distribution:', classCounts);

// Check Player table for star/OVR fields
const parseRef = (bin) => {
  if (typeof bin !== 'string' || bin.length < 32 || !/[1-9]/.test(bin)) return null;
  return { tableId: parseInt(bin.slice(0, 15), 2), row: parseInt(bin.slice(15), 2) };
};

// Get first few recruit player refs
const sampleRefs = [];
for (const rec of recruitTable.records) {
  if (rec.isEmpty) continue;
  const ref = parseRef(rec.Player);
  if (ref) { sampleRefs.push(ref); if (sampleRefs.length >= 3) break; }
}

if (sampleRefs.length) {
  const pt = franchise.getTableById(sampleRefs[0].tableId);
  await pt.readRecords();
  const prec = pt.records[sampleRefs[0].row];
  if (prec) {
    const fields = Object.keys(prec.fields);
    console.log('\nPlayer fields count:', fields.length);
    // Look for star/rating related fields
    const interesting = fields.filter(f => /star|ovr|rating|rank|grade|gem|potential/i.test(f));
    console.log('Interesting fields:', interesting);
    for (const f of interesting) {
      try { console.log(`  ${f}: ${prec[f]}`); } catch { console.log(`  ${f}: [error]`); }
    }
    // Also check TeamIndex
    try { console.log('  TeamIndex:', prec.TeamIndex); } catch {}
    // Check OverallRating or similar
    const ovrFields = fields.filter(f => /overall|ovr|star/i.test(f));
    console.log('OVR fields:', ovrFields);
    for (const f of ovrFields) {
      try { console.log(`  ${f}: ${prec[f]}`); } catch { console.log(`  ${f}: [error]`); }
    }
  }
}

process.exit(0);
