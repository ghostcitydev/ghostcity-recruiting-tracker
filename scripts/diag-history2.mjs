import Franchise from 'madden-franchise';
import { parseRef, tableByName } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const teamTable = tableByName(franchise, 'Team');
await teamTable.readRecords();
const teamFields = teamTable.offsetTable.map(o => o.name);
await teamTable.readRecords(teamFields);

// Find OSU + a low-prestige team for comparison
const inspect = ['Ohio State', 'San Jose State', 'Kent State', 'Alabama'];
const teams = new Map();
for (const r of teamTable.records) {
  if (r.isEmpty) continue;
  if (inspect.includes(r.DisplayName)) teams.set(r.DisplayName, r);
}

// For each, dump the interesting fields + follow TeamHistoricalData ref
for (const name of inspect) {
  const r = teams.get(name);
  if (!r) continue;
  console.log(`\n╔═══ ${name} ═══╗`);
  console.log(`  TeamPrestige = ${r.TeamPrestige}`);
  console.log(`  PrestigeDisplay = ${r.PrestigeDisplay}`);
  console.log(`  TeamPrestigeBias = ${r.TeamPrestigeBias}`);
  console.log(`  SeasonWinPct = ${r.SeasonWinPct}`);
  console.log(`  PlayoffRoundReached = ${r.PlayoffRoundReached}`);
  console.log(`  LastSeasonPlayoffRoundReached = ${r.LastSeasonPlayoffRoundReached}`);
  console.log(`  TeamHistoricalData ref = ${r.TeamHistoricalData}`);
  console.log(`  TeamHistory ref = ${r.TeamHistory}`);
  console.log(`  TeamSeriesHistory ref = ${r.TeamSeriesHistory}`);
  console.log(`  HistoryEntries ref = ${r.HistoryEntries}`);
  console.log(`  TeamTraditions ref = ${r.TeamTraditions}`);
}

// Follow OSU's TeamHistoricalData ref and dump the target table's schema + row values
const osu = teams.get('Ohio State');
const ref = parseRef(osu.TeamHistoricalData);
if (ref) {
  console.log(`\n=== TeamHistoricalData → tableId ${ref.tableId}, row ${ref.row} ===`);
  const target = franchise.tables.find(t => t.header?.tableId === ref.tableId);
  if (target) {
    console.log(`  Table name: ${target.name} (cap ${target.header.recordCapacity})`);
    await target.readRecords();
    const fields = target.offsetTable.map(o => o.name);
    console.log(`  Fields: ${fields.join(', ')}`);
    await target.readRecords(fields);
    const rec = target.records[ref.row];
    if (rec) {
      console.log(`  Non-empty values for OSU's row:`);
      for (const f of fields) {
        const v = rec[f];
        if (v == null || v === '' || v === 0 || v === false) continue;
        if (typeof v === 'string' && v.length > 40) continue;
        console.log(`    ${f} = ${v}`);
      }
    }
  } else {
    console.log('  Table not found for tableId', ref.tableId);
  }
}

// Same for TeamHistory
const href = parseRef(osu.TeamHistory);
if (href) {
  console.log(`\n=== TeamHistory → tableId ${href.tableId}, row ${href.row} ===`);
  const target = franchise.tables.find(t => t.header?.tableId === href.tableId);
  if (target) {
    console.log(`  Table name: ${target.name} (cap ${target.header.recordCapacity})`);
    await target.readRecords();
    const fields = target.offsetTable.map(o => o.name);
    console.log(`  Fields: ${fields.join(', ')}`);
  }
}

// Same for HistoryEntries
const heref = parseRef(osu.HistoryEntries);
if (heref) {
  console.log(`\n=== HistoryEntries → tableId ${heref.tableId}, row ${heref.row} ===`);
  const target = franchise.tables.find(t => t.header?.tableId === heref.tableId);
  if (target) {
    console.log(`  Table name: ${target.name} (cap ${target.header.recordCapacity})`);
    await target.readRecords();
    const fields = target.offsetTable.map(o => o.name);
    console.log(`  Fields: ${fields.join(', ')}`);
  }
}
