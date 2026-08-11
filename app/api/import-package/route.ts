import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const FORMAT = 'ghost-city-rlt-import-package';
const VERSION = 1;

type PackageData = {
  teams: Record<string, unknown>[];
  seasons: Record<string, unknown>[];
  seasonSettings: Record<string, unknown>[];
  teamSeasonStats: Record<string, unknown>[];
  teamPipelines: Record<string, unknown>[];
  teamPipelineRecruits: Record<string, unknown>[];
  teamPositionRecruits: Record<string, unknown>[];
  signedRecruits: Record<string, unknown>[];
  unsignedRecruits: Record<string, unknown>[];
  rosterPlayers: Record<string, unknown>[];
  teamPipelinePositionRecruits: Record<string, unknown>[];
  pipelineProspects: Record<string, unknown>[];
  teamPlayerRatings: Record<string, unknown>[];
};

function isRecords(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.every((entry) => entry && typeof entry === 'object' && !Array.isArray(entry));
}

function isPackageData(value: unknown): value is PackageData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  return [
    'teams', 'seasons', 'seasonSettings', 'teamSeasonStats', 'teamPipelines',
    'teamPipelineRecruits', 'teamPositionRecruits', 'signedRecruits', 'unsignedRecruits',
    'rosterPlayers', 'teamPipelinePositionRecruits', 'pipelineProspects', 'teamPlayerRatings',
  ].every((key) => isRecords(data[key]));
}

export async function GET() {
  try {
    const seasons = await prisma.season.findMany({ orderBy: [{ year: 'asc' }, { snapshot: 'asc' }] });
    const seasonIds = seasons.map((season) => season.id);
    const where = { seasonId: { in: seasonIds } };
    const [
      teams, seasonSettings, teamSeasonStats, teamPipelines, teamPipelineRecruits,
      teamPositionRecruits, signedRecruits, unsignedRecruits, rosterPlayers,
      teamPipelinePositionRecruits, pipelineProspects, teamPlayerRatings,
    ] = await Promise.all([
      prisma.team.findMany({ orderBy: { name: 'asc' } }),
      prisma.seasonSettings.findMany({ where }),
      prisma.teamSeasonStat.findMany({ where }),
      prisma.teamPipeline.findMany({ where }),
      prisma.teamPipelineRecruit.findMany({ where }),
      prisma.teamPositionRecruit.findMany({ where }),
      prisma.signedRecruit.findMany({ where }),
      prisma.unsignedRecruit.findMany({ where }),
      prisma.rosterPlayer.findMany({ where }),
      prisma.teamPipelinePositionRecruit.findMany({ where }),
      prisma.pipelineProspect.findMany({ where }),
      prisma.teamPlayerRating.findMany({ where }),
    ]);

    const payload = {
      format: FORMAT,
      version: VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        teams, seasons, seasonSettings, teamSeasonStats, teamPipelines, teamPipelineRecruits,
        teamPositionRecruits, signedRecruits, unsignedRecruits, rosterPlayers,
        teamPipelinePositionRecruits, pipelineProspects, teamPlayerRatings,
      },
    };
    const date = new Date().toISOString().slice(0, 10);
    return new Response(JSON.stringify(payload), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="ghost-city-rlt-imports-${date}.json"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not export imports.';
    return Response.json({ error: message }, { status: 500 });
  }
}

async function removeSeason(tx: any, seasonId: string) {
  await tx.pipelineProspect.deleteMany({ where: { seasonId } });
  await tx.unsignedRecruit.deleteMany({ where: { seasonId } });
  await tx.signedRecruit.deleteMany({ where: { seasonId } });
  await tx.rosterPlayer.deleteMany({ where: { seasonId } });
  await tx.teamPipelinePositionRecruit.deleteMany({ where: { seasonId } });
  await tx.teamPlayerRating.deleteMany({ where: { seasonId } });
  await tx.teamPositionRecruit.deleteMany({ where: { seasonId } });
  await tx.teamPipelineRecruit.deleteMany({ where: { seasonId } });
  await tx.teamPipeline.deleteMany({ where: { seasonId } });
  await tx.teamSeasonStat.deleteMany({ where: { seasonId } });
  await tx.seasonSettings.deleteMany({ where: { seasonId } });
  await tx.season.delete({ where: { id: seasonId } });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    if (payload?.format !== FORMAT || payload?.version !== VERSION || !isPackageData(payload?.data)) {
      return Response.json({ error: 'This is not a compatible Ghost City RLT imports package.' }, { status: 400 });
    }

    const data = payload.data as PackageData;
    const result = await prisma.$transaction(async (tx) => {
      const teamIdMap = new Map<string, string>();
      for (const team of data.teams) {
        const { id, ...teamData } = team;
        if (typeof id !== 'string' || typeof teamData.name !== 'string') continue;
        const saved = await tx.team.upsert({
          where: { name: teamData.name },
          update: teamData as any,
          create: teamData as any,
        });
        teamIdMap.set(id, saved.id);
      }

      const seasonIdMap = new Map<string, string>();
      for (const season of data.seasons) {
        const { id, importedAt, ...seasonData } = season;
        const year = Number(seasonData.year);
        const snapshot = String(seasonData.snapshot ?? '');
        if (typeof id !== 'string' || !Number.isInteger(year) || !snapshot) continue;
        const existing = await tx.season.findUnique({ where: { year_snapshot: { year, snapshot } } });
        if (existing) await removeSeason(tx, existing.id);
        const saved = await tx.season.create({
          data: {
            ...seasonData as any,
            year,
            snapshot,
            ...(importedAt ? { importedAt: new Date(String(importedAt)) } : {}),
          },
        });
        seasonIdMap.set(id, saved.id);
      }

      async function restore(model: string, records: Record<string, unknown>[], needsTeam = true) {
        for (const record of records) {
          const row = { ...record };
          const teamId = row.teamId;
          const seasonId = row.seasonId;
          delete row.id;
          delete row.teamId;
          delete row.seasonId;
          delete row.createdAt;
          delete row.updatedAt;
          if (typeof seasonId !== 'string' || !seasonIdMap.has(seasonId)) continue;
          const restored = { ...row, seasonId: seasonIdMap.get(seasonId) } as Record<string, unknown>;
          if (needsTeam) {
            if (typeof teamId !== 'string' || !teamIdMap.has(teamId)) continue;
            restored.teamId = teamIdMap.get(teamId)!;
          }
          await (tx as any)[model].create({ data: restored });
        }
      }

      await restore('seasonSettings', data.seasonSettings, false);
      await restore('teamSeasonStat', data.teamSeasonStats);
      await restore('teamPipeline', data.teamPipelines);
      await restore('teamPipelineRecruit', data.teamPipelineRecruits);
      await restore('teamPositionRecruit', data.teamPositionRecruits);
      await restore('signedRecruit', data.signedRecruits);
      await restore('unsignedRecruit', data.unsignedRecruits, false);
      await restore('rosterPlayer', data.rosterPlayers);
      await restore('teamPipelinePositionRecruit', data.teamPipelinePositionRecruits);
      await restore('pipelineProspect', data.pipelineProspects, false);
      await restore('teamPlayerRating', data.teamPlayerRatings);

      return { seasons: seasonIdMap.size, teams: teamIdMap.size };
    });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not restore imports.';
    return Response.json({ error: message }, { status: 500 });
  }
}
