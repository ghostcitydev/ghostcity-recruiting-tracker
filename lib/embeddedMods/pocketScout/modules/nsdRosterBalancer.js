/* PocketScout release 0.9.10 Talent Rescue default 62 v1 */
/* PocketScout NSD final unsigned-player disposition report v11 */
/* PocketScout NSD configurable Final Talent Rescue targets v10.1 */
/* PocketScout Final Talent Rescue max outgoing OVR 65 v9 */
/* PocketScout National Signing Day final talent rescue v8 */
/* PocketScout NSD mirror fallback projected-depth protection fix v7 */
/* PocketScout NSD mirrored-position final fallback v6 */
/* PocketScout NSD unsigned preview previous school metadata v5 */
/* PocketScout NSD consolidated Assign Unsigned preview projection v1 */
/* PocketScout NSD Roster Balancer hard surplus and soft surplus OVR choice v2 */
/* PocketScout NSD Roster Balancer unsigned recruit fill before FCS v1 */
/* PocketScout NSD Roster Balancer unsigned recruit vs transfer labeling v2 */
/* PocketScout NSD Roster Balancer maximum position change OVR drop v3 */
/* PocketScout NSD Roster Balancer fresh all-team proposal selection v1 */
/* PocketScout NSD Roster Balancer expose user-team flag v3 */
/* PocketScout NSD Roster Balancer user-controlled team inclusion toggle v1 */
/* PocketScout NSD Roster Balancer minimum height targets v1 */
/* PocketScout NSD one-run duplicate warning descriptions v1 */
/* PocketScout NSD Roster Balancer National Signing Day apply guard v1 */
/* PocketScout NSD Roster Balancer RosterStore duplicate proposals v1 */
/* PocketScout NSD Roster Balancer global committed-player release repair v2 */
/* PocketScout NSD Roster Balancer ZERO_REFERENCE repair v1 */
/* PocketScout NSD Roster Balancer signed recruit release proposals v1 */
/* PocketScout NSD Roster Balancer new default roster targets v8 */
/* PocketScout NSD Roster Balancer slow weight gain above 75 percent v1 */
/* PocketScout NSD Roster Balancer final exported description v1 */
/* PocketScout NSD Roster Balancer team and all-teams apply scope v1 */
/* PocketScout NSD Roster Balancer destination jersey number rules v1 */
/* PocketScout NSD Roster Balancer Phase 7 apply selected changes with roster sync v1 */
/* PocketScout NSD Roster Balancer Cut If Above version 7 migration v1 */
/* PocketScout NSD Roster Balancer revised Cut If Above defaults v1 */
/* PocketScout NSD Roster Balancer editable FCS cut OVR protection v1 */
/* PocketScout NSD Roster Balancer Cut If Above and FCS pool cut proposals v1 */
/* PocketScout NSD Roster Balancer senior weight development parity v1 */
/* PocketScout NSD Roster Balancer CSV option compact UI and class weight development v1 */
/* PocketScout NSD Roster Balancer editable FCS OVR range and surplus mix v1 */
/* PocketScout NSD Roster Balancer Pass 2 FCS pool trade proposals v1 */
/* PocketScout NSD Roster Balancer 60 OVR defaults v1 */
/* PocketScout NSD Roster Balancer protected depth targets and 62 OVR defaults v1 */
/* PocketScout NSD Roster Balancer conversion weight loss and minimum OVR v1 */
/* PocketScout NSD Roster Balancer displayed weight offset correction v1 */
/* PocketScout NSD Roster Balancer Phase 4 weight eligibility and development preview v1 */
/* PocketScout NSD Roster Balancer Phase 3 shortage-first proposals v1 */
/* PocketScout NSD Roster Balancer Phase 2 targets and Athlete projections v1 */
/* PocketScout NSD Roster Balancer Phase 1 installation v1 */
/* PocketScout NSD Roster Balancer Phase 1 self-contained analyzer v1 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Franchise from 'madden-franchise';

const POSITION_ORDER = [
  'QB', 'HB', 'FB', 'WR', 'TE',
  'LT', 'LG', 'C', 'RG', 'RT',
  'LE', 'RE', 'DT',
  'LOLB', 'MLB', 'ROLB',
  'CB', 'FS', 'SS', 'K', 'P'
];

const LEGACY_CUT_IF_ABOVE_DEFAULTS_V6 = {
  QB: 5,
  HB: 7,
  FB: 3,
  WR: 10,
  TE: 6,
  LT: 5,
  LG: 5,
  C: 5,
  RG: 5,
  RT: 5,
  LE: 6,
  RE: 6,
  DT: 8,
  LOLB: 6,
  MLB: 6,
  ROLB: 6,
  CB: 10,
  FS: 5,
  SS: 5,
  K: 2,
  P: 2
};

const LEGACY_POSITION_DEFAULTS_V7 = {
  QB: { protectedDepthPlayers: 2, cutIfAbove: 6 },
  HB: { protectedDepthPlayers: 2, cutIfAbove: 7 },
  FB: { protectedDepthPlayers: 1, cutIfAbove: 3 },
  WR: { protectedDepthPlayers: 3, cutIfAbove: 12 },
  TE: { protectedDepthPlayers: 2, cutIfAbove: 7 },
  LT: { protectedDepthPlayers: 2, cutIfAbove: 6 },
  LG: { protectedDepthPlayers: 2, cutIfAbove: 6 },
  C: { protectedDepthPlayers: 2, cutIfAbove: 6 },
  RG: { protectedDepthPlayers: 2, cutIfAbove: 6 },
  RT: { protectedDepthPlayers: 2, cutIfAbove: 6 },
  LE: { protectedDepthPlayers: 2, cutIfAbove: 7 },
  RE: { protectedDepthPlayers: 2, cutIfAbove: 7 },
  DT: { protectedDepthPlayers: 3, cutIfAbove: 8 },
  LOLB: { protectedDepthPlayers: 2, cutIfAbove: 7 },
  MLB: { protectedDepthPlayers: 2, cutIfAbove: 7 },
  ROLB: { protectedDepthPlayers: 2, cutIfAbove: 7 },
  CB: { protectedDepthPlayers: 3, cutIfAbove: 11 },
  FS: { protectedDepthPlayers: 2, cutIfAbove: 5 },
  SS: { protectedDepthPlayers: 2, cutIfAbove: 5 },
  K: { protectedDepthPlayers: 1, cutIfAbove: 3 },
  P: { protectedDepthPlayers: 1, cutIfAbove: 3 }
};

const LEGACY_FCS_POOL_SETTINGS_V7 = {
  minimumOverall: 65,
  maximumOverall: 75,
  maximumCutOverall: 70
};

const DEFAULT_POSITION_TARGETS = {
  QB: { minimum: 2, preferredMaximum: 4, minimumWeight: 170, idealMaximumWeight: 255, minimumHeight: 70, maximumWeightGain: 20, maximumWeightLoss: 20, minimumConversionOverall: 60, protectedDepthPlayers: 3, cutIfAbove: 7 },
  HB: { minimum: 3, preferredMaximum: 6, minimumWeight: 170, idealMaximumWeight: 235, minimumHeight: 66, maximumWeightGain: 20, maximumWeightLoss: 20, minimumConversionOverall: 60, protectedDepthPlayers: 3, cutIfAbove: 8 },
  FB: { minimum: 0, preferredMaximum: 2, minimumWeight: 220, idealMaximumWeight: 270, minimumHeight: 69, maximumWeightGain: 20, maximumWeightLoss: 20, minimumConversionOverall: 60, protectedDepthPlayers: 2, cutIfAbove: 5 },
  WR: { minimum: 6, preferredMaximum: 9, minimumWeight: 175, idealMaximumWeight: 240, minimumHeight: 68, maximumWeightGain: 15, maximumWeightLoss: 15, minimumConversionOverall: 60, protectedDepthPlayers: 5, cutIfAbove: 12 },
  TE: { minimum: 3, preferredMaximum: 5, minimumWeight: 220, idealMaximumWeight: 275, minimumHeight: 73, maximumWeightGain: 20, maximumWeightLoss: 20, minimumConversionOverall: 60, protectedDepthPlayers: 3, cutIfAbove: 7 },
  LT: { minimum: 2, preferredMaximum: 4, minimumWeight: 270, idealMaximumWeight: 340, minimumHeight: 76, maximumWeightGain: 25, maximumWeightLoss: 25, minimumConversionOverall: 60, protectedDepthPlayers: 3, cutIfAbove: 6 },
  LG: { minimum: 2, preferredMaximum: 4, minimumWeight: 265, idealMaximumWeight: 330, minimumHeight: 74, maximumWeightGain: 20, maximumWeightLoss: 25, minimumConversionOverall: 60, protectedDepthPlayers: 3, cutIfAbove: 6 },
  C: { minimum: 2, preferredMaximum: 4, minimumWeight: 260, idealMaximumWeight: 325, minimumHeight: 73, maximumWeightGain: 20, maximumWeightLoss: 25, minimumConversionOverall: 60, protectedDepthPlayers: 3, cutIfAbove: 6 },
  RG: { minimum: 2, preferredMaximum: 4, minimumWeight: 265, idealMaximumWeight: 330, minimumHeight: 74, maximumWeightGain: 20, maximumWeightLoss: 25, minimumConversionOverall: 60, protectedDepthPlayers: 3, cutIfAbove: 6 },
  RT: { minimum: 2, preferredMaximum: 4, minimumWeight: 270, idealMaximumWeight: 340, minimumHeight: 76, maximumWeightGain: 25, maximumWeightLoss: 25, minimumConversionOverall: 60, protectedDepthPlayers: 3, cutIfAbove: 6 },
  LE: { minimum: 3, preferredMaximum: 5, minimumWeight: 225, idealMaximumWeight: 300, minimumHeight: 73, maximumWeightGain: 20, maximumWeightLoss: 25, minimumConversionOverall: 60, protectedDepthPlayers: 3, cutIfAbove: 7 },
  RE: { minimum: 3, preferredMaximum: 5, minimumWeight: 225, idealMaximumWeight: 300, minimumHeight: 73, maximumWeightGain: 20, maximumWeightLoss: 25, minimumConversionOverall: 60, protectedDepthPlayers: 3, cutIfAbove: 7 },
  DT: { minimum: 4, preferredMaximum: 7, minimumWeight: 270, idealMaximumWeight: 345, minimumHeight: 72, maximumWeightGain: 25, maximumWeightLoss: 30, minimumConversionOverall: 60, protectedDepthPlayers: 3, cutIfAbove: 8 },
  LOLB: { minimum: 3, preferredMaximum: 5, minimumWeight: 215, idealMaximumWeight: 265, minimumHeight: 71, maximumWeightGain: 20, maximumWeightLoss: 25, minimumConversionOverall: 60, protectedDepthPlayers: 3, cutIfAbove: 7 },
  MLB: { minimum: 3, preferredMaximum: 5, minimumWeight: 225, idealMaximumWeight: 265, minimumHeight: 70, maximumWeightGain: 20, maximumWeightLoss: 25, minimumConversionOverall: 60, protectedDepthPlayers: 3, cutIfAbove: 7 },
  ROLB: { minimum: 3, preferredMaximum: 5, minimumWeight: 215, idealMaximumWeight: 265, minimumHeight: 71, maximumWeightGain: 20, maximumWeightLoss: 25, minimumConversionOverall: 60, protectedDepthPlayers: 3, cutIfAbove: 7 },
  CB: { minimum: 6, preferredMaximum: 9, minimumWeight: 165, idealMaximumWeight: 220, minimumHeight: 67, maximumWeightGain: 15, maximumWeightLoss: 15, minimumConversionOverall: 60, protectedDepthPlayers: 4, cutIfAbove: 11 },
  FS: { minimum: 2, preferredMaximum: 4, minimumWeight: 180, idealMaximumWeight: 225, minimumHeight: 68, maximumWeightGain: 15, maximumWeightLoss: 15, minimumConversionOverall: 60, protectedDepthPlayers: 2, cutIfAbove: 5 },
  SS: { minimum: 2, preferredMaximum: 4, minimumWeight: 185, idealMaximumWeight: 235, minimumHeight: 69, maximumWeightGain: 15, maximumWeightLoss: 15, minimumConversionOverall: 60, protectedDepthPlayers: 2, cutIfAbove: 5 },
  K: { minimum: 1, preferredMaximum: 2, minimumWeight: 165, idealMaximumWeight: 230, minimumHeight: 66, maximumWeightGain: 15, maximumWeightLoss: 15, minimumConversionOverall: 60, protectedDepthPlayers: 1, cutIfAbove: 3 },
  P: { minimum: 1, preferredMaximum: 2, minimumWeight: 165, idealMaximumWeight: 230, minimumHeight: 66, maximumWeightGain: 15, maximumWeightLoss: 15, minimumConversionOverall: 60, protectedDepthPlayers: 1, cutIfAbove: 3 }
};

const NSD_ROSTER_BALANCER_MODULE_DIRECTORY =
  path.dirname(
    fileURLToPath(import.meta.url)
  );

const NSD_ROSTER_BALANCER_SCHEMA_DIRECTORY =
  path.join(
    NSD_ROSTER_BALANCER_MODULE_DIRECTORY,
    '..',
    'schemas'
  );

const NSD_ROSTER_BALANCER_OVR_FORMULA_PATH =
  path.join(
    NSD_ROSTER_BALANCER_MODULE_DIRECTORY,
    '..',
    'data',
    'CFB27_OVR_Formulas_AppReady_v1.json'
  );

const NSD_ROSTER_BALANCER_TARGETS_FILE_NAME =
  'NSD-Roster-Balancer-Targets.json';

const PLAYER_WEIGHT_BASE_POUNDS =
  160;

const FCS_POOL_TEAM_INDEX =
  255;

const ZERO_REFERENCE =
  '00000000000000000000000000000000';

const OFFENSIVE_LINE_POSITIONS =
  new Set([
    'LT',
    'LG',
    'C',
    'RG',
    'RT'
  ]);

const DEFENSIVE_BACK_POSITIONS =
  new Set([
    'CB',
    'FS',
    'SS'
  ]);

/*
 * PocketScout NSD mirrored-position final fallback v6
 *
 * These are true left/right mirror positions only. The final fallback
 * never automatically mixes MLB with OLB, C with G, CB with S, etc.
 */
const MIRRORED_POSITION_PARTNER = {
  LT: 'RT',
  RT: 'LT',
  LG: 'RG',
  RG: 'LG',
  LE: 'RE',
  RE: 'LE',
  LOLB: 'ROLB',
  ROLB: 'LOLB'
};

const DEFAULT_FCS_POOL_SETTINGS = {
  minimumOverall: 63,
  maximumOverall: 77,
  maximumCutOverall: 66,
  maximumPositionChangeOverallDrop: 10,

  /* PocketScout NSD Shortage Fill minimum OVR target v12.2 */
  minimumShortageFillOverall: 70
};

const DEFAULT_FINAL_TALENT_RESCUE_SETTINGS = {
  minimumUnsignedOverall: 70,
  maximumReplacedOverall: 62
};

const FINAL_TALENT_RESCUE_EXCLUDED_POSITIONS =
  new Set([
    'K',
    'P'
  ]);

function storedPlayerWeightToDisplayedPounds(
  storedWeight
) {
  const parsed =
    toInteger(
      storedWeight,
      -1
    );

  return parsed < 0
    ? 0
    : parsed +
      PLAYER_WEIGHT_BASE_POUNDS;
}

function displayedPlayerWeightToStoredValue(
  displayedWeight
) {
  const parsed =
    toInteger(
      displayedWeight,
      -1
    );

  return parsed < PLAYER_WEIGHT_BASE_POUNDS
    ? -1
    : parsed -
      PLAYER_WEIGHT_BASE_POUNDS;
}

let nsdRosterBalancerFormulaModelCache =
  null;

export const nsdRosterBalancerModule = {
  id: 'nsd-roster-balancer',
  type: 'nsd-roster-balancer',
  name: 'National Signing Day',
  description:
    'Preview the complete National Signing Day roster plan before writing anything to the dynasty. PocketScout simulates unsigned-player assignments, builds projected post-signing rosters, resolves shortages through internal position changes, unsigned recruit/transfer fills, FCS pool trades and cuts, mirrored-position rebalancing, and a configurable Final Talent Rescue pass, then applies the completed plan with roster storage, depth-chart, jersey-number, and Weight Development reconciliation. WARNING: Review the preview first and only assign the completed National Signing Day roster plan once.',

  async run({
    inputPath,
    options = {},
    session = null
  }) {
    const mode = String(
      options.mode ??
      'analyzeRosterBalance'
    );

    if (mode === 'analyzeRosterBalance') {
      return analyzeRosterBalance({
        inputPath,
        session,
        outputDirectory:
          options.outputDirectory,
        positionTargets:
          options.positionTargets,
        fcsPoolSettings:
          options.fcsPoolSettings,
        createCsvReport:
          options.createCsvReport !== false,

        includeUserControlledTeams:
          options.includeUserControlledTeams !== false,

        unsignedAssignmentPreview:
          options.unsignedAssignmentPreview ?? null,

        talentRescueSettings:
          options.talentRescueSettings ?? null
      });
    }

    if (
      mode ===
        'writeFinalNsdDispositionReport'
    ) {
      return writeFinalNsdDispositionReport({
        inputPath,
        outputDirectory:
          options.outputDirectory,
        finalDispositionSeed:
          options.finalDispositionSeed ?? {},
        session
      });
    }

    if (mode === 'loadRosterTargets') {
      return loadRosterTargets({
        inputPath,
        outputDirectory:
          options.outputDirectory
      });
    }

    if (mode === 'saveRosterTargets') {
      return saveRosterTargets({
        inputPath,
        outputDirectory:
          options.outputDirectory,
        positionTargets:
          options.positionTargets,
        fcsPoolSettings:
          options.fcsPoolSettings
      });
    }

    if (mode === 'applySelectedRosterChanges') {
      return applySelectedRosterChanges({
        inputPath,
        outputPath:
          options.outputPath ??
          inputPath,
        outputDirectory:
          options.outputDirectory,
        selectedProposalIds:
          options.selectedProposalIds,
        applyScope:
          options.applyScope,
        selectedTeamIndex:
          options.selectedTeamIndex,
        positionTargets:
          options.positionTargets,
        fcsPoolSettings:
          options.fcsPoolSettings,

        talentRescueSettings:
          options.talentRescueSettings,

        includeUserControlledTeams:
          options.includeUserControlledTeams !== false,

        clearRecruitingDealbreakers:
          options.clearRecruitingDealbreakers === true,

        session
      });
    }

    throw new Error(
      `Unknown NSD Roster Balancer mode: ${mode}`
    );
  }
};

