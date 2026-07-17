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

type RecruitBreakdown = {
  total: number;
  fiveStars: number; fourStars: number; threeStars: number; twoStars: number; oneStars: number;
  hs: number; transfer: number;
  fiveStarsHS: number; fourStarsHS: number; threeStarsHS: number; twoStarsHS: number; oneStarsHS: number;
  fiveStarsXfer: number; fourStarsXfer: number; threeStarsXfer: number; twoStarsXfer: number; oneStarsXfer: number;
};

function emptyBreakdown(): RecruitBreakdown {
  return {
    total: 0, fiveStars: 0, fourStars: 0, threeStars: 0, twoStars: 0, oneStars: 0, hs: 0, transfer: 0,
    fiveStarsHS: 0, fourStarsHS: 0, threeStarsHS: 0, twoStarsHS: 0, oneStarsHS: 0,
    fiveStarsXfer: 0, fourStarsXfer: 0, threeStarsXfer: 0, twoStarsXfer: 0, oneStarsXfer: 0,
  };
}

const STAR_MAP: Record<string, keyof RecruitBreakdown> = {
  FIVE_STAR: 'fiveStars', FOUR_STAR: 'fourStars', THREE_STAR: 'threeStars', TWO_STAR: 'twoStars', ONE_STAR: 'oneStars',
};
const HS_STAR_MAP: Record<string, keyof RecruitBreakdown> = {
  FIVE_STAR: 'fiveStarsHS', FOUR_STAR: 'fourStarsHS', THREE_STAR: 'threeStarsHS', TWO_STAR: 'twoStarsHS', ONE_STAR: 'oneStarsHS',
};
const XFER_STAR_MAP: Record<string, keyof RecruitBreakdown> = {
  FIVE_STAR: 'fiveStarsXfer', FOUR_STAR: 'fourStarsXfer', THREE_STAR: 'threeStarsXfer', TWO_STAR: 'twoStarsXfer', ONE_STAR: 'oneStarsXfer',
};

