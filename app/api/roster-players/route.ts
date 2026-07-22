import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get('seasonId');
  if (!seasonId) return Response.json({ error: 'Missing seasonId' }, { status: 400 });

  try {
    const rows = await prisma.rosterPlayer.findMany({
      where: { seasonId },
      select: { teamId: true, firstName: true, lastName: true, position: true, posGroup: true, overall: true, starRating: true, schoolYear: true },
      orderBy: [{ overall: 'desc' }],
    });
    return Response.json(rows);
  } catch (err: any) {
    return Response.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