async function analyzeRosterBalance({
  inputPath,
  session = null,
  outputDirectory = '',
  positionTargets = null,
  fcsPoolSettings = null,
  createCsvReport = true,

  includeUserControlledTeams = true,
  unsignedAssignmentPreview = null,
  talentRescueSettings = null
}) {
  const resolvedInput =
    requireExistingInputPath(
      inputPath
    );

  const targetSettings =
    resolveRosterTargets({
      inputPath:
        resolvedInput,
      outputDirectory,
      submittedTargets:
        positionTargets,
      submittedFcsPoolSettings:
        fcsPoolSettings
    });

  const activePositionTargets =
    targetSettings.positionTargets;

  const activeFcsPoolSettings =
    targetSettings.fcsPoolSettings;

  const activeTalentRescueSettings =
    validateTalentRescueSettings(
      talentRescueSettings
    );

  const franchise =
    await Franchise.create(
      resolvedInput,
      {
        gameTypeOverride: 'college',
        gameYearOverride: 27,
        schemaDirectory:
          NSD_ROSTER_BALANCER_SCHEMA_DIRECTORY,
        saveOnChange: false
      }
    );

  const playerTableInfo =
    await resolveTable({
      franchise,
      session,
      sessionKey: 'Player',
      expectedName: 'Player',
      requiredFields: [
        'FirstName',
        'LastName',
        'TeamIndex',
        'Position',
        'PlayerType',
        'OverallRating',
        'Weight',
        'Height',
        'JerseyNum'
      ],
      minimumValidRows: 100
    });

  const teamTableInfo =
    await resolveTable({
      franchise,
      session,
      sessionKey: 'Team',
      expectedName: 'Team',
      requiredFields: [
        'TeamIndex',
        'DisplayName',
        'LongName',
        'Roster'
      ],
      minimumValidRows: 100
    });

  const coachTableInfo =
    await resolveTable({
      franchise,
      session,
      sessionKey: 'Coach',
      expectedName: 'Coach',
      requiredFields: [
        'TeamIndex',
        'IsUserControlled'
      ],
      minimumValidRows: 1
    });

  const recruitTableInfo =
    await resolveTable({
      franchise,
      session,
      sessionKey: 'Recruit',
      expectedName: 'Recruit',
      requiredFields: [
        'Player',
        'RecruitStage',
        'TopSchoolsList'
      ],
      minimumValidRows: 100
    });

  const tableIdMap =
    buildTableIdMap(
      franchise
    );

  const userControlledTeamIndexes =
    buildUserControlledTeamIndexes(
      coachTableInfo.table
    );

  const allTeams =
    buildTeamMap(
      teamTableInfo.table,
      userControlledTeamIndexes
    );

  const excludedUserControlledTeams =
    includeUserControlledTeams
      ? []
      : [
          ...allTeams.values()
        ]
          .filter(
            team =>
              team.isUserControlled
          )
          .map(
            team => ({
              teamIndex:
                team.teamIndex,
              teamName:
                team.teamName
            })
          );

  const teams =
    new Map(
      [
        ...allTeams.entries()
      ].filter(
        ([
          ,
          team
        ]) =>
          includeUserControlledTeams ||
          !team.isUserControlled
      )
    );

  const playerRecordIdentity =
    new Map();

  let rosterPlayersIncluded = 0;
  let rosterPlayersSkipped = 0;

  const possibleFcsPoolPlayers = [];

  for (
    let playerRow = 0;
    playerRow <
      (playerTableInfo.table.records ?? []).length;
    playerRow++
  ) {
    const record =
      playerTableInfo.table.records[
        playerRow
      ];

    if (
      !isUsableRecord(record) ||
      !hasFields(
        record,
        [
          'TeamIndex',
          'Position',
          'OverallRating',
          'Weight'
        ]
      )
    ) {
      rosterPlayersSkipped++;
      continue;
    }

    const position =
      toText(record.Position);

    const teamIndex =
      toInteger(
        record.TeamIndex,
        255
      );

    const team =
      teams.get(teamIndex);

    const playerIdentity = {
      playerRow,
      teamIndex,
      position,
      playerType:
        toText(record.PlayerType),
      firstName:
        toText(record.FirstName),
      lastName:
        toText(record.LastName),
      overallRating:
        toInteger(
          record.OverallRating,
          0
        ),
      schoolYear:
        toText(
          record.SchoolYear ??
          record.Class
        ),
      storedWeight:
        toInteger(
          record.Weight,
          -1
        ),
      weight:
        storedPlayerWeightToDisplayedPounds(
          record.Weight
        ),
      height:
        toInteger(
          record.Height,
          0
        )
    };

    playerRecordIdentity.set(
      playerRow,
      playerIdentity
    );

    if (
      teamIndex ===
        FCS_POOL_TEAM_INDEX &&
      POSITION_ORDER.includes(
        position
      ) &&
      playerIdentity.overallRating >=
        activeFcsPoolSettings.minimumOverall &&
      playerIdentity.overallRating <=
        activeFcsPoolSettings.maximumOverall &&
      Boolean(
        playerIdentity.firstName ||
        playerIdentity.lastName
      )
    ) {
      possibleFcsPoolPlayers.push(
        buildRosterBalancerAthleteProjection(
          record,
          playerIdentity
        )
      );
    }

    if (
      !team ||
      !POSITION_ORDER.includes(
        position
      )
    ) {
      rosterPlayersSkipped++;
      continue;
    }

    team.current.total++;
    team.current.positions[position]++;

    const athleteProjection =
      buildRosterBalancerAthleteProjection(
        record,
        playerIdentity
      );

    team.players.push(
      athleteProjection
    );

    rosterPlayersIncluded++;
  }

  const rosterStoreDuplicateDiagnostics =
    await analyzeRosterStoreDuplicates({
      teams,
      playerTable:
        playerTableInfo.table,
      tableIdMap
    });

  let recruitsScanned = 0;
  let committedRecruitsIncluded = 0;
  let committedRecruitsSkipped = 0;
  let recruitsAlreadyRostered = 0;

  const recruitReferencedPlayerRows =
    new Set();

  const primaryPlayerTableId =
    getTableId(
      playerTableInfo.table
    );

  for (
    let recruitRow = 0;
    recruitRow <
      (recruitTableInfo.table.records ?? []).length;
    recruitRow++
  ) {
    const recruitRecord =
      recruitTableInfo.table.records[
        recruitRow
      ];
    if (
      !isUsableRecord(
        recruitRecord
      )
    ) {
      continue;
    }

    recruitsScanned++;

    const referencedPlayer =
      decodeTableReference(
        recruitRecord.Player,
        tableIdMap
      );

    if (
      referencedPlayer &&
      Number.isInteger(
        primaryPlayerTableId
      ) &&
      getTableId(
        referencedPlayer.table
      ) ===
        primaryPlayerTableId
    ) {
      recruitReferencedPlayerRows.add(
        referencedPlayer.row
      );
    }

    const stage =
      toText(
        recruitRecord.RecruitStage
      )
        .toLowerCase();

    const bucket =
      stage === 'hardcommitted'
        ? 'hardCommitted'
        : stage === 'signed'
          ? 'signed'
          : '';

    if (!bucket) {
      continue;
    }

    const playerReference =
      decodeTableReference(
        recruitRecord.Player,
        tableIdMap
      );

    if (!playerReference) {
      committedRecruitsSkipped++;
      continue;
    }

    const playerTable =
      playerReference.table;

    try {
      await mutedReadRecords(
        playerTable
      );
    } catch {
      committedRecruitsSkipped++;
      continue;
    }

    const playerRecord =
      playerTable.records?.[
        playerReference.row
      ];

    const position =
      toText(
        playerRecord?.Position
      );

    if (
      !isUsableRecord(
        playerRecord
      ) ||
      !POSITION_ORDER.includes(
        position
      )
    ) {
      committedRecruitsSkipped++;
      continue;
    }

    const destinationTeamIndex =
      await resolveRecruitDestination({
        recruitRecord,
        tableIdMap
      });

    const team =
      teams.get(
        destinationTeamIndex
      );

    if (!team) {
      committedRecruitsSkipped++;
      continue;
    }

    team[bucket].total++;
    team[bucket].positions[position]++;
    committedRecruitsIncluded++;

    if (bucket === 'signed') {
      team.signedRecruitPlayers.push({
        recruitRow,
        playerRow:
          playerReference.row,
        playerReference:
          toText(
            recruitRecord.Player
          ),
        fullName:
          [
            toText(
              playerRecord.FirstName
            ),
            toText(
              playerRecord.LastName
            )
          ]
            .filter(Boolean)
            .join(' ')
            .trim(),
        position,
        playerType:
          toText(
            playerRecord.PlayerType
          ),
        storedOverall:
          toInteger(
            playerRecord.OverallRating,
            0
          ),
        calculatedOverall:
          toInteger(
            playerRecord.OverallRating,
            0
          ),
        currentWeight:
          storedPlayerWeightToDisplayedPounds(
            playerRecord.Weight
          ),
        storedWeight:
          toInteger(
            playerRecord.Weight,
            -1
          ),
        destinationTeamIndex,
        recruitStage:
          toText(
            recruitRecord.RecruitStage
          )
      });
    }

    const currentTeamIndex =
      toInteger(
        playerRecord.TeamIndex,
        255
      );

    if (
      currentTeamIndex ===
      destinationTeamIndex
    ) {
      recruitsAlreadyRostered++;
      continue;
    }

    team.incoming.total++;
    team.incoming.positions[position]++;
  }

  /*
   * PocketScout NSD consolidated Assign Unsigned preview projection v1
   *
   * Treat dry-run assignments as projected incoming players. They remain
   * separate from Current/Hard Committed/Signed until the user actually
   * runs Assign Unsigned Players.
   */
  const previewAssignedRecruitRows =
    new Set();

  const previewAssignments =
    Array.isArray(
      unsignedAssignmentPreview
        ?.previewAssignments
    )
      ? unsignedAssignmentPreview
          .previewAssignments
      : [];

  for (
    const previewAssignment
    of previewAssignments
  ) {
    const recruitRow =
      toInteger(
        previewAssignment.recruitRow,
        -1
      );

    const playerRow =
      toInteger(
        previewAssignment.playerRow,
        -1
      );

    const destinationTeamIndex =
      toInteger(
        previewAssignment.teamIndex,
        -1
      );

    const team =
      teams.get(
        destinationTeamIndex
      );

    const playerRecord =
      playerTableInfo.table.records?.[
        playerRow
      ];

    if (
      recruitRow < 0 ||
      playerRow < 0 ||
      !team ||
      !isUsableRecord(
        playerRecord
      )
    ) {
      continue;
    }

    const position =
      toText(
        playerRecord.Position
      );

    if (
      !POSITION_ORDER.includes(
        position
      )
    ) {
      continue;
    }

    previewAssignedRecruitRows.add(
      recruitRow
    );

    team.unsignedPreview.total++;
    team.unsignedPreview
      .positions[position]++;

    const identity =
      playerRecordIdentity.get(
        playerRow
      ) ?? {
        playerRow,
        teamIndex:
          FCS_POOL_TEAM_INDEX,
        position,
        playerType:
          toText(
            playerRecord.PlayerType
          ),
        firstName:
          toText(
            playerRecord.FirstName
          ),
        lastName:
          toText(
            playerRecord.LastName
          ),
        overallRating:
          toInteger(
            playerRecord.OverallRating,
            0
          ),
        schoolYear:
          toText(
            playerRecord.SchoolYear ??
            playerRecord.Class
          ),
        storedWeight:
          toInteger(
            playerRecord.Weight,
            -1
          ),
        weight:
          storedPlayerWeightToDisplayedPounds(
            playerRecord.Weight
          ),
        height:
          toInteger(
            playerRecord.Height,
            0
          )
      };

    const projection =
      buildRosterBalancerAthleteProjection(
        playerRecord,
        {
          ...identity,
          teamIndex:
            destinationTeamIndex
        }
      );

    projection.previewUnsignedAssignment =
      true;

    projection.previewRecruitRow =
      recruitRow;

    team.players.push(
      projection
    );

    const previousTeamIndex =
      toInteger(
        playerRecord.PrevTeamIndex,
        FCS_POOL_TEAM_INDEX
      );

    const hasPreviousSchool =
      previousTeamIndex >= 0 &&
      previousTeamIndex <
        FCS_POOL_TEAM_INDEX &&
      allTeams.has(
        previousTeamIndex
      );

    team.unsignedPreviewPlayers.push({
      recruitRow,
      playerRow,
      fullName:
        previewAssignment.playerName ||
        projection.fullName,
      position,
      overallRating:
        toInteger(
          previewAssignment.overall,
          projection.overallRating
        ),
      recruitClass:
        toText(
          previewAssignment.recruitClass
        ),
      unsignedPlayerType:
        hasPreviousSchool
          ? 'Unsigned Transfer'
          : 'Unsigned Recruit',
      previousTeamIndex:
        hasPreviousSchool
          ? previousTeamIndex
          : null,
      previousTeamName:
        hasPreviousSchool
          ? (
              allTeams.get(
                previousTeamIndex
              )?.teamName ??
              `Team ${previousTeamIndex}`
            )
          : ''
    });
  }

  /*
   * PocketScout NSD Roster Balancer unsigned recruit fill before FCS v1
   *
   * Build a separate pool from recruits that remain unresolved after
   * the simulated Assign Unsigned Players step. Preview-reserved recruits
   * are excluded so Pass 2 cannot use the same player twice.
   */
  const remainingUnsignedRecruits = [];

  for (
    let recruitRow = 0;
    recruitRow <
      (recruitTableInfo.table.records ?? []).length;
    recruitRow++
  ) {
    const recruitRecord =
      recruitTableInfo.table.records[
        recruitRow
      ];

    if (
      !isUsableRecord(recruitRecord) ||
      previewAssignedRecruitRows.has(
        recruitRow
      )
    ) {
      continue;
    }

    const stage =
      toText(recruitRecord.RecruitStage)
        .toLowerCase();

    if (
      [
        'hardcommitted',
        'signed',
        'invalid'
      ].includes(stage)
    ) {
      continue;
    }

    const playerReference =
      decodeTableReference(
        recruitRecord.Player,
        tableIdMap
      );

    if (
      !playerReference ||
      (
        Number.isInteger(primaryPlayerTableId) &&
        getTableId(playerReference.table) !==
          primaryPlayerTableId
      )
    ) {
      continue;
    }

    const playerRecord =
      playerReference.table.records?.[
        playerReference.row
      ];

    if (!isUsableRecord(playerRecord)) {
      continue;
    }

    const position =
      toText(playerRecord.Position);

    const overallRating =
      toInteger(
        playerRecord.OverallRating,
        0
      );

    if (
      !POSITION_ORDER.includes(position) ||
      toInteger(
        playerRecord.TeamIndex,
        FCS_POOL_TEAM_INDEX
      ) !== FCS_POOL_TEAM_INDEX ||
      (
        position === 'FB' &&
        overallRating < 70
      )
    ) {
      continue;
    }

    const identity =
      playerRecordIdentity.get(
        playerReference.row
      ) ?? {
        playerRow:
          playerReference.row,
        teamIndex:
          FCS_POOL_TEAM_INDEX,
        position,
        playerType:
          toText(playerRecord.PlayerType),
        firstName:
          toText(playerRecord.FirstName),
        lastName:
          toText(playerRecord.LastName),
        overallRating,
        schoolYear:
          toText(
            playerRecord.SchoolYear ??
            playerRecord.Class
          ),
        storedWeight:
          toInteger(playerRecord.Weight, -1),
        weight:
          storedPlayerWeightToDisplayedPounds(
            playerRecord.Weight
          ),
        height:
          toInteger(playerRecord.Height, 0)
      };

    const previousTeamIndex =
      toInteger(
        playerRecord.PrevTeamIndex,
        FCS_POOL_TEAM_INDEX
      );

    const hasPreviousSchool =
      previousTeamIndex >= 0 &&
      previousTeamIndex <
        FCS_POOL_TEAM_INDEX &&
      allTeams.has(
        previousTeamIndex
      );

    remainingUnsignedRecruits.push({
      ...buildRosterBalancerAthleteProjection(
        playerRecord,
        identity
      ),
      recruitRow,
      playerReference:
        toText(recruitRecord.Player),
      recruitStage:
        toText(recruitRecord.RecruitStage),
      unsignedPlayerType:
        hasPreviousSchool
          ? 'Unsigned Transfer'
          : 'Unsigned Recruit',
      previousTeamIndex:
        hasPreviousSchool
          ? previousTeamIndex
          : null,
      previousTeamName:
        hasPreviousSchool
          ? (
              allTeams.get(
                previousTeamIndex
              )?.teamName ??
              `Team ${previousTeamIndex}`
            )
          : ''
    });
  }

  remainingUnsignedRecruits.sort(
    (left, right) =>
      right.overallRating -
        left.overallRating ||
      left.fullName.localeCompare(
        right.fullName,
        undefined,
        {
          sensitivity: 'base',
          numeric: true
        }
      )
  );

  const usedUnsignedRecruitRows =
    new Set();

  const fcsPoolPlayers =
    possibleFcsPoolPlayers
      .filter(
        player =>
          !recruitReferencedPlayerRows.has(
            player.playerRow
          )
      )
      .sort(
        (left, right) =>
          right.overallRating -
            left.overallRating ||
          left.fullName.localeCompare(
            right.fullName,
            undefined,
            {
              sensitivity: 'base',
              numeric: true
            }
          )
      );

  const usedFcsPoolPlayerRows =
    new Set();

  const teamsByShortagePriority =
    [...teams.values()]
      .sort(
        (left, right) =>
          calculateInitialTeamShortagePriority(
            right,
            activePositionTargets
          ) -
            calculateInitialTeamShortagePriority(
              left,
              activePositionTargets
            ) ||
          left.teamName.localeCompare(
            right.teamName,
            undefined,
            {
              sensitivity: 'base',
              numeric: true
            }
          )
      );

  const teamRows =
    teamsByShortagePriority
      .map(team =>
        finalizeTeamAnalysis(
          team,
          activePositionTargets,
          activeFcsPoolSettings,
          remainingUnsignedRecruits,
          usedUnsignedRecruitRows,
          fcsPoolPlayers,
          usedFcsPoolPlayerRows
        )
      )
      .sort(
        (left, right) =>
          right.severityScore -
            left.severityScore ||
          left.teamName.localeCompare(
            right.teamName,
            undefined,
            {
              sensitivity: 'base',
              numeric: true
            }
          )
      );

  /*
   * Final Talent Rescue
   *
   * Run only after every normal NSD proposal pass. Remaining unsigned
   * Recruit-linked non-specialists rated 70+ may replace a lower-rated
   * CURRENT roster player at the exact same position. The swap is one-for-one,
   * so roster size and position count do not change. K and P are excluded.
   */
  const talentRescueUsedPlayerRows =
    new Set();

  for (const analyzedTeam of teamRows) {
    for (
      const proposal
      of [
        ...(analyzedTeam.proposals ?? []),
        ...(analyzedTeam.fcsPoolCutProposals ?? []),
        ...(analyzedTeam.signedRecruitReleaseProposals ?? [])
      ]
    ) {
      if (
        proposal.proposalType ===
          'FCS_POOL_TRADE'
      ) {
        talentRescueUsedPlayerRows.add(
          Number(
            proposal.outgoingPlayerRow
          )
        );

        talentRescueUsedPlayerRows.add(
          Number(
            proposal.incomingPlayerRow
          )
        );

        continue;
      }

      const playerRow =
        Number(
          proposal.playerRow
        );

      if (
        Number.isInteger(
          playerRow
        )
      ) {
        talentRescueUsedPlayerRows.add(
          playerRow
        );
      }
    }
  }

  const talentRescuePool =
    remainingUnsignedRecruits
      .filter(
        player =>
          player.overallRating >=
            activeTalentRescueSettings
              .minimumUnsignedOverall &&
          !FINAL_TALENT_RESCUE_EXCLUDED_POSITIONS
            .has(
              player.position
            ) &&
          !usedUnsignedRecruitRows.has(
            player.recruitRow
          ) &&
          !talentRescueUsedPlayerRows.has(
            player.playerRow
          )
      )
      .sort(
        (left, right) =>
          right.overallRating -
            left.overallRating ||
          left.fullName.localeCompare(
            right.fullName,
            undefined,
            {
              sensitivity: 'base',
              numeric: true
            }
          )
      );

  const talentRescueEligibleBefore =
    talentRescuePool.length;

  let talentRescueProposalsCreated =
    0;

  for (
    const incoming
    of talentRescuePool
  ) {
    const destinations = [];

    for (
      const analyzedTeam
      of teamRows
    ) {
      const outgoing =
        (analyzedTeam.players ?? [])
          .filter(
            player =>
              player.position ===
                incoming.position &&
              player.previewUnsignedAssignment !==
                true &&
              !talentRescueUsedPlayerRows.has(
                player.playerRow
              ) &&
              player.overallRating <=
                activeTalentRescueSettings
                  .maximumReplacedOverall &&
              player.overallRating <
                incoming.overallRating
          )
          .sort(
            (left, right) =>
              right.overallRating -
                left.overallRating ||
              right.calculatedCurrentOverall -
                left.calculatedCurrentOverall ||
              right.depthRank -
                left.depthRank ||
              left.fullName.localeCompare(
                right.fullName,
                undefined,
                {
                  sensitivity: 'base',
                  numeric: true
                }
              )
          )[0];

      if (!outgoing) {
        continue;
      }

      destinations.push({
        analyzedTeam,
        outgoing,
        upgrade:
          incoming.overallRating -
          outgoing.overallRating
      });
    }

    destinations.sort(
      (left, right) =>
        left.upgrade -
          right.upgrade ||
        (
          left.analyzedTeam
            .talentRescueProposalCount ??
          0
        ) -
          (
            right.analyzedTeam
              .talentRescueProposalCount ??
            0
          ) ||
        left.analyzedTeam.teamName
          .localeCompare(
            right.analyzedTeam.teamName,
            undefined,
            {
              sensitivity: 'base',
              numeric: true
            }
          )
    );

    const selected =
      destinations[0];

    if (!selected) {
      continue;
    }

    const {
      analyzedTeam,
      outgoing,
      upgrade
    } = selected;

    analyzedTeam.proposals.push({
      proposalType:
        'TALENT_RESCUE_SWAP',

      finalTalentRescue:
        true,

      proposalId:
        `${analyzedTeam.teamIndex}-talent-rescue-${incoming.recruitRow}-${incoming.playerRow}-${outgoing.playerRow}`,

      selectedByDefault:
        true,

      teamIndex:
        analyzedTeam.teamIndex,

      teamName:
        analyzedTeam.teamName,

      position:
        incoming.position,

      outgoingPlayerRow:
        outgoing.playerRow,

      outgoingPlayerName:
        outgoing.fullName,

      outgoingPlayerType:
        outgoing.playerType,

      outgoingStoredOverall:
        outgoing.overallRating,

      outgoingCalculatedOverall:
        outgoing.calculatedCurrentOverall,

      outgoingDepthRank:
        outgoing.depthRank,

      incomingRecruitRow:
        incoming.recruitRow,

      incomingPlayerRow:
        incoming.playerRow,

      incomingPlayerReference:
        incoming.playerReference,

      incomingPlayerName:
        incoming.fullName,

      incomingPlayerType:
        incoming.playerType,

      incomingStoredOverall:
        incoming.overallRating,

      incomingCalculatedOverall:
        incoming.calculatedCurrentOverall,

      incomingRecruitStageBefore:
        incoming.recruitStage,

      incomingUnsignedPlayerType:
        incoming.unsignedPlayerType,

      incomingPreviousTeamIndex:
        incoming.previousTeamIndex,

      incomingPreviousTeamName:
        incoming.previousTeamName,

      overallUpgrade:
        upgrade,

      destinationTeamIndex:
        analyzedTeam.teamIndex,

      outgoingDestinationTeamIndex:
        FCS_POOL_TEAM_INDEX,

      rosterImpact:
        'Same-position one-for-one swap; roster and position count unchanged',

      reason:
        `Final Talent Rescue: ${incoming.fullName} is a remaining unsigned ${incoming.position} rated ${incoming.overallRating} OVR after every normal NSD pass. ${analyzedTeam.teamName} can replace ${outgoing.fullName}, a current ${incoming.position} rated ${outgoing.overallRating} OVR, for a +${upgrade} OVR same-position upgrade. Final Talent Rescue requires the unsigned player to be at least ${activeTalentRescueSettings.minimumUnsignedOverall} OVR and may only remove a current roster player rated ${activeTalentRescueSettings.maximumReplacedOverall} OVR or lower; otherwise PocketScout keeps the existing roster player. K and P are excluded.`
    });

    analyzedTeam.proposalCount =
      analyzedTeam.proposals.length;

    analyzedTeam.talentRescueProposalCount =
      (
        analyzedTeam
          .talentRescueProposalCount ??
        0
      ) + 1;

    talentRescueUsedPlayerRows.add(
      outgoing.playerRow
    );

    talentRescueUsedPlayerRows.add(
      incoming.playerRow
    );

    usedUnsignedRecruitRows.add(
      incoming.recruitRow
    );

    talentRescueProposalsCreated++;
  }

  const talentRescueEligibleAfter =
    talentRescuePool.filter(
      player =>
        !usedUnsignedRecruitRows.has(
          player.recruitRow
        )
    ).length;


  const summary = {
    teamsAnalyzed:
      teamRows.length,

    balancedTeams:
      teamRows.filter(
        team =>
          team.shortages.length === 0 &&
          team.surpluses.length === 0
      ).length,

    teamsWithShortages:
      teamRows.filter(
        team =>
          team.shortages.length > 0
      ).length,

    teamsWithSurpluses:
      teamRows.filter(
        team =>
          team.surpluses.length > 0
      ).length,

    zeroPositionShortages:
      teamRows.reduce(
        (total, team) =>
          total +
          team.shortages.filter(
            shortage =>
              shortage.projected === 0
          ).length,
        0
      ),

    totalShortageSlots:
      teamRows.reduce(
        (total, team) =>
          total +
          team.shortages.reduce(
            (teamTotal, shortage) =>
              teamTotal +
              shortage.amount,
            0
          ),
        0
      ),

    totalSurplusSlots:
      teamRows.reduce(
        (total, team) =>
          total +
          team.surpluses.reduce(
            (teamTotal, surplus) =>
              teamTotal +
              surplus.amount,
            0
          ),
        0
      ),

    proposedMoves:
      teamRows.reduce(
        (total, team) =>
          total +
          team.proposalCount,
        0
      ),

    teamsWithProposals:
      teamRows.filter(
        team =>
          team.proposalCount > 0
      ).length,

    unresolvedShortageSlots:
      teamRows.reduce(
        (total, team) =>
          total +
          team.unresolvedShortageSlots,
        0
      ),

    playersWithWeightDevelopment:
      teamRows.reduce(
        (total, team) =>
          total +
          team.normalWeightDevelopmentCount,
        0
      ),

    proposedWeightDevelopmentPounds:
      teamRows.reduce(
        (total, team) =>
          total +
          team.normalWeightDevelopmentPounds,
        0
      ),

    conversionWeightGainPounds:
      teamRows.reduce(
        (total, team) =>
          total +
          team.proposals.reduce(
            (teamTotal, proposal) =>
              teamTotal +
              (
                proposal.requiredConversionGain ??
                0
              ),
            0
          ),
        0
      ),

    conversionWeightLossPounds:
      teamRows.reduce(
        (total, team) =>
          total +
          team.proposals.reduce(
            (teamTotal, proposal) =>
              teamTotal +
              (
                proposal.requiredConversionLoss ??
                0
              ),
            0
          ),
        0
      ),

    internalPositionChangeProposals:
      teamRows.reduce(
        (total, team) =>
          total +
          team.internalPositionChangeProposalCount,
        0
      ),

    mirrorRebalanceProposals:
      teamRows.reduce(
        (total, team) =>
          total +
          team.mirrorRebalanceProposalCount,
        0
      ),

    unsignedRecruitFillProposals:
      teamRows.reduce(
        (total, team) =>
          total +
          team.unsignedRecruitFillProposalCount,
        0
      ),

    fcsPoolTradeProposals:
      teamRows.reduce(
        (total, team) =>
          total +
          team.fcsPoolTradeProposalCount,
        0
      ),

    talentRescueProposals:
      teamRows.reduce(
        (total, team) =>
          total +
          (
            team.talentRescueProposalCount ??
            0
          ),
        0
      ),

    fcsPoolCutProposals:
      teamRows.reduce(
        (total, team) =>
          total +
          team.fcsPoolCutProposalCount,
        0
      ),

    signedRecruitReleaseProposals:
      teamRows.reduce(
        (total, team) =>
          total +
          team.signedRecruitReleaseProposalCount,
        0
      ),

    rosterStoreDuplicateProposals:
      teamRows.reduce(
        (total, team) =>
          total +
          team.rosterStoreDuplicateProposalCount,
        0
      ),

    duplicateRosterStoreSlots:
      teamRows.reduce(
        (total, team) =>
          total +
          team.rosterStoreDuplicateSlotCount,
        0
      ),

    teamsWithRosterStoreDuplicates:
      teamRows.filter(
        team =>
          team.rosterStoreDuplicateProposalCount >
            0
      ).length,

    unresolvedFcsCutSlots:
      teamRows.reduce(
        (total, team) =>
          total +
          team.unresolvedCutExcessSlots,
        0
      )
  };

  const reportPath =
    createCsvReport
      ? writeRosterBalanceCsv({
          inputPath:
            resolvedInput,
          teams:
            teamRows
        })
      : null;

  return {
    moduleId:
      nsdRosterBalancerModule.id,
    moduleName:
      nsdRosterBalancerModule.name,
    phase: 6,
    readOnly: true,
    proposalMode:
      'internal-position-changes-then-unsigned-recruit-fills-then-fcs-pool-trades-then-mirrored-position-final-fallback-then-fcs-pool-cuts-then-final-70-plus-talent-rescue',
    fcsPoolOverallRange: {
      minimum:
        activeFcsPoolSettings.minimumOverall,
      maximum:
        activeFcsPoolSettings.maximumOverall
    },
    maximumFcsCutOverall:
      activeFcsPoolSettings.maximumCutOverall,
    maximumPositionChangeOverallDrop:
      activeFcsPoolSettings.maximumPositionChangeOverallDrop,

    minimumShortageFillOverall:
      activeFcsPoolSettings.minimumShortageFillOverall,

    finalTalentRescue: {
      minimumUnsignedOverall:
        activeTalentRescueSettings
          .minimumUnsignedOverall,
      maximumReplacedOverall:
        activeTalentRescueSettings
          .maximumReplacedOverall,
      excludedPositions:
        [
          ...FINAL_TALENT_RESCUE_EXCLUDED_POSITIONS
        ],
      eligibleBefore:
        talentRescueEligibleBefore,
      proposalsCreated:
        talentRescueProposalsCreated,
      eligibleRemaining:
        talentRescueEligibleAfter
    },

    fcsPoolSettings:
      cloneFcsPoolSettings(
        activeFcsPoolSettings
      ),
    playerWeightStorage: {
      basePounds:
        PLAYER_WEIGHT_BASE_POUNDS,
      displayedFormula:
        'stored Weight + 160',
      storedFormula:
        'displayed pounds - 160'
    },
    normalWeightDevelopmentRanges: {
      freshmanToSophomore: {
        minimumGain: 8,
        maximumGain: 12
      },
      sophomoreToJunior: {
        minimumGain: 5,
        maximumGain: 8
      },
      juniorToSenior: {
        minimumGain: 2,
        maximumGain: 5
      },
      senior: {
        minimumGain: 2,
        maximumGain: 5
      },
      unknownClassFallback: {
        minimumGain: 3,
        maximumGain: 6
      }
    },
    inputPath:
      resolvedInput,
    reportPath,
    csvReportCreated:
      Boolean(reportPath),

    includeUserControlledTeams:
      Boolean(
        includeUserControlledTeams
      ),

    previewUnsignedAssignmentsPending:
      previewAssignments.length,

    unsignedAssignmentPreview:
      unsignedAssignmentPreview
        ? {
            previewOnly:
              unsignedAssignmentPreview.previewOnly === true,
            assignments:
              previewAssignments.length,
            teams:
              Array.isArray(
                unsignedAssignmentPreview.previewTeams
              )
                ? unsignedAssignmentPreview.previewTeams
                : []
          }
        : null,

    userControlledTeamsFound:
      userControlledTeamIndexes.size,

    userControlledTeamsIncluded:
      includeUserControlledTeams
        ? [
            ...teams.values()
          ].filter(
            team =>
              team.isUserControlled
          ).length
        : 0,

    excludedUserControlledTeams,

    positionOrder:
      [...POSITION_ORDER],
    positionTargets:
      activePositionTargets,
    suggestedPositionTargets:
      clonePositionTargets(
        DEFAULT_POSITION_TARGETS
      ),
    targetsPath:
      targetSettings.targetsPath,
    targetsSource:
      targetSettings.source,
    summary,
    teams:
      teamRows,
    diagnostics: {
      rosterPlayersIncluded,
      rosterPlayersSkipped,
      recruitsScanned,
      committedRecruitsIncluded,
      committedRecruitsSkipped,
      recruitsAlreadyRostered,
      possibleFcsPoolPlayers:
        possibleFcsPoolPlayers.length,
      recruitReferencedFcsPlayersExcluded:
        possibleFcsPoolPlayers.filter(
          player =>
            recruitReferencedPlayerRows.has(
              player.playerRow
            )
        ).length,
      previewUnsignedAssignments:
        previewAssignments.length,
      remainingUnsignedRecruits:
        remainingUnsignedRecruits.length,
      talentRescue70PlusNonSpecialistsBefore:
        talentRescueEligibleBefore,
      talentRescueProposalsCreated,
      talentRescue70PlusNonSpecialistsRemaining:
        talentRescueEligibleAfter,
      unsignedRecruitsReservedForProposals:
        usedUnsignedRecruitRows.size,
      eligibleFcsPoolPlayers:
        fcsPoolPlayers.length,
      fcsPoolPlayersReservedForProposals:
        usedFcsPoolPlayerRows.size,
      duplicateRosterStoreSlots:
        rosterStoreDuplicateDiagnostics
          .duplicateSlotsFound,
      teamsWithRosterStoreDuplicates:
        rosterStoreDuplicateDiagnostics
          .teamsWithDuplicates,
      resolvedTables: {
        Player:
          tableDiagnostic(
            playerTableInfo
          ),
        Team:
          tableDiagnostic(
            teamTableInfo
          ),
        Coach:
          tableDiagnostic(
            coachTableInfo
          ),
        Recruit:
          tableDiagnostic(
            recruitTableInfo
          )
      }
    }
  };
}




async function validateNsdRosterBalancerApplyWeek({
  inputPath,
  session = null
}) {
  const resolvedInput =
    requireExistingInputPath(
      inputPath
    );

  const franchise =
    await Franchise.create(
      resolvedInput,
      {
        gameTypeOverride:
          'college',
        gameYearOverride:
          27,
        schemaDirectory:
          NSD_ROSTER_BALANCER_SCHEMA_DIRECTORY,
        saveOnChange:
          false
      }
    );

  const seasonInfoTableInfo =
    await resolveTable({
      franchise,
      session,
      sessionKey:
        'SeasonInfo',
      expectedName:
        'SeasonInfo',
      requiredFields: [
        'CurrentWeekType',
        'CurrentWeek'
      ],
      minimumValidRows:
        1
    });

  const seasonInfoRecord =
    (
      seasonInfoTableInfo.table.records ??
      []
    ).find(
      record =>
        isUsableRecord(
          record
        ) &&
        hasFields(
          record,
          [
            'CurrentWeekType',
            'CurrentWeek'
          ]
        )
    );

  if (!seasonInfoRecord) {
    throw new Error(
      'Could not read the dynamically resolved SeasonInfo record.'
    );
  }

  const currentWeekType =
    toText(
      seasonInfoRecord.CurrentWeekType
    )
      .toLowerCase();

  const currentWeek =
    toInteger(
      seasonInfoRecord.CurrentWeek,
      -1
    );

  const currentOffseasonStage =
    toInteger(
      seasonInfoRecord.CurrentOffseasonStage,
      -1
    );

  return {
    valid:
      currentWeekType ===
        'offseason' &&
      currentWeek ===
        6,

    seasonInfoTableIndex:
      seasonInfoTableInfo.tableIndex,

    currentWeekType,
    currentWeek,
    currentOffseasonStage
  };
}

