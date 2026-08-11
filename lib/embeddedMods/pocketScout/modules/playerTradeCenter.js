/* PocketScout Player import targeted roster rebuild support v1 */
/* PocketScout export roster reconciliation helpers v1 */
/* PocketScout Player Trade Center integration v1 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Franchise from 'madden-franchise';

// This file lives at <appRoot>/resources/app/src/modules/playerTradeCenter.js -
// walk up 4 levels (modules -> src -> app -> resources) to get the app's own
// install folder, so backups land next to the app itself rather than a
// hardcoded path that would only be correct for one specific build.
const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

const TEAM_TABLE_NAME = 'Team';
const PLAYER_TABLE_NAME = 'Player';

export const FREE_AGENT_TEAM_INDEX = 255;

/* PocketScout Player Trade Center Unassigned Players v1 */
const UNASSIGNED_PLAYERS_LABEL =
  'Unassigned Players';

export const DEFAULT_ROSTER_CAP = 85;

const TEAM_REQUIRED_FIELDS = [
  'TeamIndex',
  'DisplayName',
  'LongName',
  'CurrentPopularity',
  'TeamBuilderData',
  'ContractOfferBlacklist',
  'TeamFan_Family',
  'TeamFan_Hardcore'
];

const PLAYER_REQUIRED_FIELDS = [
  'TeamIndex',
  'FirstName',
  'LastName',
  'Position',
  'OverallRating',
  'Age',
  'JerseyNum',
  'SchoolYear'
];

export const playerTradeCenterModule = {
  id: 'player-trade-center',
  type: 'player-trade-center',
  name: 'Player Trade Center',
  description: 'Move players between two teams while validating roster limits, depth charts, roster stores, and player team references.',
  async run({
    inputPath,
    outputPath,
    options = {},
    session = null
  }) {
    if (options.mode === 'loadRosters') {
      return loadRosters({
        inputPath,
        session
      });
    }

    if (options.mode === 'executeTrade') {
      return executeTrade({
        inputPath,
        outputPath: outputPath || inputPath,
        moves: options.moves ?? [],
        rosterCap: options.rosterCap,
        session
      });
    }

    if (options.mode === 'repairRosterSync') {
      return repairRosterSync({
        inputPath,
        outputPath: outputPath || inputPath,
        teamIndexes: options.teamIndexes ?? null,
        session
      });
    }

    throw new Error('Unknown Trade Center mode.');
  }
};

async function findRecruitReferencedPlayerRows({
  franchise,
  session,
  playerTable
}) {
  const playerTableId =
    getTableId(
      playerTable
    );

  if (!Number.isInteger(playerTableId)) {
    throw new Error(
      'Could not read the Player table ID while identifying Unassigned Players.'
    );
  }

  const cachedIndex =
    Number.parseInt(
      session?.resolvedTables?.Recruit?.index,
      10
    );

  const candidateIndexes =
    new Set();

  if (
    Number.isInteger(cachedIndex) &&
    cachedIndex >= 0
  ) {
    candidateIndexes.add(
      cachedIndex
    );
  }

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
      String(table.name ?? '') ===
        'Recruit' &&
      !Boolean(table.isArray)
    ) {
      candidateIndexes.add(
        tableIndex
      );
    }
  }

  const matches = [];

  for (
    const tableIndex
    of candidateIndexes
  ) {
    let table = null;

    try {
      table =
        franchise.getTableByIndex(
          tableIndex
        );

      await mutedReadRecords(table);
    } catch {
      continue;
    }

    let usableReferences = 0;

    for (
      const record
      of table.records ?? []
    ) {
      if (
        !record ||
        record.isEmpty ||
        !hasField(
          record,
          'Player'
        )
      ) {
        continue;
      }

      const field =
        record.fields.Player;

      const reference =
        field?.referenceData;

      if (
        field?.isReference &&
        reference &&
        Number(reference.tableId) ===
          playerTableId &&
        Number.isInteger(
          Number(
            reference.rowNumber
          )
        )
      ) {
        usableReferences++;
      }
    }

    if (usableReferences > 0) {
      matches.push({
        tableIndex,
        table,
        usableReferences
      });
    }
  }

  if (!matches.length) {
    throw new Error(
      'Could not dynamically resolve a Recruit table with Player references.'
    );
  }

  matches.sort(
    (left, right) =>
      right.usableReferences -
        left.usableReferences ||
      left.tableIndex -
        right.tableIndex
  );

  if (
    matches.length > 1 &&
    matches[0].usableReferences ===
      matches[1].usableReferences
  ) {
    throw new Error(
      'Could not uniquely resolve the primary Recruit table by Player-reference count.'
    );
  }

  const referencedRows =
    new Set();

  for (
    const record
    of matches[0].table.records ?? []
  ) {
    if (
      !record ||
      record.isEmpty ||
      !hasField(
        record,
        'Player'
      )
    ) {
      continue;
    }

    const field =
      record.fields.Player;

    const reference =
      field?.referenceData;

    if (
      !field?.isReference ||
      !reference ||
      Number(reference.tableId) !==
        playerTableId
    ) {
      continue;
    }

    const row =
      Number(
        reference.rowNumber
      );

    if (
      Number.isInteger(row) &&
      row >= 0
    ) {
      referencedRows.add(row);
    }
  }

  return {
    recruitTableIndex:
      matches[0].tableIndex,

    referencedRows
  };
}

function isEligibleUnassignedPlayer(
  record,
  recordIndex,
  recruitReferencedPlayerRows
) {
  if (
    !record ||
    record.isEmpty ||
    !isPlayerRecord(record) ||
    numberValue(record.TeamIndex) !==
      FREE_AGENT_TEAM_INDEX ||
    recruitReferencedPlayerRows.has(
      recordIndex
    )
  ) {
    return false;
  }

  const firstName =
    stringValue(
      record.FirstName
    ).trim();

  const lastName =
    stringValue(
      record.LastName
    ).trim();

  const position =
    stringValue(
      record.Position
    ).trim();

  const overall =
    numberValue(
      record.OverallRating
    );

  return (
    Boolean(
      firstName ||
      lastName
    ) &&
    Boolean(position) &&
    position.toLowerCase() !==
      'invalid' &&
    overall > 0
  );
}

