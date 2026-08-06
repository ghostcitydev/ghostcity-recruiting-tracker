import { NextResponse } from 'next/server';
import { rebalanceSaveFile } from '@/lib/rebalanceSave';

// POST /api/mods/rebalance
// Applies CFB Rebalance directly to the selected save file.
export async function POST(request: Request) {
  const { savePath } = await request.json().catch(() => ({}));
  if (typeof savePath !== 'string' || !savePath.trim()) {
    return NextResponse.json({ error: 'No save file path provided. Select a save file on the Import page.' }, { status: 400 });
  }

  try {
    const result = await rebalanceSaveFile(savePath);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `CFB Rebalance failed: ${message}` }, { status: 500 });
  }
}