async function applySelectedRosterChanges({
  inputPath,
  outputPath,
  outputDirectory = '',
  selectedProposalIds,
  applyScope = 'TEAM',
  selectedTeamIndex = null,
  positionTargets = null,
  fcsPoolSettings = null,
  talentRescueSettings = null,

  includeUserControlledTeams = true,

  /*
   * Ghost City safe default: preserve the game's normal dealbreakers and
   * NIL behavior for these proposal types too (unsigned/transfer shortage
   * fills and Final Talent Rescue swaps), matching the recruitingHelper.js
   * default. Retain PocketScout's historical RecruitingDealbreaker =
   * Invalid write only as an explicit opt-in.
   */
  clearRecruitingDealbreakers = false,

  session = null
}) {
  const resolvedInput =
    requireExistingInputPath(
      inputPath
    );

  const resolvedOutput =
    path.resolve(
      outputPath ||
      resolvedInput
    );

  const weekCheck =
    await validateNsdRosterBalancerApplyWeek({
      inputPath:
        resolvedInput,
      session
    });

  if (!weekCheck.valid) {
    throw new Error(
      'This can only be run when CurrentWeekType is OffSeason and CurrentWeek is 6.'
    );
  }

  const requestedIds =
    Array.isArray(
      selectedProposalIds
    )
      ? [
          ...new Set(
            selectedProposalIds
              .map(value =>
                toText(value)
              )
              .filter(Boolean)
          )
        ]
      : [];

  if (!requestedIds.length) {
    throw new Error(
      'Select at least one roster proposal before applying changes.'
    );
  }

  const freshAnalysis =
    await analyzeRosterBalance({
      inputPath:
        resolvedInput,
      session,
      outputDirectory,
      positionTargets,
      fcsPoolSettings,
      talentRescueSettings,
      createCsvReport:
        false,

      includeUserControlledTeams
    });

  const normalizedApplyScope =
    toText(
      applyScope
    ).toUpperCase() ===
      'ALL_TEAMS'
      ? 'ALL_TEAMS'
      : 'TEAM';

  const currentProposalById =
    new Map();

  const freshAllTeamProposals =
    [];

  for (
    const team
    of freshAnalysis.teams ?? []
  ) {
    const teamProposals = [
      ...(team.proposals ?? []),
      ...(team.fcsPoolCutProposals ?? []),
      ...(team.signedRecruitReleaseProposals ?? []),
      ...(team.rosterStoreDuplicateProposals ?? [])
    ];

    for (
      const proposal
      of teamProposals
    ) {
      currentProposalById.set(
        proposal.proposalId,
        proposal
      );

      freshAllTeamProposals.push(
        proposal
      );
    }
  }

  const normalizedSelectedTeamIndex =
    Number.isInteger(
      Number(
        selectedTeamIndex
      )
    )
      ? Number(
          selectedTeamIndex
        )
      : null;

  const selectedProposals =
    (
      normalizedApplyScope ===
        'ALL_TEAMS'
        ? freshAllTeamProposals
        : requestedIds
            .map(
              proposalId => {
                const proposal =
                  currentProposalById.get(
                    proposalId
                  );

                if (!proposal) {
                  throw new Error(
                    `Selected proposal is stale or no longer valid: ${proposalId}. Run the analysis again before applying changes.`
                  );
                }

                return proposal;
              }
            )
    )
      .sort(
        (left, right) =>
          Number(
            right.proposalType ===
              'ROSTERSTORE_DUPLICATE_CLEANUP'
          ) -
          Number(
            left.proposalType ===
              'ROSTERSTORE_DUPLICATE_CLEANUP'
          )
      );

  if (!selectedProposals.length) {
    throw new Error(
      normalizedApplyScope ===
        'ALL_TEAMS'
        ? 'The fresh roster analysis did not produce any proposals to apply.'
        : 'None of the selected team proposals are still valid. Run the analysis again.'
    );
  }

  if (
    normalizedApplyScope ===
      'TEAM'
  ) {
    if (
      normalizedSelectedTeamIndex ===
        null
    ) {
      throw new Error(
        'Apply to Team requires a valid selected team.'
      );
    }

    const wrongTeamProposal =
      selectedProposals.find(
        proposal =>
          Number(
            proposal.teamIndex
          ) !==
          normalizedSelectedTeamIndex
      );

    if (wrongTeamProposal) {
      throw new Error(
        `Proposal ${wrongTeamProposal.proposalId} does not belong to the selected team. Nothing was changed.`
      );
    }
  }

  const affectedProposalTeamIndexes =
    [
      ...new Set(
        selectedProposals.map(
          proposal =>
            Number(
              proposal.teamIndex
            )
        )
      )
    ];

  const finalDispositionAssignments =
    selectedProposals
      .flatMap(
        proposal => {
          if (
            proposal.proposalType ===
              'UNSIGNED_RECRUIT_FILL'
          ) {
            return [{
              recruitRow:
                proposal.recruitRow,
              playerRow:
                proposal.playerRow,
              teamIndex:
                proposal.teamIndex,
              teamName:
                proposal.teamName,
              phase:
                'Shortage Fill',
              proposalType:
                proposal.proposalType
            }];
          }

          if (
            proposal.proposalType ===
              'TALENT_RESCUE_SWAP'
          ) {
            return [{
              recruitRow:
                proposal.incomingRecruitRow,
              playerRow:
                proposal.incomingPlayerRow,
              teamIndex:
                proposal.teamIndex,
              teamName:
                proposal.teamName,
              phase:
                'Pass 5: Final Talent Rescue',
              proposalType:
                proposal.proposalType
            }];
          }

          return [];
        }
      );

  const usedPlayerRows =
    new Set();

  for (
    const proposal
    of selectedProposals
  ) {
    const rows =
      proposal.proposalType ===
        'ROSTERSTORE_DUPLICATE_CLEANUP'
        ? []
        : [
            'FCS_POOL_TRADE',
            'TALENT_RESCUE_SWAP'
          ].includes(
            proposal.proposalType
          )
          ? [
              proposal.outgoingPlayerRow,
              proposal.incomingPlayerRow
            ]
          : [
              proposal.playerRow
            ];

    for (const row of rows) {
      if (
        !Number.isInteger(
          Number(row)
        )
      ) {
        throw new Error(
          `Proposal ${proposal.proposalId} contains an invalid Player row.`
        );
      }

      if (
        usedPlayerRows.has(
          Number(row)
        )
      ) {
        throw new Error(
          `Player row ${row} appears in more than one selected action. Nothing was changed.`
        );
      }

      usedPlayerRows.add(
        Number(row)
      );
    }
  }

  const franchise =
    await Franchise.create(
      resolvedInput,
      {
        gameTypeOverride:
          'college',
        gameYearOverride:
          27,
        schemaDirectory:
          NSD_ROSTER_BALANCER_SCHEMA_DIRECTORY,
        saveOnChange:
          false
      }
    );

  const playerTableInfo =
    await resolveTable({
      franchise,
      session,
      sessionKey:
        'Player',
      expectedName:
        'Player',
      requiredFields: [
        'FirstName',
        'LastName',
        'TeamIndex',
        'Position',
        'PlayerType',
        'OverallRating',
        'Weight',
        'Height',
        'JerseyNum'
      ],
      minimumValidRows:
        100
    });

  const teamTableInfo =
    await resolveTable({
      franchise,
      session,
      sessionKey:
        'Team',
      expectedName:
        'Team',
      requiredFields: [
        'TeamIndex',
        'DisplayName',
        'LongName',
        'CommittedPlayers'
      ],
      minimumValidRows:
        100
    });

  const recruitTableInfo =
    await resolveTable({
      franchise,
      session,
      sessionKey:
        'Recruit',
      expectedName:
        'Recruit',
      requiredFields: [
        'Player',
        'RecruitStage',
        'TopSchoolsList'
      ],
      minimumValidRows:
        100
    });

  const tableIdMap =
    buildTableIdMap(
      franchise
    );

  const playerTable =
    playerTableInfo.table;

  const teamTable =
    teamTableInfo.table;

  const teamByIndex =
    psNsdBuildTeamByIndex(
      teamTable
    );

  const teamNameByIndex =
    psNsdBuildTeamNameByIndex(
      teamTable
    );

  const involvedTeamIndexes =
    new Set();

  const changes = [];

  let rosterStoreDuplicateCleanupsApplied =
    0;

  let duplicateRosterStoreSlotsRemoved =
    0;

  let internalPositionChangesApplied =
    0;

  let mirrorRebalancesApplied =
    0;

  let unsignedRecruitFillsApplied =
    0;

  let unsignedRecruitFillsAppliedRecruits =
    0;

  let unsignedRecruitFillsAppliedTransfers =
    0;

  let fcsPoolTradesApplied =
    0;

  let talentRescueSwapsApplied =
    0;

  let fcsPoolCutsApplied =
    0;

  let signedRecruitReleasesApplied =
    0;

  let committedPlayerReferencesRemoved =
    0;

  let recruitStagesChanged =
    0;

  let positionFieldsChanged =
    0;

  let playerTypeFieldsChanged =
    0;

  let overallFieldsChanged =
    0;

  let weightFieldsChanged =
    0;

  let teamAssignmentsChanged =
    0;

  let jerseyNumbersChanged =
    0;

  const jerseyNumberChanges = [];

  const pendingDestinationJerseyRules = [];

  function requirePlayerRecord(
    row,
    label
  ) {
    const record =
      playerTable.records?.[
        row
      ];

    if (
      !record ||
      record.isEmpty ||
      !record.fields
    ) {
      throw new Error(
        `Could not resolve ${label} at Player row ${row}. Nothing was saved.`
      );
    }

    return record;
  }

  function playerName(record) {
    return [
      toText(record.FirstName),
      toText(record.LastName)
    ]
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  function getSortedCommittedPlayerFields(
    record
  ) {
    return Object.keys(
      record?.fields ??
      record ??
      {}
    )
      .filter(
        fieldName =>
          /^Player\d+$/.test(
            fieldName
          )
      )
      .sort(
        (left, right) =>
          Number.parseInt(
            left.replace(
              'Player',
              ''
            ),
            10
          ) -
          Number.parseInt(
            right.replace(
              'Player',
              ''
            ),
            10
          )
      );
  }

  async function removeSignedRecruitFromCommittedPlayers(
    proposal
  ) {
    const teamRecord =
      (teamTable.records ?? [])
        .find(
          record =>
            toInteger(
              record?.TeamIndex,
              -1
            ) ===
              proposal.teamIndex
        );

    if (!teamRecord) {
      throw new Error(
        `Could not resolve Team ${proposal.teamIndex} while releasing ${proposal.playerName}.`
      );
    }

    const committedReference =
      decodeTableReference(
        teamRecord.CommittedPlayers,
        tableIdMap
      );

    if (!committedReference?.table) {
      throw new Error(
        `${proposal.teamName} has an invalid CommittedPlayers reference. Nothing was saved.`
      );
    }

    await mutedReadRecords(
      committedReference.table
    );

    const expectedPlayerReference =
      toText(
        proposal.playerReference
      );

    let removed = 0;
    let compactedRows = 0;

    for (
      const committedRecord
      of committedReference.table.records ?? []
    ) {
      if (
        !committedRecord ||
        !committedRecord.fields
      ) {
        continue;
      }

      const playerFields =
        getSortedCommittedPlayerFields(
          committedRecord
        );

      if (
        playerFields.length !== 35 ||
        playerFields[0] !== 'Player0' ||
        playerFields[34] !== 'Player34'
      ) {
        continue;
      }

      const retainedReferences = [];
      let removedFromRow = 0;

      for (
        const fieldName
        of playerFields
      ) {
        const value =
          toText(
            committedRecord[
              fieldName
            ]
          );

        if (
          value ===
            expectedPlayerReference
        ) {
          removed++;
          removedFromRow++;
          continue;
        }

        if (
          /^[01]{32}$/.test(value) &&
          value !==
            ZERO_REFERENCE
        ) {
          retainedReferences.push(
            value
          );
        }
      }

      if (!removedFromRow) {
        continue;
      }

      for (
        let index = 0;
        index < playerFields.length;
        index++
      ) {
        committedRecord[
          playerFields[index]
        ] =
          retainedReferences[index] ??
          ZERO_REFERENCE;
      }

      compactedRows++;
    }

    return {
      removed,
      compactedRows,
      alreadyAbsent:
        removed === 0
    };
  }


  async function applyRosterStoreDuplicateCleanup(
    proposal
  ) {
    const teamRecord =
      teamByIndex.get(
        proposal.teamIndex
      );

    if (
      !teamRecord ||
      !psNsdHasField(
        teamRecord,
        'Roster'
      )
    ) {
      throw new Error(
        `${proposal.teamName} no longer has a valid Roster reference. Run the analysis again.`
      );
    }

    const rosterField =
      teamRecord.fields.Roster;

    if (
      !rosterField.isReference ||
      !rosterField.referenceData
    ) {
      throw new Error(
        `${proposal.teamName} Roster reference is no longer valid. Run the analysis again.`
      );
    }

    const rosterTable =
      await psNsdCreateTableResolver(
        franchise
      )(
        rosterField.referenceData.tableId
      );

    const rosterRecord =
      rosterTable?.records?.[
        rosterField.referenceData.rowNumber
      ];

    if (
      !rosterRecord ||
      !rosterRecord.fields
    ) {
      throw new Error(
        `${proposal.teamName} RosterStore row could not be resolved. Run the analysis again.`
      );
    }

    const playerTableId =
      getTableId(
        playerTable
      );

    const slotNames =
      Object.keys(
        rosterRecord.fields
      )
        .filter(
          slotName =>
            rosterRecord.fields[
              slotName
            ]?.isReference
        );

    const matchingSlots =
      slotNames.filter(
        slotName => {
          const reference =
            rosterRecord.fields[
              slotName
            ]?.referenceData;

          return (
            reference &&
            Number(
              reference.tableId
            ) ===
              Number(
                playerTableId
              ) &&
            Number(
              reference.rowNumber
            ) ===
              Number(
                proposal.playerRow
              )
          );
        }
      );

    if (
      matchingSlots.length <= 1
    ) {
      return {
        removed:
          0,
        keptSlot:
          matchingSlots[0] ??
          '',
        alreadyClean:
          true
      };
    }

    const keptSlot =
      matchingSlots[0];

    const duplicateSlots =
      new Set(
        matchingSlots.slice(1)
      );

    const result =
      psNsdResortPositionSlotGroup(
        rosterRecord,
        playerTable,
        playerTableId,
        row =>
          Number(row) ===
            Number(
              proposal.playerRow
            )
      );

    const recordIndexesToRestore = [
      proposal.playerRow
    ];

    psNsdResortPositionSlotGroup(
      rosterRecord,
      playerTable,
      playerTableId,
      () =>
        false,
      recordIndexesToRestore
    );

    return {
      removed:
        matchingSlots.length - 1,
      keptSlot,
      duplicateSlots:
        [
          ...duplicateSlots
        ],
      alreadyClean:
        false,
      changedCount:
        result.changedCount
    };
  }

  function resetTeamMovementFields(
    record
  ) {
    if (
      psNsdHasField(
        record,
        'PLYR_CONSECYEARSWITHTEAM'
      )
    ) {
      record.PLYR_CONSECYEARSWITHTEAM =
        0;
    }

    if (
      psNsdHasField(
        record,
        'BaseNILValue'
      )
    ) {
      record.BaseNILValue =
        0;
    }

    if (
      psNsdHasField(
        record,
        'CurrentNILCompensation'
      )
    ) {
      record.CurrentNILCompensation =
        0;
    }
  }

  for (
    const proposal
    of selectedProposals
  ) {
    if (
      proposal.proposalType ===
      'ROSTERSTORE_DUPLICATE_CLEANUP'
    ) {
      const cleanupResult =
        await applyRosterStoreDuplicateCleanup(
          proposal
        );

      involvedTeamIndexes.add(
        proposal.teamIndex
      );

      rosterStoreDuplicateCleanupsApplied++;

      duplicateRosterStoreSlotsRemoved +=
        cleanupResult.removed;

      changes.push({
        proposalId:
          proposal.proposalId,
        type:
          proposal.proposalType,
        playerName:
          proposal.playerName,
        description:
          cleanupResult.alreadyClean
            ? `DUPLICATE ROSTER ENTRY already clean: ${proposal.playerName}`
            : `DUPLICATE ROSTER ENTRY removed: kept one ${proposal.playerName} reference and removed ${cleanupResult.removed} duplicate RosterStore slot(s)`
      });

      continue;
    }

    if (
      proposal.proposalType ===
      'INTERNAL_POSITION_CHANGE'
    ) {
      const record =
        requirePlayerRecord(
          proposal.playerRow,
          proposal.playerName
        );

      if (
        toInteger(
          record.TeamIndex,
          FCS_POOL_TEAM_INDEX
        ) !==
          proposal.teamIndex ||
        toText(
          record.Position
        ) !==
          proposal.currentPosition ||
        toText(
          record.PlayerType
        ) !==
          proposal.currentPlayerType ||
        toInteger(
          record.OverallRating,
          -1
        ) !==
          proposal.currentStoredOverall
      ) {
        throw new Error(
          `${proposal.playerName} no longer matches the analyzed internal position-change proposal. Run the analysis again.`
        );
      }

      if (
        toText(record.Position) !==
        proposal.destinationPosition
      ) {
        record.Position =
          proposal.destinationPosition;

        positionFieldsChanged++;
      }

      if (
        toText(record.PlayerType) !==
        proposal.destinationPlayerType
      ) {
        record.PlayerType =
          proposal.destinationPlayerType;

        playerTypeFieldsChanged++;
      }

      if (
        toInteger(
          record.OverallRating,
          -1
        ) !==
        proposal.destinationOverall
      ) {
        record.OverallRating =
          proposal.destinationOverall;

        overallFieldsChanged++;
      }

      if (
        Number.isInteger(
          proposal.proposedStoredWeight
        ) &&
        toInteger(
          record.Weight,
          -1
        ) !==
          proposal.proposedStoredWeight
      ) {
        record.Weight =
          proposal.proposedStoredWeight;

        weightFieldsChanged++;
      }

      involvedTeamIndexes.add(
        proposal.teamIndex
      );

      if (
        OFFENSIVE_LINE_POSITIONS.has(
          proposal.destinationPosition
        ) ||
        DEFENSIVE_BACK_POSITIONS.has(
          proposal.destinationPosition
        )
      ) {
        pendingDestinationJerseyRules.push({
          proposalId:
            proposal.proposalId,
          playerRow:
            proposal.playerRow,
          playerName:
            proposal.playerName,
          teamIndex:
            proposal.teamIndex,
          destinationPosition:
            proposal.destinationPosition,
          record
        });
      }

      internalPositionChangesApplied++;

      if (
        proposal.mirrorRebalance ===
        true
      ) {
        mirrorRebalancesApplied++;
      }

      changes.push({
        proposalId:
          proposal.proposalId,
        type:
          proposal.proposalType,
        playerName:
          proposal.playerName,
        description:
          `${proposal.currentPosition} → ${proposal.destinationPosition}`
      });

      continue;
    }

    if (
      proposal.proposalType ===
      'UNSIGNED_RECRUIT_FILL'
    ) {
      const recruitRecord =
        recruitTableInfo.table.records?.[
          proposal.recruitRow
        ];

      if (
        !isUsableRecord(recruitRecord) ||
        toText(recruitRecord.Player) !==
          toText(proposal.playerReference) ||
        [
          'hardcommitted',
          'signed',
          'invalid'
        ].includes(
          toText(
            recruitRecord.RecruitStage
          ).toLowerCase()
        )
      ) {
        throw new Error(
          `${proposal.playerName} is no longer an eligible remaining unsigned recruit. Run the analysis again.`
        );
      }

      const playerReference =
        decodeTableReference(
          recruitRecord.Player,
          tableIdMap
        );

      const record =
        playerReference?.table?.records?.[
          playerReference.row
        ];

      if (
        !playerReference ||
        !isUsableRecord(record) ||
        Number(playerReference.row) !==
          Number(proposal.playerRow) ||
        toInteger(
          record.TeamIndex,
          -1
        ) !== FCS_POOL_TEAM_INDEX ||
        toText(record.Position) !==
          proposal.position ||
        toInteger(
          record.OverallRating,
          -1
        ) !== proposal.storedOverall
      ) {
        throw new Error(
          `${proposal.playerName} no longer matches the analyzed unsigned recruit fill proposal. Run the analysis again.`
        );
      }

      record.TeamIndex =
        proposal.teamIndex;

      resetTeamMovementFields(record);

      if (
        clearRecruitingDealbreakers &&
        psNsdHasField(
          record,
          'RecruitingDealbreaker'
        )
      ) {
        record.RecruitingDealbreaker =
          'Invalid';
      }

      recruitRecord.RecruitStage =
        'Invalid';

      involvedTeamIndexes.add(
        proposal.teamIndex
      );

      recruitStagesChanged++;
      teamAssignmentsChanged++;
      unsignedRecruitFillsApplied++;

      if (
        proposal.unsignedPlayerType ===
          'Unsigned Transfer'
      ) {
        unsignedRecruitFillsAppliedTransfers++;
      } else {
        unsignedRecruitFillsAppliedRecruits++;
      }

      changes.push({
        proposalId:
          proposal.proposalId,
        type:
          proposal.proposalType,
        playerName:
          proposal.playerName,
        description:
          `Remaining unsigned recruit placed directly on ${proposal.teamName}; RecruitStage ${proposal.recruitStageBefore} → Invalid; Team.CommittedPlayers and recruiting board were not changed`
      });

      continue;
    }

    if (
      proposal.proposalType ===
      'TALENT_RESCUE_SWAP'
    ) {
      const recruitRecord =
        recruitTableInfo.table.records?.[
          proposal.incomingRecruitRow
        ];

      if (
        !isUsableRecord(
          recruitRecord
        ) ||
        toText(
          recruitRecord.Player
        ) !==
          toText(
            proposal.incomingPlayerReference
          ) ||
        [
          'hardcommitted',
          'signed',
          'invalid'
        ].includes(
          toText(
            recruitRecord.RecruitStage
          ).toLowerCase()
        )
      ) {
        throw new Error(
          `${proposal.incomingPlayerName} is no longer an eligible unsigned Talent Rescue player. Run Preview Roster Plan again.`
        );
      }

      const outgoing =
        requirePlayerRecord(
          proposal.outgoingPlayerRow,
          proposal.outgoingPlayerName
        );

      const incoming =
        requirePlayerRecord(
          proposal.incomingPlayerRow,
          proposal.incomingPlayerName
        );

      if (
        toInteger(
          outgoing.TeamIndex,
          FCS_POOL_TEAM_INDEX
        ) !==
          proposal.teamIndex ||
        toText(
          outgoing.Position
        ) !==
          proposal.position ||
        toInteger(
          outgoing.OverallRating,
          -1
        ) !==
          proposal.outgoingStoredOverall
      ) {
        throw new Error(
          `${proposal.outgoingPlayerName} no longer matches the Talent Rescue preview. Run Preview Roster Plan again.`
        );
      }

      if (
        toInteger(
          incoming.TeamIndex,
          -1
        ) !==
          FCS_POOL_TEAM_INDEX ||
        toText(
          incoming.Position
        ) !==
          proposal.position ||
        toInteger(
          incoming.OverallRating,
          -1
        ) !==
          proposal.incomingStoredOverall ||
        proposal.incomingStoredOverall <
          freshAnalysis.finalTalentRescue
            .minimumUnsignedOverall ||
        proposal.outgoingStoredOverall >
          freshAnalysis.finalTalentRescue
            .maximumReplacedOverall ||
        FINAL_TALENT_RESCUE_EXCLUDED_POSITIONS
          .has(
            proposal.position
          )
      ) {
        throw new Error(
          `${proposal.incomingPlayerName} no longer matches the 70+ Talent Rescue preview. Run Preview Roster Plan again.`
        );
      }

      if (
        proposal.incomingStoredOverall <=
        proposal.outgoingStoredOverall
      ) {
        throw new Error(
          `Talent Rescue is no longer an upgrade for ${proposal.teamName}. Run Preview Roster Plan again.`
        );
      }

      outgoing.TeamIndex =
        FCS_POOL_TEAM_INDEX;

      incoming.TeamIndex =
        proposal.teamIndex;

      resetTeamMovementFields(
        outgoing
      );

      resetTeamMovementFields(
        incoming
      );

      if (
        clearRecruitingDealbreakers &&
        psNsdHasField(
          incoming,
          'RecruitingDealbreaker'
        )
      ) {
        incoming.RecruitingDealbreaker =
          'Invalid';
      }

      recruitRecord.RecruitStage =
        'Invalid';

      involvedTeamIndexes.add(
        proposal.teamIndex
      );

      recruitStagesChanged++;

      teamAssignmentsChanged +=
        2;

      talentRescueSwapsApplied++;

      changes.push({
        proposalId:
          proposal.proposalId,
        type:
          proposal.proposalType,
        playerName:
          `${proposal.outgoingPlayerName} / ${proposal.incomingPlayerName}`,
        description:
          `Final Talent Rescue: ${proposal.outgoingPlayerName} (${proposal.outgoingStoredOverall} OVR) to Unassigned Players; ${proposal.incomingPlayerName} (${proposal.incomingStoredOverall} OVR) to ${proposal.teamName}; RecruitStage → Invalid`
      });

      continue;
    }

    if (
      proposal.proposalType ===
      'FCS_POOL_TRADE'
    ) {
      const outgoing =
        requirePlayerRecord(
          proposal.outgoingPlayerRow,
          proposal.outgoingPlayerName
        );

      const incoming =
        requirePlayerRecord(
          proposal.incomingPlayerRow,
          proposal.incomingPlayerName
        );

      if (
        toInteger(
          outgoing.TeamIndex,
          FCS_POOL_TEAM_INDEX
        ) !==
          proposal.teamIndex ||
        toText(
          outgoing.Position
        ) !==
          proposal.outgoingPosition
      ) {
        throw new Error(
          `${proposal.outgoingPlayerName} no longer matches the analyzed outgoing FCS trade proposal. Run the analysis again.`
        );
      }

      if (
        toInteger(
          incoming.TeamIndex,
          -1
        ) !==
          FCS_POOL_TEAM_INDEX ||
        toText(
          incoming.Position
        ) !==
          proposal.incomingPosition ||
        toInteger(
          incoming.OverallRating,
          -1
        ) !==
          proposal.incomingOverall
      ) {
        throw new Error(
          `${proposal.incomingPlayerName} is no longer an eligible unassigned FCS pool player. Run the analysis again.`
        );
      }

      outgoing.TeamIndex =
        FCS_POOL_TEAM_INDEX;

      incoming.TeamIndex =
        proposal.teamIndex;

      resetTeamMovementFields(
        outgoing
      );

      resetTeamMovementFields(
        incoming
      );

      involvedTeamIndexes.add(
        proposal.teamIndex
      );

      teamAssignmentsChanged +=
        2;

      fcsPoolTradesApplied++;

      changes.push({
        proposalId:
          proposal.proposalId,
        type:
          proposal.proposalType,
        playerName:
          `${proposal.outgoingPlayerName} / ${proposal.incomingPlayerName}`,
        description:
          `${proposal.outgoingPlayerName} to Unassigned Players; ${proposal.incomingPlayerName} to ${proposal.teamName}`
      });

      continue;
    }

    if (
      proposal.proposalType ===
      'SIGNED_RECRUIT_RELEASE'
    ) {
      const recruitRecord =
        recruitTableInfo.table.records?.[
          proposal.recruitRow
        ];

      if (
        !isUsableRecord(
          recruitRecord
        ) ||
        toText(
          recruitRecord.Player
        ) !==
          toText(
            proposal.playerReference
          ) ||
        toText(
          recruitRecord.RecruitStage
        ) !==
          'Signed'
      ) {
        throw new Error(
          `${proposal.playerName} no longer matches the analyzed Signed recruit release proposal. Run the analysis again.`
        );
      }

      const playerReference =
        decodeTableReference(
          recruitRecord.Player,
          tableIdMap
        );

      const playerRecord =
        playerReference?.table?.records?.[
          playerReference.row
        ];

      if (
        !playerReference ||
        !isUsableRecord(
          playerRecord
        ) ||
        playerReference.row !==
          proposal.playerRow ||
        toText(
          playerRecord.Position
        ) !==
          proposal.position
      ) {
        throw new Error(
          `${proposal.playerName} no longer has the analyzed linked Player record. Run the analysis again.`
        );
      }

      const committedRemoval =
        await removeSignedRecruitFromCommittedPlayers(
          proposal
        );

      recruitRecord.RecruitStage =
        'Top10';

      committedPlayerReferencesRemoved +=
        committedRemoval.removed;

      recruitStagesChanged++;

      signedRecruitReleasesApplied++;

      involvedTeamIndexes.add(
        proposal.teamIndex
      );

      changes.push({
        proposalId:
          proposal.proposalId,
        type:
          proposal.proposalType,
        playerName:
          proposal.playerName,
        description:
          committedRemoval.alreadyAbsent
            ? `Player never reported to campus; Signed → Top10; Player reference was already absent from all CommittedPlayers rows`
            : `Player never reported to campus; Signed → Top10; removed ${committedRemoval.removed} Player reference(s) from ${committedRemoval.compactedRows} CommittedPlayers row(s)`
      });

      continue;
    }

    if (
      proposal.proposalType ===
      'FCS_POOL_CUT'
    ) {
      const record =
        requirePlayerRecord(
          proposal.playerRow,
          proposal.playerName
        );

      if (
        toInteger(
          record.TeamIndex,
          FCS_POOL_TEAM_INDEX
        ) !==
          proposal.teamIndex ||
        toText(
          record.Position
        ) !==
          proposal.position ||
        toInteger(
          record.OverallRating,
          -1
        ) !==
          proposal.storedOverall
      ) {
        throw new Error(
          `${proposal.playerName} no longer matches the analyzed FCS cut proposal. Run the analysis again.`
        );
      }

      record.TeamIndex =
        FCS_POOL_TEAM_INDEX;

      resetTeamMovementFields(
        record
      );

      involvedTeamIndexes.add(
        proposal.teamIndex
      );

      teamAssignmentsChanged++;

      fcsPoolCutsApplied++;

      changes.push({
        proposalId:
          proposal.proposalId,
        type:
          proposal.proposalType,
        playerName:
          proposal.playerName,
        description:
          `${proposal.teamName} → Unassigned Players`
      });

      continue;
    }

    throw new Error(
      `Unsupported selected proposal type: ${proposal.proposalType}`
    );
  }

  const pendingRows =
    new Set(
      pendingDestinationJerseyRules.map(
        item =>
          item.playerRow
      )
    );

  const usedJerseyNumbersByTeam =
    new Map();

  for (
    let playerRow = 0;
    playerRow <
      (playerTable.records ?? []).length;
    playerRow++
  ) {
    if (
      pendingRows.has(
        playerRow
      )
    ) {
      continue;
    }

    const record =
      playerTable.records[
        playerRow
      ];

    if (
      !record ||
      record.isEmpty ||
      !record.fields
    ) {
      continue;
    }

    const teamIndex =
      toInteger(
        record.TeamIndex,
        FCS_POOL_TEAM_INDEX
      );

    if (
      teamIndex ===
      FCS_POOL_TEAM_INDEX
    ) {
      continue;
    }

    const jerseyNumber =
      toInteger(
        record.JerseyNum,
        -1
      );

    if (
      jerseyNumber < 0
    ) {
      continue;
    }

    if (
      !usedJerseyNumbersByTeam.has(
        teamIndex
      )
    ) {
      usedJerseyNumbersByTeam.set(
        teamIndex,
        new Set()
      );
    }

    usedJerseyNumbersByTeam
      .get(teamIndex)
      .add(jerseyNumber);
  }

  pendingDestinationJerseyRules.sort(
    (left, right) =>
      left.teamIndex -
        right.teamIndex ||
      left.playerRow -
        right.playerRow
  );

  for (
    const pending
    of pendingDestinationJerseyRules
  ) {
    const range =
      OFFENSIVE_LINE_POSITIONS.has(
        pending.destinationPosition
      )
        ? {
            minimum: 50,
            maximum: 79,
            label:
              'offensive line'
          }
        : {
            minimum: 1,
            maximum: 39,
            label:
              'defensive back'
          };

    if (
      !usedJerseyNumbersByTeam.has(
        pending.teamIndex
      )
    ) {
      usedJerseyNumbersByTeam.set(
        pending.teamIndex,
        new Set()
      );
    }

    const used =
      usedJerseyNumbersByTeam.get(
        pending.teamIndex
      );

    const currentJerseyNumber =
      toInteger(
        pending.record.JerseyNum,
        -1
      );

    const currentIsValidAndAvailable =
      currentJerseyNumber >=
        range.minimum &&
      currentJerseyNumber <=
        range.maximum &&
      !used.has(
        currentJerseyNumber
      );

    let assignedJerseyNumber =
      currentJerseyNumber;

    if (
      !currentIsValidAndAvailable
    ) {
      assignedJerseyNumber =
        -1;

      for (
        let candidate =
          range.minimum;
        candidate <=
          range.maximum;
        candidate++
      ) {
        if (
          !used.has(
            candidate
          )
        ) {
          assignedJerseyNumber =
            candidate;

          break;
        }
      }

      if (
        assignedJerseyNumber < 0
      ) {
        throw new Error(
          `${pending.playerName} moved to ${pending.destinationPosition}, but no unused ${range.label} jersey number is available from ${range.minimum} through ${range.maximum}. Nothing was saved.`
        );
      }

      pending.record.JerseyNum =
        assignedJerseyNumber;

      jerseyNumbersChanged++;

      jerseyNumberChanges.push({
        proposalId:
          pending.proposalId,
        playerRow:
          pending.playerRow,
        playerName:
          pending.playerName,
        teamIndex:
          pending.teamIndex,
        destinationPosition:
          pending.destinationPosition,
        oldJerseyNumber:
          currentJerseyNumber,
        newJerseyNumber:
          assignedJerseyNumber,
        allowedMinimum:
          range.minimum,
        allowedMaximum:
          range.maximum
      });

      const change =
        changes.find(
          item =>
            item.proposalId ===
            pending.proposalId
        );

      if (change) {
        change.description +=
          `; jersey #${currentJerseyNumber} → #${assignedJerseyNumber}`;
      }
    }

    used.add(
      assignedJerseyNumber
    );
  }

  const targetTeamIndexes =
    [
      ...involvedTeamIndexes
    ]
      .filter(
        value =>
          value !==
          FCS_POOL_TEAM_INDEX &&
          teamByIndex.has(
            value
          )
      );

  if (!targetTeamIndexes.length) {
    throw new Error(
      'No real team was affected by the selected proposals.'
    );
  }

  const expectedRecordIndexesByTeam =
    new Map(
      targetTeamIndexes.map(
        teamIndex => [
          teamIndex,
          new Set()
        ]
      )
    );

  for (
    let recordIndex = 0;
    recordIndex <
      (playerTable.records ?? []).length;
    recordIndex++
  ) {
    const record =
      playerTable.records[
        recordIndex
      ];

    if (
      !record ||
      record.isEmpty ||
      !record.fields
    ) {
      continue;
    }

    const teamIndex =
      toInteger(
        record.TeamIndex,
        FCS_POOL_TEAM_INDEX
      );

    if (
      expectedRecordIndexesByTeam.has(
        teamIndex
      )
    ) {
      expectedRecordIndexesByTeam
        .get(teamIndex)
        .add(recordIndex);
    }
  }

  const resolveTableById =
    psNsdCreateTableResolver(
      franchise
    );

  const rosterRepair =
    await psNsdReconcileRosterStore({
      targetTeamIndexes,
      playerTable,
      teamByIndex,
      teamNameByIndex,
      resolveTableById,
      expectedRecordIndexesByTeam
    });

  const depthChartRepair =
    await psNsdReconcileDepthCharts({
      targetTeamIndexes,
      playerTable,
      teamByIndex,
      teamNameByIndex,
      resolveTableById,
      expectedRecordIndexesByTeam
    });

  const rosterSyncReport =
    psNsdMergeRepairEntries(
      rosterRepair.entries,
      depthChartRepair.entries
    );

  const warnings = [
    ...rosterRepair.warnings,
    ...depthChartRepair.warnings
  ];

  const backup =
    psNsdBackupBeforeSave(
      resolvedInput,
      'before-nsd-roster-balance'
    );

  if (backup.backupError) {
    warnings.push(
      `Could not create a backup before saving: ${backup.backupError}`
    );
  }

  await psNsdAtomicSave(
    franchise,
    resolvedOutput
  );

  return {
    moduleId:
      nsdRosterBalancerModule.id,
    moduleName:
      nsdRosterBalancerModule.name,
    phase: 7,
    inputPath:
      resolvedInput,
    outputPath:
      resolvedOutput,
    overwrittenOriginal:
      path.resolve(resolvedInput) ===
      path.resolve(resolvedOutput),
    backupPath:
      backup.backupPath,
    seasonInfoTableIndex:
      weekCheck.seasonInfoTableIndex,
    currentWeekType:
      weekCheck.currentWeekType,
    currentWeek:
      weekCheck.currentWeek,
    currentOffseasonStage:
      weekCheck.currentOffseasonStage,
    applyScope:
      normalizedApplyScope,

    includeUserControlledTeams:
      Boolean(
        includeUserControlledTeams
      ),

    selectedTeamIndex:
      normalizedSelectedTeamIndex,
    proposalTeamsAffected:
      affectedProposalTeamIndexes.length,
    selectedProposalCount:
      selectedProposals.length,
    // Mirrors analyzeRosterBalance's preview-mode summary field names so
    // the UI's summary.<field> reads work identically for both preview
    // and apply results, instead of always falling back to {} on apply.
    summary: {
      internalPositionChangeProposals:
        internalPositionChangesApplied,
      mirrorRebalanceProposals:
        mirrorRebalancesApplied,
      unsignedRecruitFillProposals:
        unsignedRecruitFillsApplied,
      fcsPoolTradeProposals:
        fcsPoolTradesApplied,
      talentRescueProposals:
        talentRescueSwapsApplied,
      fcsPoolCutProposals:
        fcsPoolCutsApplied
    },
    rosterStoreDuplicateCleanupsApplied,
    duplicateRosterStoreSlotsRemoved,
    internalPositionChangesApplied,
    mirrorRebalancesApplied,
    unsignedRecruitFillsApplied,
    unsignedRecruitFillsAppliedRecruits,
    unsignedRecruitFillsAppliedTransfers,
    fcsPoolTradesApplied,
    talentRescueSwapsApplied,
    fcsPoolCutsApplied,
    signedRecruitReleasesApplied,
    committedPlayerReferencesRemoved,
    recruitStagesChanged,
    positionFieldsChanged,
    playerTypeFieldsChanged,
    overallFieldsChanged,
    weightFieldsChanged,
    teamAssignmentsChanged,
    jerseyNumbersChanged,
    jerseyNumberChanges,
    teamsReconciled:
      targetTeamIndexes.length,
    rosterSyncReport,
    warnings,
    changes,
    finalDispositionAssignments
  };
}

function psNsdHasField(
  record,
  fieldName
) {
  return Boolean(
    record?.fields &&
    Object.prototype
      .hasOwnProperty
      .call(
        record.fields,
        fieldName
      )
  );
}

function psNsdBuildTeamByIndex(
  teamTable
) {
  const result =
    new Map();

  for (
    const record
    of teamTable.records ?? []
  ) {
    if (
      !record ||
      record.isEmpty ||
      !record.fields ||
      !psNsdHasField(
        record,
        'TeamIndex'
      )
    ) {
      continue;
    }

    const teamIndex =
      toInteger(
        record.TeamIndex,
        -1
      );

    if (
      teamIndex >= 0 &&
      teamIndex <
        FCS_POOL_TEAM_INDEX
    ) {
      result.set(
        teamIndex,
        record
      );
    }
  }

  return result;
}

function psNsdBuildTeamNameByIndex(
  teamTable
) {
  const result =
    new Map();

  for (
    const record
    of teamTable.records ?? []
  ) {
    if (
      !record ||
      record.isEmpty ||
      !record.fields ||
      !psNsdHasField(
        record,
        'TeamIndex'
      )
    ) {
      continue;
    }

    const teamIndex =
      toInteger(
        record.TeamIndex,
        -1
      );

    if (
      teamIndex < 0 ||
      teamIndex >=
        FCS_POOL_TEAM_INDEX
    ) {
      continue;
    }

    result.set(
      teamIndex,
      toText(
        record.DisplayName
      ) ||
      toText(
        record.LongName
      ) ||
      `Team ${teamIndex}`
    );
  }

  return result;
}

function psNsdIsEmptyPlayerSlot(
  slotField,
  playerTable,
  playerTableId
) {
  const reference =
    slotField?.referenceData;

  if (
    !reference ||
    Number(
      reference.tableId
    ) !==
      Number(
        playerTableId
      )
  ) {
    return true;
  }

  const record =
    playerTable.records?.[
      reference.rowNumber
    ];

  return (
    !record ||
    record.isEmpty
  );
}

function psNsdResortPositionSlotGroup(
  arrayRecord,
  playerTable,
  playerTableId,
  shouldRemove,
  recordIndexesToAdd = []
) {
  const slotNames =
    Object.keys(
      arrayRecord.fields ?? {}
    )
      .filter(name => {
        const field =
          arrayRecord.fields[
            name
          ];

        return Boolean(
          field &&
          field.isReference
        );
      });

  if (!slotNames.length) {
    return {
      changedCount: 0,
      kept: [],
      dropped: []
    };
  }

  const firstValue =
    toText(
      arrayRecord.fields[
        slotNames[0]
      ].value
    );

  const emptyTemplate =
    '0'.repeat(
      firstValue.length
    );

  const present = [];
  const seen =
    new Set();

  for (
    const slotName
    of slotNames
  ) {
    const slotField =
      arrayRecord.fields[
        slotName
      ];

    if (
      psNsdIsEmptyPlayerSlot(
        slotField,
        playerTable,
        playerTableId
      )
    ) {
      continue;
    }

    const reference =
      slotField.referenceData;

    const row =
      Number(
        reference.rowNumber
      );

    if (
      shouldRemove(row) ||
      seen.has(row)
    ) {
      continue;
    }

    seen.add(row);
    present.push(row);
  }

  for (
    const recordIndex
    of recordIndexesToAdd
  ) {
    if (
      seen.has(
        recordIndex
      )
    ) {
      continue;
    }

    const record =
      playerTable.records?.[
        recordIndex
      ];

    if (
      !record ||
      record.isEmpty
    ) {
      continue;
    }

    seen.add(
      recordIndex
    );

    present.push(
      recordIndex
    );
  }

  present.sort(
    (left, right) =>
      toInteger(
        playerTable.records?.[
          right
        ]?.OverallRating,
        0
      ) -
      toInteger(
        playerTable.records?.[
          left
        ]?.OverallRating,
        0
      )
  );

  const kept =
    present.slice(
      0,
      slotNames.length
    );

  const dropped =
    present.slice(
      slotNames.length
    );

  let changedCount =
    0;

  for (
    let index = 0;
    index <
      slotNames.length;
    index++
  ) {
    const slotName =
      slotNames[index];

    const slotField =
      arrayRecord.fields[
        slotName
      ];

    const newValue =
      index <
        kept.length
        ? playerTable
            .getBinaryReferenceToRecord(
              kept[index]
            )
        : emptyTemplate;

    if (
      slotField.value !==
      newValue
    ) {
      arrayRecord[
        slotName
      ] =
        newValue;

      changedCount++;
    }
  }

  return {
    changedCount,
    kept,
    dropped
  };
}

function psNsdCreateTableResolver(
  franchise
) {
  const cache =
    new Map();

  return async function resolveTableById(
    tableId
  ) {
    if (
      cache.has(
        tableId
      )
    ) {
      return cache.get(
        tableId
      );
    }

    let found =
      null;

    let misses =
      0;

    for (
      let index = 0;
      index < 10000 &&
        misses < 50;
      index++
    ) {
      let table =
        null;

      try {
        table =
          franchise
            .getTableByIndex(
              index
            );
      } catch {
        misses++;
        continue;
      }

      if (!table) {
        misses++;
        continue;
      }

      misses =
        0;

      if (
        Number(
          getTableId(table)
        ) ===
        Number(tableId)
      ) {
        found =
          table;

        break;
      }
    }

    if (found) {
      await mutedReadRecords(
        found
      );
    }

    cache.set(
      tableId,
      found
    );

    return found;
  };
}

async function psNsdResolveDepthChartRecord(
  teamByIndex,
  teamIndex,
  resolveTableById
) {
  const teamRecord =
    teamByIndex.get(
      teamIndex
    );

  if (
    !teamRecord ||
    !psNsdHasField(
      teamRecord,
      'DepthChart'
    )
  ) {
    return null;
  }

  const field =
    teamRecord.fields.DepthChart;

  if (
    !field.isReference ||
    !field.referenceData
  ) {
    return null;
  }

  const table =
    await resolveTableById(
      field.referenceData.tableId
    );

  const record =
    table?.records?.[
      field.referenceData.rowNumber
    ];

  return (
    record?.fields
      ? record
      : null
  );
}

async function psNsdReconcileRosterStore({
  targetTeamIndexes,
  playerTable,
  teamByIndex,
  teamNameByIndex,
  resolveTableById,
  expectedRecordIndexesByTeam
}) {
  const playerTableId =
    getTableId(
      playerTable
    );

  const entries = [];
  const warnings = [];

  for (
    const teamIndex
    of targetTeamIndexes
  ) {
    const teamLabel =
      teamNameByIndex.get(
        teamIndex
      ) ??
      `Team ${teamIndex}`;

    try {
      const teamRecord =
        teamByIndex.get(
          teamIndex
        );

      if (
        !teamRecord ||
        !psNsdHasField(
          teamRecord,
          'Roster'
        )
      ) {
        warnings.push(
          `Roster sync skipped for ${teamLabel}: no Roster reference was found.`
        );

        continue;
      }

      const rosterField =
        teamRecord.fields.Roster;

      if (
        !rosterField.isReference ||
        !rosterField.referenceData
      ) {
        continue;
      }

      const rosterTable =
        await resolveTableById(
          rosterField.referenceData.tableId
        );

      const rosterRecord =
        rosterTable?.records?.[
          rosterField.referenceData.rowNumber
        ];

      if (
        !rosterRecord ||
        !rosterRecord.fields
      ) {
        warnings.push(
          `Roster sync skipped for ${teamLabel}: the linked RosterStore row could not be resolved.`
        );

        continue;
      }

      const expected =
        expectedRecordIndexesByTeam.get(
          teamIndex
        ) ??
        new Set();

      const current =
        new Set();

      for (
        const slotName
        of Object.keys(
          rosterRecord.fields
        )
      ) {
        const slotField =
          rosterRecord.fields[
            slotName
          ];

        if (
          !slotField ||
          !slotField.isReference ||
          psNsdIsEmptyPlayerSlot(
            slotField,
            playerTable,
            playerTableId
          )
        ) {
          continue;
        }

        const reference =
          slotField.referenceData;

        if (
          Number(
            reference.tableId
          ) ===
            Number(
              playerTableId
            )
        ) {
          current.add(
            Number(
              reference.rowNumber
            )
          );
        }
      }

      const missing =
        [
          ...expected
        ]
          .filter(
            row =>
              !current.has(
                row
              )
          );

      const result =
        psNsdResortPositionSlotGroup(
          rosterRecord,
          playerTable,
          playerTableId,
          row =>
            !expected.has(
              row
            ),
          missing
        );

      const removedStaleEntries =
        [
          ...current
        ]
          .filter(
            row =>
              !expected.has(
                row
              )
          )
          .length;

      const addedMissingEntries =
        missing.filter(
          row =>
            result.kept.includes(
              row
            )
        )
          .length;

      if (
        result.dropped.length
      ) {
        warnings.push(
          `${teamLabel}'s roster store has no empty slots for ${result.dropped.length} player(s) who belong there per TeamIndex.`
        );
      }

      if (
        removedStaleEntries > 0 ||
        addedMissingEntries > 0
      ) {
        entries.push({
          teamIndex,
          displayName:
            teamLabel,
          removedStaleEntries,
          addedMissingEntries
        });
      }
    } catch (error) {
      warnings.push(
        `Roster sync failed for ${teamLabel}: ${error?.message || error}`
      );
    }
  }

  return {
    entries,
    warnings
  };
}

async function psNsdReconcileDepthCharts({
  targetTeamIndexes,
  playerTable,
  teamByIndex,
  teamNameByIndex,
  resolveTableById,
  expectedRecordIndexesByTeam
}) {
  const playerTableId =
    getTableId(
      playerTable
    );

  const entries = [];
  const warnings = [];

  for (
    const teamIndex
    of targetTeamIndexes
  ) {
    const teamLabel =
      teamNameByIndex.get(
        teamIndex
      ) ??
      `Team ${teamIndex}`;

    try {
      const depthChartRecord =
        await psNsdResolveDepthChartRecord(
          teamByIndex,
          teamIndex,
          resolveTableById
        );

      if (!depthChartRecord) {
        continue;
      }

      const expected =
        expectedRecordIndexesByTeam.get(
          teamIndex
        ) ??
        new Set();

      let resortedDepthChartSlots =
        0;

      const present =
        new Set();

      for (
        const fieldName
        of Object.keys(
          depthChartRecord.fields
        )
      ) {
        const field =
          depthChartRecord.fields[
            fieldName
          ];

        if (
          !field ||
          !field.isReference ||
          !field.referenceData ||
          Number(
            field.referenceData.tableId
          ) === 0
        ) {
          continue;
        }

        const arrayTable =
          await resolveTableById(
            field.referenceData.tableId
          );

        const arrayRecord =
          arrayTable?.records?.[
            field.referenceData.rowNumber
          ];

        if (
          !arrayRecord ||
          !arrayRecord.fields
        ) {
          continue;
        }

        const result =
          psNsdResortPositionSlotGroup(
            arrayRecord,
            playerTable,
            playerTableId,
            row =>
              !expected.has(
                row
              )
          );

        resortedDepthChartSlots +=
          result.changedCount;

        for (
          const row
          of result.kept
        ) {
          present.add(row);
        }
      }

      let addedMissingDepthChartEntries =
        0;

      for (
        const recordIndex
        of expected
      ) {
        const record =
          playerTable.records?.[
            recordIndex
          ];

        if (
          !record ||
          record.isEmpty ||
          present.has(
            recordIndex
          )
        ) {
          continue;
        }

        const position =
          toText(
            record.Position
          );

        if (
          !position ||
          !psNsdHasField(
            depthChartRecord,
            position
          )
        ) {
          continue;
        }

        const positionField =
          depthChartRecord.fields[
            position
          ];

        if (
          !positionField ||
          !positionField.isReference ||
          !positionField.referenceData ||
          Number(
            positionField.referenceData.tableId
          ) === 0
        ) {
          continue;
        }

        const arrayTable =
          await resolveTableById(
            positionField.referenceData.tableId
          );

        const arrayRecord =
          arrayTable?.records?.[
            positionField.referenceData.rowNumber
          ];

        if (
          !arrayRecord ||
          !arrayRecord.fields
        ) {
          continue;
        }

        const result =
          psNsdResortPositionSlotGroup(
            arrayRecord,
            playerTable,
            playerTableId,
            () =>
              false,
            [
              recordIndex
            ]
          );

        for (
          const row
          of result.kept
        ) {
          present.add(row);
        }

        if (
          !result.dropped.includes(
            recordIndex
          )
        ) {
          addedMissingDepthChartEntries++;
        }
      }

      if (
        resortedDepthChartSlots > 0 ||
        addedMissingDepthChartEntries > 0
      ) {
        entries.push({
          teamIndex,
          displayName:
            teamLabel,
          resortedDepthChartSlots,
          addedMissingDepthChartEntries
        });
      }
    } catch (error) {
      warnings.push(
        `Depth chart repair failed for ${teamLabel}: ${error?.message || error}`
      );
    }
  }

  return {
    entries,
    warnings
  };
}

function psNsdMergeRepairEntries(
  rosterEntries,
  depthChartEntries
) {
  const report =
    rosterEntries.map(
      entry => ({
        ...entry
      })
    );

  for (
    const depthEntry
    of depthChartEntries
  ) {
    const existing =
      report.find(
        entry =>
          entry.teamIndex ===
          depthEntry.teamIndex
      );

    if (existing) {
      existing.resortedDepthChartSlots =
        depthEntry.resortedDepthChartSlots;

      existing.addedMissingDepthChartEntries =
        depthEntry.addedMissingDepthChartEntries;
    } else {
      report.push({
        teamIndex:
          depthEntry.teamIndex,
        displayName:
          depthEntry.displayName,
        removedStaleEntries:
          0,
        addedMissingEntries:
          0,
        resortedDepthChartSlots:
          depthEntry.resortedDepthChartSlots,
        addedMissingDepthChartEntries:
          depthEntry.addedMissingDepthChartEntries
      });
    }
  }

  return report;
}

/*
 * Ghost City EPERM-resilient atomic save v1
 *
 * Windows can transiently deny opening a brand-new file for a moment after
 * creation (commonly Defender/AV real-time scanning grabbing it), and the
 * per-app Staging directory under AppData/Local can also end up with
 * permissions this process can't write to (e.g. if it was first created
 * while the app ran elevated). Either case surfaces as EPERM on open, not
 * on the earlier mkdir, so it was previously uncaught and fatal even
 * though the co-located fallback path (next to the real save, where this
 * app already successfully writes during Import/Apply) would have worked.
 *
 * This now (1) retries a handful of times on EPERM/EBUSY before giving up
 * on a given target, and (2) if the Staging-directory attempt still fails
 * after retries, falls back to the co-located temp file the same way the
 * cross-drive case already did, instead of throwing immediately.
 */
async function psNsdAttemptAtomicSave(
  franchise,
  temporaryOutput,
  resolvedOutput
) {
  const maxAttempts = 5;
  const retryDelayMs = 300;

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt++
  ) {
    try {
      await franchise.save(
        temporaryOutput
      );

      fs.renameSync(
        temporaryOutput,
        resolvedOutput
      );

      return;
    } catch (error) {
      try {
        if (
          fs.existsSync(
            temporaryOutput
          )
        ) {
          fs.unlinkSync(
            temporaryOutput
          );
        }
      } catch {
        // Best-effort cleanup only.
      }

      const isTransient =
        error &&
        (error.code === 'EPERM' ||
          error.code === 'EBUSY');

      if (
        !isTransient ||
        attempt === maxAttempts
      ) {
        throw error;
      }

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            retryDelayMs
          )
      );
    }
  }
}