async function loadRosters({
  inputPath,
  session = null
}) {
  if (!inputPath) throw new Error('Missing dynasty file.');

  const resolvedInput = path.resolve(inputPath);

  if (!fs.existsSync(resolvedInput)) {
    throw new Error(`Dynasty file does not exist: ${resolvedInput}`);
  }

  const franchise = await Franchise.create(resolvedInput, {
    gameTypeOverride: 'college',
    gameYearOverride: 27,
    saveOnChange: false
  });

  const teamTableInfo = await findTeamTable(franchise, session);
  await mutedReadRecords(teamTableInfo.table);

  const playerTableInfo = await findPlayerTable(franchise, session);
  await mutedReadRecords(playerTableInfo.table);

  const teamNameByIndex =
    buildTeamNameByIndex(
      teamTableInfo.table
    );

  teamNameByIndex.set(
    FREE_AGENT_TEAM_INDEX,
    UNASSIGNED_PLAYERS_LABEL
  );

  const {
    recruitTableIndex,
    referencedRows:
      recruitReferencedPlayerRows
  } =
    await findRecruitReferencedPlayerRows({
      franchise,
      session,
      playerTable:
        playerTableInfo.table
    });

  const teams = [];

  for (let recordIndex = 0; recordIndex < teamTableInfo.table.records.length; recordIndex++) {
    const record = teamTableInfo.table.records[recordIndex];

    if (!record || record.isEmpty || !isTeamRecord(record)) continue;

    const teamIndex =
      numberValue(
        record.TeamIndex
      );

    if (
      teamIndex ===
        FREE_AGENT_TEAM_INDEX
    ) {
      continue;
    }

    teams.push({
      teamIndex,
      displayName: stringValue(record.DisplayName).trim(),
      rosterCount: 0
    });
  }

  teams.push({
    teamIndex:
      FREE_AGENT_TEAM_INDEX,

    displayName:
      UNASSIGNED_PLAYERS_LABEL,

    rosterCount:
      0,

    isVirtual:
      true
  });

  const players = [];

  for (let recordIndex = 0; recordIndex < playerTableInfo.table.records.length; recordIndex++) {
    const record = playerTableInfo.table.records[recordIndex];

    if (!record || record.isEmpty || !isPlayerRecord(record)) continue;

    const teamIndex =
      numberValue(
        record.TeamIndex
      );

    if (
      teamIndex ===
        FREE_AGENT_TEAM_INDEX &&
      !isEligibleUnassignedPlayer(
        record,
        recordIndex,
        recruitReferencedPlayerRows
      )
    ) {
      continue;
    }

    const firstName = stringValue(record.FirstName).trim();
    const lastName = stringValue(record.LastName).trim();

    players.push({
      key: `${playerTableInfo.index}:${recordIndex}`,
      teamIndex,
      teamName: teamNameByIndex.get(teamIndex) ?? `Team ${teamIndex}`,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      position: stringValue(record.Position),
      overall: numberValue(record.OverallRating),
      age: numberValue(record.Age),
      schoolYear: stringValue(record.SchoolYear),
      jerseyNum: numberValue(record.JerseyNum)
    });
  }

  const rosterCountByTeam = new Map();

  for (const player of players) {
    rosterCountByTeam.set(
      player.teamIndex,
      (rosterCountByTeam.get(player.teamIndex) ?? 0) + 1
    );
  }

  for (const team of teams) {
    team.rosterCount = rosterCountByTeam.get(team.teamIndex) ?? 0;
  }

  teams.sort((a, b) => a.displayName.localeCompare(b.displayName));
  players.sort((a, b) => b.overall - a.overall);

  return {
    moduleId: playerTradeCenterModule.id,
    moduleName: playerTradeCenterModule.name,
    inputPath: resolvedInput,
    teamTableIndex: teamTableInfo.index,
    playerTableIndex:
      playerTableInfo.index,

    recruitTableIndex,

    defaultRosterCap:
      DEFAULT_ROSTER_CAP,

    unassignedTeamIndex:
      FREE_AGENT_TEAM_INDEX,

    teams,
    players
  };
}

