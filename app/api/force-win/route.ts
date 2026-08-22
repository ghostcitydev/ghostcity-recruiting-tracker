import { prisma } from '@/lib/prisma';

// Force Win's persisted per-season history, mirroring /api/realignment for
// Conference Realignment. Rows are recorded once, at import time, by
// POST /api/import when a forceWin result is included in the request body.
export async function GET(request: Request) {
  const seasonId = new URL(request.url).searchParams.get('seasonId') ?? undefined;
  try {
    const games = await prisma.forceWinAssignment.findMany({
      where: seasonId ? { seasonId } : undefined,
      include: { season: { select: { id: true, year: true, label: true, snapshot: true } } },
      orderBy: [{ season: { year: 'desc' } }, { week: 'asc' }, { homeTeam: 'asc' }],
    });
    return Response.json(games);
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : 'Could not load Force Win history.' }, { status: 500 });
  }
}
