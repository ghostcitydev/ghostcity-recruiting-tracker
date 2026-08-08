import { del, put } from '@vercel/blob';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { materializePrivateSave } from '@/lib/cloudSave';
import { importSaveFile, type SnapshotType } from '@/lib/importSave';
import { POST as runFang } from '@/app/api/mods/fang/route';
import { POST as runTransferWave } from '@/app/api/mods/transfer-wave-run/route';
import { POST as runRebalance } from '@/app/api/mods/rebalance/route';
import { POST as runPipeline } from '@/app/api/mods/pipeline/route';
import { POST as runNsd } from '@/app/api/mods/nsd-assign/route';

export const runtime = 'nodejs';
export const maxDuration = 300;

type CloudPayload = {
  blobUrl: string;
  snapshot: SnapshotType;
  mods?: { fang?: { enabled?: boolean; config?: Record<string, unknown> | null }; tw?: { enabled?: boolean; [key: string]: unknown }; rebalance?: { enabled?: boolean }; pipeline?: { enabled?: boolean; [key: string]: unknown }; nsd?: { enabled?: boolean; [key: string]: unknown } };
};

async function invoke(handler: (request: Request) => Promise<Response>, payload: Record<string, unknown>) {
  const response = await handler(new Request('http://ghost-city-worker/internal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }));
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Cloud mod failed.');
  return data as Record<string, unknown>;
}

async function processSave(payload: CloudPayload) {
  const save = await materializePrivateSave(payload.blobUrl);
  const modLogs: { type: string; data: Record<string, unknown> }[] = [];
  const mods = payload.mods ?? {};

  try {
    if (payload.snapshot === 'preseason' && mods.fang?.enabled) {
      if (!mods.fang.config) throw new Error("Fang's Recruiting Generator is enabled, but no settings JSON is selected.");
      const data = await invoke(runFang, { savePath: save.filePath, settings: mods.fang.config });
      modLogs.push({ type: 'fang', data: { ...(data.result as Record<string, unknown> ?? {}), log: data.log ?? [] } });
    }
    if (payload.snapshot === 'preseason' && mods.tw?.enabled) {
      const { enabled: _enabled, ...settings } = mods.tw;
      const data = await invoke(runTransferWave, { savePath: save.filePath, reimport: false, settings });
      modLogs.push({ type: 'tw', data: { ...(data.modResult as Record<string, unknown> ?? {}), log: data.log ?? [] } });
    }
    if (payload.snapshot === 'preseason' && mods.rebalance?.enabled) {
      const data = await invoke(runRebalance, { savePath: save.filePath });
      modLogs.push({ type: 'rebalance', data: (data.result as Record<string, unknown>) ?? {} });
    }
    if (payload.snapshot === 'preseason' && mods.pipeline?.enabled) {
      const data = await invoke(runPipeline, { savePath: save.filePath, settings: mods.pipeline });
      modLogs.push({ type: 'pipeline', data: (data.result as Record<string, unknown>) ?? {} });
    }
    if (payload.snapshot === 'signing_day' && mods.nsd?.enabled) {
      const data = await invoke(runNsd, { savePath: save.filePath, reimport: false, bypassWeekRequirement: false, placementSettings: mods.nsd });
      modLogs.push({ type: 'nsd', data: (data.modResult as Record<string, unknown>) ?? {} });
    }

    const importResult = await importSaveFile(save.filePath, payload.snapshot);
    const output = await put(`processed-saves/${Date.now()}-${path.basename(save.filePath)}`, await readFile(save.filePath), { access: 'private', addRandomSuffix: true, contentType: 'application/octet-stream' });
    await del(payload.blobUrl, { access: 'private' });
    return { importResult, modLogs, downloadPath: output.pathname, downloadName: path.basename(save.filePath) };
  } finally {
    await save.cleanup();
  }
}

export async function POST(request: Request) {
  const payload = await request.json() as CloudPayload;
  if (!payload.blobUrl || !payload.snapshot) return Response.json({ error: 'Missing uploaded dynasty save or snapshot.' }, { status: 400 });

  if (process.env.CLOUD_WORKER_MODE === 'true') {
    if (request.headers.get('authorization') !== `Bearer ${process.env.CLOUD_WORKER_SECRET}`) return Response.json({ error: 'Unauthorized worker request.' }, { status: 401 });
    try { return Response.json(await processSave(payload)); }
    catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Cloud processing failed.' }, { status: 500 }); }
  }

  const workerUrl = process.env.CLOUD_WORKER_URL;
  const secret = process.env.CLOUD_WORKER_SECRET;
  if (!workerUrl || !secret) return Response.json({ error: 'Cloud processing is not configured yet. Use the desktop app until the Railway worker is connected.' }, { status: 503 });
  const workerResponse = await fetch(new URL('/api/cloud/process', workerUrl), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` }, body: JSON.stringify(payload) });
  return new Response(await workerResponse.text(), { status: workerResponse.status, headers: { 'Content-Type': 'application/json' } });
}
