// Extracts year-zero school grades from a save file and writes lib/default-grades.json
// Usage: node scripts/extract-default-grades.mjs <path-to-save>

import Franchise from 'madden-franchise';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const savePath = process.argv[2];
if (!savePath) {
  console.error('Usage: node scripts/extract-default-grades.mjs <path-to-save>');
  process.exit(1);
}

function parseRef(bin) {
  if (typeof bin !== 'string' || bin.length < 32 || !/[1-9]/.test(bin)) return null;
  return { tableId: parseInt(bin.slice(0, 15), 2), row: parseInt(bin.slice(15), 2) };
}

function tableByName(franchise, name) {
  const hits = franchise.tables.filter(t => t.name === name);
  if (!hits.length) throw new Error(`table not found: ${name}`);
  return hits.sort((a, b) => b.header.recordCapacity - a.header.recordCapacity)[0];
}

function gradeToDisplay(g) {
  if (!g || g === 'Invalid_') return null;
  return g.replace('plus', '+').replace('minus', '-');
}

const GRADE_FIELDS = [
  'StadiumAtmosphereGrade', 'BrandExposureGrade', 'ProgramTraditionGrade',
  'ConferencePrestigeGrade', 'AthleticFacilitiesGrade',
  'AcademicPrestigeGrade', 'CampusLifestyleGrade',
  'CoachStabilityGrade', 'CoachPrestigeGrade', 'ChampionshipContenderGrade',
  'ProPotentialGradeQB', 'ProPotentialGradeRB', 'ProPotentialGradeWR',
  'ProPotentialGradeTE', 'ProPotentialGradeOL', 'ProPotentialGradeDL',
  'ProPotentialGradeLB', 'ProPotentialGradeDB', 'ProPotentialGradeK', 'ProPotentialGradeP',
];

const KEY_MAP = {
  StadiumAtmosphereGrade:    'gradeAtmosphere',
  BrandExposureGrade:        'gradeBrand',
  ProgramTraditionGrade:     'gradeTraditions',
  ConferencePrestigeGrade:   'gradeConference',
  AthleticFacilitiesGrade:   'gradeFacilities',
  AcademicPrestigeGrade:     'gradeAcademic',
  CampusLifestyleGrade:      'gradeCampus',
  CoachStabilityGrade:       'gradeCoachStability',
  CoachPrestigeGrade:        'gradeCoachPrestige',
  ChampionshipContenderGrade:'gradeChampion',
  ProPotentialGradeQB:       'gradeProQB',
  ProPotentialGradeRB:       'gradeProRB',
  ProPotentialGradeWR:       'gradeProWR',
  ProPotentialGradeTE:       'gradeProTE',
  ProPotentialGradeOL:       'gradeProOL',
  ProPotentialGradeDL:       'gradeProDL',
  ProPotentialGradeLB:       'gradeProLB',
  ProPotentialGradeDB:       'gradeProDB',
  ProPotentialGradeK:        'gradeProK',
  ProPotentialGradeP:        'gradeProP',
};

async function main() {
  console.log(`Reading save: ${savePath}`);
  const franchise = await Franchise.create(savePath, { autoParse: true });

  const teamTable = tableByName(franchise, 'Team');
  await teamTable.readRecords(['DisplayName', 'TeamIndex', 'MySchoolTrackingTable']);

  const trackingHits = franchise.tables.filter(t => t.name === 'MySchoolTrackingTable');
  if (!trackingHits.length) {
    console.error('MySchoolTrackingTable not found in save file');
    process.exit(1);
  }
  const trackingTable = trackingHits[0];
  await trackingTable.readRecords(GRADE_FIELDS);

  const result = {};
  let count = 0;

  for (const teamRec of teamTable.records) {
    if (teamRec.isEmpty || !teamRec.DisplayName) continue;
    const name = teamRec.DisplayName;

    const ref = parseRef(teamRec.MySchoolTrackingTable);
    if (!ref) continue;
    const tRec = trackingTable.records[ref.row];
    if (!tRec || tRec.isEmpty) continue;

    const grades = {};
    for (const field of GRADE_FIELDS) {
      const raw = tRec[field];
      const key = KEY_MAP[field];
      grades[key] = gradeToDisplay(raw);
    }

    result[name] = grades;
    count++;
  }

  const outPath = resolve(__dirname, '../lib/default-grades.json');
  writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`Wrote ${count} teams → ${outPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
