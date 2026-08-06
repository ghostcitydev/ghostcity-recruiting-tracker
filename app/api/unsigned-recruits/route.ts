import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get('seasonId');
  if (!seasonId) return Response.json({ error: 'Missing seasonId' }, { status: 400 });

  try {
    const rows = await prisma.$queryRawUnsafe<{ firstName: string; lastName: string; position: string; posGroup: string; starRating: string; overall: number | null; recruitType: string; previousTeam: string | null }[]>(
      `SELECT "firstName","lastName","position","posGroup","starRating","overall","recruitType","previousTeam" FROM "UnsignedRecruit" WHERE "seasonId" = ? ORDER BY "starRating" ASC, "overall" DESC`,
      seasonId
    );
    return Response.json(rows);
  } catch (err: any) {
    return Response.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
