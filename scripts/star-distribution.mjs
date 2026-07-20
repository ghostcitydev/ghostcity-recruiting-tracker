import Franchise from 'madden-franchise';

const savePath = String.raw`C:\Users\User\Documents\EA SPORTS College Football 27\saves\DYNASTY-JUL16-04h24m23-AUTOSAVE`;
const franchise = await Franchise.create(savePath, { autoParse: true });

const parseRef = (bin) => {
  if (typeof bin !== 'string' || bin.length < 32 || !/[1-9]/.test(bin)) return null;
  return { tableId: parseInt(bin.slice(0, 15), 2), row: parseInt(bin.slice(15), 2) };
};

const tables = franchise.tables.filter(t => t.name === 'Recruit');
const recruitTable = tables.sort((a, b) => b.header.recordCapacity - a.header.recordCapacity)[0];
await recruitTable.readRecords(['Player', 'Class']);

// Group by player table
const byTable = new Map();
const recruitMeta = new Map(); // row -> class
for (const rec of recruitTable.records) {
  if (rec.isEmpty) continue;
  const ref = parseRef(rec.Player);
  if (!ref) continue;
  if (!byTable.has(ref.tableId)) byTable.set(ref.tableId, []);
  byTable.get(ref.tableId).push(ref.row);
  recruitMeta.set(`${ref.tableId}_${ref.row}`, rec.Class);
}

const starCounts = {};
const starByClass = {};
for (const [tableId, rows] of byTable) {
  const pt = franchise.getTableById(tableId);
  await pt.readRecords(['ProspectStarRating', 'TeamIndex']);
  for (const row of rows) {
    const prec = pt.records[row];
    if (!prec || prec.isEmpty) continue;
    const star = prec.ProspectStarRating;
    const cls = recruitMeta.get(`${tableId}_${row}`) || 'Unknown';
    starCounts[star] = (starCounts[star] || 0) + 1;
    const key = `${cls}|${star}`;
    starByClass[key] = (starByClass[key] || 0) + 1;
  }
}

console.log('Star distribution:', starCounts);
console.log('\nBy class+star:', starByClass);

process.exit(0);
