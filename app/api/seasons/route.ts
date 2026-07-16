import { prisma } from '@/lib/prisma';

export async function GET() {
  const seasons = await prisma.season.findMany({ orderBy: { year: 'desc' } });
  return Response.json(seasons);
}
