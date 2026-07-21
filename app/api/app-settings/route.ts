import { existsSync, statSync } from 'node:fs';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
  return Response.json({ saveDir: settings?.saveDir ?? null });
}

export async function POST(request: Request) {
  const { saveDir } = await request.json();

  if (saveDir === null || saveDir === '') {
    await prisma.appSettings.upsert({
      where: { id: 1 },
      create: { id: 1, saveDir: null },
      update: { saveDir: null },
    });
    return Response.json({ ok: true, saveDir: null });
  }

  if (typeof saveDir !== 'string') {
    return Response.json({ error: 'saveDir must be a string' }, { status: 400 });
  }
  if (!existsSync(saveDir) || !statSync(saveDir).isDirectory()) {
    return Response.json({ error: `Folder not found: ${saveDir}` }, { status: 400 });
  }

  await prisma.appSettings.upsert({
    where: { id: 1 },
    create: { id: 1, saveDir },
    update: { saveDir },
  });
  return Response.json({ ok: true, saveDir });
}