async function executeTrade({
  inputPath,
  outputPath,
  moves,
  rosterCap,
  session = null
}) {
  if (!inputPath) throw new Error('Missing dynasty file.');

  if (!Array.isArray(moves) || moves.length === 0) {
    throw new Error('No players selected to trade.');
  }

  // Caller can request a lower cap (e.g. a smaller custom roster limit) but
  // never a higher one - DEFAULT_ROSTER_CAP is the real in-game ceiling, so
  // clamp here rather than trusting whatever the renderer sends.
  const cap = Number.isInteger(rosterCap) && rosterCap > 0
    ? Math.min(rosterCap, DEFAULT_ROSTER_CAP)
    : DEFAULT_ROSTER_CAP;

  const resolvedInput = path.resolve(inputPath);
  const resolvedOutput = path.resolve(outputPath || inputPath);

  if (!fs.existsSync(resolvedInput)) {
    throw new Error(`Dynasty file does not exist: ${resolvedInput}`);
  }

  const backup = backupBeforeSave(resolvedInput, 'before-trade');

  const franchise = await Franchise.create(resolvedInput, {
    gameTypeOverride: 'college',
    gameYearOverride: 27,
    saveOnChange: false
  });

  const teamTableInfo = await findTeamTable(franchise, session);
  await mutedReadRecords(teamTableInfo.table);

  const playerTableInfo = await findPlayerTable(franchise, session);
  await mutedReadRecords(playerTableInfo.table);

  const teamByIndex =
    buildTeamByIndex(
      teamTableInfo.table
    );

  const teamNameByIndex =
    buildTeamNameByIndex(
      teamTableInfo.table
    );

  teamNameByIndex.set(
    FREE_AGENT_TEAM_INDEX,
    UNASSIGNED_PLAYERS_LABEL
  );

  const {
    referencedRows:
      recruitReferencedPlayerRows
  } =
    await findRecruitReferencedPlayerRows({
      franchise,
      session,
      playerTable:
        playerTableInfo.table
    });

  const resolvedMoves = [];

  for (const move of moves) {
    if (!move || typeof move.playerKey !== 'string') {
      throw new Error('Invalid trade move.');
    }

    const [tableIndexText, recordIndexText] = move.playerKey.split(':');
    const tableIndex = Number.parseInt(tableIndexText, 10);
    const recordIndex = Number.parseInt(recordIndexText, 10);

    if (tableIndex !== playerTableInfo.index || !Number.isInteger(recordIndex)) {
      throw new Error(`Invalid player selection: ${move.playerKey}`);
    }

    const record = playerTableInfo.table.records[recordIndex];

    if (!record || record.isEmpty || !isPlayerRecord(record)) {
      throw new Error('Could not resolve a selected player.');
    }

    const fromTeamIndex = Number.parseInt(move.fromTeamIndex, 10);
    const toTeamIndex = Number.parseInt(move.toTeamIndex, 10);

    const sourceIsUnassigned =
      fromTeamIndex ===
        FREE_AGENT_TEAM_INDEX;

    const destinationIsUnassigned =
      toTeamIndex ===
        FREE_AGENT_TEAM_INDEX;

    if (
      !sourceIsUnassigned &&
      !teamByIndex.has(
        fromTeamIndex
      )
    ) {
      throw new Error(
        `Unknown source team index ${fromTeamIndex}.`
      );
    }

    if (
      !destinationIsUnassigned &&
      !teamByIndex.has(
        toTeamIndex
      )
    ) {
      throw new Error(
        `Unknown destination team index ${toTeamIndex}.`
      );
    }

    if (
      sourceIsUnassigned &&
      !isEligibleUnassignedPlayer(
        record,
        recordIndex,
        recruitReferencedPlayerRows
      )
    ) {
      throw new Error(
        `${stringValue(record.FirstName)} ${stringValue(record.LastName)} is not an eligible Unassigned Players pool member. Reload rosters and try again.`
      );
    }

    const currentTeamIndex = numberValue(record.TeamIndex);

    if (currentTeamIndex !== fromTeamIndex) {
      throw new Error(
        `${stringValue(record.FirstName)} ${stringValue(record.LastName)} is no longer on ` +
        `${teamNameByIndex.get(currentTeamIndex) ?? `Team ${currentTeamIndex}`}. Reload rosters and try again.`
      );
    }

    if (fromTeamIndex === toTeamIndex) {
      throw new Error('A player cannot be traded to the team they are already on.');
    }

    resolvedMoves.push({
      record,
      recordIndex,
      fromTeamIndex,
      toTeamIndex,
      position: stringValue(record.Position),
      playerName: `${stringValue(record.FirstName)} ${stringValue(record.LastName)}`.trim()
    });
  }

  const involvedTeamIndexes = new Set();

  for (const move of resolvedMoves) {
    if (
      move.fromTeamIndex !==
        FREE_AGENT_TEAM_INDEX
    ) {
      involvedTeamIndexes.add(
        move.fromTeamIndex
      );
    }

    if (
      move.toTeamIndex !==
        FREE_AGENT_TEAM_INDEX
    ) {
      involvedTeamIndexes.add(
        move.toTeamIndex
      );
    }
  }

  const currentCountByTeam = countPlayersByTeam(playerTableInfo.table, involvedTeamIndexes);

  const teamsSummary = [];

  for (const teamIndex of involvedTeamIndexes) {
    const outgoing = resolvedMoves.filter(move => move.fromTeamIndex === teamIndex).length;
    const incoming = resolvedMoves.filter(move => move.toTeamIndex === teamIndex).length;
    const beforeCount = currentCountByTeam.get(teamIndex) ?? 0;
    const afterCount = beforeCount - outgoing + incoming;

    const teamLabel = teamNameByIndex.get(teamIndex) ?? `Team ${teamIndex}`;

    // cap (85 by default, matching CFB 27's real in-game scholarship limit)
    // is a hard block - no override. Confirmed via the DYNASTY-100-roster
    // investigation that players past the 85th never show up in-game even
    // when cleanly slotted, so there's no legitimate reason to let a trade
    // push a team past it.
    if (afterCount > cap) {
      throw new Error(
        `${teamLabel} would have ${afterCount} players, over the ${cap}-player roster limit. ` +
        `Trade cancelled; nothing was changed.`
      );
    }

    teamsSummary.push({
      teamIndex,
      displayName: teamLabel,
      beforeCount,
      afterCount,
      cap
    });
  }

  const changes = [];

  for (const move of resolvedMoves) {
    const record = move.record;

    record.TeamIndex =
      move.toTeamIndex;

    /*
     * Preserve both previous-team fields for Unassigned Players movement.
     * The pool is not a normal transfer destination and should not rewrite
     * the player's historical team metadata.
     */
    if (
      hasField(
        record,
        'PLYR_CONSECYEARSWITHTEAM'
      )
    ) {
      record.PLYR_CONSECYEARSWITHTEAM =
        0;
    }

    if (hasField(record, 'BaseNILValue')) record.BaseNILValue = 0;
    if (hasField(record, 'CurrentNILCompensation')) record.CurrentNILCompensation = 0;

    changes.push({
      playerName: move.playerName,
      fromTeam: teamNameByIndex.get(move.fromTeamIndex) ?? `Team ${move.fromTeamIndex}`,
      toTeam: teamNameByIndex.get(move.toTeamIndex) ?? `Team ${move.toTeamIndex}`
    });
  }

  const tradedAwayRecordIndexesByTeam = new Map();
  const tradedInRecordIndexesByTeam = new Map();

  for (const move of resolvedMoves) {
    if (
      move.fromTeamIndex !==
        FREE_AGENT_TEAM_INDEX
    ) {
      if (
        !tradedAwayRecordIndexesByTeam.has(
          move.fromTeamIndex
        )
      ) {
        tradedAwayRecordIndexesByTeam.set(
          move.fromTeamIndex,
          new Set()
        );
      }

      tradedAwayRecordIndexesByTeam
        .get(
          move.fromTeamIndex
        )
        .add(
          move.recordIndex
        );
    }

    if (
      move.toTeamIndex !==
        FREE_AGENT_TEAM_INDEX
    ) {
      if (
        !tradedInRecordIndexesByTeam.has(
          move.toTeamIndex
        )
      ) {
        tradedInRecordIndexesByTeam.set(
          move.toTeamIndex,
          new Set()
        );
      }

      tradedInRecordIndexesByTeam
        .get(
          move.toTeamIndex
        )
        .add(
          move.recordIndex
        );
    }
  }

  const resolveTableById = createTableResolver(franchise);

  const depthChartWarnings =
    await syncDepthCharts({
      playerTable:
        playerTableInfo.table,

      teamByIndex,

      resolvedMoves:
        resolvedMoves.filter(
          move =>
            move.toTeamIndex !==
              FREE_AGENT_TEAM_INDEX
        ),

      tradedAwayRecordIndexesByTeam,
      teamNameByIndex,
      resolveTableById
    });

  const rosterStoreWarnings = await syncRosterStore({
    playerTable: playerTableInfo.table,
    teamByIndex,
    tradedAwayRecordIndexesByTeam,
    tradedInRecordIndexesByTeam,
    teamNameByIndex,
    resolveTableById
  });

  const postMoveExpectedRecordIndexesByTeam = new Map();

  for (const teamIndex of involvedTeamIndexes) {
    const expected = new Set();

    for (let recordIndex = 0; recordIndex < playerTableInfo.table.records.length; recordIndex++) {
      const record = playerTableInfo.table.records[recordIndex];

      if (!record || record.isEmpty || !isPlayerRecord(record)) continue;
      if (numberValue(record.TeamIndex) === teamIndex) expected.add(recordIndex);
    }

    postMoveExpectedRecordIndexesByTeam.set(teamIndex, expected);
  }

  const involvedTeamIndexesArray = [...involvedTeamIndexes];

  const postTradeRosterResult = await reconcileRosterStore({
    targetTeamIndexes: involvedTeamIndexesArray,
    playerTable: playerTableInfo.table,
    teamByIndex,
    teamNameByIndex,
    resolveTableById,
    expectedRecordIndexesByTeam: postMoveExpectedRecordIndexesByTeam
  });

  const postTradeDepthChartResult = await reconcileDepthCharts({
    targetTeamIndexes: involvedTeamIndexesArray,
    playerTable: playerTableInfo.table,
    teamByIndex,
    teamNameByIndex,
    resolveTableById,
    expectedRecordIndexesByTeam: postMoveExpectedRecordIndexesByTeam
  });

  const autoRepairReport = mergeReportEntries(postTradeRosterResult.entries, postTradeDepthChartResult.entries);

  const warnings = [
    ...depthChartWarnings,
    ...rosterStoreWarnings,
    ...postTradeRosterResult.warnings,
    ...postTradeDepthChartResult.warnings
  ];

  if (backup.backupError) {
    warnings.push(`Could not create a backup before saving: ${backup.backupError}`);
  }

  await atomicSave(franchise, resolvedOutput);

  return {
    moduleId: playerTradeCenterModule.id,
    moduleName: playerTradeCenterModule.name,
    inputPath: resolvedInput,
    outputPath: resolvedOutput,
    overwrittenOriginal: true,
    backupPath: backup.backupPath,
    cap,
    teamsSummary,
    changes,
    autoRepairReport,
    warnings
  };
}