async function psNsdAtomicSave(
  franchise,
  resolvedOutput
) {
  const tempFileName =
    `${path.basename(resolvedOutput)}.pstmp-${process.pid}-${Date.now()}`;

  const stagingDirectory =
    path.join(
      os.homedir(),
      'AppData',
      'Local',
      'PocketScout Utilities',
      'Staging'
    );

  let stagedOutput =
    null;

  try {
    if (
      path.parse(
        stagingDirectory
      ).root.toLowerCase() ===
      path.parse(
        resolvedOutput
      ).root.toLowerCase()
    ) {
      fs.mkdirSync(
        stagingDirectory,
        {
          recursive:
            true
        }
      );

      stagedOutput =
        path.join(
          stagingDirectory,
          tempFileName
        );
    }
  } catch {
    stagedOutput =
      null;
  }

  const coLocatedOutput =
    `${resolvedOutput}.${tempFileName}`;

  if (!stagedOutput) {
    await psNsdAttemptAtomicSave(
      franchise,
      coLocatedOutput,
      resolvedOutput
    );

    return;
  }

  try {
    await psNsdAttemptAtomicSave(
      franchise,
      stagedOutput,
      resolvedOutput
    );
  } catch (stagingError) {
    /*
     * The Staging directory itself may be the problem (permissions from
     * an earlier elevated run, a locked/undeletable leftover, etc.), not
     * just a transient lock on this one file. Fall back to writing next
     * to the real save, same as the cross-drive case above, rather than
     * failing the whole Apply.
     */
    await psNsdAttemptAtomicSave(
      franchise,
      coLocatedOutput,
      resolvedOutput
    );
  }
}

function psNsdBackupBeforeSave(
  resolvedInput,
  label
) {
  const timestamp =
    new Date()
      .toISOString()
      .replace(
        /[:.]/g,
        '-'
      );

  const fileName =
    `${path.basename(resolvedInput)}.${label}.${timestamp}.bak`;

  const candidateDirectories = [
    path.join(
      os.homedir(),
      'AppData',
      'Local',
      'PocketScout Utilities',
      'Backups'
    ),
    path.join(
      path.dirname(
        resolvedInput
      ),
      'PocketScout Backups'
    )
  ];

  let lastError =
    null;

  for (
    const backupDirectory
    of candidateDirectories
  ) {
    try {
      fs.mkdirSync(
        backupDirectory,
        {
          recursive:
            true
        }
      );

      const backupPath =
        path.join(
          backupDirectory,
          fileName
        );

      fs.copyFileSync(
        resolvedInput,
        backupPath
      );

      return {
        backupPath,
        backupError:
          null
      };
    } catch (error) {
      lastError =
        error;
    }
  }

  return {
    backupPath:
      null,
    backupError:
      lastError?.message ??
      'Unknown backup error'
  };
}


