import Franchise from 'madden-franchise';
import { parseRef, tableByName } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SACSTATE-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

// Find the Coach table
const coachTable = franchise.tables.find(t => t.name === 'Coach');
if (!coachTable) {
  const candidates = franchise.tables.filter(t => /coach/i.test(t.name) && t.header?.recordCapacity > 100);
  console.log('Coach candidates:', candidates.map(c => `${c.name}(cap ${c.header.recordCapacity})`).join(', '));
} else {
  console.log(`Coach table: cap ${coachTable.header.recordCapacity}`);
  await coachTable.readRecords();
  const fields = coachTable.offsetTable.map(o => o.name);
  console.log(`\nAll fields (${fields.length}):`);
  console.log(fields.join(', '));

  // Look for tactician/talent/ability/level fields
  const interesting = fields.filter(f => /tactician|talent|level|ability|badge|xp|skill/i.test(f));
  console.log(`\nInteresting fields: ${interesting.join(', ')}`);

  // Dump a sample coach
  await coachTable.readRecords(fields);
  for (const c of coachTable.records) {
    if (c.isEmpty) continue;
    console.log('\n=== Sample coach ===');
    for (const f of fields) {
      const v = c[f];
      if (v == null || v === '' || v === 0 || v === false) continue;
      if (typeof v === 'string' && v.length > 40) continue;
      console.log(`  ${f} = ${v}`);
    }
    break;
  }
}

// Also check Team → HeadCoach ref → coach record
const teamTable = tableByName(franchise, 'Team');
await teamTable.readRecords();
await teamTable.readRecords(['DisplayName', 'PrestigeRank', 'TeamPrestige', 'HeadCoach', 'CoachTalentEffects']);
const inspect = ['Ohio State', 'South Carolina', 'Cincinnati', 'Sac State', 'Kent State', 'Sam Houston'];
console.log('\n=== HeadCoach refs for inspection teams ===');
for (const t of teamTable.records) {
  if (t.isEmpty) continue;
  if (!inspect.includes(t.DisplayName)) continue;
  console.log(`  ${t.DisplayName} (prestige ${t.TeamPrestige}): HeadCoach=${t.HeadCoach}, CoachTalentEffects=${t.CoachTalentEffects}`);
  const ref = parseRef(t.HeadCoach);
  if (!ref) { console.log('    no ref parsed'); continue; }
  const table = franchise.tables.find(tt => tt.header?.tableId === ref.tableId);
  if (!table) { console.log(`    table ${ref.tableId} not found`); continue; }
  console.log(`    -> table ${table.name} row ${ref.row}`);
}