export async function reconcileRosterStore({
  targetTeamIndexes,
  playerTable,
  teamByIndex,
  teamNameByIndex,
  resolveTableById,
  expectedRecordIndexesByTeam
}) {
  const playerTableId = getTableId(playerTable);
  const entries = [];
  const warnings = [];

  for (const teamIndex of targetTeamIndexes) {
    const teamLabel = teamNameByIndex.get(teamIndex) ?? `Team ${teamIndex}`;

    try {
      const teamRecord = teamByIndex.get(teamIndex);

      if (!teamRecord || !hasField(teamRecord, 'Roster')) continue;

      const rosterField = teamRecord.fields.Roster;

      if (!rosterField.isReference) continue;

      const rosterRef = rosterField.referenceData;

      if (!rosterRef) continue;

      const rosterStoreTable = await resolveTableById(rosterRef.tableId);

      if (!rosterStoreTable) {
        warnings.push(`Roster sync skipped for ${teamLabel}: could not resolve the roster store table.`);
        continue;
      }

      const rosterRecord = rosterStoreTable.records[rosterRef.rowNumber];

      if (!rosterRecord || !rosterRecord.fields) continue;

      const expectedRecordIndexes = expectedRecordIndexesByTeam.get(teamIndex) ?? new Set();

      const currentRecordIndexes = new Set();

      for (const slotName of Object.keys(rosterRecord.fields)) {
        const slotField = rosterRecord.fields[slotName];

        if (!slotField || !slotField.isReference) continue;
        if (isEmptyPlayerSlot(slotField, playerTable, playerTableId)) continue;

        const ref = slotField.referenceData;

        if (!ref || ref.tableId !== playerTableId) continue;

        currentRecordIndexes.add(ref.rowNumber);
      }

      const missingRecordIndexes = [...expectedRecordIndexes].filter(
        recordIndex => !currentRecordIndexes.has(recordIndex)
      );

      const { kept, dropped } = resortPositionSlotGroup(
        rosterRecord,
        playerTable,
        playerTableId,
        recordIndex => !expectedRecordIndexes.has(recordIndex),
        missingRecordIndexes
      );

      const removedStaleEntries = [...currentRecordIndexes].filter(
        recordIndex => !expectedRecordIndexes.has(recordIndex)
      ).length;
      const addedMissingEntries = missingRecordIndexes.filter(
        recordIndex => kept.includes(recordIndex)
      ).length;

      if (dropped.length) {
        warnings.push(
          `${teamLabel}'s roster store has no empty slots for ${dropped.length} ` +
          `player(s) who belong there per TeamIndex.`
        );
      }

      if (removedStaleEntries > 0 || addedMissingEntries > 0) {
        entries.push({ teamIndex, displayName: teamLabel, removedStaleEntries, addedMissingEntries });
      }
    } catch (error) {
      warnings.push(`Roster sync failed for ${teamLabel}: ${error.message}`);
    }
  }

  return { entries, warnings };
}

/*
 * Depth chart repair: remove any slot referencing a player who isn't
 * actually on this team per TeamIndex, re-sort every touched slot group
 * by OverallRating (fixes stale/ghost entries, closes gaps, AND fixes
 * ordering, all in one pass - see resortPositionSlotGroup), then re-add
 * ANY player who belongs on this team (TeamIndex matches) but is missing
 * from every slot group at their position - also inserted at the slot
 * their overall earns, bumping a lower-overall incumbent if the group is
 * full. This is what actually fixes the "depth charts are a mess on both
 * sides" symptom for trades made before this repair (and before
 * syncDepthCharts) existed.
 *
 * Earlier versions of this pass only re-added players whose
 * PrevTeamIndex wasn't the free-agent sentinel (255), on the assumption
 * that was a reliable "this player was recently traded" signal. It
 * isn't: PrevTeamIndex defaults to 255 for the vast majority of
 * game-generated players regardless of trade history, so that filter
 * was silently skipping a whole separate category of real bugs - a
 * player correctly on the roster (TeamIndex matches, present in
 * RosterStore) who was simply never added to their position's
 * DepthChart slot array in the first place, nothing to do with any
 * trade. Confirmed via a real save: NDSU's DJ Scott (83 overall, their
 * best HB) sat completely absent from NDSU's HB depth chart - NDSU was
 * never involved in any trade - showing as a rank-less "-" entry in the
 * in-game depth chart screen. Now this pass fills in ANY such gap, not
 * just trade-caused ones. Shared by repairRosterSync and executeTrade -
 * see reconcileRosterStore just above for why.
 */
export async function reconcileDepthCharts({
  targetTeamIndexes,
  playerTable,
  teamByIndex,
  teamNameByIndex,
  resolveTableById,
  expectedRecordIndexesByTeam,
  rebuildPlayerRowsByTeam = null
}) {
  const playerTableId = getTableId(playerTable);
  const entries = [];
  const warnings = [];

  for (const teamIndex of targetTeamIndexes) {
    const teamLabel = teamNameByIndex.get(teamIndex) ?? `Team ${teamIndex}`;

    try {
      const depthChartRecord = await resolveDepthChartRecord(teamByIndex, teamIndex, resolveTableById);

      if (!depthChartRecord) continue;

      const expectedRecordIndexes = expectedRecordIndexesByTeam.get(teamIndex) ?? new Set();

      const rebuildPlayerRows =
        rebuildPlayerRowsByTeam?.get?.(
          teamIndex
        ) ??
        new Set();

      let resortedDepthChartSlots = 0;
      const presentRecordIndexes = new Set();

      for (const fieldName of Object.keys(depthChartRecord.fields)) {
        const field = depthChartRecord.fields[fieldName];

        if (!field || !field.isReference) continue;

        const ref = field.referenceData;

        if (!ref || ref.tableId === 0) continue;

        const arrayTable = await resolveTableById(ref.tableId);

        if (!arrayTable) continue;

        const arrayRecord = arrayTable.records[ref.rowNumber];

        if (!arrayRecord || !arrayRecord.fields) continue;

        const { changedCount, kept } = resortPositionSlotGroup(
          arrayRecord,
          playerTable,
          playerTableId,
          recordIndex =>
            !expectedRecordIndexes.has(
              recordIndex
            ) ||
            rebuildPlayerRows.has(
              recordIndex
            )
        );

        resortedDepthChartSlots += changedCount;

        for (const recordIndex of kept) presentRecordIndexes.add(recordIndex);
      }

      let addedMissingDepthChartEntries = 0;

      for (const recordIndex of expectedRecordIndexes) {
        const record = playerTable.records[recordIndex];

        if (!record || record.isEmpty) continue;
        if (presentRecordIndexes.has(recordIndex)) continue;

        const position = stringValue(record.Position);

        if (!position || !hasField(depthChartRecord, position)) continue;

        const posField = depthChartRecord.fields[position];

        if (!posField || !posField.isReference) continue;

        const posRef = posField.referenceData;

        if (!posRef || posRef.tableId === 0) continue;

        const arrayTable = await resolveTableById(posRef.tableId);

        if (!arrayTable) continue;

        const arrayRecord = arrayTable.records[posRef.rowNumber];

        if (!arrayRecord || !arrayRecord.fields) continue;

        const { kept, dropped } = resortPositionSlotGroup(
          arrayRecord,
          playerTable,
          playerTableId,
          () => false,
          [recordIndex]
        );

        for (const keptIndex of kept) presentRecordIndexes.add(keptIndex);

        if (!dropped.includes(recordIndex)) addedMissingDepthChartEntries++;
      }

      if (resortedDepthChartSlots > 0 || addedMissingDepthChartEntries > 0) {
        entries.push({ teamIndex, displayName: teamLabel, resortedDepthChartSlots, addedMissingDepthChartEntries });
      }
    } catch (error) {
      warnings.push(`Depth chart repair failed for ${teamLabel}: ${error.message}`);
    }
  }

  return { entries, warnings };
}

