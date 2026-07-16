import Franchise from 'madden-franchise';
import { prisma } from './prisma';
import { parseRef, tableByName } from './franchiseRefs';
import teamLogos from './team-logos.json';

type ConfInfo = { conference: string; division: string | null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveConferences(franchise: any, teamTable: any): Promise<Map<string, ConfInfo>> {
  const confTable = tableByName(franchise, 'Conference');
  await confTable.readRecords();

  const mapping = new Map<string, ConfInfo>();
  const tableCache = new Map<number, any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  async function getTable(id: number) {
    if (!tableCache.has(id)) {
      const t = franchise.getTableById(id);
      await t.readRecords();
      tableCache.set(id, t);
    }
    return tableCache.get(id);
  }

  for (const confRec of confTable.records) {
    if (confRec.isEmpty || !confRec.Name) continue;
    const confName = confRec.Name as string;
    const divArrRef = parseRef(confRec.Divisions);
    if (!divArrRef) continue;
    const divArrTable = await getTable(divArrRef.tableId);
    const divArrRec = divArrTable.records[divArrRef.row];

    for (const f of Object.keys(divArrRec.fields)) {
      let v: unknown;
      try { v = divArrRec[f]; } catch { continue; }
      const divRef = parseRef(v);
      if (!divRef) continue;
      const divTable = await getTable(divRef.tableId);
      const divRec = divTable.records[divRef.row];
      const divName: string | null = divRec.Name || null;

      let teamsRef;
      try { teamsRef = parseRef(divRec.Teams); } catch { teamsRef = null; }
      if (!teamsRef) continue;
      const teamsArrTable = await getTable(teamsRef.tableId);
      const teamsArrRec = teamsArrTable.records[teamsRef.row];

      for (const tf of Object.keys(teamsArrRec.fields)) {
        let tv: unknown;
        try { tv = teamsArrRec[tf]; } catch { continue; }
        const tRef = parseRef(tv);
        if (!tRef) continue;
        const teamRec = teamTable.records[tRef.row];
        if (!teamRec || !teamRec.DisplayName) continue;
        mapping.set(teamRec.DisplayName, { conference: confName, division: divName });
      }
    }
  }
  return mapping;
}

// Counts committed recruits per team for the current recruiting class by
// resolving each Recruit board entry's Player reference and reading its
// TeamIndex (255 = not yet committed to any school).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function countRecruitsByTeamIndex(franchise: any): Promise<Map<number, number>> {
  const recruitTable = tableByName(franchise, 'Recruit');
  await recruitTable.readRecords(['Player']);

  const byPlayerTable = new Map<number, number[]>();
  for (const rec of recruitTable.records) {
    if (rec.isEmpty) continue;
    const ref = parseRef(rec.Player);
    if (!ref) continue;
    if (!byPlayerTable.has(ref.tableId)) byPlayerTable.set(ref.tableId, []);
    byPlayerTable.get(ref.tableId)!.push(ref.row);
  }

  const counts = new Map<number, number>();
  for (const [tableId, rows] of byPlayerTable) {
    const pt = franchise.getTableById(tableId);
    await pt.readRecords(['TeamIndex']);
    for (const row of rows) {
      const prec = pt.records[row];
      if (!prec || prec.isEmpty) continue;
      let teamIndex: number;
      try { teamIndex = prec.TeamIndex; } catch { continue; }
      if (teamIndex === 255 || teamIndex == null) continue; // uncommitted
      counts.set(teamIndex, (counts.get(teamIndex) ?? 0) + 1);
    }
  }
  return counts;
}

export type ImportResult = {
  seasonYear: number;
  teamsImported: number;
  teamsSkipped: string[];
};

export async function importSaveFile(savePath: string): Promise<ImportResult> {
  const franchise = await Franchise.create(savePath, { autoParse: true });

  if (franchise.gameType !== 'college') {
    throw new Error(`Not a College Football save file (detected type: ${franchise.gameType})`);
  }

  const seasonInfoTable = tableByName(franchise, 'SeasonInfo');
  await seasonInfoTable.readRecords(['CurrentSeasonYear']);
  const year: number = seasonInfoTable.records[0].CurrentSeasonYear;

  const teamTable = tableByName(franchise, 'Team');
  await teamTable.readRecords([
    'DisplayName', 'ShortName', 'NickName', 'TeamIndex',
    'TEAM_RATINGOVR', 'TeamPrestige', 'PrestigeRank', 'TopClassRank', 'TeamRank',
    'ConfWin', 'ConfLoss', 'NonConfWin', 'NonConfLoss',
    'LastSeasonTransfersSigned', 'LastSeasonTransfersLost', 'ActiveRosterSize',
  ]);

  const confMap = await resolveConferences(franchise, teamTable);
  const recruitCounts = await countRecruitsByTeamIndex(franchise);

  const season = await prisma.season.upsert({
    where: { year },
    update: { sourceFile: savePath },
    create: { year, label: `Season ${year}`, sourceFile: savePath },
  });

  let teamsImported = 0;
  const teamsSkipped: string[] = [];

  for (const rec of teamTable.records) {
    if (rec.isEmpty || !rec.DisplayName) continue;
    const name: string = rec.DisplayName;
    const conf = confMap.get(name);
    if (!conf) {
      teamsSkipped.push(name); // FCS placeholder opponents etc. — not a real program to track
      continue;
    }

    const team = await prisma.team.upsert({
      where: { name },
      update: {
        conference: conf.conference,
        division: conf.division,
        shortName: rec.ShortName || null,
        nickname: rec.NickName || null,
        logoUrl: (teamLogos as Record<string, string>)[name] ?? null,
      },
      create: {
        name,
        conference: conf.conference,
        division: conf.division,
        shortName: rec.ShortName || null,
        nickname: rec.NickName || null,
        logoUrl: (teamLogos as Record<string, string>)[name] ?? null,
      },
    });

    const wins = (rec.ConfWin ?? 0) + (rec.NonConfWin ?? 0);
    const losses = (rec.ConfLoss ?? 0) + (rec.NonConfLoss ?? 0);
    const recruitCount = recruitCounts.get(rec.TeamIndex) ?? 0;

    await prisma.teamSeasonStat.upsert({
      where: { teamId_seasonId: { teamId: team.id, seasonId: season.id } },
      update: {
        overall: rec.TEAM_RATINGOVR ?? null,
        prestige: rec.TeamPrestige ?? null,
        prestigeRank: rec.PrestigeRank ?? null,
        recruitingRank: rec.TopClassRank ?? null,
        teamRank: rec.TeamRank ?? null,
        wins, losses,
        transfersIn: rec.LastSeasonTransfersSigned ?? null,
        transfersOut: rec.LastSeasonTransfersLost ?? null,
        recruitCount,
        rosterSize: rec.ActiveRosterSize ?? null,
      },
      create: {
        teamId: team.id,
        seasonId: season.id,
        overall: rec.TEAM_RATINGOVR ?? null,
        prestige: rec.TeamPrestige ?? null,
        prestigeRank: rec.PrestigeRank ?? null,
        recruitingRank: rec.TopClassRank ?? null,
        teamRank: rec.TeamRank ?? null,
        wins, losses,
        transfersIn: rec.LastSeasonTransfersSigned ?? null,
        transfersOut: rec.LastSeasonTransfersLost ?? null,
        recruitCount,
        rosterSize: rec.ActiveRosterSize ?? null,
      },
    });

    teamsImported++;
  }

  return { seasonYear: year, teamsImported, teamsSkipped };
}
