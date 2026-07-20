import Franchise from 'madden-franchise';
import { parseRef, tableByName } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SACSTATE-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const coachTable = franchise.tables.find(t => t.name === 'Coach');
await coachTable.readRecords();
await coachTable.readRecords(['Level', 'ActiveTalentTree', 'FirstName', 'LastName']);

const teamTable = tableByName(franchise, 'Team');
await teamTable.readRecords();
await teamTable.readRecords(['DisplayName', 'HeadCoach']);

async function inspectCoach(name, coachRow) {
  const coach = coachTable.records[coachRow];
  console.log(`\n=== ${name} L${coach.Level} ===`);
  const ttRef = parseRef(coach.ActiveTalentTree);
  const ttTable = franchise.tables.find(t => t.header?.tableId === ttRef.tableId);
  await ttTable.readRecords();
  await ttTable.readRecords(['TalentSubTreeStatusList']);
  const ttRec = ttTable.records[ttRef.row];
  const listRef = parseRef(ttRec.TalentSubTreeStatusList);
  console.log(`  TalentSubTreeStatusList ref: ${ttRec.TalentSubTreeStatusList} -> tid=${listRef.tableId} row=${listRef.row}`);
  const listTable = franchise.tables.find(t => t.header?.tableId === listRef.tableId);
  console.log(`  -> Table: ${listTable.name} (cap ${listTable.header.recordCapacity})`);
  await listTable.readRecords();
  const fields = listTable.offsetTable.map(o => o.name);
  console.log(`  Fields (${fields.length}): ${fields.slice(0, 20).join(', ')}${fields.length > 20 ? ' ...' : ''}`);
  await listTable.readRecords(fields);
  const rec = listTable.records[listRef.row];
  if (!rec || rec.isEmpty) { console.log('  empty'); return; }
  const nonzero = [];
  for (const f of fields) {
    const v = rec[f];
    if (v == null || v === '' || v === 0 || v === false) continue;
    nonzero.push(`${f}=${typeof v === 'string' && v.length > 40 ? v.slice(0, 32) + '...' : v}`);
  }
  console.log(`  Non-zero (${nonzero.length}/${fields.length}): ${nonzero.slice(0, 20).join(', ')}${nonzero.length > 20 ? ' ...' : ''}`);

  // Try to follow one of the refs if any
  if (fields[0] && typeof rec[fields[0]] === 'string' && rec[fields[0]].length === 32) {
    const firstRef = parseRef(rec[fields[0]]);
    if (firstRef) {
      const subTable = franchise.tables.find(t => t.header?.tableId === firstRef.tableId);
      if (subTable) {
        console.log(`  First field points to: ${subTable.name} (cap ${subTable.header.recordCapacity})`);
        await subTable.readRecords();
        const subFields = subTable.offsetTable.map(o => o.name);
        console.log(`    Sub fields: ${subFields.join(', ')}`);
        await subTable.readRecords(subFields);
        const subRec = subTable.records[firstRef.row];
        if (subRec && !subRec.isEmpty) {
          const subNonzero = [];
          for (const f of subFields) {
            const v = subRec[f];
            if (v == null || v === '' || v === 0 || v === false) continue;
            subNonzero.push(`${f}=${typeof v === 'string' && v.length > 40 ? v.slice(0, 32) : v}`);
          }
          console.log(`    Sub non-zero: ${subNonzero.join(', ')}`);
        }
      }
    }
  }
}

for (const t of teamTable.records) {
  if (t.isEmpty) continue;
  if (t.DisplayName === 'Ohio State' || t.DisplayName === 'Sam Houston') {
    const ref = parseRef(t.HeadCoach);
    if (ref) await inspectCoach(t.DisplayName, ref.row);
  }
}
