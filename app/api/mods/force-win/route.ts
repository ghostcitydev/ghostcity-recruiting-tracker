import { NextResponse } from 'next/server';
import path from 'path';

function forceWinRoot() {
  return process.env.ELECTRON_RESOURCES_PATH
    ? path.join(process.cwd(), 'embeddedMods', 'forceWin')
    : path.join(process.cwd(), 'lib', 'embeddedMods', 'forceWin');
}

export async function GET(request: Request) {
  const savePath = new URL(request.url).searchParams.get('savePath');
  if (!savePath) return NextResponse.json({ error: 'Select a preseason save file first.' }, { status: 400 });
  try {
    const runnerPath = path.join(forceWinRoot(), 'runner.js');
    const getBuiltinModule = (process as NodeJS.Process & { getBuiltinModule: (name: string) => any }).getBuiltinModule;
    const modApi = getBuiltinModule('node:module');
    const urlApi = getBuiltinModule('node:url');
    const req = modApi.createRequire(urlApi.pathToFileURL(runnerPath).href);
    const { prepareForceWin } = req(runnerPath) as { prepareForceWin: (file: string) => Promise<unknown> };
    return NextResponse.json({ ok: true, result: await prepareForceWin(savePath) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { savePath, settings = {} } = await request.json().catch(() => ({}));
  if (!savePath || typeof savePath !== 'string') return NextResponse.json({ error: 'Select a preseason save file first.' }, { status: 400 });
  try {
    const runnerPath = path.join(forceWinRoot(), 'runner.js');
    const getBuiltinModule = (process as NodeJS.Process & { getBuiltinModule: (name: string) => any }).getBuiltinModule;
    const modApi = getBuiltinModule('node:module');
    const urlApi = getBuiltinModule('node:url');
    const req = modApi.createRequire(urlApi.pathToFileURL(runnerPath).href);
    const { runForceWin } = req(runnerPath) as { runForceWin: (file: string, opts: Record<string, unknown>) => Promise<unknown> };
    return NextResponse.json({ ok: true, result: await runForceWin(savePath, settings) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