function mergeReportEntries(rosterEntries, depthChartEntries) {
  const report = rosterEntries.map(entry => ({ ...entry }));

  for (const dcEntry of depthChartEntries) {
    const existing = report.find(entry => entry.teamIndex === dcEntry.teamIndex);

    if (existing) {
      existing.resortedDepthChartSlots = dcEntry.resortedDepthChartSlots;
      existing.addedMissingDepthChartEntries = dcEntry.addedMissingDepthChartEntries;
    } else {
      report.push({
        teamIndex: dcEntry.teamIndex,
        displayName: dcEntry.displayName,
        removedStaleEntries: 0,
        addedMissingEntries: 0,
        resortedDepthChartSlots: dcEntry.resortedDepthChartSlots,
        addedMissingDepthChartEntries: dcEntry.addedMissingDepthChartEntries
      });
    }
  }

  return report;
}

/*
 * Recovery tool for saves already desynced by something outside Trade
 * Center's own sync path - e.g. a raw TeamIndex edit made through another
 * tool (no RosterStore/DepthChart updates at all), or a trade made with a
 * pre-fix version of this module. Reconciles every team's Roster/
 * RosterStore entry against the live source of truth (Player.TeamIndex):
 * clears any RosterStore slot for a player who no longer belongs to that
 * team, then fills empty slots with any player whose TeamIndex says
 * they're on this team but who's missing from RosterStore. Skips
 * FREE_AGENT_TEAM_INDEX (255) - that's the unrostered/free-agent player
 * pool (~4000 players in a fresh dynasty), not a real managed roster.
 */
export async function repairRosterSync({
  inputPath,
  outputPath,
  teamIndexes,
  rebuildPlayerRowsByTeam = null,
  session = null
}) {
  if (!inputPath) throw new Error('Missing dynasty file.');

  const resolvedInput = path.resolve(inputPath);
  const resolvedOutput = path.resolve(outputPath || inputPath);

  if (!fs.existsSync(resolvedInput)) {
    throw new Error(`Dynasty file does not exist: ${resolvedInput}`);
  }

  const franchise = await Franchise.create(resolvedInput, {
    gameTypeOverride: 'college',
    gameYearOverride: 27,
    saveOnChange: false
  });

  const teamTableInfo = await findTeamTable(franchise, session);
  await mutedReadRecords(teamTableInfo.table);

  const playerTableInfo = await findPlayerTable(franchise, session);
  await mutedReadRecords(playerTableInfo.table);

  const teamByIndex = buildTeamByIndex(teamTableInfo.table);
  const teamNameByIndex = buildTeamNameByIndex(teamTableInfo.table);

  const targetTeamIndexes = (
    Array.isArray(teamIndexes) && teamIndexes.length
      ? teamIndexes.map(value => Number.parseInt(value, 10)).filter(value => teamByIndex.has(value))
      : [...teamByIndex.keys()]
  ).filter(value => value !== FREE_AGENT_TEAM_INDEX);

  const playerTableId = getTableId(playerTableInfo.table);
  const resolveTableById = createTableResolver(franchise);

  const expectedRecordIndexesByTeam = new Map();

  for (let recordIndex = 0; recordIndex < playerTableInfo.table.records.length; recordIndex++) {
    const record = playerTableInfo.table.records[recordIndex];

    if (!record || record.isEmpty || !isPlayerRecord(record)) continue;

    const teamIndex = numberValue(record.TeamIndex);

    if (!expectedRecordIndexesByTeam.has(teamIndex)) {
      expectedRecordIndexesByTeam.set(teamIndex, new Set());
    }

    expectedRecordIndexesByTeam.get(teamIndex).add(recordIndex);
  }

  const rosterResult = await reconcileRosterStore({
    targetTeamIndexes,
    playerTable: playerTableInfo.table,
    teamByIndex,
    teamNameByIndex,
    resolveTableById,
    expectedRecordIndexesByTeam
  });

  const depthChartResult = await reconcileDepthCharts({
    targetTeamIndexes,
    playerTable: playerTableInfo.table,
    teamByIndex,
    teamNameByIndex,
    resolveTableById,
    expectedRecordIndexesByTeam,
    rebuildPlayerRowsByTeam
  });

  const report = mergeReportEntries(rosterResult.entries, depthChartResult.entries);
  const warnings = [...rosterResult.warnings, ...depthChartResult.warnings];

  let backupPath = null;

  if (report.length) {
    const backup = backupBeforeSave(resolvedInput, 'before-repair');
    backupPath = backup.backupPath;

    if (backup.backupError) {
      warnings.push(`Could not create a backup before saving: ${backup.backupError}`);
    }

    await atomicSave(franchise, resolvedOutput);
  }

  return {
    moduleId: playerTradeCenterModule.id,
    moduleName: playerTradeCenterModule.name,
    inputPath: resolvedInput,
    outputPath: resolvedOutput,
    overwrittenOriginal: report.length > 0,
    backupPath,
    report,
    warnings
  };
}

function countPlayersByTeam(playerTable, teamIndexSet) {
  const counts = new Map();

  for (const record of playerTable.records ?? []) {
    if (!record || record.isEmpty || !isPlayerRecord(record)) continue;

    const teamIndex = numberValue(record.TeamIndex);

    if (!teamIndexSet.has(teamIndex)) continue;

    counts.set(teamIndex, (counts.get(teamIndex) ?? 0) + 1);
  }

  return counts;
}

