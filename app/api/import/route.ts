import { importSaveFile, type SnapshotType } from '@/lib/importSave';
import { materializePrivateSave } from '@/lib/cloudSave';

export async function POST(request: Request) {
  const { path, blobUrl, snapshot } = await request.json();
  if ((!path || typeof path !== 'string') && (!blobUrl || typeof blobUrl !== 'string')) {
    return Response.json({ error: 'Missing save file' }, { status: 400 });
  }
  const snap: SnapshotType = snapshot === 'preseason' ? 'preseason' : 'signing_day';

  try {
    const cloudSave = blobUrl ? await materializePrivateSave(blobUrl) : null;
    try {
      const result = await importSaveFile(cloudSave?.filePath ?? path, snap);
      return Response.json(result);
    } finally {
      await cloudSave?.cleanup();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
