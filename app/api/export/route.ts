import { prisma } from '@/lib/prisma';

function esc(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
}

function row(vals: unknown[]): string {
  return vals.map(esc).join(',');
}

export async function GET(request: Request) {
  const type = new URL(request.url).searchParams.get('type') ?? 'stats';

  if (type === 'unsigned') {
    const settings = await prisma.seasonSettings.findMany({
      include: { season: true },
      orderBy: { season: { year: 'asc' } },
    });
    const headers = [
      'Season', 'Year',
      'UnsignedTotal', 'UnsignedHS', 'UnsignedTransfer',
      'UnsignedHS_5★', 'UnsignedHS_4★', 'UnsignedHS_3★', 'UnsignedHS_2★', 'UnsignedHS_1★',
      'UnsignedXfer_5★', 'UnsignedXfer_4★', 'UnsignedXfer_3★', 'UnsignedXfer_2★', 'UnsignedXfer_1★',
      'Difficulty', 'CPUTransferPct', 'UserTransferPct', 'MaxTransfers', 'RecruitFlipping',
      'Progression', 'TalentSpeed', 'XPPenalty',
    ];
    const lines = [headers.join(',')];
    for (const s of settings) {
      lines.push(row([
        s.season.label, s.season.year,
        s.unsignedTotal, s.unsignedHS, s.unsignedTransfer,
        s.unsignedHSFiveStar, s.unsignedHSFourStar, s.unsignedHSThreeStar, s.unsignedHSTwoStar, s.unsignedHSOneStar,
        s.unsignedXferFiveStar, s.unsignedXferFourStar, s.unsignedXferThreeStar, s.unsignedXferTwoStar, s.unsignedXferOneStar,
        s.skillLevel, s.cpuTransferChance, s.userTransferChance, s.maxTransfersPerTeam, s.recruitFlipping,
        s.progressionFreq, s.talentProgressSpeed, s.xpPenalty,
      ]));
    }
    return new Response(lines.join('\n'), {
      headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="unsigned.csv"' },
    });
  }

  // type === 'stats' (default) — all team season stats
  const stats = await prisma.teamSeasonStat.findMany({
    include: { team: true, season: true },
    orderBy: [{ season: { year: 'asc' } }, { team: { name: 'asc' } }],
  });
  const headers = [
    'Season', 'Year', 'Team', 'Conference', 'Division',
    'OVR', 'Prestige', 'PrestigeRank', 'RecruitRank', 'TeamRank',
    'Wins', 'Losses',
    'TransfersIn', 'TransfersOut', 'NetTransfers',
    'Signed', 'HS', 'Transfer',
    '5★', '4★', '3★', '2★', '1★',
    'HS_5★', 'HS_4★', 'HS_3★', 'HS_2★', 'HS_1★',
    'Xfer_5★', 'Xfer_4★', 'Xfer_3★', 'Xfer_2★', 'Xfer_1★',
    'RosterSize',
    'AvgGrade', 'GradeAtm', 'GradeBrand', 'GradeBudget', 'GradeTrad', 'GradeConf',
  ];
  const lines = [headers.join(',')];
  for (const s of stats) {
    lines.push(row([
      s.season.label, s.season.year, s.team.name, s.team.conference, s.team.division,
      s.overall, s.prestige, s.prestigeRank, s.recruitingRank, s.teamRank,
      s.wins, s.losses,
      s.transfersIn, s.transfersOut, (s.transfersIn ?? 0) - (s.transfersOut ?? 0),
      s.recruitCount, s.hsRecruits, s.transferRecruits,
      s.fiveStars, s.fourStars, s.threeStars, s.twoStars, s.oneStars,
      s.fiveStarsHS, s.fourStarsHS, s.threeStarsHS, s.twoStarsHS, s.oneStarsHS,
      s.fiveStarsXfer, s.fourStarsXfer, s.threeStarsXfer, s.twoStarsXfer, s.oneStarsXfer,
      s.rosterSize,
      s.avgGrade?.toFixed(2), s.gradeAtmosphere, s.gradeBrand, s.gradeBudget, s.gradeTraditions, s.gradeConference,
    ]));
  }
  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="team-stats.csv"' },
  });
}