function clonePositionTargets(
  targets
) {
  return Object.fromEntries(
    POSITION_ORDER.map(
      position => {
        const defaults =
          DEFAULT_POSITION_TARGETS[
            position
          ];

        const source =
          targets?.[position] ??
          {};

        return [
          position,
          {
            minimum:
              toInteger(
                source.minimum,
                defaults.minimum
              ),

            preferredMaximum:
              toInteger(
                source.preferredMaximum,
                defaults.preferredMaximum
              ),

            minimumWeight:
              toInteger(
                source.minimumWeight,
                defaults.minimumWeight
              ),

            idealMaximumWeight:
              toInteger(
                source.idealMaximumWeight,
                defaults.idealMaximumWeight
              ),

            minimumHeight:
              toInteger(
                source.minimumHeight,
                defaults.minimumHeight
              ),

            maximumWeightGain:
              toInteger(
                source.maximumWeightGain ??
                source.maximumConversionGain,
                defaults.maximumWeightGain
              ),

            maximumWeightLoss:
              toInteger(
                source.maximumWeightLoss,
                defaults.maximumWeightLoss
              ),

            minimumConversionOverall:
              toInteger(
                source.minimumConversionOverall,
                defaults.minimumConversionOverall
              ),

            protectedDepthPlayers:
              toInteger(
                source.protectedDepthPlayers,
                defaults.protectedDepthPlayers
              ),

            cutIfAbove:
              toInteger(
                source.cutIfAbove,
                defaults.cutIfAbove
              )
          }
        ];
      }
    )
  );
}

function validatePositionTargets(
  submittedTargets
) {
  const normalized = {};

  for (
    const position
    of POSITION_ORDER
  ) {
    const defaults =
      DEFAULT_POSITION_TARGETS[
        position
      ];

    const source =
      submittedTargets?.[
        position
      ] ??
      {};

    const minimum =
      toInteger(
        source.minimum,
        -1
      );

    const preferredMaximum =
      toInteger(
        source.preferredMaximum,
        -1
      );

    const minimumWeight =
      toInteger(
        source.minimumWeight,
        defaults.minimumWeight
      );

    const idealMaximumWeight =
      toInteger(
        source.idealMaximumWeight,
        defaults.idealMaximumWeight
      );

    const minimumHeight =
      toInteger(
        source.minimumHeight,
        defaults.minimumHeight
      );

    const maximumWeightGain =
      toInteger(
        source.maximumWeightGain ??
        source.maximumConversionGain,
        defaults.maximumWeightGain
      );

    const maximumWeightLoss =
      toInteger(
        source.maximumWeightLoss,
        defaults.maximumWeightLoss
      );

    const minimumConversionOverall =
      toInteger(
        source.minimumConversionOverall,
        defaults.minimumConversionOverall
      );

    const protectedDepthPlayers =
      toInteger(
        source.protectedDepthPlayers,
        defaults.protectedDepthPlayers
      );

    const cutIfAbove =
      toInteger(
        source.cutIfAbove,
        defaults.cutIfAbove
      );

    if (
      minimum < 0 ||
      minimum > 99
    ) {
      throw new Error(
        `${position} Minimum must be a whole number from 0 to 99.`
      );
    }

    if (
      preferredMaximum < 0 ||
      preferredMaximum > 99
    ) {
      throw new Error(
        `${position} Preferred Max must be a whole number from 0 to 99.`
      );
    }

    if (
      minimum >
      preferredMaximum
    ) {
      throw new Error(
        `${position} Minimum cannot be greater than Preferred Max.`
      );
    }

    if (
      minimumWeight < 100 ||
      minimumWeight > 450
    ) {
      throw new Error(
        `${position} Minimum Playable Weight must be from 100 to 450 pounds.`
      );
    }

    if (
      idealMaximumWeight < 100 ||
      idealMaximumWeight > 450
    ) {
      throw new Error(
        `${position} Ideal Maximum Weight must be from 100 to 450 pounds.`
      );
    }

    if (
      minimumWeight >
      idealMaximumWeight
    ) {
      throw new Error(
        `${position} Minimum Playable Weight cannot exceed Ideal Maximum Weight.`
      );
    }

    if (
      minimumHeight < 60 ||
      minimumHeight > 90
    ) {
      throw new Error(
        `${position} Minimum Height must be from 60 to 90 inches.`
      );
    }

    if (
      maximumWeightGain < 0 ||
      maximumWeightGain > 100
    ) {
      throw new Error(
        `${position} Maximum Weight Gain must be from 0 to 100 pounds.`
      );
    }

    if (
      maximumWeightLoss < 0 ||
      maximumWeightLoss > 100
    ) {
      throw new Error(
        `${position} Maximum Weight Loss must be from 0 to 100 pounds.`
      );
    }

    if (
      minimumConversionOverall < 12 ||
      minimumConversionOverall > 99
    ) {
      throw new Error(
        `${position} Minimum Conversion OVR must be from 12 to 99.`
      );
    }

    if (
      protectedDepthPlayers < 0 ||
      protectedDepthPlayers > 99
    ) {
      throw new Error(
        `${position} Protected Depth Players must be from 0 to 99.`
      );
    }

    if (
      cutIfAbove < preferredMaximum ||
      cutIfAbove > 99
    ) {
      throw new Error(
        `${position} Cut If Above must be from Preferred Max through 99.`
      );
    }

    normalized[position] = {
      minimum,
      preferredMaximum,
      minimumWeight,
      idealMaximumWeight,
      minimumHeight,
      maximumWeightGain,
      maximumWeightLoss,
      minimumConversionOverall,
      protectedDepthPlayers,
      cutIfAbove
    };
  }

  return normalized;
}

function resolveTargetsPath({
  inputPath,
  outputDirectory = ''
}) {
  const configured =
    toText(outputDirectory) ||
    toText(
      process.env
        .POCKETSCOUT_OUTPUT_DIRECTORY
    );

  const baseDirectory =
    configured
      ? path.resolve(configured)
      : path.dirname(
          path.resolve(inputPath)
        );

  return path.join(
    baseDirectory,
    'settings',
    NSD_ROSTER_BALANCER_TARGETS_FILE_NAME
  );
}

function cloneTalentRescueSettings(
  settings = null
) {
  return {
    minimumUnsignedOverall:
      toInteger(
        settings?.minimumUnsignedOverall,
        DEFAULT_FINAL_TALENT_RESCUE_SETTINGS
          .minimumUnsignedOverall
      ),

    maximumReplacedOverall:
      toInteger(
        settings?.maximumReplacedOverall,
        DEFAULT_FINAL_TALENT_RESCUE_SETTINGS
          .maximumReplacedOverall
      )
  };
}

function validateTalentRescueSettings(
  submittedSettings
) {
  const normalized =
    cloneTalentRescueSettings(
      submittedSettings
    );

  if (
    normalized.minimumUnsignedOverall < 0 ||
    normalized.minimumUnsignedOverall > 99
  ) {
    throw new Error(
      'Final Talent Rescue Minimum Unsigned Player OVR must be from 0 to 99.'
    );
  }

  if (
    normalized.maximumReplacedOverall < 0 ||
    normalized.maximumReplacedOverall > 99
  ) {
    throw new Error(
      'Final Talent Rescue Maximum Replaced Player OVR must be from 0 to 99.'
    );
  }

  return normalized;
}

function cloneFcsPoolSettings(
  settings = null
) {
  return {
    minimumOverall:
      toInteger(
        settings?.minimumOverall,
        DEFAULT_FCS_POOL_SETTINGS.minimumOverall
      ),
    maximumOverall:
      toInteger(
        settings?.maximumOverall,
        DEFAULT_FCS_POOL_SETTINGS.maximumOverall
      ),

    maximumCutOverall:
      toInteger(
        settings?.maximumCutOverall,
        DEFAULT_FCS_POOL_SETTINGS.maximumCutOverall
      ),

    maximumPositionChangeOverallDrop:
      toInteger(
        settings?.maximumPositionChangeOverallDrop,
        DEFAULT_FCS_POOL_SETTINGS.maximumPositionChangeOverallDrop
      ),

    minimumShortageFillOverall:
      toInteger(
        settings?.minimumShortageFillOverall,
        DEFAULT_FCS_POOL_SETTINGS.minimumShortageFillOverall
      )
  };
}

function validateFcsPoolSettings(
  submittedSettings
) {
  const normalized =
    cloneFcsPoolSettings(
      submittedSettings
    );

  if (
    normalized.minimumOverall < 0 ||
    normalized.minimumOverall > 99
  ) {
    throw new Error(
      'Minimum FCS Player OVR must be from 0 to 99.'
    );
  }

  if (
    normalized.maximumOverall < 0 ||
    normalized.maximumOverall > 99
  ) {
    throw new Error(
      'Maximum FCS Player OVR must be from 0 to 99.'
    );
  }

  if (
    normalized.minimumOverall >
    normalized.maximumOverall
  ) {
    throw new Error(
      'Minimum FCS Player OVR cannot exceed Maximum FCS Player OVR.'
    );
  }

  if (
    normalized.maximumCutOverall < 0 ||
    normalized.maximumCutOverall > 99
  ) {
    throw new Error(
      'Maximum OVR Eligible for FCS Cut must be from 0 to 99.'
    );
  }

  if (
    normalized.maximumPositionChangeOverallDrop < 0 ||
    normalized.maximumPositionChangeOverallDrop > 99
  ) {
    throw new Error(
      'Maximum Position Change OVR Drop must be from 0 to 99.'
    );
  }

  if (
    normalized.minimumShortageFillOverall < 0 ||
    normalized.minimumShortageFillOverall > 99
  ) {
    throw new Error(
      'Minimum Shortage Fill OVR must be from 0 to 99.'
    );
  }

  return normalized;
}

function resolveRosterTargets({
  inputPath,
  outputDirectory = '',
  submittedTargets = null,
  submittedFcsPoolSettings = null
}) {
  const targetsPath =
    resolveTargetsPath({
      inputPath,
      outputDirectory
    });

  if (
    submittedTargets ||
    submittedFcsPoolSettings
  ) {
    return {
      positionTargets:
        validatePositionTargets(
          submittedTargets ??
          DEFAULT_POSITION_TARGETS
        ),
      fcsPoolSettings:
        validateFcsPoolSettings(
          submittedFcsPoolSettings ??
          DEFAULT_FCS_POOL_SETTINGS
        ),
      targetsPath,
      source:
        'submitted values'
    };
  }

  if (fs.existsSync(targetsPath)) {
    try {
      const parsed =
        JSON.parse(
          fs.readFileSync(
            targetsPath,
            'utf8'
          )
        );

      const savedVersion =
        toInteger(
          parsed.version,
          1
        );

      const savedTargets =
        parsed.positionTargets ??
        parsed;

      const savedFcsPoolSettings =
        savedVersion < 6
          ? {
              ...(
                savedVersion < 4
                  ? DEFAULT_FCS_POOL_SETTINGS
                  : (
                      parsed.fcsPoolSettings ??
                      DEFAULT_FCS_POOL_SETTINGS
                    )
              ),
              maximumCutOverall:
                DEFAULT_FCS_POOL_SETTINGS.maximumCutOverall,
              maximumPositionChangeOverallDrop:
                DEFAULT_FCS_POOL_SETTINGS.maximumPositionChangeOverallDrop
            }
          : {
              ...(
                parsed.fcsPoolSettings ??
                DEFAULT_FCS_POOL_SETTINGS
              ),
              maximumPositionChangeOverallDrop:
                savedVersion < 9
                  ? DEFAULT_FCS_POOL_SETTINGS.maximumPositionChangeOverallDrop
                  : toInteger(
                      parsed.fcsPoolSettings?.maximumPositionChangeOverallDrop,
                      DEFAULT_FCS_POOL_SETTINGS.maximumPositionChangeOverallDrop
                    )
            };

      const migratedTargetsV7 =
        savedVersion < 7
          ? Object.fromEntries(
              POSITION_ORDER.map(
                position => {
                  const savedTarget =
                    savedTargets?.[
                      position
                    ] ??
                    {};

                  const savedCutIfAbove =
                    toInteger(
                      savedTarget.cutIfAbove,
                      LEGACY_CUT_IF_ABOVE_DEFAULTS_V6[
                        position
                      ]
                    );

                  const shouldUpgradeCutIfAbove =
                    savedVersion < 5 ||
                    savedCutIfAbove ===
                      LEGACY_CUT_IF_ABOVE_DEFAULTS_V6[
                        position
                      ];

                  return [
                    position,
                    {
                      ...savedTarget,
                      minimumConversionOverall:
                        savedVersion < 3
                          ? 60
                          : toInteger(
                              savedTarget.minimumConversionOverall,
                              DEFAULT_POSITION_TARGETS[
                                position
                              ].minimumConversionOverall
                            ),
                      protectedDepthPlayers:
                        toInteger(
                          savedTarget.protectedDepthPlayers,
                          DEFAULT_POSITION_TARGETS[
                            position
                          ].protectedDepthPlayers
                        ),
                      cutIfAbove:
                        shouldUpgradeCutIfAbove
                          ? LEGACY_POSITION_DEFAULTS_V7[
                              position
                            ].cutIfAbove
                          : savedCutIfAbove
                    }
                  ];
                }
              )
            )
          : savedTargets;

      const migratedTargets =
        savedVersion < 8
          ? Object.fromEntries(
              POSITION_ORDER.map(
                position => {
                  const savedTarget =
                    migratedTargetsV7?.[
                      position
                    ] ??
                    {};

                  const legacyDefaults =
                    LEGACY_POSITION_DEFAULTS_V7[
                      position
                    ];

                  const newDefaults =
                    DEFAULT_POSITION_TARGETS[
                      position
                    ];

                  const savedProtectedDepthPlayers =
                    toInteger(
                      savedTarget.protectedDepthPlayers,
                      legacyDefaults.protectedDepthPlayers
                    );

                  const savedCutIfAbove =
                    toInteger(
                      savedTarget.cutIfAbove,
                      legacyDefaults.cutIfAbove
                    );

                  return [
                    position,
                    {
                      ...savedTarget,
                      protectedDepthPlayers:
                        savedProtectedDepthPlayers ===
                          legacyDefaults.protectedDepthPlayers
                          ? newDefaults.protectedDepthPlayers
                          : savedProtectedDepthPlayers,
                      cutIfAbove:
                        savedCutIfAbove ===
                          legacyDefaults.cutIfAbove
                          ? newDefaults.cutIfAbove
                          : savedCutIfAbove
                    }
                  ];
                }
              )
            )
          : migratedTargetsV7;

      const migratedFcsPoolSettings =
        savedVersion < 8
          ? {
              maximumPositionChangeOverallDrop:
                DEFAULT_FCS_POOL_SETTINGS.maximumPositionChangeOverallDrop,
              minimumOverall:
                toInteger(
                  savedFcsPoolSettings.minimumOverall,
                  LEGACY_FCS_POOL_SETTINGS_V7.minimumOverall
                ) ===
                  LEGACY_FCS_POOL_SETTINGS_V7.minimumOverall
                  ? DEFAULT_FCS_POOL_SETTINGS.minimumOverall
                  : toInteger(
                      savedFcsPoolSettings.minimumOverall,
                      DEFAULT_FCS_POOL_SETTINGS.minimumOverall
                    ),
              maximumOverall:
                toInteger(
                  savedFcsPoolSettings.maximumOverall,
                  LEGACY_FCS_POOL_SETTINGS_V7.maximumOverall
                ) ===
                  LEGACY_FCS_POOL_SETTINGS_V7.maximumOverall
                  ? DEFAULT_FCS_POOL_SETTINGS.maximumOverall
                  : toInteger(
                      savedFcsPoolSettings.maximumOverall,
                      DEFAULT_FCS_POOL_SETTINGS.maximumOverall
                    ),
              maximumCutOverall:
                toInteger(
                  savedFcsPoolSettings.maximumCutOverall,
                  LEGACY_FCS_POOL_SETTINGS_V7.maximumCutOverall
                ) ===
                  LEGACY_FCS_POOL_SETTINGS_V7.maximumCutOverall
                  ? DEFAULT_FCS_POOL_SETTINGS.maximumCutOverall
                  : toInteger(
                      savedFcsPoolSettings.maximumCutOverall,
                      DEFAULT_FCS_POOL_SETTINGS.maximumCutOverall
                    )
            }
          : savedFcsPoolSettings;

      return {
        positionTargets:
          validatePositionTargets(
            migratedTargets
          ),
        fcsPoolSettings:
          validateFcsPoolSettings(
            migratedFcsPoolSettings
          ),
        targetsPath,
        source:
          savedVersion < 9
            ? 'saved settings upgraded to version 9'
            : 'saved settings'
      };
    } catch (error) {
      throw new Error(
        `Could not load NSD Roster Balancer targets from ${targetsPath}: ${error?.message || error}`
      );
    }
  }

  return {
    positionTargets:
      clonePositionTargets(
        DEFAULT_POSITION_TARGETS
      ),
    fcsPoolSettings:
      cloneFcsPoolSettings(
        DEFAULT_FCS_POOL_SETTINGS
      ),
    targetsPath,
    source:
      'suggested defaults'
  };
}

function loadRosterTargets({
  inputPath,
  outputDirectory = ''
}) {
  const resolvedInput =
    requireExistingInputPath(
      inputPath
    );

  const resolved =
    resolveRosterTargets({
      inputPath:
        resolvedInput,
      outputDirectory
    });

  return {
    moduleId:
      nsdRosterBalancerModule.id,
    positionOrder:
      [...POSITION_ORDER],
    positionTargets:
      resolved.positionTargets,
    suggestedPositionTargets:
      clonePositionTargets(
        DEFAULT_POSITION_TARGETS
      ),
    fcsPoolSettings:
      resolved.fcsPoolSettings,
    suggestedFcsPoolSettings:
      cloneFcsPoolSettings(
        DEFAULT_FCS_POOL_SETTINGS
      ),
    targetsPath:
      resolved.targetsPath,
    source:
      resolved.source
  };
}

function saveRosterTargets({
  inputPath,
  outputDirectory = '',
  positionTargets,
  fcsPoolSettings
}) {
  const resolvedInput =
    requireExistingInputPath(
      inputPath
    );

  const normalized =
    validatePositionTargets(
      positionTargets
    );

  const normalizedFcsPoolSettings =
    validateFcsPoolSettings(
      fcsPoolSettings
    );

  const targetsPath =
    resolveTargetsPath({
      inputPath:
        resolvedInput,
      outputDirectory
    });

  fs.mkdirSync(
    path.dirname(targetsPath),
    {
      recursive: true
    }
  );

  fs.writeFileSync(
    targetsPath,
    JSON.stringify(
      {
        version: 9,
        savedAt:
          new Date().toISOString(),
        positionTargets:
          normalized,
        fcsPoolSettings:
          normalizedFcsPoolSettings
      },
      null,
      2
    ) + '\n',
    'utf8'
  );

  return {
    moduleId:
      nsdRosterBalancerModule.id,
    positionOrder:
      [...POSITION_ORDER],
    positionTargets:
      normalized,
    suggestedPositionTargets:
      clonePositionTargets(
        DEFAULT_POSITION_TARGETS
      ),
    fcsPoolSettings:
      normalizedFcsPoolSettings,
    suggestedFcsPoolSettings:
      cloneFcsPoolSettings(
        DEFAULT_FCS_POOL_SETTINGS
      ),
    targetsPath,
    source:
      'saved settings'
  };
}

function normalizeOverallFormulaKey(
  value
) {
  return toText(value)
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      ''
    );
}

function loadRosterBalancerFormulaModel() {
  if (
    nsdRosterBalancerFormulaModelCache
  ) {
    return nsdRosterBalancerFormulaModelCache;
  }

  if (
    !fs.existsSync(
      NSD_ROSTER_BALANCER_OVR_FORMULA_PATH
    )
  ) {
    throw new Error(
      `NSD Roster Balancer OVR formula package is missing: ${NSD_ROSTER_BALANCER_OVR_FORMULA_PATH}`
    );
  }

  let parsed;

  try {
    parsed =
      JSON.parse(
        fs.readFileSync(
          NSD_ROSTER_BALANCER_OVR_FORMULA_PATH,
          'utf8'
        )
      );
  } catch (error) {
    throw new Error(
      `Could not read the NSD Roster Balancer OVR formula package: ${error?.message || error}`
    );
  }

  if (
    !Array.isArray(
      parsed?.formulas
    ) ||
    !parsed.formulas.length
  ) {
    throw new Error(
      'The NSD Roster Balancer OVR formula package contains no formulas.'
    );
  }

  nsdRosterBalancerFormulaModelCache =
    parsed;

  return parsed;
}

function calculateRosterBalancerOverall(
  record,
  formula
) {
  let rawOverall =
    Number(
      formula.intercept
    );

  if (!Number.isFinite(rawOverall)) {
    throw new Error(
      'OVR formula has an invalid intercept.'
    );
  }

  for (
    const [
      fieldName,
      coefficient
    ]
    of Object.entries(
      formula.coefficients ??
      {}
    )
  ) {
    const rating =
      Number(
        record[fieldName]
      );

    const numericCoefficient =
      Number(coefficient);

    if (
      !Number.isFinite(rating) ||
      !Number.isFinite(
        numericCoefficient
      )
    ) {
      throw new Error(
        `Cannot calculate ${formula.position}/${formula.playerType} because ${fieldName} is not numeric.`
      );
    }

    rawOverall +=
      rating *
      numericCoefficient;
  }

  const roundedOverall =
    Math.ceil(
      rawOverall -
      0.5
    );

  const model =
    loadRosterBalancerFormulaModel();

  const minimumOverall =
    Number.isFinite(
      Number(
        formula.minimumOverall
      )
    )
      ? Number(
          formula.minimumOverall
        )
      : Number(
          model.calculation
            ?.minimumOverall ??
          12
        );

  const maximumOverall =
    Number.isFinite(
      Number(
        formula.maximumOverall
      )
    )
      ? Number(
          formula.maximumOverall
        )
      : Number(
          model.calculation
            ?.maximumOverall ??
          99
        );

  return Math.min(
    Math.max(
      roundedOverall,
      minimumOverall
    ),
    maximumOverall
  );
}

function buildRosterBalancerAthleteProjection(
  record,
  identity
) {
  const currentPosition =
    toText(
      identity.position
    );

  const currentPlayerType =
    toText(
      identity.playerType
    );

  const allFits = [];

  for (
    const formula
    of loadRosterBalancerFormulaModel()
      .formulas
  ) {
    try {
      const position =
        toText(
          formula.position
        );

      const playerType =
        toText(
          formula.playerType ??
          formula.sourceType ??
          formula.sourcePLTY
        );

      if (
        !POSITION_ORDER.includes(
          position
        ) ||
        !playerType
      ) {
        continue;
      }

      allFits.push({
        position,
        playerType,
        overall:
          calculateRosterBalancerOverall(
            record,
            formula
          ),

        isCurrent:
          normalizeOverallFormulaKey(
            position
          ) ===
            normalizeOverallFormulaKey(
              currentPosition
            ) &&
          normalizeOverallFormulaKey(
            playerType
          ) ===
            normalizeOverallFormulaKey(
              currentPlayerType
            )
      });
    } catch {
      // Skip formulas whose required ratings are unavailable.
    }
  }

  const bestByPosition =
    new Map();

  for (const fit of allFits) {
    const prior =
      bestByPosition.get(
        fit.position
      );

    if (
      !prior ||
      fit.overall >
        prior.overall
    ) {
      bestByPosition.set(
        fit.position,
        fit
      );
    }
  }

  const currentFit =
    allFits.find(
      fit =>
        fit.isCurrent
    ) ??
    bestByPosition.get(
      currentPosition
    ) ??
    null;

  const calculatedCurrentOverall =
    currentFit?.overall ??
    identity.overallRating;

  const bestFits =
    [...bestByPosition.values()]
      .filter(
        fit =>
          fit.position !==
          currentPosition
      )
      .sort(
        (left, right) =>
          right.overall -
            left.overall ||
          POSITION_ORDER.indexOf(
            left.position
          ) -
            POSITION_ORDER.indexOf(
              right.position
            ) ||
          left.playerType.localeCompare(
            right.playerType,
            undefined,
            {
              sensitivity: 'base',
              numeric: true
            }
          )
      )
      .map(fit => ({
        ...fit,
        overallDifference:
          fit.overall -
          calculatedCurrentOverall
      }));

  const fullName =
    [
      identity.firstName,
      identity.lastName
    ]
      .filter(Boolean)
      .join(' ') ||
    `Player row ${identity.playerRow}`;

  return {
    playerRow:
      identity.playerRow,
    fullName,
    firstName:
      identity.firstName,
    lastName:
      identity.lastName,
    position:
      currentPosition,
    playerType:
      currentPlayerType,
    overallRating:
      identity.overallRating,
    schoolYear:
      identity.schoolYear,
    storedWeight:
      identity.storedWeight,
    weight:
      identity.weight,
    height:
      identity.height,
    calculatedCurrentOverall,
    bestFits,
    topFits:
      bestFits.slice(0, 3)
  };
}

function buildUserControlledTeamIndexes(
  coachTable
) {
  const result =
    new Set();

  for (
    const record
    of coachTable.records ?? []
  ) {
    if (
      !isUsableRecord(record) ||
      !hasFields(
        record,
        [
          'TeamIndex',
          'IsUserControlled'
        ]
      )
    ) {
      continue;
    }

    const isUserControlled =
      record.IsUserControlled === true ||
      toText(
        record.IsUserControlled
      ).toLowerCase() ===
        'true' ||
      toInteger(
        record.IsUserControlled,
        0
      ) ===
        1;

    const teamIndex =
      toInteger(
        record.TeamIndex,
        -1
      );

    if (
      isUserControlled &&
      teamIndex >= 0 &&
      teamIndex <
        FCS_POOL_TEAM_INDEX
    ) {
      result.add(
        teamIndex
      );
    }
  }

  return result;
}

function buildTeamMap(
  teamTable,
  userControlledTeamIndexes =
    new Set()
) {
  const teams =
    new Map();

  for (
    const record
    of teamTable.records ?? []
  ) {
    if (
      !isUsableRecord(record) ||
      !hasFields(
        record,
        [
          'TeamIndex',
          'DisplayName',
          'LongName'
        ]
      )
    ) {
      continue;
    }

    const teamIndex =
      toInteger(
        record.TeamIndex,
        -1
      );

    const teamName =
      toText(
        record.DisplayName
      ) ||
      toText(
        record.LongName
      );

    if (
      teamIndex < 0 ||
      teamIndex >= 255 ||
      !teamName ||
      teams.has(teamIndex)
    ) {
      continue;
    }

    teams.set(
      teamIndex,
      {
        teamIndex,
        teamName,

        isUserControlled:
          userControlledTeamIndexes.has(
            teamIndex
          ),

        rosterReference:
          toText(
            record.Roster
          ),
        current:
          emptyRosterBucket(),
        hardCommitted:
          emptyRosterBucket(),
        signed:
          emptyRosterBucket(),
        incoming:
          emptyRosterBucket(),
        unsignedPreview:
          emptyRosterBucket(),
        unsignedPreviewPlayers: [],
        players: [],
        signedRecruitPlayers: [],
        rosterStoreDuplicateProposals: []
      }
    );
  }

  if (teams.size < 100) {
    throw new Error(
      `The dynamically resolved Team table contained only ${teams.size} valid unique teams.`
    );
  }

  return teams;
}

function normalizeRosterBalancerSchoolYear(
  value
) {
  const normalized =
    toText(value)
      .trim()
      .toLowerCase();

  if (
    normalized === 'fr' ||
    normalized === 'freshman' ||
    normalized.includes('fresh')
  ) {
    return 'FR';
  }

  if (
    normalized === 'so' ||
    normalized === 'sophomore' ||
    normalized.includes('soph')
  ) {
    return 'SO';
  }

  if (
    normalized === 'jr' ||
    normalized === 'junior' ||
    normalized.includes('junior')
  ) {
    return 'JR';
  }

  if (
    normalized === 'sr' ||
    normalized === 'senior' ||
    normalized.includes('senior')
  ) {
    return 'SR';
  }

  return '';
}

