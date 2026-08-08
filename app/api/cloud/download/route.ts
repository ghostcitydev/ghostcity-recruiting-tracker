import { get } from '@vercel/blob';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const pathname = new URL(request.url).searchParams.get('path');
  if (!pathname?.startsWith('processed-saves/')) return Response.json({ error: 'Invalid processed save.' }, { status: 400 });

  const result = await get(pathname, { access: 'private' });
  if (!result || result.statusCode !== 200) return Response.json({ error: 'Processed save not found.' }, { status: 404 });
  return new Response(result.stream, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': result.blob.contentDisposition,
      'Cache-Control': 'no-store',
    },
  });
}
