import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Franchise from 'madden-franchise';
import fs from 'fs';

// Attributes considered "universal" — matter for every position
const UNIVERSAL_ATTRS = [
  'SpeedRating', 'AccelerationRating', 'AgilityRating', 'ChangeOfDirectionRating',
  'JumpingRating', 'StrengthRating', 'AwarenessRating', 'PlayRecognitionRating',
  'BCVisionRating',
];

// Reusable attribute groups for positions that share skill sets
const OL_ATTRS = [
  'RunBlockRating', 'RunBlockPowerRating', 'RunBlockFinesseRating',
  'PassBlockRating', 'PassBlockPowerRating', 'PassBlockFinesseRating',
  'LeadBlockRating', 'ImpactBlockingRating',
];
const DL_ATTRS = [
  'PowerMovesRating', 'FinesseMovesRating', 'BlockSheddingRating',
  'BreakSackRating', 'HitPowerRating', 'TackleRating', 'PursuitRating',
];
const LB_ATTRS = [
  'TackleRating', 'HitPowerRating', 'BlockSheddingRating', 'PursuitRating',
  'ZoneCoverageRating', 'ManCoverageRating', 'PressRating',
  'PowerMovesRating', 'FinesseMovesRating', 'BreakSackRating',
];
const DB_ATTRS = [
  'ManCoverageRating', 'ZoneCoverageRating', 'PressRating',
  'TackleRating', 'HitPowerRating', 'PursuitRating',
  'CatchingRating', 'CatchInTrafficRating',
];
const WR_TE_ATTRS = [
  'CatchingRating', 'CatchInTrafficRating', 'SpectacularCatchRating',
  'ShortRouteRunningRating', 'MediumRouteRunningRating', 'DeepRouteRunningRating',
  'ReleaseRating', 'CarryingRating',
];

const POSITION_ATTRS: Record<string, string[]> = {
  QB: [
    'ThrowAccuracyRating', 'ThrowAccuracyShortRating', 'ThrowAccuracyMidRating', 'ThrowAccuracyDeepRating',
    'ThrowPowerRating', 'ThrowOnTheRunRating', 'PlayActionRating', 'ThrowUnderPressureRating',
    'BreakSackRating', 'CarryingRating', 'BreakTackleRating',
  ],
  HB: ['CarryingRating', 'TruckingRating', 'BreakTackleRating', 'StiffArmRating', 'JukeMoveRating', 'SpinMoveRating', 'CatchingRating'],
  FB: ['CarryingRating', 'TruckingRating', 'ImpactBlockingRating', 'LeadBlockRating', 'RunBlockRating', 'PassBlockRating', 'CatchingRating'],
  WR: WR_TE_ATTRS,
  TE: [
    ...WR_TE_ATTRS,
    'RunBlockRating', 'RunBlockPowerRating', 'RunBlockFinesseRating',
    'PassBlockRating', 'PassBlockPowerRating', 'PassBlockFinesseRating',
    'LeadBlockRating', 'ImpactBlockingRating',
  ],
  LT: OL_ATTRS, LG: OL_ATTRS, C: OL_ATTRS, RG: OL_ATTRS, RT: OL_ATTRS,
  LE: DL_ATTRS, RE: DL_ATTRS, DT: DL_ATTRS, NT: DL_ATTRS,
  LOLB: LB_ATTRS, MLB: LB_ATTRS, ROLB: LB_ATTRS, OLB: LB_ATTRS,
  CB: DB_ATTRS, FS: DB_ATTRS, SS: DB_ATTRS, S: DB_ATTRS,
  K: ['KickAccuracyRating', 'KickPowerRating'],
  P: ['KickPowerRating', 'KickAccuracyRating'],
  LS: ['LongSnapRating'],
};

// Ratings we never touch (health/personality/wear/caps)
const SKIP_ALWAYS = new Set([
  'OverallRating',
  'InjuryRating', 'ToughnessRating', 'StaminaRating', 'ConfidenceRating',
]);