function getWeightDevelopmentRange(
  player
) {
  const schoolYear =
    normalizeRosterBalancerSchoolYear(
      player.schoolYear
    );

  if (schoolYear === 'FR') {
    return {
      schoolYear,
      transition:
        'Freshman to Sophomore',
      minimumGain: 8,
      maximumGain: 12
    };
  }

  if (schoolYear === 'SO') {
    return {
      schoolYear,
      transition:
        'Sophomore to Junior',
      minimumGain: 5,
      maximumGain: 8
    };
  }

  if (schoolYear === 'JR') {
    return {
      schoolYear,
      transition:
        'Junior to Senior',
      minimumGain: 2,
      maximumGain: 5
    };
  }

  if (schoolYear === 'SR') {
    return {
      schoolYear,
      transition:
        'Senior offseason',
      minimumGain: 2,
      maximumGain: 5
    };
  }

  return {
    schoolYear:
      schoolYear ||
      'Unknown',
    transition:
      'Unknown class',
    minimumGain: 3,
    maximumGain: 6
  };
}

function deterministicWeightDevelopmentGain(
  player,
  range
) {
  const seed =
    [
      player.playerRow,
      player.fullName,
      player.position,
      player.weight,
      player.schoolYear
    ].join('|');

  let hash = 2166136261;

  for (
    let index = 0;
    index < seed.length;
    index++
  ) {
    hash ^=
      seed.charCodeAt(index);

    hash =
      Math.imul(
        hash,
        16777619
      );
  }

  const span =
    range.maximumGain -
      range.minimumGain +
    1;

  return range.minimumGain +
    (
      Math.abs(hash) %
      Math.max(span, 1)
    );
}

function buildNormalWeightDevelopment(
  player,
  positionTargets
) {
  const target =
    positionTargets[
      player.position
    ];

  const currentWeight =
    toInteger(
      player.weight,
      0
    );

  const developmentRange =
    getWeightDevelopmentRange(
      player
    );

  if (
    !target ||
    currentWeight <= 0
  ) {
    return {
      eligible: false,
      currentWeight,
      developmentGain: 0,
      proposedWeight:
        currentWeight,
      schoolYear:
        developmentRange.schoolYear,
      transition:
        developmentRange.transition,
      minimumGain:
        developmentRange.minimumGain,
      maximumGain:
        developmentRange.maximumGain,
      reason:
        'Weight data was unavailable.'
    };
  }

  if (
    developmentRange.maximumGain <= 0
  ) {
    return {
      eligible: false,
      currentWeight,
      developmentGain: 0,
      proposedWeight:
        currentWeight,
      schoolYear:
        developmentRange.schoolYear,
      transition:
        developmentRange.transition,
      minimumGain: 0,
      maximumGain: 0,
      reason:
        'This class receives no normal offseason weight-development preview.'
    };
  }

  if (
    currentWeight >=
    target.idealMaximumWeight
  ) {
    return {
      eligible: false,
      currentWeight,
      developmentGain: 0,
      proposedWeight:
        currentWeight,
      schoolYear:
        developmentRange.schoolYear,
      transition:
        developmentRange.transition,
      minimumGain:
        developmentRange.minimumGain,
      maximumGain:
        developmentRange.maximumGain,
      reason:
        `Already at or above the ${target.idealMaximumWeight} lb Ideal Maximum Weight.`
    };
  }

  const generatedGain =
    deterministicWeightDevelopmentGain(
      player,
      developmentRange
    );

  const slowDevelopmentThreshold =
    Math.ceil(
      target.idealMaximumWeight *
      0.75
    );

  const isAboveSlowDevelopmentThreshold =
    currentWeight >=
    slowDevelopmentThreshold;

  const adjustedGeneratedGain =
    isAboveSlowDevelopmentThreshold
      ? Math.max(
          1,
          Math.ceil(
            generatedGain /
            2
          )
        )
      : generatedGain;

  const proposedWeight =
    Math.min(
      currentWeight +
        adjustedGeneratedGain,
      target.idealMaximumWeight
    );

  return {
    eligible:
      proposedWeight >
      currentWeight,
    currentWeight,
    developmentGain:
      proposedWeight -
      currentWeight,
    proposedWeight,
    generatedGain,
    adjustedGeneratedGain,
    slowDevelopmentThreshold,
    slowDevelopmentApplied:
      isAboveSlowDevelopmentThreshold,
    schoolYear:
      developmentRange.schoolYear,
    transition:
      developmentRange.transition,
    minimumGain:
      developmentRange.minimumGain,
    maximumGain:
      developmentRange.maximumGain,
    idealMaximumWeight:
      target.idealMaximumWeight,
    reason:
      isAboveSlowDevelopmentThreshold
        ? `${developmentRange.transition} development generated ${generatedGain} lbs, then slowed to ${adjustedGeneratedGain} lbs because the player is at or above 75% of the ${target.idealMaximumWeight} lb Ideal Maximum Weight. Growth remains at least 1 lb and is capped at the Ideal Maximum Weight.`
        : `${developmentRange.transition} development generated ${generatedGain} lbs from its ${developmentRange.minimumGain}-${developmentRange.maximumGain} lb range, capped at ${target.idealMaximumWeight} lbs.`
  };
}

function evaluateConversionWeight({
  player,
  destinationPosition,
  positionTargets
}) {
  const target =
    positionTargets[
      destinationPosition
    ];

  const currentWeight =
    toInteger(
      player.weight,
      0
    );

  const currentHeight =
    toInteger(
      player.height,
      0
    );

  if (
    !target ||
    currentWeight <= 0
  ) {
    return {
      eligible: false,
      currentWeight,
      requiredGain: 0,
      requiredLoss: 0,
      proposedWeight:
        currentWeight,
      reason:
        'Weight data was unavailable.'
    };
  }

  if (
    currentHeight <= 0
  ) {
    return {
      eligible: false,
      currentWeight,
      currentHeight,
      minimumHeight:
        target.minimumHeight,
      requiredGain: 0,
      requiredLoss: 0,
      proposedWeight:
        currentWeight,
      reason:
        'Height data was unavailable.'
    };
  }

  if (
    currentHeight <
    target.minimumHeight
  ) {
    return {
      eligible: false,
      currentWeight,
      currentHeight,
      minimumHeight:
        target.minimumHeight,
      requiredGain: 0,
      requiredLoss: 0,
      proposedWeight:
        currentWeight,
      minimumWeight:
        target.minimumWeight,
      idealMaximumWeight:
        target.idealMaximumWeight,
      maximumWeightGain:
        target.maximumWeightGain,
      maximumWeightLoss:
        target.maximumWeightLoss,
      alreadyWithinRange: false,
      reason:
        `Height ${currentHeight} inches is below the ${target.minimumHeight}-inch Minimum Height for ${destinationPosition}.`
    };
  }

  if (
    currentWeight <
    target.minimumWeight
  ) {
    const requiredGain =
      target.minimumWeight -
      currentWeight;

    if (
      requiredGain >
      target.maximumWeightGain
    ) {
      return {
        eligible: false,
        currentWeight,
        currentHeight,
        minimumHeight:
          target.minimumHeight,
        requiredGain,
        requiredLoss: 0,
        proposedWeight:
          currentWeight,
        minimumWeight:
          target.minimumWeight,
        idealMaximumWeight:
          target.idealMaximumWeight,
        maximumWeightGain:
          target.maximumWeightGain,
        maximumWeightLoss:
          target.maximumWeightLoss,
        alreadyWithinRange: false,
        reason:
          `Needs ${requiredGain} lbs to reach ${target.minimumWeight}, exceeding the ${target.maximumWeightGain} lb Maximum Weight Gain.`
      };
    }

    return {
      eligible: true,
      currentWeight,
      currentHeight,
      minimumHeight:
        target.minimumHeight,
      requiredGain,
      requiredLoss: 0,
      proposedWeight:
        target.minimumWeight,
      minimumWeight:
        target.minimumWeight,
      idealMaximumWeight:
        target.idealMaximumWeight,
      maximumWeightGain:
        target.maximumWeightGain,
      maximumWeightLoss:
        target.maximumWeightLoss,
      alreadyWithinRange: false,
      reason:
        `Eligible to gain ${requiredGain} lbs and reach the ${target.minimumWeight} lb minimum for ${destinationPosition}.`
    };
  }

  if (
    currentWeight >
    target.idealMaximumWeight
  ) {
    const requiredLoss =
      currentWeight -
      target.idealMaximumWeight;

    if (
      requiredLoss >
      target.maximumWeightLoss
    ) {
      return {
        eligible: false,
        currentWeight,
        requiredGain: 0,
        requiredLoss,
        proposedWeight:
          currentWeight,
        minimumWeight:
          target.minimumWeight,
        idealMaximumWeight:
          target.idealMaximumWeight,
        maximumWeightGain:
          target.maximumWeightGain,
        maximumWeightLoss:
          target.maximumWeightLoss,
        alreadyWithinRange: false,
        reason:
          `Needs to lose ${requiredLoss} lbs to reach ${target.idealMaximumWeight}, exceeding the ${target.maximumWeightLoss} lb Maximum Weight Loss.`
      };
    }

    return {
      eligible: true,
      currentWeight,
      requiredGain: 0,
      requiredLoss,
      proposedWeight:
        target.idealMaximumWeight,
      minimumWeight:
        target.minimumWeight,
      idealMaximumWeight:
        target.idealMaximumWeight,
      maximumWeightGain:
        target.maximumWeightGain,
      maximumWeightLoss:
        target.maximumWeightLoss,
      alreadyWithinRange: false,
      reason:
        `Eligible to lose ${requiredLoss} lbs and reach the ${target.idealMaximumWeight} lb maximum for ${destinationPosition}.`
    };
  }

  return {
    eligible: true,
    currentWeight,
    requiredGain: 0,
    requiredLoss: 0,
    proposedWeight:
      currentWeight,
    minimumWeight:
      target.minimumWeight,
    idealMaximumWeight:
      target.idealMaximumWeight,
    maximumWeightGain:
      target.maximumWeightGain,
    maximumWeightLoss:
      target.maximumWeightLoss,
    alreadyWithinRange: true,
    reason:
      `Already within the ${target.minimumWeight}-${target.idealMaximumWeight} lb range for ${destinationPosition}.`
  };
}


async function analyzeRosterStoreDuplicates({
  teams,
  playerTable,
  tableIdMap
}) {
  const playerTableId =
    getTableId(
      playerTable
    );

  let duplicateSlotsFound =
    0;

  for (
    const team
    of teams.values()
  ) {
    const rosterReference =
      decodeTableReference(
        team.rosterReference,
        tableIdMap
      );

    if (
      !rosterReference?.table
    ) {
      continue;
    }

    try {
      await mutedReadRecords(
        rosterReference.table
      );
    } catch {
      continue;
    }

    const rosterRecord =
      rosterReference.table.records?.[
        rosterReference.row
      ];

    if (
      !rosterRecord ||
      !rosterRecord.fields
    ) {
      continue;
    }

    const slotNames =
      Object.keys(
        rosterRecord.fields
      )
        .filter(
          slotName =>
            rosterRecord.fields[
              slotName
            ]?.isReference
        );

    const firstSlotByPlayerRow =
      new Map();

    const duplicateSlotsByPlayerRow =
      new Map();

    for (
      const slotName
      of slotNames
    ) {
      const slotField =
        rosterRecord.fields[
          slotName
        ];

      const reference =
        slotField?.referenceData;

      if (
        !reference ||
        Number(
          reference.tableId
        ) !==
          Number(
            playerTableId
          )
      ) {
        continue;
      }

      const playerRow =
        Number(
          reference.rowNumber
        );

      const playerRecord =
        playerTable.records?.[
          playerRow
        ];

      if (
        !Number.isInteger(
          playerRow
        ) ||
        !isUsableRecord(
          playerRecord
        )
      ) {
        continue;
      }

      if (
        !firstSlotByPlayerRow.has(
          playerRow
        )
      ) {
        firstSlotByPlayerRow.set(
          playerRow,
          slotName
        );

        continue;
      }

      if (
        !duplicateSlotsByPlayerRow.has(
          playerRow
        )
      ) {
        duplicateSlotsByPlayerRow.set(
          playerRow,
          []
        );
      }

      duplicateSlotsByPlayerRow
        .get(
          playerRow
        )
        .push(
          slotName
        );

      duplicateSlotsFound++;
    }

    team.rosterStoreDuplicateProposals =
      [
        ...duplicateSlotsByPlayerRow.entries()
      ]
        .map(
          ([
            playerRow,
            duplicateSlotNames
          ]) => {
            const playerRecord =
              playerTable.records?.[
                playerRow
              ];

            const playerName =
              [
                toText(
                  playerRecord?.FirstName
                ),
                toText(
                  playerRecord?.LastName
                )
              ]
                .filter(Boolean)
                .join(' ')
                .trim() ||
              `Player row ${playerRow}`;

            return {
              proposalType:
                'ROSTERSTORE_DUPLICATE_CLEANUP',

              proposalId:
                `${team.teamIndex}-roster-duplicate-${playerRow}`,

              selectedByDefault:
                true,

              teamIndex:
                team.teamIndex,

              teamName:
                team.teamName,

              playerRow,

              playerName,

              position:
                toText(
                  playerRecord?.Position
                ),

              calculatedOverall:
                toInteger(
                  playerRecord?.OverallRating,
                  0
                ),

              currentWeight:
                storedPlayerWeightToDisplayedPounds(
                  playerRecord?.Weight
                ),

              depthRank:
                'Duplicate',

              protectedDepthPlayers:
                'N/A',

              rosterBefore:
                duplicateSlotNames.length +
                1,

              rosterAfter:
                1,

              duplicateCount:
                duplicateSlotNames.length,

              firstKeptSlot:
                firstSlotByPlayerRow.get(
                  playerRow
                ),

              duplicateSlotNames:
                [
                  ...duplicateSlotNames
                ],

              destinationLabel:
                'Remove duplicate RosterStore entries',

              reason:
                `DUPLICATE ROSTER ENTRY: ${playerName} appears ${duplicateSlotNames.length + 1} times in ${team.teamName}'s RosterStore. Keep ${firstSlotByPlayerRow.get(playerRow)} and remove duplicate slot(s): ${duplicateSlotNames.join(', ')} before evaluating or applying real player cuts.`
            };
          }
        )
        .sort(
          (left, right) =>
            right.duplicateCount -
              left.duplicateCount ||
            left.playerName.localeCompare(
              right.playerName,
              undefined,
              {
                sensitivity: 'base',
                numeric: true
              }
            )
        );
  }

  return {
    duplicateSlotsFound,

    teamsWithDuplicates:
      [
        ...teams.values()
      ]
        .filter(
          team =>
            team
              .rosterStoreDuplicateProposals
              .length > 0
        )
        .length
  };
}

function calculateInitialTeamShortagePriority(
  team,
  positionTargets
) {
  return POSITION_ORDER.reduce(
    (
      total,
      position
    ) => {
      const projected =
        team.current.positions[
          position
        ] +
        team.incoming.positions[
          position
        ] +
        team.unsignedPreview.positions[
          position
        ];

      const shortage =
        Math.max(
          positionTargets[
            position
          ].minimum -
            projected,
          0
        );

      return total +
        shortage *
          (
            projected === 0
              ? 10
              : 4
          );
    },
    0
  );
}

