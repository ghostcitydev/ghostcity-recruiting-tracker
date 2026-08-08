import { importSaveFile, type SnapshotType } from '@/lib/importSave';

export async function POST(request: Request) {
  const { path, snapshot } = await request.json();
  if (!path || typeof path !== 'string') {
    return Response.json({ error: 'Missing save file' }, { status: 400 });
  }
  const snap: SnapshotType = snapshot === 'preseason' ? 'preseason' : 'signing_day';

  try {
    return Response.json(await importSaveFile(path, snap));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