export async function syncDepthCharts({
  playerTable,
  teamByIndex,
  resolvedMoves,
  tradedAwayRecordIndexesByTeam,
  teamNameByIndex,
  resolveTableById
}) {
  const warnings = [];

  const playerTableId = getTableId(playerTable);

  // Step 1: remove departures from every position slot group on the old
  // team, and re-sort each touched group by OverallRating so the next-best
  // remaining player moves up to fill the vacated slot.
  for (const [fromTeamIndex, tradedRecordIndexes] of tradedAwayRecordIndexesByTeam) {
    const teamLabel = teamNameByIndex.get(fromTeamIndex) ?? `Team ${fromTeamIndex}`;

    try {
      const depthChartRecord = await resolveDepthChartRecord(teamByIndex, fromTeamIndex, resolveTableById);

      if (!depthChartRecord) continue;

      for (const fieldName of Object.keys(depthChartRecord.fields)) {
        const field = depthChartRecord.fields[fieldName];

        if (!field || !field.isReference) continue;

        const ref = field.referenceData;

        if (!ref || ref.tableId === 0) continue;

        const arrayTable = await resolveTableById(ref.tableId);

        if (!arrayTable) continue;

        const arrayRecord = arrayTable.records[ref.rowNumber];

        if (!arrayRecord || !arrayRecord.fields) continue;

        resortPositionSlotGroup(
          arrayRecord,
          playerTable,
          playerTableId,
          recordIndex => tradedRecordIndexes.has(recordIndex)
        );
      }
    } catch (error) {
      warnings.push(`Depth chart cleanup failed for ${teamLabel}: ${error.message}`);
    }
  }

  // Step 2: add each arriving player into their new team's matching
  // position slot group (e.g. a WR goes into the "WR" field), re-sorted by
  // OverallRating so they land in the slot their overall actually earns -
  // bumping the lowest-overall incumbent out of the listing if the group
  // is already full.
  for (const move of resolvedMoves) {
    const teamLabel = teamNameByIndex.get(move.toTeamIndex) ?? `Team ${move.toTeamIndex}`;

    try {
      const depthChartRecord = await resolveDepthChartRecord(teamByIndex, move.toTeamIndex, resolveTableById);

      if (!depthChartRecord) continue;

      if (!move.position || !hasField(depthChartRecord, move.position)) continue;

      const posField = depthChartRecord.fields[move.position];

      if (!posField || !posField.isReference) continue;

      const posRef = posField.referenceData;

      if (!posRef || posRef.tableId === 0) {
        warnings.push(
          `${teamLabel} has no ${move.position} depth chart slot group to add ${move.playerName} to.`
        );
        continue;
      }

      const arrayTable = await resolveTableById(posRef.tableId);

      if (!arrayTable) continue;

      const arrayRecord = arrayTable.records[posRef.rowNumber];

      if (!arrayRecord || !arrayRecord.fields) continue;

      const { dropped } = resortPositionSlotGroup(
        arrayRecord,
        playerTable,
        playerTableId,
        () => false,
        [move.recordIndex]
      );

      if (dropped.includes(move.recordIndex)) {
        warnings.push(
          `${teamLabel}'s ${move.position} depth chart is full of higher-overall players - ` +
          `could not add ${move.playerName}.`
        );
      }
    } catch (error) {
      warnings.push(`Depth chart insertion failed for ${move.playerName} on ${teamLabel}: ${error.message}`);
    }
  }

  return warnings;
}

async function resolveDepthChartRecord(teamByIndex, teamIndex, resolveTableById) {
  const teamRecord = teamByIndex.get(teamIndex);

  if (!teamRecord || !hasField(teamRecord, 'DepthChart')) return null;

  const depthChartField = teamRecord.fields.DepthChart;

  if (!depthChartField.isReference) return null;

  const depthChartRef = depthChartField.referenceData;

  if (!depthChartRef) return null;

  const depthChartTable = await resolveTableById(depthChartRef.tableId);

  if (!depthChartTable) return null;

  const depthChartRecord = depthChartTable.records[depthChartRef.rowNumber];

  if (!depthChartRecord || !depthChartRecord.fields) return null;

  return depthChartRecord;
}

/*
 * Rebuilds a depth chart slot group (e.g. the array of up to 6 players
 * behind a "WR" field) ranked by OverallRating (descending) rather than
 * merely preserving whatever order the slots happened to be in. Every slot
 * NOT removed by shouldRemove and not already empty is combined with
 * recordIndexesToAdd (deduped against what's already present), sorted by
 * overall, then written back starting from slot 0 - so the best player at
 * that position always ends up the "starter." If the combined list is
 * longer than the slot group, the lowest-overall entries are dropped from
 * the depth-chart listing (returned as `dropped` - the caller decides
 * whether that's worth a warning). Dropping a player from this listing
 * does NOT remove them from the roster (see RosterStore) - it only means
 * they're no longer one of the up-to-6 players shown at that position on
 * the depth chart screen.
 */
function resortPositionSlotGroup(arrayRecord, playerTable, playerTableId, shouldRemove, recordIndexesToAdd = []) {
  const slotNames = Object.keys(arrayRecord.fields).filter(name => {
    const field = arrayRecord.fields[name];
    return field && field.isReference;
  });

  if (!slotNames.length) return { changedCount: 0, kept: [], dropped: [] };

  const emptyTemplate = '0'.repeat(arrayRecord.fields[slotNames[0]].value.length);

  const present = [];
  const seen = new Set();

  for (const slotName of slotNames) {
    const slotField = arrayRecord.fields[slotName];

    if (isEmptyPlayerSlot(slotField, playerTable, playerTableId)) continue;

    const ref = slotField.referenceData;

    if (shouldRemove(ref.rowNumber)) continue;
    if (seen.has(ref.rowNumber)) continue;

    seen.add(ref.rowNumber);
    present.push(ref.rowNumber);
  }

  for (const recordIndex of recordIndexesToAdd) {
    if (seen.has(recordIndex)) continue;

    const record = playerTable.records[recordIndex];

    if (!record || record.isEmpty) continue;

    seen.add(recordIndex);
    present.push(recordIndex);
  }

  present.sort((a, b) => {
    const overallA = numberValue(playerTable.records[a]?.OverallRating);
    const overallB = numberValue(playerTable.records[b]?.OverallRating);
    return overallB - overallA;
  });

  const kept = present.slice(0, slotNames.length);
  const dropped = present.slice(slotNames.length);

  let changedCount = 0;

  for (let i = 0; i < slotNames.length; i++) {
    const slotName = slotNames[i];
    const slotField = arrayRecord.fields[slotName];
    const newValue = i < kept.length
      ? playerTable.getBinaryReferenceToRecord(kept[i])
      : emptyTemplate;

    if (slotField.value !== newValue) {
      arrayRecord[slotName] = newValue;
      changedCount++;
    }
  }

  return { changedCount, kept, dropped };
}

