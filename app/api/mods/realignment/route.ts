import { NextResponse } from 'next/server';
import path from 'path';

function realignmentRoot() {
  return process.env.ELECTRON_RESOURCES_PATH
    ? path.join(process.cwd(), 'embeddedMods', 'realignment')
    : path.join(process.cwd(), 'lib', 'embeddedMods', 'realignment');
}

export async function POST(request: Request) {
  const { savePath, settings = {} } = await request.json().catch(() => ({}));
  if (!savePath || typeof savePath !== 'string') {
    return NextResponse.json({ error: 'Select a Signing Day save file first.' }, { status: 400 });
  }

  try {
    const runnerPath = path.join(realignmentRoot(), 'runner.js');
    const getBuiltinModule = (process as NodeJS.Process & { getBuiltinModule: (name: string) => any }).getBuiltinModule;
    const modApi = getBuiltinModule('node:module');
    const urlApi = getBuiltinModule('node:url');
    const req = modApi.createRequire(urlApi.pathToFileURL(runnerPath).href);
    const { runRealignmentTool } = req(runnerPath) as {
      runRealignmentTool: (file: string, opts: Record<string, unknown>) => Promise<unknown>;
    };
    return NextResponse.json({ ok: true, result: await runRealignmentTool(savePath, settings) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
