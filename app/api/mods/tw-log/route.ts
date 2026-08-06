import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function GET() {
  const historyPath = path.join(
    os.homedir(),
    'AppData', 'Roaming', 'preseason-transfer-wave', 'history.json'
  );

  try {
    const raw = fs.readFileSync(historyPath, 'utf-8');
    const entries: unknown[] = JSON.parse(raw);
    // Return the most recent entry
    const latest = Array.isArray(entries) ? entries[entries.length - 1] : null;
    return NextResponse.json({ ok: true, entry: latest });
  } catch {
    return NextResponse.json({ ok: false, entry: null });
  }
}