export async function syncRosterStore({
  playerTable,
  teamByIndex,
  tradedAwayRecordIndexesByTeam,
  tradedInRecordIndexesByTeam,
  teamNameByIndex,
  resolveTableById
}) {
  const warnings = [];

  const playerTableId = getTableId(playerTable);

  const involvedTeamIndexes = new Set([
    ...tradedAwayRecordIndexesByTeam.keys(),
    ...tradedInRecordIndexesByTeam.keys()
  ]);

  for (const teamIndex of involvedTeamIndexes) {
    const teamLabel = teamNameByIndex.get(teamIndex) ?? `Team ${teamIndex}`;

    try {
      const teamRecord = teamByIndex.get(teamIndex);

      if (!teamRecord || !hasField(teamRecord, 'Roster')) {
        warnings.push(`Roster sync skipped for ${teamLabel}: no Roster reference found on the Team record.`);
        continue;
      }

      const rosterField = teamRecord.fields.Roster;

      if (!rosterField.isReference) continue;

      const rosterRef = rosterField.referenceData;

      if (!rosterRef) continue;

      const rosterStoreTable = await resolveTableById(rosterRef.tableId);

      if (!rosterStoreTable) {
        warnings.push(`Roster sync skipped for ${teamLabel}: could not resolve the roster store table.`);
        continue;
      }

      const rosterRecord = rosterStoreTable.records[rosterRef.rowNumber];

      if (!rosterRecord || !rosterRecord.fields) {
        warnings.push(`Roster sync skipped for ${teamLabel}: could not resolve the roster store row.`);
        continue;
      }

      const leavingRecordIndexes = tradedAwayRecordIndexesByTeam.get(teamIndex) ?? new Set();
      const arrivingRecordIndexes = [...(tradedInRecordIndexesByTeam.get(teamIndex) ?? new Set())];

      const { dropped } = resortPositionSlotGroup(
        rosterRecord,
        playerTable,
        playerTableId,
        recordIndex => leavingRecordIndexes.has(recordIndex),
        arrivingRecordIndexes
      );

      if (dropped.length) {
        warnings.push(
          `${teamLabel}'s roster store has no empty slots for ${dropped.length} ` +
          `incoming player(s). TeamIndex was still updated, but they may not show correctly on the in-game ` +
          `roster screen until the roster store has room.`
        );
      }
    } catch (error) {
      warnings.push(`Roster store sync failed for ${teamLabel}: ${error.message}`);
    }
  }

  return warnings;
}

function isEmptyPlayerSlot(slotField, playerTable, playerTableId) {
  const ref = slotField.referenceData;

  if (!ref || ref.tableId !== playerTableId) return true;

  const record = playerTable.records[ref.rowNumber];

  return !record || record.isEmpty;
}

export function createTableResolver(franchise) {
  const cache = new Map();

  return async function resolveTableById(tableId) {
    if (cache.has(tableId)) return cache.get(tableId);

    let found = null;
    let misses = 0;

    for (let index = 0; index < 10000 && misses < 50; index++) {
      let table = null;

      try {
        table = franchise.getTableByIndex(index);
      } catch {
        misses++;
        continue;
      }

      if (!table) {
        misses++;
        continue;
      }

      misses = 0;

      if (getTableId(table) === tableId) {
        found = table;
        break;
      }
    }

    if (found) await mutedReadRecords(found);

    cache.set(tableId, found);

    return found;
  };
}

async function findTeamTable(franchise, session = null) {
  const cachedIndex = Number.parseInt(session?.resolvedTables?.Team?.index, 10);

  if (Number.isInteger(cachedIndex) && cachedIndex >= 0) {
    try {
      const cachedTable = franchise.getTableByIndex(cachedIndex);

      await mutedReadRecords(cachedTable);

      if (analyzeTeamTable(cachedTable).valid) {
        return { index: cachedIndex, table: cachedTable };
      }
    } catch {
      // Fall through to signature discovery.
    }
  }

  const candidates = [];
  let misses = 0;

  for (let tableIndex = 0; tableIndex < 10000 && misses < 50; tableIndex++) {
    let table = null;

    try {
      table = franchise.getTableByIndex(tableIndex);
    } catch {
      misses++;
      continue;
    }

    if (!table) {
      misses++;
      continue;
    }

    misses = 0;

    if (String(table.name ?? '') !== TEAM_TABLE_NAME || Boolean(table.isArray)) continue;

    try {
      await mutedReadRecords(table);
    } catch {
      continue;
    }

    const analysis = analyzeTeamTable(table);

    if (!analysis.valid) continue;

    candidates.push({ index: tableIndex, table, analysis });
  }

  if (!candidates.length) {
    throw new Error('Could not find the primary Team table.');
  }

  candidates.sort((left, right) => right.analysis.eligibleCount - left.analysis.eligibleCount);

  return candidates[0];
}

function analyzeTeamTable(table) {
  let eligibleCount = 0;

  for (const record of table.records ?? []) {
    if (!record || record.isEmpty || !record.fields) continue;

    if (!TEAM_REQUIRED_FIELDS.every(field => hasField(record, field))) continue;

    const teamIndex = Number.parseInt(record.TeamIndex, 10);
    const displayName = stringValue(record.DisplayName).trim();

    if (!Number.isInteger(teamIndex) || teamIndex < 0 || teamIndex >= 255 || !displayName) continue;

    eligibleCount++;
  }

  return { valid: eligibleCount >= 100, eligibleCount };
}

async function findPlayerTable(franchise, session = null) {
  const cachedIndex = Number.parseInt(
    session?.resolvedTables?.Player?.index,
    10
  );

  if (Number.isInteger(cachedIndex) && cachedIndex >= 0) {
    try {
      const cachedTable = franchise.getTableByIndex(cachedIndex);
      await mutedReadRecords(cachedTable);

      let eligibleCount = 0;

      for (const record of cachedTable.records ?? []) {
        if (!record || record.isEmpty || !record.fields) continue;

        if (
          PLAYER_REQUIRED_FIELDS.every(
            field => hasField(record, field)
          )
        ) {
          eligibleCount++;
        }
      }

      if (eligibleCount >= 1000) {
        return {
          index: cachedIndex,
          table: cachedTable,
          eligibleCount
        };
      }
    } catch {
      // Fall through to signature discovery.
    }
  }

  const candidates = [];
  let misses = 0;

  for (let tableIndex = 0; tableIndex < 10000 && misses < 50; tableIndex++) {
    let table = null;

    try {
      table = franchise.getTableByIndex(tableIndex);
    } catch {
      misses++;
      continue;
    }

    if (!table) {
      misses++;
      continue;
    }

    misses = 0;

    if (String(table.name ?? '') !== PLAYER_TABLE_NAME || Boolean(table.isArray)) continue;

    try {
      await mutedReadRecords(table);
    } catch {
      continue;
    }

    let eligibleCount = 0;

    for (const record of table.records ?? []) {
      if (!record || record.isEmpty || !record.fields) continue;
      if (PLAYER_REQUIRED_FIELDS.every(field => hasField(record, field))) eligibleCount++;
    }

    if (eligibleCount < 1000) continue;

    candidates.push({ index: tableIndex, table, eligibleCount });
  }

  if (!candidates.length) {
    throw new Error('Could not find the primary Player table.');
  }

  candidates.sort((left, right) => right.eligibleCount - left.eligibleCount);

  return candidates[0];
}