type Payload =
  | { mode: 'fixed'; value: number; floor: number }
  | { mode: 'tighten'; midpoint: number; maxDeviation: number; floor: number };

function clamp99(v: number): number {
  return Math.max(0, Math.min(99, Math.round(v)));
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Payload;

  const season = await prisma.season.findFirst({ orderBy: { year: 'desc' } });
  if (!season?.sourceFile) return NextResponse.json({ error: 'No save file path found.' }, { status: 400 });
  if (!fs.existsSync(season.sourceFile)) return NextResponse.json({ error: `Save file not found: ${season.sourceFile}` }, { status: 400 });
  const savePath = season.sourceFile;

  try {
    const franchise = await Franchise.create(savePath, { autoParse: true });
    const playerTable = franchise.tables.find((t: any) => t.name === 'Player');
    if (!playerTable) return NextResponse.json({ error: 'Player table not found' }, { status: 500 });

    await playerTable.readRecords();
    const allFields = playerTable.offsetTable.map((o: any) => o.name);
    const ratingFields: string[] = allFields.filter((f: string) =>
      f.endsWith('Rating') && !SKIP_ALWAYS.has(f) && !f.startsWith('WearAndTear_')
    );

    await playerTable.readRecords(['Position', 'TeamIndex', 'OverallRating', ...ratingFields]);

    const floor = clamp99(body.floor);
    let playersEdited = 0;
    let relevantWrites = 0;
    let floorWrites = 0;
    const unknownPositions = new Set<string>();

    for (const p of (playerTable.records as any[])) {
      if (p.isEmpty) continue;
      if ((p.TeamIndex as number) === 255) continue;

      const pos = p.Position as string;
      const positional = POSITION_ATTRS[pos];
      if (!positional) unknownPositions.add(pos);
      const relevant = new Set<string>([...UNIVERSAL_ATTRS, ...(positional ?? [])]);

      // For tighten mode, compute a per-player shift from the player's current OVR
      // so relative attribute strengths are preserved: elite players get pulled down
      // as a whole, weak players get boosted up as a whole.
      let playerShift = 0;
      if (body.mode === 'tighten') {
        const curOvr = p.OverallRating as number;
        if (typeof curOvr === 'number') {
          const mid = body.midpoint;
          const dev = Math.max(0, body.maxDeviation);
          const clampedOvr = Math.max(mid - dev, Math.min(mid + dev, curOvr));
          playerShift = clampedOvr - curOvr;
        }
      }

      let changed = false;
      for (const f of ratingFields) {
        const cur = p[f];
        if (typeof cur !== 'number') continue;

        let target: number;
        if (relevant.has(f)) {
          if (body.mode === 'fixed') {
            target = clamp99(body.value);
          } else {
            target = clamp99(cur + playerShift);
          }
          if (target !== cur) { p[f] = target; relevantWrites++; changed = true; }
        } else {
          target = floor;
          if (target !== cur) { p[f] = target; floorWrites++; changed = true; }
        }
      }

      // Proxy OverallRating = mean of relevant attributes. Game will refine via
      // archetype formula on next training/sim tick — this just gives sensible
      // starting values so Team OVR calc below isn't nonsense.
      const relevantVals: number[] = [];
      for (const f of relevant) {
        const v = p[f];
        if (typeof v === 'number') relevantVals.push(v);
      }
      if (relevantVals.length) {
        const proxy = clamp99(Math.round(relevantVals.reduce((a, b) => a + b, 0) / relevantVals.length));
        if (p.OverallRating !== proxy) { p.OverallRating = proxy; changed = true; }
      }

      if (changed) playersEdited++;
    }

    // Note: we don't write TEAM_RATING* fields. The game recomputes them once
    // between Encourage Transfers and Preseason using player OVRs + prestige
    // scaling. Direct writes get clobbered.

    await franchise.save(savePath);

    return NextResponse.json({
      success: true,
      playersEdited,
      relevantWrites,
      floorWrites,
      floorValue: floor,
      unknownPositions: Array.from(unknownPositions),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}
