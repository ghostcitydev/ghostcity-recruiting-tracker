import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const seasonId = new URL(request.url).searchParams.get('seasonId') ?? undefined;
  try {
    const moves = await prisma.conferenceRealignmentMove.findMany({
      where: seasonId ? { seasonId } : undefined,
      include: { season: { select: { id: true, year: true, label: true, snapshot: true } } },
      orderBy: [{ season: { year: 'desc' } }, { teamName: 'asc' }],
    });
    return Response.json(moves);
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : 'Could not load realignment history.' }, { status: 500 });
  }
}
