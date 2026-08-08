import { NextResponse } from 'next/server';
import path from 'node:path';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { savePath, settings } = await request.json();
    if (!savePath || !settings) return NextResponse.json({ error: 'A save file and Fang settings JSON are required.' }, { status: 400 });
    const runnerPath = path.join(process.cwd(), 'lib', 'embeddedMods', 'fang', 'runner.js');
    // Keep Turbopack from attempting to statically transform Fang's CJS source.
    const getBuiltinModule = (process as NodeJS.Process & { getBuiltinModule: (name: string) => any }).getBuiltinModule;
    const createRequire = getBuiltinModule('node:module')?.createRequire;
    const pathToFileURL = getBuiltinModule('node:url')?.pathToFileURL;
    if (!createRequire || !pathToFileURL) throw new Error('Node runtime module loader is unavailable.');
    const runtimeRequire = createRequire(pathToFileURL(runnerPath).href);
    const runner = runtimeRequire(runnerPath) as { run(input: { savePath: string; settings: unknown; log(line: string): void }): Promise<Record<string, unknown>> };
    const log: string[] = [];
    const result = await runner.run({ savePath, settings, log: (line) => log.push(line) });
    return NextResponse.json({ result, log });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Fang Recruiting Generator failed.' }, { status: 500 });
  }
}
