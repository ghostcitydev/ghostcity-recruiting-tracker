import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Franchise from 'madden-franchise';
import { tableByName } from '@/lib/franchiseRefs';
import fs from 'fs';

async function loadFranchise() {
  const season = await prisma.season.findFirst({ orderBy: { year: 'desc' } });
  if (!season?.sourceFile) throw new Error('No save file path found. Import a save first.');
  if (!fs.existsSync(season.sourceFile)) throw new Error(`Save file not found: ${season.sourceFile}`);
  const franchise = await Franchise.create(season.sourceFile, { autoParse: true });
  return { franchise, savePath: season.sourceFile };
}

// GET: return the current prestige values for every FBS team
export async function GET() {
  try {
    const { franchise } = await loadFranchise();
    const teamTable = tableByName(franchise, 'Team');
    await teamTable.readRecords();
    await teamTable.readRecords(['DisplayName', 'TeamPrestige', 'PrestigeRank']);

    const rows: { name: string; prestige: number; rank: number }[] = [];
    for (const r of (teamTable.records as any[])) {
      if (r.isEmpty) continue;
      // Skip FCS placeholders (rank 255)
      if ((r.PrestigeRank as number) === 255) continue;
      if (!r.DisplayName) continue;
      rows.push({ name: r.DisplayName as string, prestige: r.TeamPrestige as number, rank: r.PrestigeRank as number });
    }
    rows.sort((a, b) => a.rank - b.rank);
    return NextResponse.json({ teams: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}

type Payload =
  | { mode: 'fixed'; value: number }
  | { mode: 'tighten'; midpoint: number; maxDeviation: number }
  | { mode: 'custom'; values: Record<string, number> };

function clampPrestige(v: number): number {
  return Math.max(0, Math.min(10, Math.round(v)));
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Payload;

  const { franchise, savePath } = await loadFranchise();

  try {
    const teamTable = tableByName(franchise, 'Team');
    await teamTable.readRecords();
    await teamTable.readRecords(['DisplayName', 'TeamPrestige', 'PrestigeRank']);

    // Collect editable FBS teams (rank != 255)
    const targets: { rec: any; name: string; oldPrestige: number }[] = [];
    for (const r of (teamTable.records as any[])) {
      if (r.isEmpty) continue;
      if ((r.PrestigeRank as number) === 255) continue;
      if (!r.DisplayName) continue;
      targets.push({ rec: r, name: r.DisplayName as string, oldPrestige: r.TeamPrestige as number });
    }

    let changedCount = 0;
    for (const t of targets) {
      let newVal: number;
      if (body.mode === 'fixed') {
        newVal = clampPrestige(body.value);
      } else if (body.mode === 'tighten') {
        const mid = body.midpoint;
        const dev = Math.max(0, body.maxDeviation);
        const delta = t.oldPrestige - mid;
        const clampedDelta = Math.max(-dev, Math.min(dev, delta));
        newVal = clampPrestige(mid + clampedDelta);
      } else if (body.mode === 'custom') {
        const provided = body.values[t.name];
        newVal = provided != null ? clampPrestige(provided) : t.oldPrestige;
      } else {
        newVal = t.oldPrestige;
      }
      if (newVal !== t.oldPrestige) {
        t.rec.TeamPrestige = newVal;
        changedCount++;
      }
    }

    // Recompute PrestigeRank across all edited FBS teams (1..N by prestige desc, tiebreak by name asc)
    const sorted = [...targets].sort((a, b) => {
      const pb = (b.rec.TeamPrestige as number) - (a.rec.TeamPrestige as number);
      if (pb !== 0) return pb;
      return a.name.localeCompare(b.name);
    });
    sorted.forEach((t, i) => {
      const newRank = i + 1;
      if (t.rec.PrestigeRank !== newRank) t.rec.PrestigeRank = newRank;
    });

    await franchise.save(savePath);

    return NextResponse.json({
      success: true,
      changedCount,
      totalTeams: targets.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}
