import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get('seasonId');
  if (!seasonId) return Response.json({ error: 'Missing seasonId' }, { status: 400 });

  try {
    const rows = await prisma.$queryRawUnsafe<{
      firstName: string; lastName: string; position: string; posGroup: string;
      starRating: string; overall: number | null; previousTeam: string | null;
      classYear: string | null; teamName: string;
    }[]>(
      `SELECT sr."firstName", sr."lastName", sr."position", sr."posGroup",
              sr."starRating", sr."overall", sr."previousTeam", sr."classYear",
              t."name" AS "teamName"
       FROM "SignedRecruit" sr
       JOIN "Team" t ON t."id" = sr."teamId"
       WHERE sr."seasonId" = ? AND sr."recruitType" = 'Transfer'
       ORDER BY sr."starRating" ASC, sr."overall" DESC`,
      seasonId
    );
    return Response.json(rows);
  } catch (err: any) {
    return Response.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