function finalizeTeamAnalysis(
  team,
  positionTargets,
  fcsPoolSettings,
  remainingUnsignedRecruits,
  usedUnsignedRecruitRows,
  fcsPoolPlayers,
  usedFcsPoolPlayerRows
) {
  const positions = {};
  const shortages = [];
  const surpluses = [];

  for (
    const position
    of POSITION_ORDER
  ) {
    const current =
      team.current.positions[
        position
      ];

    const hardCommitted =
      team.hardCommitted.positions[
        position
      ];

    const signed =
      team.signed.positions[
        position
      ];

    const incoming =
      team.incoming.positions[
        position
      ];

    const unsignedPreview =
      team.unsignedPreview.positions[
        position
      ];

    const projected =
      current +
      incoming +
      unsignedPreview;

    const target =
      positionTargets[position];

    const shortageAmount =
      Math.max(
        target.minimum -
          projected,
        0
      );

    const surplusAmount =
      Math.max(
        projected -
          target.preferredMaximum,
        0
      );

    positions[position] = {
      current,
      hardCommitted,
      signed,
      incoming,
      unsignedPreview,
      projected,
      minimum:
        target.minimum,
      preferredMaximum:
        target.preferredMaximum,
      cutIfAbove:
        target.cutIfAbove,
      shortageAmount,
      surplusAmount,
      cutExcess:
        Math.max(
          projected -
            target.cutIfAbove,
          0
        )
    };

    if (shortageAmount > 0) {
      shortages.push({
        position,
        current,
        incoming,
        projected,
        minimum:
          target.minimum,
        amount:
          shortageAmount,
        isZero:
          projected === 0
      });
    }

    if (surplusAmount > 0) {
      surpluses.push({
        position,
        current,
        incoming,
        projected,
        preferredMaximum:
          target.preferredMaximum,
        amount:
          surplusAmount
      });
    }
  }

  shortages.sort(
    (left, right) =>
      Number(right.isZero) -
        Number(left.isZero) ||
      right.amount -
        left.amount ||
      POSITION_ORDER.indexOf(
        left.position
      ) -
        POSITION_ORDER.indexOf(
          right.position
        )
  );

  surpluses.sort(
    (left, right) =>
      right.amount -
        left.amount ||
      POSITION_ORDER.indexOf(
        left.position
      ) -
        POSITION_ORDER.indexOf(
          right.position
        )
  );

  const playersByPosition =
    new Map(
      POSITION_ORDER.map(
        position => [
          position,
          []
        ]
      )
    );

  for (
    const player
    of team.players
  ) {
    playersByPosition
      .get(player.position)
      ?.push(player);
  }

  for (
    const players
    of playersByPosition.values()
  ) {
    players.sort(
      (left, right) =>
        right.calculatedCurrentOverall -
          left.calculatedCurrentOverall ||
        right.overallRating -
          left.overallRating ||
        left.fullName.localeCompare(
          right.fullName,
          undefined,
          {
            sensitivity: 'base',
            numeric: true
          }
        )
    );

    players.forEach(
      (
        player,
        index
      ) => {
        player.depthRank =
          index + 1;

        player.protectedStarter =
          index === 0;

        player.protectedDepthPlayers =
          positionTargets[
            player.position
          ].protectedDepthPlayers;

        player.protectedDepthPlayer =
          player.depthRank <=
          player.protectedDepthPlayers;
      }
    );
  }

  for (
    const player
    of team.players
  ) {
    player.normalWeightDevelopment =
      buildNormalWeightDevelopment(
        player,
        positionTargets
      );
  }

  const projectedCounts =
    Object.fromEntries(
      POSITION_ORDER.map(
        position => [
          position,
          positions[position]
            .projected
        ]
      )
    );

  const usedPlayerRows =
    new Set();

  const proposals = [];
  const unresolvedShortages = [];
  const rejectedConversionCandidates = [];

  for (
    const shortage
    of shortages
  ) {
    let remaining =
      Math.max(
        shortage.minimum -
          projectedCounts[
            shortage.position
          ],
        0
      );

    while (remaining > 0) {
      const candidates = [];

      for (
        const player
        of team.players
      ) {
        if (
          usedPlayerRows.has(
            player.playerRow
          ) ||
          player.protectedDepthPlayer ||
          player.position ===
            shortage.position
        ) {
          continue;
        }

        const sourcePosition =
          player.position;

        const sourceTarget =
          positionTargets[
            sourcePosition
          ];

        const sourceBefore =
          projectedCounts[
            sourcePosition
          ];

        const sourceAfter =
          sourceBefore - 1;

        if (
          sourceAfter <
            sourceTarget.minimum ||
          sourceBefore <=
            sourceTarget.preferredMaximum
        ) {
          continue;
        }

        const destinationFit =
          player.bestFits.find(
            fit =>
              fit.position ===
              shortage.position
          );

        if (!destinationFit) {
          continue;
        }

        const conversionWeight =
          evaluateConversionWeight({
            player,
            destinationPosition:
              shortage.position,
            positionTargets
          });

        const destinationMinimumOverall =
          positionTargets[
            shortage.position
          ].minimumConversionOverall;

        const rejectionReasons = [];

        if (
          !conversionWeight.eligible
        ) {
          rejectionReasons.push(
            conversionWeight.reason
          );
        }

        if (
          destinationFit.overall <
          destinationMinimumOverall
        ) {
          rejectionReasons.push(
            `Projected ${shortage.position} OVR ${destinationFit.overall} is below the configured Minimum Conversion OVR of ${destinationMinimumOverall}.`
          );
        }

        const overallDrop =
          Math.max(
            0,
            player.calculatedCurrentOverall -
              destinationFit.overall
          );

        if (
          overallDrop >
          fcsPoolSettings
            .maximumPositionChangeOverallDrop
        ) {
          rejectionReasons.push(
            `Position change would drop calculated OVR by ${overallDrop} points (${player.calculatedCurrentOverall} → ${destinationFit.overall}), exceeding the configured Maximum Position Change OVR Drop of ${fcsPoolSettings.maximumPositionChangeOverallDrop}.`
          );
        }

        if (rejectionReasons.length) {
          rejectedConversionCandidates.push({
            shortagePosition:
              shortage.position,
            playerRow:
              player.playerRow,
            playerName:
              player.fullName,
            currentPosition:
              player.position,
            currentOverall:
              player.calculatedCurrentOverall,
            destinationOverall:
              destinationFit.overall,
            overallDifference:
              destinationFit.overallDifference,
            overallDrop,
            maximumPositionChangeOverallDrop:
              fcsPoolSettings.maximumPositionChangeOverallDrop,
            minimumConversionOverall:
              destinationMinimumOverall,
            currentWeight:
              conversionWeight.currentWeight,
            currentHeight:
              conversionWeight.currentHeight,
            minimumHeight:
              conversionWeight.minimumHeight,
            minimumWeight:
              conversionWeight.minimumWeight,
            idealMaximumWeight:
              conversionWeight.idealMaximumWeight,
            requiredGain:
              conversionWeight.requiredGain,
            requiredLoss:
              conversionWeight.requiredLoss,
            maximumWeightGain:
              conversionWeight.maximumWeightGain,
            maximumWeightLoss:
              conversionWeight.maximumWeightLoss,
            reason:
              rejectionReasons.join(' ')
          });

          continue;
        }

        const sourceWasAbovePreferredMaximum =
          sourceBefore >
          sourceTarget.preferredMaximum;

        const sourceWasAboveCutIfAbove =
          sourceBefore >
          sourceTarget.cutIfAbove;

        candidates.push({
          player,
          destinationFit,
          sourcePosition,
          sourceBefore,
          sourceAfter,
          sourceMinimum:
            sourceTarget.minimum,
          sourcePreferredMaximum:
            sourceTarget.preferredMaximum,
          sourceCutIfAbove:
            sourceTarget.cutIfAbove,
          sourceWasAbovePreferredMaximum,
          sourceWasAboveCutIfAbove,
          conversionWeight
        });
      }

      candidates.sort(
        (left, right) =>
          Number(
            right.sourceWasAboveCutIfAbove
          ) -
            Number(
              left.sourceWasAboveCutIfAbove
            ) ||
          Number(
            right.conversionWeight
              .alreadyWithinRange
          ) -
            Number(
              left.conversionWeight
                .alreadyWithinRange
            ) ||
          (
            left.conversionWeight.requiredGain +
            left.conversionWeight.requiredLoss
          ) -
            (
              right.conversionWeight.requiredGain +
              right.conversionWeight.requiredLoss
            ) ||
          Number(
            right.sourceWasAbovePreferredMaximum
          ) -
            Number(
              left.sourceWasAbovePreferredMaximum
            ) ||
          right.destinationFit.overall -
            left.destinationFit.overall ||
          right.destinationFit
              .overallDifference -
            left.destinationFit
              .overallDifference ||
          right.player.depthRank -
            left.player.depthRank ||
          left.player.fullName.localeCompare(
            right.player.fullName,
            undefined,
            {
              sensitivity: 'base',
              numeric: true
            }
          )
      );

      let selected =
        candidates[0];

      if (!selected) {
        break;
      }

      if (
        !selected.sourceWasAboveCutIfAbove
      ) {
        const bestUnsignedCandidate =
          remainingUnsignedRecruits
            .filter(
              recruit =>
                !usedUnsignedRecruitRows.has(
                  recruit.recruitRow
                ) &&
                recruit.position ===
                  shortage.position &&
                recruit.height >=
                  positionTargets[
                    shortage.position
                  ].minimumHeight &&
                recruit.overallRating >=
                  fcsPoolSettings
                    .minimumShortageFillOverall
            )
            .sort(
              (left, right) =>
                right.overallRating -
                  left.overallRating ||
                left.fullName.localeCompare(
                  right.fullName,
                  undefined,
                  {
                    sensitivity: 'base',
                    numeric: true
                  }
                )
            )[0];

        if (
          bestUnsignedCandidate &&
          bestUnsignedCandidate.overallRating >
            selected.destinationFit.overall
        ) {
          break;
        }
      }

      const destinationBefore =
        projectedCounts[
          shortage.position
        ];

      const destinationAfter =
        destinationBefore + 1;

      projectedCounts[
        selected.sourcePosition
      ] =
        selected.sourceAfter;

      projectedCounts[
        shortage.position
      ] =
        destinationAfter;

      usedPlayerRows.add(
        selected.player.playerRow
      );

      const proposalNumber =
        proposals.length + 1;

      proposals.push({
        proposalType:
          'INTERNAL_POSITION_CHANGE',

        proposalId:
          `${team.teamIndex}-${proposalNumber}-${selected.player.playerRow}-${shortage.position}`,

        selectedByDefault:
          true,

        teamIndex:
          team.teamIndex,

        teamName:
          team.teamName,

        playerRow:
          selected.player.playerRow,

        playerName:
          selected.player.fullName,

        currentPosition:
          selected.sourcePosition,

        currentPlayerType:
          selected.player.playerType,

        currentStoredOverall:
          selected.player.overallRating,

        currentCalculatedOverall:
          selected.player
            .calculatedCurrentOverall,

        destinationPosition:
          shortage.position,

        destinationPlayerType:
          selected.destinationFit
            .playerType,

        destinationOverall:
          selected.destinationFit
            .overall,

        overallDifference:
          selected.destinationFit
            .overallDifference,

        depthRank:
          selected.player.depthRank,

        protectedStarter:
          false,

        protectedDepthPlayer:
          false,

        protectedDepthPlayers:
          selected.player
            .protectedDepthPlayers,

        sourceBefore:
          selected.sourceBefore,

        sourceAfter:
          selected.sourceAfter,

        sourceMinimum:
          selected.sourceMinimum,

        sourcePreferredMaximum:
          selected.sourcePreferredMaximum,

        sourceCutIfAbove:
          selected.sourceCutIfAbove,

        sourceWasAboveCutIfAbove:
          selected.sourceWasAboveCutIfAbove,

        sourceWasAbovePreferredMaximum:
          selected
            .sourceWasAbovePreferredMaximum,

        destinationBefore,
        destinationAfter,

        destinationMinimum:
          shortage.minimum,

        fillsZeroPosition:
          shortage.projected === 0,

        currentWeight:
          selected.conversionWeight
            .currentWeight,

        currentHeight:
          selected.conversionWeight
            .currentHeight,

        destinationMinimumHeight:
          selected.conversionWeight
            .minimumHeight,

        destinationMinimumWeight:
          selected.conversionWeight
            .minimumWeight,

        destinationIdealMaximumWeight:
          selected.conversionWeight
            .idealMaximumWeight,

        maximumWeightGain:
          selected.conversionWeight
            .maximumWeightGain,

        maximumWeightLoss:
          selected.conversionWeight
            .maximumWeightLoss,

        requiredConversionGain:
          selected.conversionWeight
            .requiredGain,

        requiredConversionLoss:
          selected.conversionWeight
            .requiredLoss,

        minimumConversionOverall:
          positionTargets[
            shortage.position
          ].minimumConversionOverall,

        maximumPositionChangeOverallDrop:
          fcsPoolSettings.maximumPositionChangeOverallDrop,

        overallDrop:
          Math.max(
            0,
            selected.player
              .calculatedCurrentOverall -
            selected.destinationFit.overall
          ),

        proposedFinalWeight:
          selected.conversionWeight
            .proposedWeight,

        proposedStoredWeight:
          displayedPlayerWeightToStoredValue(
            selected.conversionWeight
              .proposedWeight
          ),

        weightEligibilityReason:
          selected.conversionWeight
            .reason,

        reason:
          selected.sourceWasAboveCutIfAbove
            ? `Hard surplus ${selected.sourcePosition}: projected count ${selected.sourceBefore} is above Cut If Above ${selected.sourceCutIfAbove}. The best legal internal conversion is used before any unsigned player. Moving the player leaves ${selected.sourceAfter}, at or above the ${selected.sourceMinimum} Minimum.`
            : `Soft surplus ${selected.sourcePosition}: projected count ${selected.sourceBefore} is above Preferred Max ${selected.sourcePreferredMaximum} but not above Cut If Above ${selected.sourceCutIfAbove}. This legal internal conversion was kept because its projected ${shortage.position} OVR ${selected.destinationFit.overall} is at least as high as the best eligible remaining unsigned ${shortage.position} option. Moving the player leaves ${selected.sourceAfter}, at or above the ${selected.sourceMinimum} Minimum.`
      });

      remaining =
        Math.max(
          shortage.minimum -
            projectedCounts[
              shortage.position
            ],
          0
        );
    }

  }

  /*
   * Pass 2: remaining unsigned recruit direct roster fill.
   * Do not touch Team.CommittedPlayers or recruiting-board capacity.
   */
  const unsignedRecruitFillProposals = [];

  for (
    const shortage
    of shortages
  ) {
    let remaining =
      Math.max(
        shortage.minimum -
          projectedCounts[
            shortage.position
          ],
        0
      );

    while (remaining > 0) {
      const candidates =
        remainingUnsignedRecruits
          .filter(
            recruit =>
              !usedUnsignedRecruitRows.has(
                recruit.recruitRow
              ) &&
              recruit.position ===
                shortage.position &&
              recruit.height >=
                positionTargets[
                  shortage.position
                ].minimumHeight &&
              recruit.overallRating >=
                fcsPoolSettings
                  .minimumShortageFillOverall
          )
          .sort(
            (left, right) =>
              right.overallRating -
                left.overallRating ||
              left.fullName.localeCompare(
                right.fullName,
                undefined,
                {
                  sensitivity: 'base',
                  numeric: true
                }
              )
          );

      const selected =
        candidates[0];

      if (!selected) {
        break;
      }

      const destinationBefore =
        projectedCounts[
          shortage.position
        ];

      const destinationAfter =
        destinationBefore + 1;

      projectedCounts[
        shortage.position
      ] =
        destinationAfter;

      usedUnsignedRecruitRows.add(
        selected.recruitRow
      );

      const proposalNumber =
        proposals.length +
        unsignedRecruitFillProposals.length +
        1;

      unsignedRecruitFillProposals.push({
        proposalType:
          'UNSIGNED_RECRUIT_FILL',

        proposalId:
          `${team.teamIndex}-unsigned-${proposalNumber}-${selected.recruitRow}-${selected.playerRow}`,

        selectedByDefault:
          true,

        teamIndex:
          team.teamIndex,

        teamName:
          team.teamName,

        recruitRow:
          selected.recruitRow,

        playerRow:
          selected.playerRow,

        playerReference:
          selected.playerReference,

        playerName:
          selected.fullName,

        position:
          selected.position,

        playerType:
          selected.playerType,

        storedOverall:
          selected.overallRating,

        calculatedOverall:
          selected.calculatedCurrentOverall,

        currentWeight:
          selected.weight,

        currentHeight:
          selected.height,

        recruitStageBefore:
          selected.recruitStage,

        recruitStageAfter:
          'Invalid',

        unsignedPlayerType:
          selected.unsignedPlayerType,

        previousTeamIndex:
          selected.previousTeamIndex,

        previousTeamName:
          selected.previousTeamName,

        destinationBefore,
        destinationAfter,

        destinationMinimum:
          shortage.minimum,

        destinationMinimumHeight:
          positionTargets[
            shortage.position
          ].minimumHeight,

        minimumShortageFillOverall:
          fcsPoolSettings
            .minimumShortageFillOverall,

        reason:
          selected.unsignedPlayerType ===
            'Unsigned Transfer'
            ? `Pass 2 unsigned transfer fill: ${selected.fullName} is an unsigned transfer from ${selected.previousTeamName} still in the Recruit pool after Assign Unsigned Players. The player is ${selected.overallRating} OVR and ${selected.height} inches tall, meeting the ${fcsPoolSettings.minimumShortageFillOverall} OVR Shortage Fill minimum and the ${positionTargets[shortage.position].minimumHeight}-inch height minimum. The linked Player will be placed directly on ${team.teamName}; the Recruit row will be retired as Invalid; Team.CommittedPlayers and the recruiting board will not be changed.`
            : `Pass 2 unsigned recruit fill: ${selected.fullName} is an unsigned recruit with no previous school still in the Recruit pool after Assign Unsigned Players. The player is ${selected.overallRating} OVR and ${selected.height} inches tall, meeting the ${fcsPoolSettings.minimumShortageFillOverall} OVR Shortage Fill minimum and the ${positionTargets[shortage.position].minimumHeight}-inch height minimum. The linked Player will be placed directly on ${team.teamName}; the Recruit row will be retired as Invalid; Team.CommittedPlayers and the recruiting board will not be changed.`
      });

      remaining =
        Math.max(
          shortage.minimum -
            projectedCounts[
              shortage.position
            ],
          0
        );
    }
  }

  proposals.push(
    ...unsignedRecruitFillProposals
  );

  const fcsPoolTradeProposals = [];

  for (
    const shortage
    of shortages
  ) {
    let remaining =
      Math.max(
        shortage.minimum -
          projectedCounts[
            shortage.position
          ],
        0
      );

    while (remaining > 0) {
      const incomingCandidates =
        fcsPoolPlayers
          .filter(
            player =>
              !usedFcsPoolPlayerRows.has(
                player.playerRow
              ) &&
              player.position ===
                shortage.position &&
              player.height >=
                positionTargets[
                  shortage.position
                ].minimumHeight &&
              player.overallRating >=
                fcsPoolSettings.minimumOverall &&
              player.overallRating <=
                fcsPoolSettings.maximumOverall
          )
          .sort(
            (left, right) =>
              right.overallRating -
                left.overallRating ||
              left.fullName.localeCompare(
                right.fullName,
                undefined,
                {
                  sensitivity: 'base',
                  numeric: true
                }
              )
          );

      const eligibleOutgoingPlayers =
        team.players
          .filter(
            player => {
              if (
                usedPlayerRows.has(
                  player.playerRow
                ) ||
                player.protectedDepthPlayer
              ) {
                return false;
              }

              const sourceTarget =
                positionTargets[
                  player.position
                ];

              const sourceBefore =
                projectedCounts[
                  player.position
                ];

              const sourceAfter =
                sourceBefore - 1;

              return (
                sourceBefore >
                  sourceTarget
                    .preferredMaximum &&
                sourceAfter >=
                  sourceTarget.minimum
              );
            }
          );

      const maximumSurplus =
        eligibleOutgoingPlayers.reduce(
          (
            currentMaximum,
            player
          ) =>
            Math.max(
              currentMaximum,
              projectedCounts[
                player.position
              ] -
                positionTargets[
                  player.position
                ].preferredMaximum
            ),
          0
        );

      const largestSurplusCandidates =
        eligibleOutgoingPlayers
          .filter(
            player =>
              projectedCounts[
                player.position
              ] -
                positionTargets[
                  player.position
                ].preferredMaximum ===
              maximumSurplus
          )
          .sort(
            (left, right) =>
              left.calculatedCurrentOverall -
                right.calculatedCurrentOverall ||
              right.depthRank -
                left.depthRank ||
              left.fullName.localeCompare(
                right.fullName,
                undefined,
                {
                  sensitivity: 'base',
                  numeric: true
                }
              )
          );

      const lowOverallCandidateBand =
        largestSurplusCandidates.slice(
          0,
          Math.min(
            3,
            largestSurplusCandidates.length
          )
        );

      const outgoingMixIndex =
        lowOverallCandidateBand.length
          ? (
              Math.abs(
                (
                  team.teamIndex *
                  31
                ) +
                (
                  POSITION_ORDER.indexOf(
                    shortage.position
                  ) *
                  17
                ) +
                proposals.length +
                fcsPoolTradeProposals.length
              ) %
              lowOverallCandidateBand.length
            )
          : 0;

      const incoming =
        incomingCandidates[0];

      const outgoing =
        lowOverallCandidateBand[
          outgoingMixIndex
        ];

      if (
        !incoming ||
        !outgoing
      ) {
        break;
      }

      const sourcePosition =
        outgoing.position;

      const sourceBefore =
        projectedCounts[
          sourcePosition
        ];

      const sourceAfter =
        sourceBefore - 1;

      const destinationBefore =
        projectedCounts[
          shortage.position
        ];

      const destinationAfter =
        destinationBefore + 1;

      projectedCounts[
        sourcePosition
      ] =
        sourceAfter;

      projectedCounts[
        shortage.position
      ] =
        destinationAfter;

      usedPlayerRows.add(
        outgoing.playerRow
      );

      usedFcsPoolPlayerRows.add(
        incoming.playerRow
      );

      const proposalNumber =
        proposals.length +
        fcsPoolTradeProposals.length +
        1;

      fcsPoolTradeProposals.push({
        proposalType:
          'FCS_POOL_TRADE',

        proposalId:
          `${team.teamIndex}-fcs-${proposalNumber}-${outgoing.playerRow}-${incoming.playerRow}`,

        selectedByDefault:
          true,

        teamIndex:
          team.teamIndex,

        teamName:
          team.teamName,

        outgoingPlayerRow:
          outgoing.playerRow,

        outgoingPlayerName:
          outgoing.fullName,

        outgoingPosition:
          outgoing.position,

        outgoingOverall:
          outgoing
            .calculatedCurrentOverall,

        outgoingStoredOverall:
          outgoing.overallRating,

        outgoingDepthRank:
          outgoing.depthRank,

        protectedDepthPlayers:
          outgoing.protectedDepthPlayers,

        incomingPlayerRow:
          incoming.playerRow,

        incomingPlayerName:
          incoming.fullName,

        incomingPosition:
          incoming.position,

        incomingOverall:
          incoming.overallRating,

        incomingPlayerType:
          incoming.playerType,

        incomingWeight:
          incoming.weight,

        incomingHeight:
          incoming.height,

        destinationMinimumHeight:
          positionTargets[
            shortage.position
          ].minimumHeight,

        incomingStoredWeight:
          incoming.storedWeight,

        sourceBefore,
        sourceAfter,

        sourceMinimum:
          positionTargets[
            sourcePosition
          ].minimum,

        sourcePreferredMaximum:
          positionTargets[
            sourcePosition
          ].preferredMaximum,

        destinationBefore,
        destinationAfter,

        destinationMinimum:
          shortage.minimum,

        requiredConversionGain:
          0,

        requiredConversionLoss:
          0,

        outgoingSelectionPoolSize:
          lowOverallCandidateBand.length,

        maximumSourceSurplus:
          maximumSurplus,

        reason:
          `Pass 3 FCS pool trade: ${sourcePosition} was tied for the team's largest surplus at ${maximumSurplus} above Preferred Max. The outgoing player was selected from the lowest-${lowOverallCandidateBand.length} eligible OVR band to create a repeatable mix of lower-rated surplus players. Trading unprotected ${sourcePosition} #${outgoing.depthRank} leaves ${sourceAfter}, at or above its Minimum. The incoming unassigned ${shortage.position} is ${incoming.overallRating} OVR, is ${incoming.height} inches tall against the ${positionTargets[shortage.position].minimumHeight}-inch minimum, is within the configured ${fcsPoolSettings.minimumOverall}-${fcsPoolSettings.maximumOverall} range, and has no Recruit record.`
      });

      remaining =
        Math.max(
          shortage.minimum -
            projectedCounts[
              shortage.position
            ],
          0
        );
    }
  }

  proposals.push(
    ...fcsPoolTradeProposals
  );

  /*
   * Pass 4: mirrored-position final fallback.
   *
   * This pass runs only after the normal internal-conversion, remaining
   * unsigned-player, and FCS-pool shortage passes have all had a chance
   * to solve the shortage.
   *
   * A player may move only from the exact mirrored partner position:
   * LT <-> RT, LG <-> RG, LE <-> RE, LOLB <-> ROLB.
   *
   * The source position does NOT need to be above Preferred Max here.
   * It only needs enough PROJECTED depth to remain at or above its Minimum
   * after the move. Because this is the final projected-roster fallback,
   * current protected-depth status does not block the move when incoming
   * committed/signed players keep the projected source at Minimum.
   * Height, weight, destination Minimum Conversion OVR, and Maximum
   * Position Change OVR Drop rules still apply.
   */
  const mirrorRebalanceProposals = [];

  for (
    const shortage
    of shortages
  ) {
    const sourcePosition =
      MIRRORED_POSITION_PARTNER[
        shortage.position
      ];

    if (!sourcePosition) {
      continue;
    }

    let remaining =
      Math.max(
        shortage.minimum -
          projectedCounts[
            shortage.position
          ],
        0
      );

    while (remaining > 0) {
      const sourceTarget =
        positionTargets[
          sourcePosition
        ];

      const destinationTarget =
        positionTargets[
          shortage.position
        ];

      const sourceBefore =
        projectedCounts[
          sourcePosition
        ];

      const sourceAfter =
        sourceBefore - 1;

      if (
        sourceAfter <
        sourceTarget.minimum
      ) {
        break;
      }

      const candidates = [];

      for (
        const player
        of team.players
      ) {
        if (
          player.position !==
            sourcePosition ||
          usedPlayerRows.has(
            player.playerRow
          )
        ) {
          continue;
        }

        const destinationFit =
          player.bestFits.find(
            fit =>
              fit.position ===
              shortage.position
          );

        if (!destinationFit) {
          continue;
        }

        const conversionWeight =
          evaluateConversionWeight({
            player,
            destinationPosition:
              shortage.position,
            positionTargets
          });

        const rejectionReasons = [];

        if (
          !conversionWeight.eligible
        ) {
          rejectionReasons.push(
            conversionWeight.reason
          );
        }

        if (
          destinationFit.overall <
          destinationTarget
            .minimumConversionOverall
        ) {
          rejectionReasons.push(
            `Projected ${shortage.position} OVR ${destinationFit.overall} is below the configured Minimum Conversion OVR of ${destinationTarget.minimumConversionOverall}.`
          );
        }

        const overallDrop =
          Math.max(
            0,
            player.calculatedCurrentOverall -
              destinationFit.overall
          );

        if (
          overallDrop >
          fcsPoolSettings
            .maximumPositionChangeOverallDrop
        ) {
          rejectionReasons.push(
            `Position change would drop calculated OVR by ${overallDrop} points (${player.calculatedCurrentOverall} → ${destinationFit.overall}), exceeding the configured Maximum Position Change OVR Drop of ${fcsPoolSettings.maximumPositionChangeOverallDrop}.`
          );
        }

        if (rejectionReasons.length) {
          rejectedConversionCandidates.push({
            mirrorRebalance:
              true,
            shortagePosition:
              shortage.position,
            playerRow:
              player.playerRow,
            playerName:
              player.fullName,
            currentPosition:
              player.position,
            currentOverall:
              player.calculatedCurrentOverall,
            destinationOverall:
              destinationFit.overall,
            overallDifference:
              destinationFit.overallDifference,
            overallDrop,
            maximumPositionChangeOverallDrop:
              fcsPoolSettings
                .maximumPositionChangeOverallDrop,
            minimumConversionOverall:
              destinationTarget
                .minimumConversionOverall,
            currentWeight:
              conversionWeight.currentWeight,
            currentHeight:
              conversionWeight.currentHeight,
            minimumHeight:
              conversionWeight.minimumHeight,
            minimumWeight:
              conversionWeight.minimumWeight,
            idealMaximumWeight:
              conversionWeight
                .idealMaximumWeight,
            requiredGain:
              conversionWeight.requiredGain,
            requiredLoss:
              conversionWeight.requiredLoss,
            maximumWeightGain:
              conversionWeight
                .maximumWeightGain,
            maximumWeightLoss:
              conversionWeight
                .maximumWeightLoss,
            reason:
              `Mirror fallback ${sourcePosition} → ${shortage.position}: ${rejectionReasons.join(' ')}`
          });

          continue;
        }

        candidates.push({
          player,
          destinationFit,
          conversionWeight,
          overallDrop
        });
      }

      /*
       * "Worst player" means the lowest current calculated OVR among
       * otherwise legal candidates. Ties prefer the deeper player, then
       * the lower stored OVR, then the better destination OVR.
       */
      candidates.sort(
        (left, right) =>
          left.player
            .calculatedCurrentOverall -
            right.player
              .calculatedCurrentOverall ||
          right.player.depthRank -
            left.player.depthRank ||
          left.player.overallRating -
            right.player.overallRating ||
          right.destinationFit.overall -
            left.destinationFit.overall ||
          left.player.fullName.localeCompare(
            right.player.fullName,
            undefined,
            {
              sensitivity: 'base',
              numeric: true
            }
          )
      );

      const selected =
        candidates[0];

      if (!selected) {
        break;
      }

      const destinationBefore =
        projectedCounts[
          shortage.position
        ];

      const destinationAfter =
        destinationBefore + 1;

      projectedCounts[
        sourcePosition
      ] =
        sourceAfter;

      projectedCounts[
        shortage.position
      ] =
        destinationAfter;

      usedPlayerRows.add(
        selected.player.playerRow
      );

      const proposalNumber =
        proposals.length +
        mirrorRebalanceProposals.length +
        1;

      mirrorRebalanceProposals.push({
        proposalType:
          'INTERNAL_POSITION_CHANGE',

        mirrorRebalance:
          true,

        fallbackPass:
          4,

        mirrorPair:
          `${sourcePosition}<->${shortage.position}`,

        proposalId:
          `${team.teamIndex}-mirror-${proposalNumber}-${selected.player.playerRow}-${shortage.position}`,

        selectedByDefault:
          true,

        teamIndex:
          team.teamIndex,

        teamName:
          team.teamName,

        playerRow:
          selected.player.playerRow,

        playerName:
          selected.player.fullName,

        currentPosition:
          sourcePosition,

        currentPlayerType:
          selected.player.playerType,

        currentStoredOverall:
          selected.player.overallRating,

        currentCalculatedOverall:
          selected.player
            .calculatedCurrentOverall,

        destinationPosition:
          shortage.position,

        destinationPlayerType:
          selected.destinationFit
            .playerType,

        destinationOverall:
          selected.destinationFit
            .overall,

        overallDifference:
          selected.destinationFit
            .overallDifference,

        depthRank:
          selected.player.depthRank,

        protectedStarter:
          selected.player
            .protectedStarter,

        protectedDepthPlayer:
          selected.player
            .protectedDepthPlayer,

        protectedDepthPlayers:
          selected.player
            .protectedDepthPlayers,

        mirrorFallbackUsesProjectedDepth:
          true,

        sourceBefore,
        sourceAfter,

        sourceMinimum:
          sourceTarget.minimum,

        sourcePreferredMaximum:
          sourceTarget
            .preferredMaximum,

        sourceCutIfAbove:
          sourceTarget.cutIfAbove,

        sourceWasAboveCutIfAbove:
          sourceBefore >
          sourceTarget.cutIfAbove,

        sourceWasAbovePreferredMaximum:
          sourceBefore >
          sourceTarget
            .preferredMaximum,

        destinationBefore,
        destinationAfter,

        destinationMinimum:
          shortage.minimum,

        fillsZeroPosition:
          destinationBefore === 0,

        currentWeight:
          selected.conversionWeight
            .currentWeight,

        currentHeight:
          selected.conversionWeight
            .currentHeight,

        destinationMinimumHeight:
          selected.conversionWeight
            .minimumHeight,

        destinationMinimumWeight:
          selected.conversionWeight
            .minimumWeight,

        destinationIdealMaximumWeight:
          selected.conversionWeight
            .idealMaximumWeight,

        maximumWeightGain:
          selected.conversionWeight
            .maximumWeightGain,

        maximumWeightLoss:
          selected.conversionWeight
            .maximumWeightLoss,

        requiredConversionGain:
          selected.conversionWeight
            .requiredGain,

        requiredConversionLoss:
          selected.conversionWeight
            .requiredLoss,

        minimumConversionOverall:
          destinationTarget
            .minimumConversionOverall,

        maximumPositionChangeOverallDrop:
          fcsPoolSettings
            .maximumPositionChangeOverallDrop,

        overallDrop:
          selected.overallDrop,

        proposedFinalWeight:
          selected.conversionWeight
            .proposedWeight,

        proposedStoredWeight:
          displayedPlayerWeightToStoredValue(
            selected.conversionWeight
              .proposedWeight
          ),

        weightEligibilityReason:
          selected.conversionWeight
            .reason,

        reason:
          `Pass 4 Mirror Rebalance — Final Fallback: ${shortage.position} remained below its Minimum of ${shortage.minimum} after the normal internal conversion, unsigned-player, and FCS-pool passes. ${sourcePosition} had ${sourceBefore} projected players and can spare one while remaining at its Minimum of ${sourceTarget.minimum}. ${selected.player.fullName}, the lowest-current-OVR eligible current ${sourcePosition}, moves ${sourcePosition} → ${shortage.position}; projected ${sourcePosition} becomes ${sourceAfter} and projected ${shortage.position} becomes ${destinationAfter}. This final fallback protects the projected source Minimum rather than the current-depth protected-player count, so incoming committed/signed players can provide the depth that makes the side-to-side move safe. Height, weight, Minimum Conversion OVR, and Maximum Position Change OVR Drop limits are still enforced.`
      });

      remaining =
        Math.max(
          shortage.minimum -
            projectedCounts[
              shortage.position
            ],
          0
        );
    }
  }

  proposals.push(
    ...mirrorRebalanceProposals
  );

  for (
    const shortage
    of shortages
  ) {
    const remaining =
      Math.max(
        shortage.minimum -
          projectedCounts[
            shortage.position
          ],
        0
      );

    if (remaining > 0) {
      unresolvedShortages.push({
        position:
          shortage.position,

        projectedAfterProposals:
          projectedCounts[
            shortage.position
          ],

        minimum:
          shortage.minimum,

        remaining,

        reason:
          MIRRORED_POSITION_PARTNER[
            shortage.position
          ]
            ? `Pass 1 found no legal surplus conversion, Pass 2 found no remaining unsigned recruit/transfer at ${shortage.position}, Pass 3 found no eligible FCS-pool solution, and Pass 4 could not legally move an unprotected ${MIRRORED_POSITION_PARTNER[shortage.position]} to ${shortage.position} without violating the source Minimum or another configured conversion limit.`
            : `Pass 1 found no legal surplus conversion, Pass 2 found no remaining unsigned recruit/transfer at ${shortage.position}, and Pass 3 found no eligible FCS-pool solution. ${shortage.position} has no configured mirrored-position fallback.`
      });
    }
  }

  const fcsPoolCutProposals = [];
  const signedRecruitReleaseProposals = [];

  const cutPositions =
    POSITION_ORDER
      .map(
        position => ({
          position,
          projected:
            projectedCounts[
              position
            ],
          cutIfAbove:
            positionTargets[
              position
            ].cutIfAbove,
          excess:
            Math.max(
              projectedCounts[
                position
              ] -
                positionTargets[
                  position
                ].cutIfAbove,
              0
            )
        })
      )
      .filter(
        item =>
          item.excess > 0
      )
      .sort(
        (left, right) =>
          right.excess -
            left.excess ||
          POSITION_ORDER.indexOf(
            left.position
          ) -
            POSITION_ORDER.indexOf(
              right.position
            )
      );

  for (
    const cutPosition
    of cutPositions
  ) {
    while (
      projectedCounts[
        cutPosition.position
      ] >
      cutPosition.cutIfAbove
    ) {
      const eligibleSignedRecruits =
        team.signedRecruitPlayers
          .filter(
            recruit =>
              recruit.position ===
                cutPosition.position &&
              !usedPlayerRows.has(
                recruit.playerRow
              ) &&
              recruit.calculatedOverall <=
                fcsPoolSettings.maximumCutOverall
          )
          .sort(
            (left, right) =>
              left.calculatedOverall -
                right.calculatedOverall ||
              left.fullName.localeCompare(
                right.fullName,
                undefined,
                {
                  sensitivity: 'base',
                  numeric: true
                }
              )
          );

      if (
        eligibleSignedRecruits.length
      ) {
        const selected =
          eligibleSignedRecruits[0];

        const before =
          projectedCounts[
            cutPosition.position
          ];

        const after =
          before - 1;

        projectedCounts[
          cutPosition.position
        ] =
          after;

        usedPlayerRows.add(
          selected.playerRow
        );

        signedRecruitReleaseProposals.push({
          proposalType:
            'SIGNED_RECRUIT_RELEASE',

          proposalId:
            `${team.teamIndex}-signed-release-${cutPosition.position}-${selected.recruitRow}-${selected.playerRow}`,

          selectedByDefault:
            true,

          teamIndex:
            team.teamIndex,

          teamName:
            team.teamName,

          recruitRow:
            selected.recruitRow,

          playerRow:
            selected.playerRow,

          playerReference:
            selected.playerReference,

          playerName:
            selected.fullName,

          position:
            selected.position,

          playerType:
            selected.playerType,

          storedOverall:
            selected.storedOverall,

          calculatedOverall:
            selected.calculatedOverall,

          depthRank:
            'Incoming',

          protectedDepthPlayers:
            'N/A',

          currentWeight:
            selected.currentWeight,

          storedWeight:
            selected.storedWeight,

          rosterBefore:
            before,

          rosterAfter:
            after,

          cutIfAbove:
            cutPosition.cutIfAbove,

          maximumCutOverall:
            fcsPoolSettings.maximumCutOverall,

          destinationTeamIndex:
            FCS_POOL_TEAM_INDEX,

          destinationLabel:
            'Player never reported to campus',

          recruitStageBefore:
            'Signed',

          recruitStageAfter:
            'Top10',

          reason:
            `${cutPosition.position} remained above its Cut If Above value of ${cutPosition.cutIfAbove}. This incoming Signed recruit is ${selected.calculatedOverall} OVR, at or below the configured Maximum OVR Eligible for FCS Cut of ${fcsPoolSettings.maximumCutOverall}. Applying this proposal removes the Player reference from ${team.teamName} CommittedPlayers and changes RecruitStage from Signed to Top10 because the player never reported to campus.`
        });

        continue;
      }

      const eligiblePlayers =
        team.players
          .filter(
            player =>
              player.position ===
                cutPosition.position &&
              !usedPlayerRows.has(
                player.playerRow
              ) &&
              !player.protectedDepthPlayer &&
              player.calculatedCurrentOverall <=
                fcsPoolSettings.maximumCutOverall
          )
          .sort(
            (left, right) =>
              left.calculatedCurrentOverall -
                right.calculatedCurrentOverall ||
              right.depthRank -
                left.depthRank ||
              left.fullName.localeCompare(
                right.fullName,
                undefined,
                {
                  sensitivity: 'base',
                  numeric: true
                }
              )
          );

      if (!eligiblePlayers.length) {
        break;
      }

      const lowOverallBand =
        eligiblePlayers.slice(
          0,
          Math.min(
            3,
            eligiblePlayers.length
          )
        );

      const mixIndex =
        Math.abs(
          (
            team.teamIndex *
            37
          ) +
          (
            POSITION_ORDER.indexOf(
              cutPosition.position
            ) *
            19
          ) +
          fcsPoolCutProposals.length
        ) %
        lowOverallBand.length;

      const selected =
        lowOverallBand[
          mixIndex
        ];

      const before =
        projectedCounts[
          cutPosition.position
        ];

      const after =
        before - 1;

      projectedCounts[
        cutPosition.position
      ] =
        after;

      usedPlayerRows.add(
        selected.playerRow
      );

      fcsPoolCutProposals.push({
        proposalType:
          'FCS_POOL_CUT',

        proposalId:
          `${team.teamIndex}-cut-${cutPosition.position}-${selected.playerRow}`,

        selectedByDefault:
          true,

        teamIndex:
          team.teamIndex,

        teamName:
          team.teamName,

        playerRow:
          selected.playerRow,

        playerName:
          selected.fullName,

        position:
          selected.position,

        playerType:
          selected.playerType,

        storedOverall:
          selected.overallRating,

        calculatedOverall:
          selected.calculatedCurrentOverall,

        depthRank:
          selected.depthRank,

        protectedDepthPlayers:
          selected.protectedDepthPlayers,

        currentWeight:
          selected.weight,

        storedWeight:
          selected.storedWeight,

        rosterBefore:
          before,

        rosterAfter:
          after,

        cutIfAbove:
          cutPosition.cutIfAbove,

        maximumCutOverall:
          fcsPoolSettings.maximumCutOverall,

        destinationTeamIndex:
          FCS_POOL_TEAM_INDEX,

        destinationLabel:
          'Unassigned Players',

        selectionPoolSize:
          lowOverallBand.length,

        reason:
          `${cutPosition.position} remained above its Cut If Above value of ${cutPosition.cutIfAbove} after the shortage-fixing passes. This unprotected ${cutPosition.position} #${selected.depthRank} is ${selected.calculatedCurrentOverall} OVR, at or below the configured Maximum OVR Eligible for FCS Cut of ${fcsPoolSettings.maximumCutOverall}. It was selected from the lowest-${lowOverallBand.length} eligible OVR band and would move to TeamIndex ${FCS_POOL_TEAM_INDEX} using the Player Trade Center unassigned-player workflow.`
      });
    }
  }

  const unresolvedCutExcess =
    POSITION_ORDER
      .map(
        position => {
          const remaining =
            Math.max(
              projectedCounts[position] -
                positionTargets[position].cutIfAbove,
              0
            );

          return {
            position,
            remaining,
            projectedAfterProposals:
              projectedCounts[position],
            cutIfAbove:
              positionTargets[position].cutIfAbove,
            maximumCutOverall:
              fcsPoolSettings.maximumCutOverall,
            reason:
              remaining > 0
                ? `${position} remains ${remaining} above Cut If Above because no remaining eligible Signed recruit or unprotected current-roster player is at or below the configured Maximum OVR Eligible for FCS Cut of ${fcsPoolSettings.maximumCutOverall}.`
                : ''
          };
        }
      )
      .filter(
        item =>
          item.remaining > 0
      );

  const projectedTotal =
    team.current.total +
    team.incoming.total +
    team.unsignedPreview.total;

  const severityScore =
    shortages.reduce(
      (total, shortage) =>
        total +
        shortage.amount *
          (shortage.isZero ? 10 : 4),
      0
    ) +
    surpluses.reduce(
      (total, surplus) =>
        total +
        surplus.amount,
      0
    );

  const analyzedPlayers =
    team.players
      .map(player => ({
        ...player,

        sourceIsSurplus:
          surpluses.some(
            surplus =>
              surplus.position ===
              player.position
          ),

        shortageFits:
          player.bestFits.filter(
            fit =>
              shortages.some(
                shortage =>
                  shortage.position ===
                  fit.position
              )
          )
      }))
      .sort(
        (left, right) =>
          Number(right.sourceIsSurplus) -
            Number(left.sourceIsSurplus) ||
          Number(left.protectedStarter) -
            Number(right.protectedStarter) ||
          right.overallRating -
            left.overallRating ||
          left.fullName.localeCompare(
            right.fullName,
            undefined,
            {
              sensitivity: 'base',
              numeric: true
            }
          )
      );

  return {
    teamIndex:
      team.teamIndex,
    teamName:
      team.teamName,

    isUserControlled:
      Boolean(
        team.isUserControlled
      ),

    currentRosterTotal:
      team.current.total,
    hardCommittedTotal:
      team.hardCommitted.total,
    signedTotal:
      team.signed.total,
    incomingTotal:
      team.incoming.total,
    unsignedPreviewTotal:
      team.unsignedPreview.total,
    unsignedPreviewPlayers:
      team.unsignedPreviewPlayers,
    projectedRosterTotal:
      projectedTotal,
    shortageCount:
      shortages.length,
    surplusCount:
      surpluses.length,
    severityScore,
    shortages,
    surpluses,
    positions,
    players:
      analyzedPlayers,
    proposals,
    proposalCount:
      proposals.length,
    internalPositionChangeProposalCount:
      proposals.filter(
        proposal =>
          proposal.proposalType ===
          'INTERNAL_POSITION_CHANGE'
      ).length,
    mirrorRebalanceProposalCount:
      proposals.filter(
        proposal =>
          proposal.proposalType ===
            'INTERNAL_POSITION_CHANGE' &&
          proposal.mirrorRebalance ===
            true
      ).length,
    unsignedRecruitFillProposalCount:
      proposals.filter(
        proposal =>
          proposal.proposalType ===
          'UNSIGNED_RECRUIT_FILL'
      ).length,
    fcsPoolTradeProposalCount:
      proposals.filter(
        proposal =>
          proposal.proposalType ===
          'FCS_POOL_TRADE'
      ).length,
    talentRescueProposalCount:
      0,
    fcsPoolCutProposals,
    fcsPoolCutProposalCount:
      fcsPoolCutProposals.length,
    signedRecruitReleaseProposals,
    signedRecruitReleaseProposalCount:
      signedRecruitReleaseProposals.length,
    rosterStoreDuplicateProposals:
      team.rosterStoreDuplicateProposals,
    rosterStoreDuplicateProposalCount:
      team
        .rosterStoreDuplicateProposals
        .length,
    rosterStoreDuplicateSlotCount:
      team
        .rosterStoreDuplicateProposals
        .reduce(
          (total, proposal) =>
            total +
            proposal.duplicateCount,
          0
        ),
    unresolvedCutExcess,
    unresolvedCutExcessSlots:
      unresolvedCutExcess.reduce(
        (total, item) =>
          total +
          item.remaining,
        0
      ),
    projectedCountsAfterCuts:
      {
        ...projectedCounts
      },
    unresolvedShortages,
    unresolvedShortageSlots:
      unresolvedShortages.reduce(
        (total, item) =>
          total +
          item.remaining,
        0
      ),
    projectedCountsAfterProposals:
      projectedCounts,

    rejectedConversionCandidates:
      rejectedConversionCandidates
        .filter(
          (
            item,
            index,
            all
          ) =>
            all.findIndex(
              candidate =>
                candidate.shortagePosition ===
                  item.shortagePosition &&
                candidate.playerRow ===
                  item.playerRow
            ) ===
            index
        )
        .slice(0, 75),

    normalWeightDevelopmentCount:
      analyzedPlayers.filter(
        player =>
          player.normalWeightDevelopment
            ?.eligible
      ).length,

    normalWeightDevelopmentPounds:
      analyzedPlayers.reduce(
        (total, player) =>
          total +
          (
            player.normalWeightDevelopment
              ?.developmentGain ??
            0
          ),
        0
      ),

    starterProtectionMethod:
      'Players are ranked within their current position by calculated OVR. Each position protects the configured number of highest-ranked depth players from position-change proposals.'
  };
}

