import Franchise from 'madden-franchise';

const savePath = String.raw`C:\Users\User\Documents\EA SPORTS College Football 27\saves\DYNASTY-JUL16-04h24m23-AUTOSAVE`;
const franchise = await Franchise.create(savePath, { autoParse: true });

const tables = franchise.tables.filter(t => t.name === 'Recruit');
const recruitTable = tables.sort((a, b) => b.header.recordCapacity - a.header.recordCapacity)[0];
console.log('Recruit table capacity:', recruitTable.header.recordCapacity);

await recruitTable.readRecords();
const sample = recruitTable.records.find(r => !r.isEmpty);
if (sample) {
  const fields = Object.keys(sample.fields);
  console.log('Fields:', fields.join(', '));
  console.log('\nSample values:');
  for (const f of fields) {
    try { console.log(`  ${f}: ${sample[f]}`); } catch { console.log(`  ${f}: [error]`); }
  }
}

process.exit(0);
