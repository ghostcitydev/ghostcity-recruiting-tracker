import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Franchise from 'madden-franchise';
import { parseRef } from '@/lib/franchiseRefs';
import fs from 'fs';

export async function POST() {
  const season = await prisma.season.findFirst({ orderBy: { year: 'desc' } });
  if (!season?.sourceFile) {
    return NextResponse.json({ error: 'No save file path found. Import a save first.' }, { status: 400 });
  }
  const savePath = season.sourceFile;
  if (!fs.existsSync(savePath)) {
    return NextResponse.json({ error: `Save file not found: ${savePath}` }, { status: 400 });
  }

  try {
    const franchise = await Franchise.create(savePath, { autoParse: true });
    const recruitTable = franchise.tables.find((t: any) => t.name === 'Recruit');
    const playerTable = franchise.tables.find((t: any) => t.name === 'Player');
    if (!recruitTable || !playerTable) {
      return NextResponse.json({ error: 'Could not find Recruit or Player table in save file.' }, { status: 500 });
    }

    await recruitTable.readRecords(['Player', 'RecruitStage']);
    await playerTable.readRecords(['BaseNILValue']);

    let resetCount = 0;
    let skippedCount = 0;
    for (const r of recruitTable.records) {
      if (r.isEmpty) continue;
      const stage = r.RecruitStage as string;
      if (stage === 'Signed') { skippedCount++; continue; }
      const ref = parseRef(r.Player);
      if (!ref) continue;
      const p = (playerTable.records as any[])[ref.row];
      if (!p || p.isEmpty) continue;
      if ((p.BaseNILValue ?? 0) !== 0) {
        p.BaseNILValue = 0;
        resetCount++;
      }
    }

    await franchise.save(savePath);
    return NextResponse.json({ success: true, resetCount, skippedCount });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}