function isTeamRecord(record) {
  return record.fields && TEAM_REQUIRED_FIELDS.every(field => hasField(record, field));
}

function isPlayerRecord(record) {
  return record.fields && PLAYER_REQUIRED_FIELDS.every(field => hasField(record, field));
}

export function buildTeamNameByIndex(teamTable) {
  const map = new Map();

  for (const record of teamTable.records ?? []) {
    if (!record || record.isEmpty || !isTeamRecord(record)) continue;

    map.set(numberValue(record.TeamIndex), stringValue(record.DisplayName).trim());
  }

  return map;
}

export function buildTeamByIndex(teamTable) {
  const map = new Map();

  for (const record of teamTable.records ?? []) {
    if (!record || record.isEmpty || !isTeamRecord(record)) continue;

    map.set(numberValue(record.TeamIndex), record);
  }

  return map;
}

function hasField(record, fieldName) {
  return !!record?.fields && Object.prototype.hasOwnProperty.call(record.fields, fieldName);
}

function stringValue(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function numberValue(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : 0;
}

export function getTableId(table) {
  return table.header?.tableId ?? table.header?.uniqueId ?? table.header?.id ?? null;
}

async function mutedReadRecords(table) {
  return withSchemaNoiseMuted(async () => {
    await table.readRecords();
  });
}

/*
 * franchise.save() writes directly to the destination file via fs.writeFile
 * (truncate, then write in place) - not atomic. If anything else touches
 * that file mid-write (the game has it open, antivirus is scanning it, a
 * sync client, the app being closed), the write can be interrupted partway
 * through, corrupting or truncating the file - which can look exactly like
 * "random players disappeared" even though nothing in the trade logic
 * itself was wrong. Saving to a temp file first and renaming it over the
 * real target avoids that window: a rename on the same volume is atomic
 * (all-or-nothing) on both Windows and POSIX, so the real file is either
 * the old complete version or the new complete version, never a partial
 * write.
 *
 * Confirmed via real-world testing that this alone isn't enough when the
 * target lives in a cloud-synced folder (e.g. OneDrive): a trade wiped 4
 * unrelated players' records in a save under OneDrive-synced Documents,
 * but replaying the exact same trade on a copy outside that folder was
 * clean every time. The multi-table pack/write franchise.save() does isn't
 * instant, and the original version of this function wrote its temp file
 * *inside* the synced folder - giving the sync engine a window to notice
 * and interfere with a file mid-write. Now the temp file is written to a
 * local, non-synced staging folder instead (same drive, so the final
 * rename into the target folder stays atomic) - the slow write never
 * happens anywhere a sync client is watching, and the only operation that
 * touches the synced folder is the near-instant rename itself. This
 * shrinks the exposure window from "however long packing takes" to a few
 * milliseconds; it doesn't fully eliminate the risk (nothing short of
 * excluding the folder from sync does that), but it's a large reduction.
 */
export async function atomicSave(franchise, resolvedOutput) {
  const tempFileName = `${path.basename(resolvedOutput)}.pstmp-${process.pid}-${Date.now()}`;
  const stagingDir = path.join(os.homedir(), 'AppData', 'Local', 'PocketScout Utilities', 'Staging');

  let tempOutput = null;

  try {
    if (
      path.parse(stagingDir).root.toLowerCase() === path.parse(resolvedOutput).root.toLowerCase()
    ) {
      if (!fs.existsSync(stagingDir)) fs.mkdirSync(stagingDir, { recursive: true });
      tempOutput = path.join(stagingDir, tempFileName);
    }
  } catch {
    tempOutput = null;
  }

  // Fall back to a temp file next to the target if staging isn't usable
  // (different drive than the target, or the staging folder isn't
  // writable) - still atomic, just without the reduced-exposure benefit.
  if (!tempOutput) {
    tempOutput = `${resolvedOutput}.${tempFileName}`;
  }

  try {
    await franchise.save(tempOutput);
    fs.renameSync(tempOutput, resolvedOutput);
  } catch (error) {
    try {
      if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
    } catch {
      // Best-effort cleanup only - the original error is what matters.
    }

    throw error;
  }
}

/*
 * Copies the save file as-is into a "PocketScout Backups" folder next to
 * the app itself, before any trade/repair write, timestamped so backups
 * never collide or overwrite each other. This is a safety net independent
 * of atomicSave - atomicSave protects against a write getting interrupted,
 * this protects against everything else (an unwanted trade result, a bug
 * not yet found, OneDrive/cloud-sync clobbering the save after a write
 * completes, etc.). Deliberately NOT placed next to the save file: this
 * user's save folder lives under OneDrive-synced Documents, and a backup
 * sitting in that same tree is exposed to the exact same sync interference
 * it's meant to protect against. The app's own install folder (APP_ROOT,
 * e.g. under C:\MMC_Modding_Tools_v1.1.0.0\...) isn't under
 * Documents/Desktop/Pictures, so OneDrive's "Known Folder Move" never
 * touches it - and it's easier for the user to find than a folder buried
 * in AppData. Falls back to AppData\Local if the app folder isn't
 * writable (e.g. installed somewhere permission-restricted). A failed
 * backup doesn't block the operation itself - it's surfaced as a warning
 * instead, since the alternative (refusing to trade because a backup
 * couldn't be written) would be worse for the user in most real
 * situations.
 */
export function backupBeforeSave(resolvedInput, label) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${path.basename(resolvedInput)}.${label}.${timestamp}.bak`;

  const candidateDirs = [
    path.join(APP_ROOT, 'backups', 'pocketscout-backups'),
    path.join(os.homedir(), 'AppData', 'Local', 'PocketScout Utilities', 'Backups')
  ];

  let lastError = null;

  for (const backupDir of candidateDirs) {
    try {
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
      const backupPath = path.join(backupDir, fileName);
      fs.copyFileSync(resolvedInput, backupPath);
      return { backupPath, backupError: null };
    } catch (error) {
      lastError = error;
    }
  }

  return { backupPath: null, backupError: lastError?.message ?? 'Unknown error' };
}

async function withSchemaNoiseMuted(callback) {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  function shouldSuppress(args) {
    return args.some(arg => String(arg ?? '').includes("Schema doesn't exist for this table"));
  }

  console.log = (...args) => { if (!shouldSuppress(args)) originalLog(...args); };
  console.warn = (...args) => { if (!shouldSuppress(args)) originalWarn(...args); };
  console.error = (...args) => { if (!shouldSuppress(args)) originalError(...args); };

  try {
    return await callback();
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }
}