type RecruitAnalysis = {
  byTeam: Map<string, RecruitBreakdown>;
  unsigned: RecruitBreakdown;
  unsignedHSStars: RecruitBreakdown;
  unsignedXferStars: RecruitBreakdown;
  transfersOutByTeamIdx: Map<number, number>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function analyzeRecruits(franchise: any, teamTable: any): Promise<RecruitAnalysis> {
  const recruitTable = tableByName(franchise, 'Recruit');
  await recruitTable.readRecords(['Player', 'Class', 'RecruitStage']);

  const playerTable = franchise.tables.find((t: any) => t.name === 'Player'); // eslint-disable-line @typescript-eslint/no-explicit-any
  await playerTable.readRecords(['ProspectStarRating', 'PrevTeamIndex']);

  // Build player-row → Recruit record map for Class lookups
  const playerToRecruit = new Map<number, { isTransfer: boolean }>();
  for (const rec of recruitTable.records) {
    if (rec.isEmpty) continue;
    const ref = parseRef(rec.Player);
    if (!ref) continue;
    const cls: string = rec.Class ?? '';
    // JUCO counts as HS bucket (matches game's "High School / JUCO" grouping)
    playerToRecruit.set(ref.row, { isTransfer: !cls.startsWith('HighSchool') && !cls.startsWith('JuniorCollege') });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableCache = new Map<number, any>();
  async function getTable(id: number) {
    if (!tableCache.has(id)) {
      const t = franchise.getTableById(id);
      await t.readRecords();
      tableCache.set(id, t);
    }
    return tableCache.get(id);
  }

  // Read per-team recruits from CommittedPlayers array on each team
  const byTeam = new Map<string, RecruitBreakdown>();
  for (const teamRec of teamTable.records) {
    if (teamRec.isEmpty || !teamRec.DisplayName) continue;
    const teamName: string = teamRec.DisplayName;
    const cpRef = parseRef(teamRec.CommittedPlayers);
    if (!cpRef) continue;

    const cpTable = await getTable(cpRef.tableId);
    const cpRec = cpTable.records[cpRef.row];
    const breakdown = emptyBreakdown();

    for (const f of Object.keys(cpRec.fields)) {
      try {
        const val = cpRec[f];
        const ref = parseRef(val);
        if (!ref) continue;
        const prec = playerTable.records[ref.row];
        if (!prec || prec.isEmpty) continue;

        breakdown.total++;
        const starRating = prec.ProspectStarRating as string;
        const starField = STAR_MAP[starRating];
        if (starField) (breakdown[starField] as number)++;

        const recruitInfo = playerToRecruit.get(ref.row);
        if (recruitInfo?.isTransfer) {
          breakdown.transfer++;
          const xf = XFER_STAR_MAP[starRating];
          if (xf) (breakdown[xf] as number)++;
        } else {
          breakdown.hs++;
          const hf = HS_STAR_MAP[starRating];
          if (hf) (breakdown[hf] as number)++;
        }
      } catch { /* skip unreadable slots */ }
    }

    if (breakdown.total > 0) byTeam.set(teamName, breakdown);
  }

  // Transfers out: count by PrevTeamIndex of all Transfer-class recruits
  const transfersOutByTeamIdx = new Map<number, number>();
  for (const rec of recruitTable.records) {
    if (rec.isEmpty) continue;
    const cls: string = rec.Class ?? '';
    if (cls.startsWith('HighSchool') || cls.startsWith('JuniorCollege')) continue;
    const ref = parseRef(rec.Player);
    if (!ref) continue;
    const prec = playerTable.records[ref.row];
    if (!prec || prec.isEmpty) continue;
    const prevIdx = prec.PrevTeamIndex as number;
    if (prevIdx == null || prevIdx === 255 || prevIdx < 0) continue;
    transfersOutByTeamIdx.set(prevIdx, (transfersOutByTeamIdx.get(prevIdx) ?? 0) + 1);
  }

  // Unsigned = recruits not signed (stage is Top10, Top5, Top3, Invalid, etc.)
  const unsigned = emptyBreakdown();
  const unsignedHSStars = emptyBreakdown();
  const unsignedXferStars = emptyBreakdown();
  for (const rec of recruitTable.records) {
    if (rec.isEmpty) continue;
    if (rec.RecruitStage === 'Signed') continue;
    const ref = parseRef(rec.Player);
    if (!ref) continue;
    const prec = playerTable.records[ref.row];
    if (!prec || prec.isEmpty) continue;

    unsigned.total++;
    const cls: string = rec.Class ?? '';
    const isTransfer = !cls.startsWith('HighSchool') && !cls.startsWith('JuniorCollege');
    if (isTransfer) unsigned.transfer++;
    else unsigned.hs++;
    const starField = STAR_MAP[prec.ProspectStarRating as string];
    if (starField) {
      (unsigned[starField] as number)++;
      if (isTransfer) (unsignedXferStars[starField] as number)++;
      else (unsignedHSStars[starField] as number)++;
    }
  }

  return { byTeam, unsigned, unsignedHSStars, unsignedXferStars, transfersOutByTeamIdx };
}

const GRADE_VALUES: Record<string, number> = {
  Aplus: 4.3, A: 4.0, Aminus: 3.7,
  Bplus: 3.3, B: 3.0, Bminus: 2.7,
  Cplus: 2.3, C: 2.0, Cminus: 1.7,
  Dplus: 1.3, D: 1.0, Dminus: 0.7,
  F: 0.0,
};

function gradeToDisplay(g: string): string {
  return g.replace('plus', '+').replace('minus', '-');
}

function avgGradeValue(...grades: string[]): number {
  const vals = grades.map((g) => GRADE_VALUES[g]).filter((v) => v != null);
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function extractSettings(franchise: any) {
  const lsTables = franchise.tables.filter((t: any) => t.name === 'LeagueSetting');
  const ls = lsTables[0];
  await ls.readRecords();
  const rec = ls.records.find((r: any) => !r.isEmpty);

  const xpTables = franchise.tables.filter((t: any) => t.name === 'ProgressionXPSlider');
  const xp = xpTables[0];
  await xp.readRecords();
  const xpRec = xp.records.find((r: any) => !r.isEmpty);

  return {
    cpuTransferChance: rec?.CPUPlayerTransferChance ?? null,
    userTransferChance: rec?.UserPlayerTransferChance ?? null,
    maxTransfersPerTeam: rec?.MaxTransfersPerTeam ?? null,
    recruitFlipping: rec?.IsRecruitFlippingEnabled ?? null,
    skillLevel: rec?.SkillLevel ?? null,
    progressionFreq: rec?.CPUProgressionFrequency ?? null,
    talentProgressSpeed: rec?.TalentProgressSpeed ?? null,
    xpPenalty: rec?.ManualProgressionXPPenalty ?? null,
    xpQB: xpRec?.QB ?? null,
    xpHB: xpRec?.HB ?? null,
    xpWR: xpRec?.WR ?? null,
    xpTE: xpRec?.TE ?? null,
    xpT: xpRec?.T ?? null,
    xpG: xpRec?.G ?? null,
    xpC: xpRec?.C ?? null,
    xpDE: xpRec?.DE ?? null,
    xpDT: xpRec?.DT ?? null,
    xpOLB: xpRec?.OLB ?? null,
    xpMLB: xpRec?.MLB ?? null,
    xpCB: xpRec?.CB ?? null,
    xpFS: xpRec?.FS ?? null,
    xpSS: xpRec?.SS ?? null,
    xpK: xpRec?.K ?? null,
    xpP: xpRec?.P ?? null,
  };
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
    'ProgramPointsStadiumAtmosphereGrade', 'ProgramPointsBrandExposureGrade',
    'ProgramPointsBudgetGrade', 'ProgramPointsProgramTraditionsGrade',
    'ProgramPointsConferencePrestigeGrade',
    'CommittedPlayers',
  ]);

  // Build facilities grade map: TeamIndex → { grade, score }
  const facilitiesMap = new Map<number, { grade: string; score: number }>();
  try {
    const trackingTables = franchise.tables.filter((t: any) => t.name === 'MySchoolTrackingTable'); // eslint-disable-line @typescript-eslint/no-explicit-any
    if (trackingTables.length > 0) {
      const trackingTable = trackingTables[0];
      await trackingTable.readRecords(['AthleticFacilitiesGrade', 'AthleticFacilitiesScore']);
      for (const r of trackingTable.records) {
        if (r.isEmpty) continue;
        const idx = r.TeamIndex as number;
        const grade = r.AthleticFacilitiesGrade as string;
        const score = r.AthleticFacilitiesScore as number;
        if (idx != null && idx !== 255 && grade) {
          facilitiesMap.set(idx, { grade: gradeToDisplay(grade), score: score ?? 0 });
        }
      }
    }
  } catch { /* table absent — skip */ }

  const confMap = await resolveConferences(franchise, teamTable);
  const { byTeam: recruitData, unsigned, unsignedHSStars, unsignedXferStars, transfersOutByTeamIdx } = await analyzeRecruits(franchise, teamTable);
  const settings = await extractSettings(franchise);

  const season = await prisma.season.upsert({
    where: { year },
    update: { sourceFile: savePath },
    create: { year, label: `Season ${year}`, sourceFile: savePath },
  });

  const unsignedPayload = {
    unsignedTotal: unsigned.total,
    unsignedFiveStar: unsigned.fiveStars,
    unsignedFourStar: unsigned.fourStars,
    unsignedThreeStar: unsigned.threeStars,
    unsignedTwoStar: unsigned.twoStars,
    unsignedOneStar: unsigned.oneStars,
    unsignedHS: unsigned.hs,
    unsignedTransfer: unsigned.transfer,
    unsignedHSFiveStar: unsignedHSStars.fiveStars,
    unsignedHSFourStar: unsignedHSStars.fourStars,
    unsignedHSThreeStar: unsignedHSStars.threeStars,
    unsignedHSTwoStar: unsignedHSStars.twoStars,
    unsignedHSOneStar: unsignedHSStars.oneStars,
    unsignedXferFiveStar: unsignedXferStars.fiveStars,
    unsignedXferFourStar: unsignedXferStars.fourStars,
    unsignedXferThreeStar: unsignedXferStars.threeStars,
    unsignedXferTwoStar: unsignedXferStars.twoStars,
    unsignedXferOneStar: unsignedXferStars.oneStars,
  };

  await prisma.seasonSettings.upsert({
    where: { seasonId: season.id },
    update: { ...settings, ...unsignedPayload },
    create: { seasonId: season.id, ...settings, ...unsignedPayload },
  });

  let teamsImported = 0;
  const teamsSkipped: string[] = [];

  for (const rec of teamTable.records) {
    if (rec.isEmpty || !rec.DisplayName) continue;
    const name: string = rec.DisplayName;
    const conf = confMap.get(name);
    if (!conf) {
      teamsSkipped.push(name);
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
    const rb = recruitData.get(name) ?? emptyBreakdown();

    const gAtm: string = rec.ProgramPointsStadiumAtmosphereGrade ?? '';
    const gBrand: string = rec.ProgramPointsBrandExposureGrade ?? '';
    const gBudget: string = rec.ProgramPointsBudgetGrade ?? '';
    const gTrad: string = rec.ProgramPointsProgramTraditionsGrade ?? '';
    const gConf: string = rec.ProgramPointsConferencePrestigeGrade ?? '';

    const statPayload = {
      overall: rec.TEAM_RATINGOVR ?? null,
      prestige: rec.TeamPrestige ?? null,
      prestigeRank: rec.PrestigeRank ?? null,
      recruitingRank: rec.TopClassRank ?? null,
      teamRank: rec.TeamRank ?? null,
      wins, losses,
      transfersIn: rb.transfer,
      transfersOut: transfersOutByTeamIdx.get(rec.TeamIndex as number) ?? 0,
      recruitCount: rb.total,
      rosterSize: rec.ActiveRosterSize ?? null,
      fiveStars: rb.fiveStars,
      fourStars: rb.fourStars,
      threeStars: rb.threeStars,
      twoStars: rb.twoStars,
      oneStars: rb.oneStars,
      fiveStarsHS: rb.fiveStarsHS,
      fourStarsHS: rb.fourStarsHS,
      threeStarsHS: rb.threeStarsHS,
      twoStarsHS: rb.twoStarsHS,
      oneStarsHS: rb.oneStarsHS,
      fiveStarsXfer: rb.fiveStarsXfer,
      fourStarsXfer: rb.fourStarsXfer,
      threeStarsXfer: rb.threeStarsXfer,
      twoStarsXfer: rb.twoStarsXfer,
      oneStarsXfer: rb.oneStarsXfer,
      hsRecruits: rb.hs,
      transferRecruits: rb.transfer,
      gradeAtmosphere: gAtm ? gradeToDisplay(gAtm) : null,
      gradeBrand: gBrand ? gradeToDisplay(gBrand) : null,
      gradeBudget: gBudget ? gradeToDisplay(gBudget) : null,
      gradeTraditions: gTrad ? gradeToDisplay(gTrad) : null,
      gradeConference: gConf ? gradeToDisplay(gConf) : null,
      gradeFacilities: facilitiesMap.get(rec.TeamIndex as number)?.grade ?? null,
      facilitiesScore: facilitiesMap.get(rec.TeamIndex as number)?.score ?? null,
      avgGrade: avgGradeValue(gAtm, gBrand, gBudget, gTrad, gConf),
    };

    await prisma.teamSeasonStat.upsert({
      where: { teamId_seasonId: { teamId: team.id, seasonId: season.id } },
      update: statPayload,
      create: { teamId: team.id, seasonId: season.id, ...statPayload },
    });

    teamsImported++;
  }

  return { seasonYear: year, teamsImported, teamsSkipped };
}
