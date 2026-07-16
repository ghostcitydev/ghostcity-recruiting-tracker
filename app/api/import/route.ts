import { importSaveFile } from '@/lib/importSave';

export async function POST(request: Request) {
  const { path } = await request.json();
  if (!path || typeof path !== 'string') {
    return Response.json({ error: 'Missing save file path' }, { status: 400 });
  }

  try {
    const result = await importSaveFile(path);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
