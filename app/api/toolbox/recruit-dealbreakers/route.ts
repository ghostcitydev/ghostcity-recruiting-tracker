import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Franchise from 'madden-franchise';
import fs from 'fs';

// Factor type enum values used in the Recruit table
// NeedType fields hold one of these string values
const FACTOR_LABELS: Record<string, string> = {
  PlayingTime:          'Playing Time',
  SchemeId:             'Playing Style',
  DistanceFromHome:     'Proximity to Home',
  AcademicReputation:   'Academic Reputation',
  CampusLifestyle:      'Campus Lifestyle',
  CoachStability:       'Coach Stability',
  ChampionshipPotential:'Championship Potential',
  ConferencePower:      'Conference Prestige',
  ProgramTradition:     'Program Tradition',
  StadiumAtmosphere:    'Stadium Atmosphere',
  NationalExposure:     'National Exposure',
};

// Grade values as stored in the franchise file (internal names)
const GRADE_VALUES = [
  { value: 'Aplus', label: 'A+' }, { value: 'A', label: 'A' }, { value: 'Aminus', label: 'A-' },
  { value: 'Bplus', label: 'B+' }, { value: 'B', label: 'B' }, { value: 'Bminus', label: 'B-' },
  { value: 'Cplus', label: 'C+' }, { value: 'C', label: 'C' }, { value: 'Cminus', label: 'C-' },
  { value: 'Dplus', label: 'D+' }, { value: 'D', label: 'D' }, { value: 'Dminus', label: 'D-' },
  { value: 'F', label: 'F' },
];

// GET: probe one recruit record to discover available fields
export async function GET() {
  const season = await prisma.season.findFirst({ orderBy: [{ year: 'desc' }, { snapshot: 'desc' }] });
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
    if (!recruitTable) return NextResponse.json({ error: 'Recruit table not found.' }, { status: 500 });

    // Read all fields to discover the schema
    await recruitTable.readRecords();
    const sample = (recruitTable.records as any[]).find((r: any) => !r.isEmpty);
    if (!sample) return NextResponse.json({ error: 'No recruit records found.' }, { status: 404 });

    const fields = Object.keys(sample).filter((k) => !k.startsWith('_') && k !== 'isEmpty');
    const needFields = fields.filter((f) =>
      f.toLowerCase().includes('need') || f.toLowerCase().includes('dealbreaker') ||
      f.toLowerCase().includes('threshold') || f.toLowerCase().includes('mingrade') ||
      f.toLowerCase().includes('factor') || f.toLowerCase().includes('importance') ||
      f.toLowerCase().includes('requirement')
    );

    // Sample values for first 3 recruits
    const samples = (recruitTable.records as any[])
      .filter((r: any) => !r.isEmpty)
      .slice(0, 3)
      .map((r: any) => {
        const obj: Record<string, any> = {};
        needFields.forEach((f) => { obj[f] = r[f]; });
        return obj;
      });

    return NextResponse.json({ allFields: fields, needFields, samples });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { factors, gradeValue } = body as { factors: string[]; gradeValue: string };

  if (!factors?.length || !gradeValue) {
    return NextResponse.json({ error: 'Missing factors or gradeValue' }, { status: 400 });
  }

  const season = await prisma.season.findFirst({ orderBy: [{ year: 'desc' }, { snapshot: 'desc' }] });
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
    if (!recruitTable) return NextResponse.json({ error: 'Recruit table not found.' }, { status: 500 });

    // Read all records to discover need fields dynamically
    await recruitTable.readRecords();
    const allRecords = (recruitTable.records as any[]).filter((r: any) => !r.isEmpty);
    if (!allRecords.length) return NextResponse.json({ error: 'No recruit records found.' }, { status: 404 });

    // Discover need-type and need-threshold field name patterns from first record
    const sampleKeys = Object.keys(allRecords[0]).filter((k) => !k.startsWith('_'));
    const needTypeFields = sampleKeys.filter((k) => /need.*type|factor.*type|recruit.*need/i.test(k));
    const needGradeFields = sampleKeys.filter((k) => /need.*grade|need.*min|need.*thresh|factor.*grade/i.test(k));

    let editCount = 0;
    let fieldWriteCount = 0;

    for (const rec of allRecords) {
      const stage = rec.RecruitStage as string;
      if (stage === 'Signed') continue;

      let changed = false;

      // Approach 1: named need-type fields (e.g. NeedType1, NeedType2, NeedType3)
      for (let i = 0; i < needTypeFields.length; i++) {
        const typeField = needTypeFields[i];
        const gradeField = needGradeFields[i];
        const currentType = rec[typeField] as string;
        if (currentType && factors.includes(currentType)) {
          if (gradeField && rec[gradeField] !== gradeValue) {
            rec[gradeField] = gradeValue;
            changed = true;
            fieldWriteCount++;
          }
        }
      }

      if (changed) editCount++;
    }

    if (editCount === 0) {
      return NextResponse.json({
        success: true, editCount: 0, fieldWriteCount: 0,
        warning: 'No matching factors found. Use the probe endpoint (GET) to inspect available field names.',
      });
    }

    await franchise.save(savePath);
    return NextResponse.json({ success: true, editCount, fieldWriteCount });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}
