import Franchise from 'madden-franchise';

const savePath = String.raw`C:\Users\User\Documents\EA SPORTS College Football 27\saves\DYNASTY-JUL16-04h24m23-AUTOSAVE`;
const franchise = await Franchise.create(savePath, { autoParse: true });

// ProgressionXPSlider
const xpTables = franchise.tables.filter(t => t.name === 'ProgressionXPSlider');
if (xpTables.length) {
  const t = xpTables[0];
  await t.readRecords();
  console.log('=== ProgressionXPSlider ===');
  for (const r of t.records) {
    if (r.isEmpty) continue;
    const fields = Object.keys(r.fields);
    console.log('Fields:', fields);
    for (const f of fields) {
      try { console.log(`  ${f}: ${r[f]}`); } catch { console.log(`  ${f}: [error]`); }
    }
  }
}

// LeagueSetting
const lsTables = franchise.tables.filter(t => t.name === 'LeagueSetting');
if (lsTables.length) {
  const t = lsTables[0];
  await t.readRecords();
  console.log('\n=== LeagueSetting ===');
  for (const r of t.records) {
    if (r.isEmpty) continue;
    const fields = Object.keys(r.fields);
    console.log('Fields:', fields.join(', '));
    for (const f of fields) {
      try { console.log(`  ${f}: ${r[f]}`); } catch { console.log(`  ${f}: [error]`); }
    }
    break; // just first record
  }
}

// TeamSetting - check first non-empty
const tsTables = franchise.tables.filter(t => t.name === 'TeamSetting');
if (tsTables.length) {
  const t = tsTables.sort((a,b) => b.header.recordCapacity - a.header.recordCapacity)[0];
  await t.readRecords();
  console.log('\n=== TeamSetting (first record) ===');
  for (const r of t.records) {
    if (r.isEmpty) continue;
    const fields = Object.keys(r.fields);
    console.log('Fields:', fields.join(', '));
    for (const f of fields) {
      try { console.log(`  ${f}: ${r[f]}`); } catch { console.log(`  ${f}: [error]`); }
    }
    break;
  }
}

// XPSummaryEntry
const xpSumTables = franchise.tables.filter(t => t.name === 'XPSummaryEntry');
if (xpSumTables.length) {
  const t = xpSumTables[0];
  await t.readRecords();
  console.log('\n=== XPSummaryEntry (first 3) ===');
  let count = 0;
  for (const r of t.records) {
    if (r.isEmpty) continue;
    const fields = Object.keys(r.fields);
    if (count === 0) console.log('Fields:', fields.join(', '));
    for (const f of fields) {
      try { console.log(`  ${f}: ${r[f]}`); } catch { console.log(`  ${f}: [error]`); }
    }
    console.log('---');
    if (++count >= 3) break;
  }
}

process.exit(0);
