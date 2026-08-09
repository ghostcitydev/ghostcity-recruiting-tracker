import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import vm from 'vm';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import os from 'os';
import { prisma } from '@/lib/prisma';
import { importSaveFile } from '@/lib/importSave';

function getRedistributionPath() {
  if (process.env.ELECTRON_RESOURCES_PATH) {
    return path.join(process.env.ELECTRON_RESOURCES_PATH, 'mods', 'redistribution.js');
  }
  return path.join(process.cwd(), 'public', 'other mods', 'redistribution.js');
}

function writeHistoryEntry(entry: Record<string, unknown>) {
  try {
    const historyPath = path.join(os.homedir(), 'AppData', 'Roaming', 'preseason-transfer-wave', 'history.json');
    let existing: unknown[] = [];
    try { existing = JSON.parse(fs.readFileSync(historyPath, 'utf-8')); } catch { /* first run */ }
    existing.push(entry);
    fs.mkdirSync(path.dirname(historyPath), { recursive: true });
    fs.writeFileSync(historyPath, JSON.stringify(existing, null, 2));
  } catch { /* non-fatal */ }
}

export async function POST(request: Request) {
  const { settings = {}, reimport = true, savePath: bodyPath } = await request.json().catch(() => ({}));

  // Prefer the path passed in the request body (the file selected on the Import page).
  // Fall back to the most-recently imported preseason sourceFile if not supplied.
  let savePath: string | null = bodyPath ?? null;
  if (!savePath) {
    const season = await prisma.season.findFirst({
      where: { snapshot: 'preseason' },
      orderBy: { year: 'desc' },
    });
    savePath = season?.sourceFile ?? null;
  }
  if (!savePath) {
    return NextResponse.json(
      { error: 'No save file path provided. Select a save file on the Import page.' },
      { status: 400 }
    );
  }
  const logLines: string[] = [];

  let redistribution: {
    run: (opts: {
      savePath: string;
      dryRun: boolean;
      log: (line: string) => void;
      settings: Record<string, unknown>;
    }) => Promise<Record<string, unknown>>;
  };

  try {
    // Load via vm + readFileSync to avoid Turbopack static import analysis
    const modPath = getRedistributionPath();
    // The bundled module is CommonJS but uses dynamic import solely for this
    // package. Replace that expression with its CommonJS equivalent before
    // evaluation: Electron's Node runtime does not enable VM modules.
    const code = fs.readFileSync(modPath, 'utf-8')
      .replaceAll("await import('madden-franchise')", "await Promise.resolve(require('madden-franchise'))");
    const mod = { exports: {} as Record<string, unknown> };
    const modRequire = createRequire(pathToFileURL(modPath).href);
    // The portable build keeps Transfer Wave in resources/mods while shared
    // dependencies live under resources/standalone/node_modules. Resolve the
    // franchise parser from the running app, not from the copied mod folder.
    const appRequire = createRequire(pathToFileURL(path.join(process.cwd(), 'package.json')).href);
    const req = (specifier: string) => specifier === 'madden-franchise'
      ? appRequire(specifier)
      : modRequire(specifier);
    vm.Script.prototype; // ensure vm is retained by bundler
    new vm.Script(`(function(require,module,exports){${code}})`).runInThisContext()(req, mod, mod.exports);
    redistribution = mod.exports as typeof redistribution;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to load Transfer Wave module: ${message}` }, { status: 500 });
  }

  let modResult: Record<string, unknown>;
  try {
    modResult = await redistribution.run({
      savePath,
      dryRun: false,
      settings,
      log: (line: string) => logLines.push(line),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Transfer Wave failed: ${message}`, log: logLines }, { status: 500 });
  }

  // Write to history.json so the existing log reader works too
  writeHistoryEntry({
    id: `${Date.now()}-gc`,
    date: new Date().toISOString(),
    savePath,
    log: logLines,
    ...modResult,
  });

  if (reimport) {
    try {
      await importSaveFile(savePath, 'preseason');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ modResult, log: logLines, reimportError: `Mod ran but reimport failed: ${message}` });
    }
  }

  return NextResponse.json({ ok: true, modResult, log: logLines });
}
