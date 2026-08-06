import { NextResponse } from 'next/server';
import path from 'path';
import { spawn } from 'child_process';
import { prisma } from '@/lib/prisma';
import { importSaveFile } from '@/lib/importSave';

function getModsRoot() {
  if (process.env.ELECTRON_RESOURCES_PATH) {
    return path.join(process.env.ELECTRON_RESOURCES_PATH, 'mods');
  }
  return path.join(process.cwd(), 'public', 'other mods');
}

// POST /api/mods/transfer-wave
//   action: 'launch'  → spawns the exe, returns immediately
//   action: 'reimport' → reimports the preseason save file
export async function POST(request: Request) {
  const { action = 'launch' } = await request.json().catch(() => ({}));

  if (action === 'reimport') {
    const season = await prisma.season.findFirst({
      where: { snapshot: 'preseason' },
      orderBy: { year: 'desc' },
    });
    if (!season?.sourceFile) {
      return NextResponse.json({ error: 'No preseason save file found. Import a preseason snapshot first.' }, { status: 400 });
    }
    try {
      const result = await importSaveFile(season.sourceFile, 'preseason');
      return NextResponse.json({ ok: true, result });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: `Reimport failed: ${message}` }, { status: 500 });
    }
  }

  // action === 'launch'
  const exePath = path.join(
    getModsRoot(),
    'Preseason Transfer Wave V1.1.0',
    'Preseason Transfer Wave.exe'
  );

  try {
    const child = spawn(exePath, [], {
      detached: true,
      stdio: 'ignore',
      cwd: path.dirname(exePath),
    });
    child.unref();
    return NextResponse.json({ ok: true, pid: child.pid });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to launch Transfer Wave: ${message}` }, { status: 500 });
  }
}
