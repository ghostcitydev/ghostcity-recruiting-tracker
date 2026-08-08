export const runtime = 'nodejs';
export const maxDuration = 300;

type CloudPayload = {
  blobUrl: string;
  snapshot: 'preseason' | 'signing_day';
  mods?: Record<string, unknown>;
};

export async function GET() {
  return Response.json({ ok: true, worker: process.env.CLOUD_WORKER_MODE === 'true' });
}

// This route is deliberately a thin proxy. The game-save runtime lives in
// /api/cloud/worker so Vercel never attempts to load desktop-only modules.
export async function POST(request: Request) {
  const payload = await request.json() as CloudPayload;
  if (!payload.blobUrl || !payload.snapshot) return Response.json({ error: 'Missing uploaded dynasty save or snapshot.' }, { status: 400 });

  const workerUrl = process.env.CLOUD_WORKER_URL;
  const secret = process.env.CLOUD_WORKER_SECRET;
  if (!workerUrl || !secret) return Response.json({ error: 'Cloud processing is not configured yet. Use the desktop app until the Railway worker is connected.' }, { status: 503 });

  try {
    const workerResponse = await fetch(new URL('/api/cloud/worker', workerUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
      body: JSON.stringify(payload),
    });
    const text = await workerResponse.text();
    try {
      JSON.parse(text);
      return new Response(text, { status: workerResponse.status, headers: { 'Content-Type': 'application/json' } });
    } catch {
      return Response.json({ error: `Cloud worker returned HTTP ${workerResponse.status} instead of a processing result. Check the Railway deployment logs.` }, { status: 502 });
    }
  } catch (error) {
    return Response.json({ error: `Could not reach the cloud worker: ${error instanceof Error ? error.message : 'network error'}` }, { status: 502 });
  }
}
