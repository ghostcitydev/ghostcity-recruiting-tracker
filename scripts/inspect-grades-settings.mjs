import Franchise from 'madden-franchise';

const savePath = String.raw`C:\Users\User\Documents\EA SPORTS College Football 27\saves\DYNASTY-JUL16-04h24m23-AUTOSAVE`;
const franchise = await Franchise.create(savePath, { autoParse: true });

// Look for grade/academic fields on Team
const tables = franchise.tables.filter(t => t.name === 'Team');
const teamTable = tables.sort((a, b) => b.header.recordCapacity - a.header.recordCapacity)[0];
await teamTable.readRecords();
const teamRec = teamTable.records.find(r => !r.isEmpty && r.DisplayName === 'Alabama');
const teamFields = Object.keys(teamRec.fields);
const gradeFields = teamFields.filter(f => /grade|academic|school|gpa/i.test(f));
console.log('=== Team grade-related fields ===');
console.log(gradeFields);
for (const f of gradeFields) {
  try { console.log(`  ${f}: ${teamRec[f]}`); } catch { console.log(`  ${f}: [error]`); }
}

// Look for XP/transfer setting fields
const xpFields = teamFields.filter(f => /xp|slider|transfer|setting|speed|threshold|difficulty/i.test(f));
console.log('\n=== Team XP/transfer/setting fields ===');
console.log(xpFields);
for (const f of xpFields) {
  try { console.log(`  ${f}: ${teamRec[f]}`); } catch { console.log(`  ${f}: [error]`); }
}

// Look for global settings tables
const settingsTables = franchise.tables.filter(t =>
  /setting|config|slider|option|difficulty|xp|transfer/i.test(t.name)
);
console.log('\n=== Settings-like tables ===');
for (const t of settingsTables) {
  console.log(`  ${t.name} (capacity: ${t.header.recordCapacity}, id: ${t.header.tableId})`);
}

// Check for DynastySetting or similar
for (const tName of ['DynastySetting', 'DynastySettings', 'GameSetting', 'SliderSettings', 'TransferSettings', 'XPSliders', 'UserSettings']) {
  const hits = franchise.tables.filter(t => t.name === tName);
  if (hits.length) console.log(`\nFound table: ${tName}`);
}

// Check FranchiseSetting
const fsTables = franchise.tables.filter(t => /franchise/i.test(t.name));
console.log('\n=== Franchise tables ===');
for (const t of fsTables) {
  console.log(`  ${t.name} (capacity: ${t.header.recordCapacity})`);
}

process.exit(0);