function emptyRosterBucket() {
  return {
    total: 0,
    positions:
      Object.fromEntries(
        POSITION_ORDER.map(
          position => [
            position,
            0
          ]
        )
      )
  };
}

async function resolveTable({
  franchise,
  session,
  sessionKey,
  expectedName,
  requiredFields,
  minimumValidRows
}) {
  const cachedIndex =
    toInteger(
      session?.resolvedTables
        ?.[sessionKey]
        ?.index,
      -1
    );

  if (cachedIndex >= 0) {
    try {
      const cachedTable =
        franchise.getTableByIndex(
          cachedIndex
        );

      await mutedReadRecords(
        cachedTable
      );

      const analysis =
        analyzeTable(
          cachedTable,
          expectedName,
          requiredFields
        );

      if (
        analysis.validRows >=
        minimumValidRows
      ) {
        return {
          table:
            cachedTable,
          tableIndex:
            cachedIndex,
          source:
            'dynasty session',
          validRows:
            analysis.validRows,
          requiredFields:
            [...requiredFields]
        };
      }
    } catch {
      // Continue to dynamic discovery.
    }
  }

  const candidates = [];
  let misses = 0;

  for (
    let tableIndex = 0;
    tableIndex < 10000 &&
    misses < 50;
    tableIndex++
  ) {
    let table = null;

    try {
      table =
        franchise.getTableByIndex(
          tableIndex
        );
    } catch {
      misses++;
      continue;
    }

    if (!table) {
      misses++;
      continue;
    }

    misses = 0;

    if (
      Boolean(table.isArray) ||
      normalizeName(
        table.name
      ) !==
        normalizeName(
          expectedName
        )
    ) {
      continue;
    }

    try {
      await mutedReadRecords(
        table
      );
    } catch {
      continue;
    }

    const analysis =
      analyzeTable(
        table,
        expectedName,
        requiredFields
      );

    if (
      analysis.validRows <
      minimumValidRows
    ) {
      continue;
    }

    candidates.push({
      table,
      tableIndex,
      source:
        'name and field-signature discovery',
      validRows:
        analysis.validRows,
      requiredFields:
        [...requiredFields]
    });
  }

  if (!candidates.length) {
    throw new Error(
      `Could not dynamically resolve a valid ${expectedName} table containing ${requiredFields.join(', ')}.`
    );
  }

  candidates.sort(
    (left, right) =>
      right.validRows -
        left.validRows ||
      left.tableIndex -
        right.tableIndex
  );

  return candidates[0];
}

function analyzeTable(
  table,
  expectedName,
  requiredFields
) {
  if (
    !table ||
    Boolean(table.isArray) ||
    normalizeName(
      table.name
    ) !==
      normalizeName(
        expectedName
      )
  ) {
    return {
      validRows: 0
    };
  }

  let validRows = 0;

  for (
    const record
    of table.records ?? []
  ) {
    if (
      isUsableRecord(record) &&
      hasFields(
        record,
        requiredFields
      )
    ) {
      validRows++;
    }
  }

  return {
    validRows
  };
}

function buildTableIdMap(
  franchise
) {
  const map =
    new Map();

  let misses = 0;

  for (
    let tableIndex = 0;
    tableIndex < 10000 &&
    misses < 50;
    tableIndex++
  ) {
    let table = null;

    try {
      table =
        franchise.getTableByIndex(
          tableIndex
        );
    } catch {
      misses++;
      continue;
    }

    if (!table) {
      misses++;
      continue;
    }

    misses = 0;

    const tableId =
      getTableId(table);

    if (
      Number.isInteger(tableId) &&
      !map.has(tableId)
    ) {
      map.set(
        tableId,
        {
          table,
          tableIndex
        }
      );
    }
  }

  return map;
}

function decodeTableReference(
  value,
  tableIdMap
) {
  const text =
    toText(value);

  if (!/^[01]{32}$/.test(text)) {
    return null;
  }

  const tableId =
    Number.parseInt(
      text.slice(0, 15),
      2
    );

  const row =
    Number.parseInt(
      text.slice(15),
      2
    );

  const mapped =
    tableIdMap.get(tableId);

  if (!mapped) {
    return null;
  }

  return {
    tableId,
    row,
    table:
      mapped.table,
    tableIndex:
      mapped.tableIndex
  };
}

async function resolveRecruitDestination({
  recruitRecord,
  tableIdMap
}) {
  const topSchoolsReference =
    decodeTableReference(
      recruitRecord.TopSchoolsList,
      tableIdMap
    );

  if (!topSchoolsReference) {
    return null;
  }

  try {
    await mutedReadRecords(
      topSchoolsReference.table
    );
  } catch {
    return null;
  }

  const listRecord =
    topSchoolsReference.table
      .records?.[
        topSchoolsReference.row
      ];

  if (!isUsableRecord(listRecord)) {
    return null;
  }

  const fieldNames =
    Object.keys(
      listRecord.fields ?? {}
    );

  const preferredFields = [
    'RecruitAndTeam0',
    'RecruitTeam0',
    'Target0',
    'School0',
    'Team0'
  ];

  const candidates = [
    ...preferredFields.filter(
      fieldName =>
        fieldNames.includes(
          fieldName
        )
    ),
    ...fieldNames
      .filter(
        fieldName =>
          /0$/.test(fieldName) &&
          !preferredFields.includes(
            fieldName
          )
      )
      .sort()
  ];

  for (
    const fieldName
    of candidates
  ) {
    const targetReference =
      decodeTableReference(
        listRecord[fieldName],
        tableIdMap
      );

    if (!targetReference) {
      continue;
    }

    try {
      await mutedReadRecords(
        targetReference.table
      );
    } catch {
      continue;
    }

    const targetRecord =
      targetReference.table
        .records?.[
          targetReference.row
        ];

    if (!isUsableRecord(targetRecord)) {
      continue;
    }

    for (
      const teamField
      of [
        'TeamId',
        'TeamIndex',
        'SchoolId'
      ]
    ) {
      if (
        !hasField(
          targetRecord,
          teamField
        )
      ) {
        continue;
      }

      const teamIndex =
        toInteger(
          targetRecord[teamField],
          -1
        );

      if (
        teamIndex >= 0 &&
        teamIndex < 255
      ) {
        return teamIndex;
      }
    }
  }

  return null;
}


async function writeFinalNsdDispositionReport({
  inputPath,
  outputDirectory = '',
  finalDispositionSeed = {},
  session = null
}) {
  const resolvedInput =
    requireExistingInputPath(
      inputPath
    );

  const candidates =
    Array.isArray(
      finalDispositionSeed
        ?.candidates
    )
      ? finalDispositionSeed
          .candidates
      : [];

  const phaseOneAssignments =
    Array.isArray(
      finalDispositionSeed
        ?.phaseOneAssignments
    )
      ? finalDispositionSeed
          .phaseOneAssignments
      : [];

  const rosterAssignments =
    Array.isArray(
      finalDispositionSeed
        ?.rosterAssignments
    )
      ? finalDispositionSeed
          .rosterAssignments
      : [];

  if (!candidates.length) {
    return {
      reportPath:
        null,
      rowsWritten:
        0,
      assigned:
        0,
      leftUnassigned:
        0,
      reason:
        'No National Signing Day unsigned-player candidate seed was available.'
    };
  }

  const franchise =
    await Franchise.create(
      resolvedInput,
      {
        gameTypeOverride:
          'college',
        gameYearOverride:
          27,
        schemaDirectory:
          NSD_ROSTER_BALANCER_SCHEMA_DIRECTORY,
        saveOnChange:
          false
      }
    );

  const playerTableInfo =
    await resolveTable({
      franchise,
      session,
      sessionKey:
        'Player',
      expectedName:
        'Player',
      requiredFields: [
        'FirstName',
        'LastName',
        'TeamIndex',
        'Position',
        'OverallRating'
      ],
      minimumValidRows:
        100
    });

  const teamTableInfo =
    await resolveTable({
      franchise,
      session,
      sessionKey:
        'Team',
      expectedName:
        'Team',
      requiredFields: [
        'TeamIndex',
        'DisplayName',
        'LongName'
      ],
      minimumValidRows:
        100
    });

  const recruitTableInfo =
    await resolveTable({
      franchise,
      session,
      sessionKey:
        'Recruit',
      expectedName:
        'Recruit',
      requiredFields: [
        'Player',
        'RecruitStage'
      ],
      minimumValidRows:
        100
    });

  const teamNameByIndex =
    new Map();

  for (
    const record
    of teamTableInfo.table.records ?? []
  ) {
    if (
      !isUsableRecord(
        record
      )
    ) {
      continue;
    }

    const teamIndex =
      toInteger(
        record.TeamIndex,
        -1
      );

    if (
      teamIndex < 0 ||
      teamIndex >=
        FCS_POOL_TEAM_INDEX
    ) {
      continue;
    }

    teamNameByIndex.set(
      teamIndex,
      toText(
        record.DisplayName
      ) ||
      toText(
        record.LongName
      ) ||
      `Team ${teamIndex}`
    );
  }

  const phaseOneByPlayerRow =
    new Map(
      phaseOneAssignments
        .map(
          item => [
            Number(
              item.playerRow
            ),
            item
          ]
        )
        .filter(
          ([playerRow]) =>
            Number.isInteger(
              playerRow
            )
        )
    );

  const rosterByPlayerRow =
    new Map(
      rosterAssignments
        .map(
          item => [
            Number(
              item.playerRow
            ),
            item
          ]
        )
        .filter(
          ([playerRow]) =>
            Number.isInteger(
              playerRow
            )
        )
    );

  const reportRows = [];

  for (
    const candidate
    of candidates
  ) {
    const playerRow =
      Number(
        candidate.playerRow
      );

    const recruitRow =
      Number(
        candidate.recruitRow
      );

    const playerRecord =
      Number.isInteger(
        playerRow
      )
        ? playerTableInfo.table.records?.[
            playerRow
          ]
        : null;

    const recruitRecord =
      Number.isInteger(
        recruitRow
      )
        ? recruitTableInfo.table.records?.[
            recruitRow
          ]
        : null;

    const finalTeamIndex =
      isUsableRecord(
        playerRecord
      )
        ? toInteger(
            playerRecord.TeamIndex,
            FCS_POOL_TEAM_INDEX
          )
        : FCS_POOL_TEAM_INDEX;

    const finalAssigned =
      finalTeamIndex >= 0 &&
      finalTeamIndex <
        FCS_POOL_TEAM_INDEX;

    const phaseOne =
      phaseOneByPlayerRow.get(
        playerRow
      );

    const rosterAssignment =
      rosterByPlayerRow.get(
        playerRow
      );

    let finalPhase =
      'Final Unassigned';

    let finalReason =
      candidate.initialReason ??
      '';

    if (finalAssigned) {
      if (rosterAssignment) {
        finalPhase =
          rosterAssignment.phase ??
          rosterAssignment.proposalType ??
          'Roster Balancer';

        finalReason =
          rosterAssignment.proposalType ===
            'TALENT_RESCUE_SWAP'
            ? 'Placed by the final Talent Rescue one-for-one same-position replacement.'
            : 'Placed directly by Roster Balancer to resolve a remaining roster shortage.';
      } else if (phaseOne) {
        finalPhase =
          phaseOne.assignmentPass ||
          phaseOne.assignmentDecision ||
          candidate.assignmentPass ||
          candidate.initialDecision ||
          'Assign Unsigned Players';

        finalReason =
          'Assigned during the initial Assign Unsigned Players phase.';
      } else {
        finalPhase =
          'Assigned — Final Dynasty State';

        finalReason =
          'Player is assigned in the completed dynasty, but no specific National Signing Day phase hint was available.';
      }
    }

    reportRows.push({
      player:
        isUsableRecord(
          playerRecord
        )
          ? [
              toText(
                playerRecord.FirstName
              ),
              toText(
                playerRecord.LastName
              )
            ]
              .filter(Boolean)
              .join(' ')
              .trim() ||
            candidate.player ||
            'Unknown Player'
          : candidate.player ||
            'Unknown Player',

      playerType:
        candidate.previousSchool
          ? 'Unsigned Transfer'
          : 'Unsigned Recruit',

      class:
        candidate.class ??
        '',

      position:
        isUsableRecord(
          playerRecord
        )
          ? toText(
              playerRecord.Position
            )
          : candidate.position ??
            '',

      overall:
        isUsableRecord(
          playerRecord
        )
          ? toInteger(
              playerRecord.OverallRating,
              candidate.overall ?? 0
            )
          : candidate.overall ??
            '',

      previousSchool:
        candidate.previousSchool ??
        '',

      originalTopSchool:
        candidate.originalTopSchool ??
        '',

      initialPhaseResult:
        candidate.initialDecision ??
        '',

      initialDestination:
        candidate.initialDestination ??
        '',

      finalResult:
        finalAssigned
          ? 'Assigned'
          : 'Left Unassigned',

      finalSchool:
        finalAssigned
          ? (
              teamNameByIndex.get(
                finalTeamIndex
              ) ??
              `Team ${finalTeamIndex}`
            )
          : '',

      finalPhase,

      finalRecruitStage:
        isUsableRecord(
          recruitRecord
        )
          ? toText(
              recruitRecord.RecruitStage
            )
          : '',

      finalReason,

      recruitRow:
        Number.isInteger(
          recruitRow
        )
          ? recruitRow
          : '',

      playerRow:
        Number.isInteger(
          playerRow
        )
          ? playerRow
          : ''
    });
  }

  reportRows.sort(
    (left, right) =>
      Number(
        left.finalResult ===
          'Left Unassigned'
      ) -
        Number(
          right.finalResult ===
            'Left Unassigned'
        ) ||
      Number(
        right.overall
      ) -
        Number(
          left.overall
        ) ||
      left.player.localeCompare(
        right.player,
        undefined,
        {
          sensitivity:
            'base',
          numeric:
            true
        }
      )
  );

  const resolvedReportDirectory =
    outputDirectory
      ? path.join(
          path.resolve(
            outputDirectory
          ),
          'Reports'
        )
      : resolveReportDirectory(
          resolvedInput
        );

  fs.mkdirSync(
    resolvedReportDirectory,
    {
      recursive:
        true
    }
  );

  const dynastyName =
    sanitizeFileName(
      path.parse(
        resolvedInput
      ).name
    );

  const reportStamp =
    new Date()
      .toISOString()
      .replace(
        /[:.]/g,
        '-'
      );

  const reportPath =
    path.join(
      resolvedReportDirectory,
      `${dynastyName}-National-Signing-Day-Final-Player-Disposition-${reportStamp}.csv`
    );

  const headers = [
    'Player',
    'Type',
    'Class',
    'Position',
    'OVR',
    'Previous School',
    'Original Top School',
    'Initial Assign Unsigned Result',
    'Initial Destination',
    'Final Result',
    'Final School',
    'Final Phase',
    'Final RecruitStage',
    'Final Reason',
    'Recruit Row',
    'Player Row'
  ];

  const lines = [
    headers
      .map(
        csvCell
      )
      .join(',')
  ];

  for (
    const row
    of reportRows
  ) {
    lines.push(
      [
        row.player,
        row.playerType,
        row.class,
        row.position,
        row.overall,
        row.previousSchool,
        row.originalTopSchool,
        row.initialPhaseResult,
        row.initialDestination,
        row.finalResult,
        row.finalSchool,
        row.finalPhase,
        row.finalRecruitStage,
        row.finalReason,
        row.recruitRow,
        row.playerRow
      ]
        .map(
          csvCell
        )
        .join(',')
    );
  }

  fs.writeFileSync(
    reportPath,
    lines.join('\r\n') +
      '\r\n',
    'utf8'
  );

  const assigned =
    reportRows.filter(
      row =>
        row.finalResult ===
          'Assigned'
    ).length;

  return {
    reportPath,
    rowsWritten:
      reportRows.length,
    assigned,
    leftUnassigned:
      reportRows.length -
      assigned,
    phaseOneAssignments:
      phaseOneAssignments.length,
    rosterAssignments:
      rosterAssignments.length
  };
}

function writeRosterBalanceCsv({
  inputPath,
  teams
}) {
  const outputDirectory =
    resolveReportDirectory(
      inputPath
    );

  fs.mkdirSync(
    outputDirectory,
    {
      recursive: true
    }
  );

  const dynastyName =
    sanitizeFileName(
      path.parse(inputPath).name
    );

  const outputPath =
    path.join(
      outputDirectory,
      `${dynastyName}-NSD-Roster-Balance-Phase1.csv`
    );

  const headers = [
    'Team',
    'TeamIndex',
    'CurrentRosterTotal',
    'IncomingNotYetRostered',
    'ProjectedRosterTotal',
    'ShortagePositions',
    'SurplusPositions',
    ...POSITION_ORDER.flatMap(
      position => [
        `${position} Current`,
        `${position} Incoming`,
        `${position} Projected`,
        `${position} Minimum`,
        `${position} Preferred Maximum`,
        `${position} Shortage`,
        `${position} Surplus`
      ]
    )
  ];

  const lines = [
    headers.map(csvCell).join(',')
  ];

  for (const team of teams) {
    const values = [
      team.teamName,
      team.teamIndex,
      team.currentRosterTotal,
      team.incomingTotal,
      team.projectedRosterTotal,
      team.shortages
        .map(item =>
          `${item.position}:${item.amount}`
        )
        .join(' | '),
      team.surpluses
        .map(item =>
          `${item.position}:${item.amount}`
        )
        .join(' | ')
    ];

    for (
      const position
      of POSITION_ORDER
    ) {
      const data =
        team.positions[position];

      values.push(
        data.current,
        data.incoming,
        data.projected,
        data.minimum,
        data.preferredMaximum,
        data.shortageAmount,
        data.surplusAmount
      );
    }

    lines.push(
      values.map(csvCell).join(',')
    );
  }

  fs.writeFileSync(
    outputPath,
    lines.join('\n') + '\n',
    'utf8'
  );

  return outputPath;
}

function resolveReportDirectory(
  inputPath
) {
  const configured =
    toText(
      process.env
        .POCKETSCOUT_OUTPUT_DIRECTORY
    );

  if (configured) {
    return path.join(
      path.resolve(configured),
      'reports'
    );
  }

  return path.join(
    path.dirname(inputPath),
    'reports'
  );
}

function tableDiagnostic(info) {
  return {
    name:
      toText(info.table?.name),
    index:
      info.tableIndex,
    source:
      info.source,
    validRows:
      info.validRows,
    requiredFields:
      [...info.requiredFields]
  };
}

function requireExistingInputPath(
  inputPath
) {
  if (!inputPath) {
    throw new Error(
      'Missing dynasty file.'
    );
  }

  const resolved =
    path.resolve(inputPath);

  if (!fs.existsSync(resolved)) {
    throw new Error(
      `Dynasty file does not exist: ${resolved}`
    );
  }

  return resolved;
}

async function mutedReadRecords(table) {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  function suppress(args) {
    return args.some(
      value =>
        toText(value).includes(
          "Schema doesn't exist for this table"
        )
    );
  }

  console.log = (...args) => {
    if (!suppress(args)) {
      originalLog(...args);
    }
  };

  console.warn = (...args) => {
    if (!suppress(args)) {
      originalWarn(...args);
    }
  };

  console.error = (...args) => {
    if (!suppress(args)) {
      originalError(...args);
    }
  };

  try {
    await table.readRecords();
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }
}

function isUsableRecord(record) {
  return Boolean(
    record &&
    !record.isEmpty &&
    record.fields
  );
}

function hasField(
  record,
  fieldName
) {
  return Boolean(
    record?.fields &&
    Object.prototype
      .hasOwnProperty
      .call(
        record.fields,
        fieldName
      )
  );
}

function hasFields(
  record,
  fieldNames
) {
  return fieldNames.every(
    fieldName =>
      hasField(
        record,
        fieldName
      )
  );
}

function getTableId(table) {
  const candidates = [
    table?.header?.tableId,
    table?.tableId,
    table?.header?.data1TableId
  ];

  for (
    const candidate
    of candidates
  ) {
    const value =
      toInteger(
        candidate,
        -1
      );

    if (value >= 0) {
      return value;
    }
  }

  return null;
}

function normalizeName(value) {
  return toText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function toText(value) {
  return String(
    value ?? ''
  ).trim();
}

function toInteger(
  value,
  fallback = 0
) {
  const parsed =
    Number.parseInt(
      value,
      10
    );

  return Number.isInteger(parsed)
    ? parsed
    : fallback;
}

function sanitizeFileName(value) {
  return toText(value)
    .replace(
      /[<>:"/\\|?*\x00-\x1F]/g,
      '_'
    )
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') ||
    'Dynasty';
}

function csvCell(value) {
  const text =
    String(value ?? '');

  return `"${text.replace(/"/g, '""')}"`;
}
/* END PocketScout NSD Roster Balancer Phase 1 self-contained analyzer v1 */
