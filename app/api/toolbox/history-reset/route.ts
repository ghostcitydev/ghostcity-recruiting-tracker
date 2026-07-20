import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Franchise from 'madden-franchise';
import { parseRef, tableByName } from '@/lib/franchiseRefs';
import fs from 'fs';

const TEAM_HISTORY_FIELDS = [
  'Wins', 'Losses', 'Ties',
  'HomeWins', 'HomeLosses', 'HomeTies',
  'RivalryWins', 'RivalryLosses',
  'LongestHomeWinStreak', 'CurrentHomeWinStreak',
  'WeeksRankedTop25InMediaPoll',
  'AllAmericans1stAnd2nd', 'HeismanWinners', 'PlayersDrafted',
  'BowlsMade', 'BowlsWon',
  'NY6BowlsMade', 'NY6BowlsWon',
  'CFPSMade', 'CFPSWon',
  'NationalChampionshipsMade', 'NationalChampionshipsWon',
  'ConferenceChampionshipsMade', 'ConferenceChampionshipsWon',
  'TopRecruitingClasses', 'Top5RecruitingClasses', 'Top10RecruitingClasses', 'Top25RecruitingClasses',
];

const PRO_POTENTIAL_GRADE_FIELDS = [
  'ProPotentialGradeQB', 'ProPotentialGradeRB', 'ProPotentialGradeWR', 'ProPotentialGradeTE',
  'ProPotentialGradeOL', 'ProPotentialGradeDL', 'ProPotentialGradeLB', 'ProPotentialGradeDB',
  'ProPotentialGradeK', 'ProPotentialGradeP',
];

const CAREER_COACH_FIELDS = [
  'PlayersMaxProgressed', 'Wins', 'WinsAtCurrentSchool', 'FirstRoundDraftPicks',
  'PlayoffLosses', 'PlayoffWins', 'DraftPicks', 'Losses', 'LossesAtCurrentSchool',
  'RivalLosses', 'RivalWins', 'Top25Losses', 'Top25Wins', 'NumPrestigeIncreases',
  'NumTop5RankYdsGainedAllowed', 'RivalWinStreak', 'Top5RecruitClasses',
  'BowlLosses', 'BowlWins', 'ConfChampWinStreak', 'NCLosses', 'TimesFired',
  'ConfChampLosses', 'ConfChampWins', 'NCWins', 'RecentYearNCWon',
];

async function zeroTableFields(franchise: any, tableName: string, fields: string[]) {
  const table = franchise.tables.find((t: any) => t.name === tableName);
  if (!table) return { rowsUpdated: 0, fieldsUpdated: 0 };
  await table.readRecords();
  await table.readRecords(fields);
  let rowsUpdated = 0, fieldsUpdated = 0;
  for (const rec of (table.records as any[])) {
    if (rec.isEmpty) continue;
    let changed = false;
    for (const f of fields) {
      if (typeof rec[f] === 'number' && rec[f] !== 0) {
        rec[f] = 0;
        fieldsUpdated++;
        changed = true;
      }
    }
    if (changed) rowsUpdated++;
  }
  return { rowsUpdated, fieldsUpdated };
}

export async function POST() {
  const season = await prisma.season.findFirst({ orderBy: { year: 'desc' } });
  if (!season?.sourceFile) return NextResponse.json({ error: 'No save file path found.' }, { status: 400 });
  if (!fs.existsSync(season.sourceFile)) return NextResponse.json({ error: `Save file not found: ${season.sourceFile}` }, { status: 400 });
  const savePath = season.sourceFile;

  try {
    const franchise = await Franchise.create(savePath, { autoParse: true });
    const teamTable = tableByName(franchise, 'Team');
    await teamTable.readRecords();
    await teamTable.readRecords(['DisplayName', 'PrestigeRank', 'TeamHistoricalData']);

    const teamsByTableId = new Map<number, number[]>();
    for (const r of (teamTable.records as any[])) {
      if (r.isEmpty) continue;
      if ((r.PrestigeRank as number) === 255) continue;
      if (!r.DisplayName) continue;
      const ref = parseRef(r.TeamHistoricalData);
      if (!ref) continue;
      const list = teamsByTableId.get(ref.tableId) ?? [];
      list.push(ref.row);
      teamsByTableId.set(ref.tableId, list);
    }

    let teamsZeroed = 0, fieldsZeroed = 0;
    for (const [tableId, rows] of teamsByTableId) {
      const target = franchise.tables.find((t: any) => t.header?.tableId === tableId);
      if (!target) continue;
      await target.readRecords();
      await target.readRecords(TEAM_HISTORY_FIELDS);
      for (const row of rows) {
        const rec = (target.records as any[])[row];
        if (!rec || rec.isEmpty) continue;
        let changed = false;
        for (const f of TEAM_HISTORY_FIELDS) {
          if (typeof rec[f] === 'number' && rec[f] !== 0) {
            rec[f] = 0;
            fieldsZeroed++;
            changed = true;
          }
        }
        if (changed) teamsZeroed++;
      }
    }

    // Also zero coach career stats, season stats, and accomplishment counts
    const career = await zeroTableFields(franchise, 'CareerCoachStats', CAREER_COACH_FIELDS);
    const seasonal = await zeroTableFields(franchise, 'SeasonCoachStats', ['Wins', 'Losses']);
    const accom = await zeroTableFields(franchise, 'CoachAccomplishment', ['TimesEarned']);
    const coachesZeroed = career.rowsUpdated + seasonal.rowsUpdated;
    const coachFieldsZeroed = career.fieldsUpdated + seasonal.fieldsUpdated + accom.fieldsUpdated;

    // Reset Pro Potential grades on every team's MySchoolTrackingTable to F (no positional bias)
    await teamTable.readRecords(['MySchoolTrackingTable']);
    const trackingRowsByTable = new Map<number, number[]>();
    for (const r of (teamTable.records as any[])) {
      if (r.isEmpty) continue;
      if ((r.PrestigeRank as number) === 255) continue;
      if (!r.DisplayName) continue;
      const ref = parseRef(r.MySchoolTrackingTable);
      if (!ref) continue;
      const list = trackingRowsByTable.get(ref.tableId) ?? [];
      list.push(ref.row);
      trackingRowsByTable.set(ref.tableId, list);
    }
    let proTeamsReset = 0, proFieldsReset = 0;
    for (const [tableId, rows] of trackingRowsByTable) {
      const target = franchise.tables.find((t: any) => t.header?.tableId === tableId);
      if (!target) continue;
      await target.readRecords();
      await target.readRecords(PRO_POTENTIAL_GRADE_FIELDS);
      for (const row of rows) {
        const rec = (target.records as any[])[row];
        if (!rec || rec.isEmpty) continue;
        let changed = false;
        for (const f of PRO_POTENTIAL_GRADE_FIELDS) {
          if (rec[f] !== 'Cplus') {
            rec[f] = 'Cplus';
            proFieldsReset++;
            changed = true;
          }
        }
        if (changed) proTeamsReset++;
      }
    }

    await franchise.save(savePath);
    return NextResponse.json({
      success: true,
      teamsZeroed, fieldsZeroed,
      coachesZeroed, coachFieldsZeroed,
      proTeamsReset, proFieldsReset,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}
