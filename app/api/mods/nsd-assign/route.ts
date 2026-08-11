import { NextResponse } from 'next/server';
import path from 'path';
import { pathToFileURL } from 'url';
import { copyFile, mkdir } from 'node:fs/promises';
import { prisma } from '@/lib/prisma';
import { importSaveFile } from '@/lib/importSave';

function getEmbeddedPocketScoutRoot() {
  if (process.env.ELECTRON_RESOURCES_PATH) {
    return path.join(process.cwd(), 'embeddedMods', 'pocketScout');
  }
  return path.join(process.cwd(), 'lib', 'embeddedMods', 'pocketScout');
}

export async function POST(request: Request) {
  const { bypassWeekRequirement = false, reimport = true, placementSettings = {}, savePath: bodyPath } = await request.json().catch(() => ({}));

  // Prefer the path passed in the request body (the file selected on the Import page).
  // Fall back to the most-recently imported signing_day sourceFile if not supplied.
  let saveFilePath: string | null = bodyPath ?? null;
  if (!saveFilePath) {
    const season = await prisma.season.findFirst({
      where: { snapshot: 'signing_day' },
      orderBy: { year: 'desc' },
    });
    saveFilePath = season?.sourceFile ?? null;
  }
  if (!saveFilePath) {
    return NextResponse.json({ error: 'No save file path provided. Select a save file on the Import page.' }, { status: 400 });
  }

  // Ghost City's full restore point: created before any PocketScout code runs.
  const backupDir = path.join(process.cwd(), 'backups', 'pocketscout-backups');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const preRunBackupPath = path.join(backupDir, `${path.basename(saveFilePath)}.gc-rlt-pre-pocket-scout.${timestamp}.bak`);
  try {
    await mkdir(backupDir, { recursive: true });
    await copyFile(saveFilePath, preRunBackupPath);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Could not create the required pre-PocketScout backup: ${message}` }, { status: 500 });
  }

  // Use new Function to bypass Turbopack's static import analysis for ESM modules
  const dynamicImport = new Function('url', 'return import(url)');

  const pocketScoutRoot = getEmbeddedPocketScoutRoot();
  const helperPath = path.join(pocketScoutRoot, 'modules', 'recruitingHelper.js');
  const sessionManagerPath = path.join(pocketScoutRoot, 'dynastySessionManager.js');

  // Load PocketScout modules
  let recruitingHelperModule: { run: (args: Record<string, unknown>) => Promise<unknown> };
  let scanDynastyFile: (args: { inputPath: string; onProgress?: (p: unknown) => void }) => Promise<Record<string, unknown>>;

  try {
    const [helperImport, sessionImport] = await Promise.all([
      dynamicImport(pathToFileURL(helperPath).href),
      dynamicImport(pathToFileURL(sessionManagerPath).href),
    ]);
    recruitingHelperModule = helperImport.recruitingHelperModule;
    scanDynastyFile = sessionImport.scanDynastyFile;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to load PocketScout module: ${message}` }, { status: 500 });
  }

  // Build the dynasty session (resolves Team, Recruit, Conference tables etc.)
  let session: Record<string, unknown>;
  try {
    session = await scanDynastyFile({ inputPath: saveFilePath });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to scan dynasty file: ${message}` }, { status: 500 });
  }

  // Run NSD assign, passing the resolved session
  let modResult: Record<string, unknown>;
  try {
    modResult = await recruitingHelperModule.run({
      inputPath: saveFilePath,
      outputPath: saveFilePath,
      session,
      options: {
        mode: 'assignZeroOfferTransfers',
        bypassWeekRequirement,
        assignmentMode: 'smart',
        placementSettings,
      },
    }) as Record<string, unknown>;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `PocketScout NSD mod failed: ${message}` }, { status: 500 });
  }

  // Reimport the now-modified save file
  if (reimport) {
    try {
      await importSaveFile(saveFilePath, 'signing_day');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({
        modResult: { ...modResult, preRunBackupPath },
        reimportError: `Mod ran but reimport failed: ${message}`,
      });
    }
  }

  // Log shape so we can debug zero-count issues in dev console
  if (process.env.NODE_ENV !== 'production') {
    const r = modResult;
    console.log('[nsd-assign] result keys:', Object.keys(r ?? {}));
    console.log('[nsd-assign] transfersAssigned:', r?.transfersAssigned, '| zeroOfferTransfers:', r?.zeroOfferTransfers);
  }

  return NextResponse.json({ ok: true, modResult: { ...modResult, preRunBackupPath } });
}
