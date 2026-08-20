import { NextResponse } from 'next/server';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { copyFile, mkdir } from 'node:fs/promises';

export const runtime = 'nodejs';

type PocketScoutModule = {
  run: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

type ScanDynastyFile = (args: {
  inputPath: string;
  outputDirectory?: string;
  onProgress?: (progress: unknown) => void;
}) => Promise<Record<string, unknown>>;

function getPocketScoutRoot() {
  if (process.env.ELECTRON_RESOURCES_PATH) {
    return path.join(process.cwd(), 'embeddedMods', 'pocketScout');
  }
  return path.join(process.cwd(), 'lib', 'embeddedMods', 'pocketScout');
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function loadPocketScoutModules() {
  const root = getPocketScoutRoot();
  const dynamicImport = new Function('url', 'return import(url)');

  const [helperImport, rosterImport, sessionImport] = await Promise.all([
    dynamicImport(pathToFileURL(path.join(root, 'modules', 'recruitingHelper.js')).href),
    dynamicImport(pathToFileURL(path.join(root, 'modules', 'nsdRosterBalancer.js')).href),
    dynamicImport(pathToFileURL(path.join(root, 'dynastySessionManager.js')).href),
  ]);

  return {
    recruitingHelperModule: helperImport.recruitingHelperModule as PocketScoutModule,
    rosterBalancerModule: rosterImport.nsdRosterBalancerModule as PocketScoutModule,
    scanDynastyFile: sessionImport.scanDynastyFile as ScanDynastyFile,
  };
}

function collectProposalIds(analysis: Record<string, unknown>) {
  const teams = Array.isArray(analysis.teams) ? analysis.teams : [];
  const ids = new Set<string>();

  for (const team of teams) {
    if (!team || typeof team !== 'object') continue;
    const row = team as Record<string, unknown>;
    for (const key of ['proposals', 'fcsPoolCutProposals', 'signedRecruitReleaseProposals', 'rosterStoreDuplicateProposals']) {
      const proposals = Array.isArray(row[key]) ? row[key] : [];
      for (const proposal of proposals) {
        if (!proposal || typeof proposal !== 'object') continue;
        const id = String((proposal as Record<string, unknown>).proposalId ?? '').trim();
        if (id) ids.add(id);
      }
    }
  }

  return [...ids];
}

function compactUnsignedResult(result: Record<string, unknown>) {
  const keys = [
    'previewOnly', 'dynastyModified', 'currentOffseasonStage', 'currentWeek',
    'transferCandidates', 'zeroOfferTransfers', 'transfersAssigned',
    'playersMovedToRoster', 'transfersLeftUnassigned', 'previousSchoolCount',
    'smartPlacementCount', 'favoriteWalkOnCount', 'recruitingDealbreakersCleared',
    'baseNilPlayersReset', 'targetNilFieldsReset', 'rosterSyncWarnings',
  ];
  return {
    ...Object.fromEntries(keys.map((key) => [key, result[key]])),
    previewAssignments: Array.isArray(result.previewAssignments) ? result.previewAssignments.length : Number(result.previewAssignments ?? 0),
  };
}

function compactRosterResult(result: Record<string, unknown>) {
  return {
    summary: result.summary ?? {},
    previewUnsignedAssignmentsPending: result.previewUnsignedAssignmentsPending ?? 0,
    csvReportCreated: result.csvReportCreated === true,
    reportPath: result.reportPath ?? null,
    includeUserControlledTeams: result.includeUserControlledTeams === true,
    userControlledTeamsIncluded: result.userControlledTeamsIncluded ?? 0,
    diagnostics: result.diagnostics ?? {},
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? 'preview');
  const savePath = String(body.savePath ?? '').trim();
  const placementSettings = body.placementSettings && typeof body.placementSettings === 'object'
    ? body.placementSettings as Record<string, unknown>
    : {};
  const rosterSettings = body.rosterSettings && typeof body.rosterSettings === 'object'
    ? body.rosterSettings as Record<string, unknown>
    : {};
  const includeUserControlledTeams = body.includeUserControlledTeams !== false;

  if (!savePath) {
    return NextResponse.json({ error: 'Select a dynasty save before previewing the roster plan.' }, { status: 400 });
  }

  const outputDirectory = path.join(process.cwd(), 'backups', 'pocketscout-reports');
  await mkdir(outputDirectory, { recursive: true });

  let modules: Awaited<ReturnType<typeof loadPocketScoutModules>>;
  try {
    modules = await loadPocketScoutModules();
  } catch (error) {
    return NextResponse.json({ error: `Failed to load PocketScout roster-plan modules: ${errorMessage(error)}` }, { status: 500 });
  }

  if (action === 'preview') {
    try {
      const session = await modules.scanDynastyFile({ inputPath: savePath, outputDirectory });
      const unsignedPreview = await modules.recruitingHelperModule.run({
        inputPath: savePath,
        outputPath: savePath,
        session,
        options: {
          mode: 'previewAssignUnsignedPlayers',
          bypassWeekRequirement: false,
          placementSettings: {
            ...placementSettings,
            includeUserControlledTeams,
          },
        },
      });

      const analysis = await modules.rosterBalancerModule.run({
        inputPath: savePath,
        session,
        options: {
          mode: 'analyzeRosterBalance',
          outputDirectory,
          createCsvReport: rosterSettings.createCsvReport === true,
          includeUserControlledTeams,
          positionTargets: rosterSettings.positionTargets ?? null,
          fcsPoolSettings: rosterSettings.fcsPoolSettings ?? null,
          talentRescueSettings: rosterSettings.talentRescueSettings ?? null,
          unsignedAssignmentPreview: unsignedPreview,
        },
      });

      return NextResponse.json({
        ok: true,
        preview: {
          unsigned: compactUnsignedResult(unsignedPreview),
          roster: compactRosterResult(analysis),
          proposalIds: collectProposalIds(analysis),
        },
      });
    } catch (error) {
      return NextResponse.json({ error: `PocketScout roster-plan preview failed: ${errorMessage(error)}` }, { status: 500 });
    }
  }

  if (action !== 'apply') {
    return NextResponse.json({ error: `Unknown roster-plan action: ${action}` }, { status: 400 });
  }

  const proposalIds = Array.isArray(body.proposalIds)
    ? [...new Set(body.proposalIds.map((value: unknown) => String(value ?? '').trim()).filter(Boolean))]
    : [];

  const backupDirectory = path.join(process.cwd(), 'backups', 'pocketscout-backups');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const preRunBackupPath = path.join(
    backupDirectory,
    `${path.basename(savePath)}.gc-rlt-pre-pocket-scout-roster-plan.${timestamp}.bak`,
  );

  try {
    await mkdir(backupDirectory, { recursive: true });
    await copyFile(savePath, preRunBackupPath);
  } catch (error) {
    return NextResponse.json({ error: `Could not create the required pre-PocketScout backup: ${errorMessage(error)}` }, { status: 500 });
  }

  try {
    const initialSession = await modules.scanDynastyFile({ inputPath: savePath, outputDirectory });
    const unsignedResult = await modules.recruitingHelperModule.run({
      inputPath: savePath,
      outputPath: savePath,
      session: initialSession,
      options: {
        mode: 'assignZeroOfferTransfers',
        assignmentMode: 'smart',
        suppressPlacementReport: true,
        bypassWeekRequirement: false,
        placementSettings: {
          ...placementSettings,
          includeUserControlledTeams,
        },
      },
    });

    let rosterResult: Record<string, unknown> | null = null;
    if (proposalIds.length > 0) {
      const updatedSession = await modules.scanDynastyFile({ inputPath: savePath, outputDirectory });
      rosterResult = await modules.rosterBalancerModule.run({
        inputPath: savePath,
        session: updatedSession,
        options: {
          mode: 'applySelectedRosterChanges',
          outputPath: savePath,
          outputDirectory,
          selectedProposalIds: proposalIds,
          applyScope: 'ALL_TEAMS',
          includeUserControlledTeams,
          positionTargets: rosterSettings.positionTargets ?? null,
          fcsPoolSettings: rosterSettings.fcsPoolSettings ?? null,
          talentRescueSettings: rosterSettings.talentRescueSettings ?? null,
          clearRecruitingDealbreakers: placementSettings?.clearRecruitingDealbreakers === true,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      result: {
        preRunBackupPath,
        unsigned: compactUnsignedResult(unsignedResult),
        roster: rosterResult ? compactRosterResult(rosterResult) : null,
        // Prefer the roster balancer's own post-apply count (accounts for
        // ALL_TEAMS scope re-analyzing fresh at apply time, which can
        // differ from what was originally selected in preview) and only
        // fall back to the request's proposal count when apply didn't run.
        appliedProposalCount: typeof rosterResult?.selectedProposalCount === 'number'
          ? rosterResult.selectedProposalCount
          : proposalIds.length,
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: `PocketScout roster-plan apply failed: ${errorMessage(error)}`,
      preRunBackupPath,
    }, { status: 500 });
  }
}
