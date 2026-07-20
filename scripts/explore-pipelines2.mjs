import Franchise from 'madden-franchise';
import { parseRef, tableByName } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

// Read the SchoolPipelineInfluence[] array table (138 rows, one per team by index)
const pipelineArrTables = franchise.tables.filter(t => t.name === 'SchoolPipelineInfluence[]');
const pipelineArrTable = pipelineArrTables[0];
await pipelineArrTable.readRecords();

// Read the SchoolPipelineInfluence records table
const pipelineTable = franchise.tables.filter(t => t.name === 'SchoolPipelineInfluence')[0];
await pipelineTable.readRecords();

// Read team table
const teamTable = tableByName(franchise, 'Team');
await teamTable.readRecords(['DisplayName', 'TeamIndex']);

// Build team index -> name map
const teamNames = new Map();
for (const t of teamTable.records) {
  if (!t.isEmpty && t.DisplayName) teamNames.set(t.TeamIndex, t.DisplayName);
}

// Show first 3 teams' pipelines
for (let teamIdx = 0; teamIdx < 5; teamIdx++) {
  const arrRec = pipelineArrTable.records[teamIdx];
  if (!arrRec || arrRec.isEmpty) continue;
  const teamName = teamNames.get(teamIdx) ?? `Team ${teamIdx}`;
  console.log(`\n=== ${teamName} (idx ${teamIdx}) ===`);

  const fields = Object.keys(arrRec.fields).filter(f => f.startsWith('SchoolPipelineInfluence'));
  const pipelines = [];
  for (const f of fields) {
    const ref = parseRef(arrRec[f]);
    if (!ref) continue;
    const pRec = pipelineTable.records[ref.row];
    if (!pRec || pRec.isEmpty) continue;
    pipelines.push({ pipeline: pRec.Pipeline, level: pRec.InfluenceLevel, value: pRec.InfluenceValue });
  }

  // Sort by value desc
  pipelines.sort((a, b) => b.value - a.value);
  for (const p of pipelines.slice(0, 15)) {
    console.log(`  ${p.pipeline}: ${p.level} (${p.value})`);
  }
}

// Show all unique InfluenceLevel values
const levels = new Set();
for (const r of pipelineTable.records) {
  if (!r.isEmpty) levels.add(r.InfluenceLevel);
}
console.log('\nAll InfluenceLevel values:', [...levels].sort().join(', '));

// Show sample Pipeline values (to understand naming)
const pipelineNames = new Set();
for (const r of pipelineTable.records) {
  if (!r.isEmpty) pipelineNames.add(r.Pipeline);
}
console.log('\nSample Pipeline names (first 30):', [...pipelineNames].sort().slice(0, 30).join(', '));
console.log('Total unique pipelines:', pipelineNames.size);
