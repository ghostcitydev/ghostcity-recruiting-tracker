import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const seasonId = new URL(request.url).searchParams.get('seasonId');
  const historyPath = path.join(
    os.homedir(),
    'AppData', 'Roaming', 'preseason-transfer-wave', 'history.json'
  );

  try {
    const raw = fs.readFileSync(historyPath, 'utf-8');
    const entries: unknown[] = JSON.parse(raw);
    let latest = Array.isArray(entries) ? entries[entries.length - 1] : null;
    // The history file is shared between dynasties. When viewing a specific
    // preseason snapshot, only show a run that modified that snapshot's save.
    if (seasonId) {
      const season = await prisma.season.findUnique({ where: { id: seasonId }, select: { sourceFile: true } });
      if (!season?.sourceFile) latest = null;
      else {
        latest = [...entries].reverse().find((entry: any) => entry?.savePath === season.sourceFile) ?? null;
      }
    }
    return NextResponse.json({ ok: true, entry: latest });
  } catch {
    return NextResponse.json({ ok: false, entry: null });
  }
}
