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

  if (type === 'pipelines') {
    const rows = await prisma.teamPipeline.findMany({
      include: { team: true, season: true },
      orderBy: [{ season: { year: 'asc' } }, { team: { name: 'asc' } }, { pipeline: 'asc' }],
    });
    const PIPELINE_LABELS: Record<string, string> = {
      Alabama: 'Alabama', Arizona: 'Arizona', Arkansas: 'Arkansas',
      BigApple: 'New York Metro', BigSky: 'Big Sky (MT/ID/WY)', CentralFlorida: 'Central Florida',
      Colorado: 'Colorado', EastTexas: 'East Texas', Hawaii: 'Hawaii',
      Illinois: 'Illinois', Indiana: 'Indiana', Iowa: 'Iowa', Kansas: 'Kansas',
      Kentucky: 'Kentucky', Louisiana: 'Louisiana', MetroAtlanta: 'Metro Atlanta',
      Michigan: 'Michigan', Minnesota: 'Minnesota', Mississippi: 'Mississippi',
      Missouri: 'Missouri', Nebraska: 'Nebraska', Nevada: 'Nevada',
      NewEngland: 'New England', NewMexico: 'New Mexico', NorthCarolina: 'North Carolina',
      NorthFlorida: 'North Florida', NorthTexas: 'North Texas', NorthernCalifornia: 'Northern California',
      Ohio: 'Ohio', Oklahoma: 'Oklahoma', PacificNorthwest: 'Pacific Northwest',
      Pennsylvania: 'Pennsylvania', SouthCarolina: 'South Carolina', SouthFlorida: 'South Florida',
      SouthGeorgia: 'South Georgia', SouthernCalifornia: 'Southern California',
      SouthwestTexas: 'Southwest Texas', Tennessee: 'Tennessee', Tidewater: 'Tidewater (VA/NC)',
      Utah: 'Utah', WestVirginia: 'West Virginia', Wisconsin: 'Wisconsin',
    };
    const LEVEL_LABELS: Record<string, string> = {
      CulturalPillar: 'Cultural Pillar', HouseholdName: 'Household Name', Popular: 'Popular',
      Respected: 'Respected', NicheInterest: 'Niche Interest', Unrecognized: 'Unrecognized',
    };
    const headers = ['Year', 'Team', 'Conference', 'Region', 'Level', 'Value'];
    const lines = [headers.join(',')];
    for (const r of rows) {
      lines.push(row([
        r.season.year, r.team.name, r.team.conference,
        PIPELINE_LABELS[r.pipeline] ?? r.pipeline,
        LEVEL_LABELS[r.level] ?? r.level,
        r.value,
      ]));
    }
    return new Response(lines.join('\n'), {
      headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="pipelines.csv"' },
    });
  }

  if (type === 'pipeline-recruits') {
    const rows = await prisma.teamPipelineRecruit.findMany({
      include: { team: true, season: true },
      orderBy: [{ season: { year: 'asc' } }, { team: { name: 'asc' } }, { pipeline: 'asc' }],
    });
    const PIPELINE_LABELS: Record<string, string> = {
      Alabama: 'Alabama', Arizona: 'Arizona', Arkansas: 'Arkansas',
      BigApple: 'New York Metro', BigSky: 'Big Sky (MT/ID/WY)', CentralFlorida: 'Central Florida',
      Colorado: 'Colorado', EastTexas: 'East Texas', Hawaii: 'Hawaii',
      Illinois: 'Illinois', Indiana: 'Indiana', Iowa: 'Iowa', Kansas: 'Kansas',
      Kentucky: 'Kentucky', Louisiana: 'Louisiana', MetroAtlanta: 'Metro Atlanta',
      Michigan: 'Michigan', Minnesota: 'Minnesota', Mississippi: 'Mississippi',
      Missouri: 'Missouri', Nebraska: 'Nebraska', Nevada: 'Nevada',
      NewEngland: 'New England', NewMexico: 'New Mexico', NorthCarolina: 'North Carolina',
      NorthFlorida: 'North Florida', NorthTexas: 'North Texas', NorthernCalifornia: 'Northern California',
      Ohio: 'Ohio', Oklahoma: 'Oklahoma', PacificNorthwest: 'Pacific Northwest',
      Pennsylvania: 'Pennsylvania', SouthCarolina: 'South Carolina', SouthFlorida: 'South Florida',
      SouthGeorgia: 'South Georgia', SouthernCalifornia: 'Southern California',
      SouthwestTexas: 'Southwest Texas', Tennessee: 'Tennessee', Tidewater: 'Tidewater (VA/NC)',
      Utah: 'Utah', WestVirginia: 'West Virginia', Wisconsin: 'Wisconsin',
    };
    const headers = ['Year', 'Team', 'Conference', 'Region', '5★', '4★', '3★', '2★', '1★', 'Total'];
    const lines = [headers.join(',')];
    for (const r of rows) {
      lines.push(row([
        r.season.year, r.team.name, r.team.conference,
        PIPELINE_LABELS[r.pipeline] ?? r.pipeline,
        r.fiveStars, r.fourStars, r.threeStars, r.twoStars, r.oneStars, r.total,
      ]));
    }
    return new Response(lines.join('\n'), {
      headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="pipeline-recruits.csv"' },
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
    'AvgGrade', 'GradeAtm', 'GradeBrand', 'GradeBudget', 'GradeTrad', 'GradeConf', 'GradeFacilities', 'FacilitiesScore(0-100)',
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
      s.avgGrade?.toFixed(2), s.gradeAtmosphere, s.gradeBrand, s.gradeBudget, s.gradeTraditions, s.gradeConference, s.gradeFacilities, s.facilitiesScore,
    ]));
  }
  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="team-stats.csv"' },
  });
}
