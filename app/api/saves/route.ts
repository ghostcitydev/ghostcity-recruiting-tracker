import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { prisma } from '@/lib/prisma';

const DEFAULT_SAVE_DIR = join(homedir(), 'Documents', 'EA SPORTS College Football 27', 'saves');

export async function GET() {
  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
  const dir = settings?.saveDir || DEFAULT_SAVE_DIR;

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const saves = entries
      .filter((e) => !e.isDirectory() && e.name.startsWith('DYNASTY'))
      .map((e) => ({
        name: e.name,
        path: join(dir, e.name),
      }))
      .sort((a, b) => b.name.localeCompare(a.name));

    return Response.json({ dir, defaultDir: DEFAULT_SAVE_DIR, isDefault: dir === DEFAULT_SAVE_DIR, saves });
  } catch {
    return Response.json({ dir, defaultDir: DEFAULT_SAVE_DIR, isDefault: dir === DEFAULT_SAVE_DIR, saves: [], error: 'Could not read saves directory' });
  }
}
