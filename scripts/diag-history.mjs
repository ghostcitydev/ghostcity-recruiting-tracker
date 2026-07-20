import Franchise from 'madden-franchise';
import { tableByName } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

// 1) All tables whose names look historical
console.log('=== Tables matching history/legacy/record/tradition/season/prestige/champion ===');
const pattern = /history|legacy|record|tradition|season|prestige|champion|bowl|playoff|allTime|career|winloss/i;
for (const t of franchise.tables) {
  if (pattern.test(t.name)) {
    console.log(`  ${t.name} (cap ${t.header?.recordCapacity})`);
  }
}

// 2) All fields on Team containing historical-sounding words
const teamTable = tableByName(franchise, 'Team');
await teamTable.readRecords();
const teamFields = teamTable.offsetTable.map(o => o.name);
console.log('\n=== Team fields matching history-ish patterns ===');
const teamPattern = /history|prestige|legacy|record|tradition|career|allTime|totalWin|totalLoss|champion|bowl|playoff|winPct|history/i;
for (const f of teamFields) {
  if (teamPattern.test(f)) console.log(`  ${f}`);
}

// 3) Full field dump on Ohio State (prestige 10) so we can spot suspects
await teamTable.readRecords(teamFields);
console.log('\n=== Ohio State all non-zero-ish fields ===');
for (const r of teamTable.records) {
  if (r.isEmpty) continue;
  if (r.DisplayName !== 'Ohio State') continue;
  for (const f of teamFields) {
    const v = r[f];
    if (v == null || v === '' || v === 0 || v === false) continue;
    if (typeof v === 'string' && v.length > 40) continue; // skip binary refs
    console.log(`  ${f} = ${v}`);
  }
  break;
}
