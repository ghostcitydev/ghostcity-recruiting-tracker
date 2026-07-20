import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Franchise from 'madden-franchise';
import { parseRef, tableByName } from '@/lib/franchiseRefs';
import fs from 'fs';

// Static per-school grades (sim does not recompute)
const STATIC_FIELDS = [
  'AcademicPrestigeGrade',
  'CampusLifestyleGrade',
];

// Derived per-school grades (sim recomputes from historical/current inputs)
const DERIVED_FIELDS = [
  'AthleticFacilitiesGrade',
  'BrandExposureGrade',
  'ChampionshipContenderGrade',
  'CoachPrestigeGrade',
  'CoachStabilityGrade',
  'ConferencePrestigeGrade',
  'ProgramTraditionGrade',
  'StadiumAtmosphereGrade',
];

const ALL_FIELDS = [...STATIC_FIELDS, ...DERIVED_FIELDS];

const GRADE_ORDER = [
  'F', 'Dminus', 'D', 'Dplus', 'Cminus', 'C', 'Cplus',
  'Bminus', 'B', 'Bplus', 'Aminus', 'A', 'Aplus',
];
const GRADE_TO_TIER = new Map(GRADE_ORDER.map((g, i) => [g, i]));

async function loadFranchise() {
  const season = await prisma.season.findFirst({ orderBy: { year: 'desc' } });
  if (!season?.sourceFile) throw new Error('No save file path found. Import a save first.');
  if (!fs.existsSync(season.sourceFile)) throw new Error(`Save file not found: ${season.sourceFile}`);
  const franchise = await Franchise.create(season.sourceFile, { autoParse: true });
  return { franchise, savePath: season.sourceFile };
}

async function collectTeams(franchise: any) {
  const teamTable = tableByName(franchise, 'Team');
  await teamTable.readRecords();
  await teamTable.readRecords(['DisplayName', 'PrestigeRank', 'MySchoolTrackingTable']);

  const targets: { name: string; rank: number; tableId: number; row: number }[] = [];
  for (const r of teamTable.records) {
    if (r.isEmpty) continue;
    if ((r.PrestigeRank as number) === 255) continue;
    if (!r.DisplayName) continue;
    const ref = parseRef(r.MySchoolTrackingTable);
    if (!ref) continue;
    targets.push({ name: r.DisplayName as string, rank: r.PrestigeRank as number, tableId: ref.tableId, row: ref.row });
  }

  const rowsByTable = new Map<number, number[]>();
  for (const t of targets) {
    const list = rowsByTable.get(t.tableId) ?? [];
    list.push(t.row);
    rowsByTable.set(t.tableId, list);
  }
  const tableById = new Map<number, any>();
  for (const [tableId] of rowsByTable) {
    const target = franchise.tables.find((t: any) => t.header?.tableId === tableId);
    if (!target) continue;
    await target.readRecords();
    await target.readRecords(ALL_FIELDS);
    tableById.set(tableId, target);
  }
  return { targets, tableById };
}

// GET: for each team, current avg grade separately for static + derived groups
export async function GET() {
  try {
    const { franchise } = await loadFranchise();
    const { targets, tableById } = await collectTeams(franchise);
    const avgOf = (rec: any, fields: string[]) => {
      let sum = 0, count = 0;
      for (const f of fields) {
        const tier = GRADE_TO_TIER.get(rec[f] as string);
        if (tier != null) { sum += tier; count++; }
      }
      return count ? GRADE_ORDER[Math.round(sum / count)] : null;
    };
    const rows = targets.map(t => {
      const rec = tableById.get(t.tableId)?.records[t.row];
      return {
        name: t.name, rank: t.rank,
        avgStatic: rec && !rec.isEmpty ? avgOf(rec, STATIC_FIELDS) : null,
        avgDerived: rec && !rec.isEmpty ? avgOf(rec, DERIVED_FIELDS) : null,
        avgGrade: rec && !rec.isEmpty ? avgOf(rec, ALL_FIELDS) : null,
      };
    }).sort((a, b) => a.rank - b.rank);
    return NextResponse.json({ teams: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}

type StaticOp =
  | null
  | { op: 'fixed'; grade: string }
  | { op: 'tighten'; midGrade: string; maxTierDeviation: number }
  | { op: 'custom'; values: Record<string, string> };

type DerivedOp =
  | null
  | { op: 'fixed'; grade: string }
  | { op: 'tighten'; midGrade: string; maxTierDeviation: number };

type Payload = { static: StaticOp; derived: DerivedOp };

function clampTier(t: number): number {
  return Math.max(0, Math.min(GRADE_ORDER.length - 1, Math.round(t)));
}

function targetForField(
  current: string,
  op: StaticOp | DerivedOp,
  teamName: string,
): string | null {
  if (!op) return null;
  if (op.op === 'fixed') {
    return GRADE_TO_TIER.has(op.grade) ? op.grade : null;
  }
  if (op.op === 'tighten') {
    const midTier = GRADE_TO_TIER.get(op.midGrade);
    const curTier = GRADE_TO_TIER.get(current);
    if (midTier == null || curTier == null) return null;
    const dev = Math.max(0, Math.floor(op.maxTierDeviation));
    const delta = curTier - midTier;
    const clamped = Math.max(-dev, Math.min(dev, delta));
    return GRADE_ORDER[clampTier(midTier + clamped)];
  }
  if (op.op === 'custom') {
    const provided = op.values[teamName];
    return provided && GRADE_TO_TIER.has(provided) ? provided : null;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Payload;
  const { franchise, savePath } = await loadFranchise();

  try {
    const { targets, tableById } = await collectTeams(franchise);
    let teamsUpdated = 0, fieldsUpdated = 0;

    for (const t of targets) {
      const rec = tableById.get(t.tableId)?.records[t.row];
      if (!rec || rec.isEmpty) continue;

      let changed = false;
      const write = (fields: string[], op: StaticOp | DerivedOp) => {
        for (const f of fields) {
          const current = rec[f] as string;
          const target = targetForField(current, op, t.name);
          if (target != null && target !== current) {
            rec[f] = target;
            fieldsUpdated++;
            changed = true;
          }
        }
      };
      write(STATIC_FIELDS, body.static);
      write(DERIVED_FIELDS, body.derived);
      if (changed) teamsUpdated++;
    }

    await franchise.save(savePath);
    return NextResponse.json({ success: true, teamsUpdated, fieldsUpdated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}
