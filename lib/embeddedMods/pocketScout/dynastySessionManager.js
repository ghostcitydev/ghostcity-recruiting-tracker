import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Franchise from 'madden-franchise';
import {
  preloadRecruitingHelperCache
} from './modules/recruitingHelper.js';

const dynastySessions = new Map();
// EA's title update introduced a newer CFB 27 schema. Keep PocketScout's
// verified schema beside the embedded module so both local and packaged runs
// can decode the updated Coach table.
const SCHEMA_DIRECTORY = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'schemas'
);

const TEAM_REQUIRED_FIELDS = [
  'TeamIndex',
  'DisplayName',
  'LongName',
  'MediaPoll_CurrentRank',
  'CoachesPoll_CurrentRank',
  'CFPPoll_CurrentRank',
  'CurrentPopularity',
  'TeamBuilderData',
  'ContractOfferBlacklist',
  'TeamFan_Family',
  'TeamFan_Hardcore'
];

export function getDynastySession(inputPath) {
  if (!inputPath) return null;

  return dynastySessions.get(
    normalizePath(inputPath)
  ) ?? null;
}

export function clearDynastySession(inputPath) {
  if (!inputPath) return;

  dynastySessions.delete(
    normalizePath(inputPath)
  );
}

export async function scanDynastyFile({
  inputPath,
  onProgress = () => {}
}) {
  if (!inputPath) {
    throw new Error(
      'Missing dynasty file.'
    );
  }

  const resolvedInput =
    path.resolve(inputPath);

  if (!fs.existsSync(resolvedInput)) {
    throw new Error(
      `Dynasty file does not exist: ${resolvedInput}`
    );
  }

  onProgress({
    stage: 'open',
    message: 'Opening dynasty file...'
  });

  const franchise =
    await Franchise.create(
      resolvedInput,
      {
        gameTypeOverride: 'college',
        gameYearOverride: 27,
        schemaDirectory: SCHEMA_DIRECTORY,
        saveOnChange: false
      }
    );

  onProgress({
    stage: 'scan',
    message: 'Scanning dynasty tables...'
  });

  const tables = [];
  const tablesByName = {};
  const tablesById = {};
  const teamCandidates = [];
  const reportedTableNames = new Set();

  let misses = 0;
  let scannedIndexes = 0;

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
    scannedIndexes++;

    const tableName =
      String(
        table.name ??
        `Table_${tableIndex}`
      );

    const tableId =
      getTableId(table);

    const info = {
      index: tableIndex,
      name: tableName,
      tableId,
      uniqueId:
        table.header?.uniqueId ?? null,
      isArray:
        Boolean(table.isArray)
    };

    tables.push(info);

    if (!tablesByName[tableName]) {
      tablesByName[tableName] = [];
    }

    tablesByName[tableName].push(info);

    if (
      Number.isInteger(tableId) &&
      !tablesById[String(tableId)]
    ) {
      tablesById[String(tableId)] =
        info;
    }

    if (
      normalizeName(tableName) ===
      'team'
    ) {
      teamCandidates.push({
        info,
        table
      });
    }

    const reportName =
      normalizeName(tableName);

    if (
      shouldReportTable(tableName) &&
      !reportedTableNames.has(reportName)
    ) {
      reportedTableNames.add(
        reportName
      );
      onProgress({
        stage: 'found',
        tableIndex,
        tableName,
        message:
          `Found ${tableName} at index ${tableIndex}`
      });
    }
  }

  if (!tables.length) {
    throw new Error(
      'No dynasty tables could be read.'
    );
  }

  onProgress({
    stage: 'resolve',
    message:
      'Resolving the primary Team table...'
  });

  const teamTable =
    await resolveTeamTable(
      franchise,
      teamCandidates,
      onProgress
    );

  if (!teamTable) {
    throw new Error(
      'Could not find a Team table containing the poll fields.'
    );
  }

  const bowlGameTable =
    await resolveNamedTableBySignature({
      franchise,
      tableName: 'BowlGame',

      requiredFields: [
        'Name',
        'Conference1',
        'Conference2',
        'Conference1Rank',
        'Conference2Rank'
      ],

      countPopulatedRows:
        isPopulatedBowlGameRecord,

      onProgress
    });

  const conferenceTable =
    await resolveNamedTableBySignature({
      franchise,
      tableName: 'Conference',

      requiredFields: [
        'Name',
        'WhiteLogoId',
        'CONF_LOGO',
        'ConfChampGameTrophyID',
        'CONF_TERTIARY_COLOR_R',
        'ConferenceEnum'
      ],

      countPopulatedRows:
        isPopulatedConferenceRecord,

      onProgress
    });

  const recruitTable =
    await resolveRecruitTable({
      franchise,
      onProgress
    });

  const progressionXpSliderTable =
    await resolveUniqueNamedTable({
      franchise,

      tableName:
        'ProgressionXPSlider',

      onProgress
    });

  const userRecruitingCoachTable =
    await resolveUserRecruitingHoursTable({
      franchise,
      tableName: 'Coach',

      requiredFields: [
        'TeamPhilosophy',
        'ActiveTalentTree',
        'WeeklyGoals',
        'IsUserControlled'
      ],

      onProgress
    });

  const userRecruitingBoardTable =
    await resolveUserRecruitingHoursTable({
      franchise,

      tableName:
        'RecruitingBoard',

      requiredFields: [
        'RecruitingHoursTotal',
        'RecruitingHoursAssigned',
        'RecruitingHoursProcessed'
      ],

      onProgress
    });

  const session = {
    inputPath: resolvedInput,
    scannedAt:
      new Date().toISOString(),

    /* PocketScout Recruiting Helper session cache v1 */
    recruitingHelperCache:
      null,

    scannedIndexes,
    tableCount: tables.length,

    tables,
    tablesByName,
    tablesById,

    resolvedTables: {
      Team: teamTable,
      BowlGame: bowlGameTable,
      Conference: conferenceTable,
      Recruit: recruitTable,
      ProgressionXPSlider: progressionXpSliderTable,
      Coach: userRecruitingCoachTable,
      RecruitingBoard: userRecruitingBoardTable
    }
  };

  /*
   * PocketScout keeps only the currently loaded dynasty session.
   * Loading another dynasty releases every cache owned by the prior session.
   */
  dynastySessions.clear();

  dynastySessions.set(
    normalizePath(resolvedInput),
    session
  );

  /* PocketScout Recruiting Helper preload during dynasty scan v1 */
  onProgress({
    stage: 'recruiting-helper-cache',
    message:
      'Building Recruiting Helper recruit list and detail cache...'
  });

  try {
    const recruitingHelperPayload =
      await preloadRecruitingHelperCache({
        inputPath:
          resolvedInput,
        session
      });

    onProgress({
      stage: 'recruiting-helper-cache-ready',
      message:
        `Recruiting Helper cache ready. ` +
        `${recruitingHelperPayload.recruits?.length ?? 0} recruits loaded.`
    });
  } catch (error) {
    session.recruitingHelperCache =
      null;

    session.recruitingHelperCacheError =
      String(
        error?.message ??
        error
      );

    onProgress({
      stage: 'recruiting-helper-cache-warning',
      message:
        `Dynasty loaded, but Recruiting Helper preloading failed: ` +
        `${session.recruitingHelperCacheError}`
    });
  }

  onProgress({
    stage: 'ready',
    message:
      `Dynasty ready. Team table: index ${teamTable.index}. ` +
      `Tables found: ${tables.length}.`
  });

  return session;
}

async function resolveTeamTable(
  franchise,
  candidates,
  onProgress
) {
  const minimumEligibleTeams = 100;
  const evaluatedCandidates = [];
  const checkedIndexes = new Set();

  async function evaluateCandidate(
    info,
    table,
    sourceLabel
  ) {
    if (
      !info ||
      !table ||
      checkedIndexes.has(info.index)
    ) {
      return;
    }

    checkedIndexes.add(info.index);

    onProgress({
      stage: 'verify',
      tableIndex: info.index,
      tableName: info.name,
      message:
        `Checking Team candidate at index ${info.index}...`
    });

    try {
      await mutedReadRecords(table);
    } catch {
      onProgress({
        stage: 'skip',
        tableIndex: info.index,
        tableName: info.name,
        message:
          `Skipped unreadable Team candidate at index ${info.index}.`
      });

      return;
    }

    const analysis =
      analyzePollTeamTable(table);

    onProgress({
      stage: analysis.valid
        ? 'candidate'
        : 'skip',

      tableIndex: info.index,
      tableName: info.name,

      message:
        `Team candidate ${info.index}: ` +
        `${analysis.eligibleTeamCount} eligible teams, ` +
        `${analysis.uniqueTeamIndexCount} unique TeamIndex values.`
    });

    if (!analysis.valid) {
      return;
    }

    evaluatedCandidates.push({
      info,
      table,
      sourceLabel,
      analysis
    });
  }

  for (const candidate of candidates) {
    await evaluateCandidate(
      candidate.info,
      candidate.table,
      'named Team table'
    );
  }

  /*
   * Search other tables too because some dynasty files
   * can expose the primary Team table under a generic name.
   */
  if (
    !evaluatedCandidates.some(
      candidate =>
        candidate.analysis
          .eligibleTeamCount >=
        minimumEligibleTeams
    )
  ) {
    onProgress({
      stage: 'deep-scan',
      message:
        'Named Team tables did not contain enough real teams. Checking other readable tables...'
    });

    let misses = 0;

    for (
      let tableIndex = 0;
      tableIndex < 10000 &&
      misses < 50;
      tableIndex++
    ) {
      if (
        checkedIndexes.has(tableIndex)
      ) {
        continue;
      }

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

      const info = {
        index: tableIndex,
        name:
          String(
            table.name ??
            `Table_${tableIndex}`
          ),

        tableId:
          getTableId(table),

        uniqueId:
          table.header?.uniqueId ??
          null,

        isArray:
          Boolean(table.isArray)
      };

      await evaluateCandidate(
        info,
        table,
        'field-discovered table'
      );
    }
  }

  const viableCandidates =
    evaluatedCandidates.filter(
      candidate =>
        candidate.analysis
          .eligibleTeamCount >=
        minimumEligibleTeams
    );

  if (!viableCandidates.length) {
    onProgress({
      stage: 'error',
      message:
        'No Team candidate contained at least 100 eligible teams.'
    });

    return null;
  }

  viableCandidates.sort(
    (left, right) => {
      const eligibleDifference =
        right.analysis
          .eligibleTeamCount -
        left.analysis
          .eligibleTeamCount;

      if (eligibleDifference !== 0) {
        return eligibleDifference;
      }

      const uniqueDifference =
        right.analysis
          .uniqueTeamIndexCount -
        left.analysis
          .uniqueTeamIndexCount;

      if (uniqueDifference !== 0) {
        return uniqueDifference;
      }

      /*
       * Prefer a normal table over an array when
       * the row statistics are otherwise identical.
       */
      if (
        left.info.isArray !==
        right.info.isArray
      ) {
        return left.info.isArray
          ? 1
          : -1;
      }

      /*
       * Index 2222 remains only a final tie-breaker.
       */
      if (left.info.index === 2222) {
        return -1;
      }

      if (right.info.index === 2222) {
        return 1;
      }

      return (
        left.info.index -
        right.info.index
      );
    }
  );

  const selected =
    viableCandidates[0];

  onProgress({
    stage: 'resolved',
    tableIndex:
      selected.info.index,
    tableName:
      selected.info.name,

    message:
      `Verified primary Team table at index ${selected.info.index} ` +
      `with ${selected.analysis.eligibleTeamCount} eligible teams.`
  });

  return {
    ...selected.info,

    eligibleTeamCount:
      selected.analysis
        .eligibleTeamCount,

    uniqueTeamIndexCount:
      selected.analysis
        .uniqueTeamIndexCount,

    requiredFields:
      [...TEAM_REQUIRED_FIELDS]
  };
}

function analyzePollTeamTable(table) {
  const requiredFields = [
    'TeamIndex',
    'LongName',
    'MediaPoll_CurrentRank',
    'CoachesPoll_CurrentRank',
    'CFPPoll_CurrentRank'
  ];

  const foundFields =
    new Set();

  const uniqueTeamIndexes =
    new Set();

  let eligibleTeamCount = 0;
  let nonEmptyRecordCount = 0;

  for (
    const record
    of table.records ?? []
  ) {
    if (
      !record ||
      record.isEmpty ||
      !record.fields
    ) {
      continue;
    }

    nonEmptyRecordCount++;

    for (
      const fieldName
      of requiredFields
    ) {
      if (
        Object.prototype
          .hasOwnProperty
          .call(
            record.fields,
            fieldName
          )
      ) {
        foundFields.add(
          fieldName
        );
      }
    }

    const teamIndex =
      Number.parseInt(
        record.TeamIndex,
        10
      );

    const longName =
      String(
        record.LongName ?? ''
      ).trim();

    const hasRequiredFields =
      requiredFields.every(
        fieldName =>
          Object.prototype
            .hasOwnProperty
            .call(
              record.fields,
              fieldName
            )
      );

    if (
      hasRequiredFields &&
      Number.isInteger(teamIndex) &&
      teamIndex >= 0 &&
      teamIndex < 255 &&
      longName
    ) {
      eligibleTeamCount++;

      uniqueTeamIndexes.add(
        teamIndex
      );
    }
  }

  const missingFields =
    requiredFields.filter(
      fieldName =>
        !foundFields.has(fieldName)
    );

  return {
    valid:
      missingFields.length === 0 &&
      eligibleTeamCount > 0,

    missingFields,
    nonEmptyRecordCount,
    eligibleTeamCount,

    uniqueTeamIndexCount:
      uniqueTeamIndexes.size
  };
}


async function resolveNamedTableBySignature({
  franchise,
  tableName,
  requiredFields,
  countPopulatedRows,
  onProgress = () => {}
}) {
  onProgress({
    stage: 'resolve',
    tableName,
    message:
      `Finding ${tableName} table...`
  });

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
      normalizeName(table.name) !==
      normalizeName(tableName)
    ) {
      continue;
    }

    try {
      await mutedReadRecords(table);
    } catch {
      continue;
    }

    const analysis =
      analyzeSignatureTable(
        table,
        requiredFields,
        countPopulatedRows
      );

    if (!analysis.valid) {
      continue;
    }

    candidates.push({
      index: tableIndex,

      name:
        String(
          table.name ??
          tableName
        ),

      tableId:
        getTableId(table),

      uniqueId:
        table.header?.uniqueId ??
        null,

      isArray:
        Boolean(table.isArray),

      populatedRowCount:
        analysis.populatedRowCount,

      validRecordCount:
        analysis.validRecordCount,

      requiredFields:
        [...requiredFields]
    });
  }

  if (!candidates.length) {
    throw new Error(
      `Could not find a valid ${tableName} table.`
    );
  }

  candidates.sort(
    (left, right) => {
      const populatedDifference =
        right.populatedRowCount -
        left.populatedRowCount;

      if (populatedDifference !== 0) {
        return populatedDifference;
      }

      const validDifference =
        right.validRecordCount -
        left.validRecordCount;

      if (validDifference !== 0) {
        return validDifference;
      }

      if (
        left.isArray !==
        right.isArray
      ) {
        return left.isArray
          ? 1
          : -1;
      }

      return (
        left.index -
        right.index
      );
    }
  );

  const selected =
    candidates[0];

  onProgress({
    stage: 'resolved',
    tableName,
    tableIndex:
      selected.index,

    message:
      `${tableName} verified at index ${selected.index}.`
  });

  return selected;
}

function analyzeSignatureTable(
  table,
  requiredFields,
  countPopulatedRows
) {
  let validRecordCount = 0;
  let populatedRowCount = 0;

  for (
    const record
    of table.records ?? []
  ) {
    if (
      !record ||
      record.isEmpty ||
      !record.fields
    ) {
      continue;
    }

    const hasRequiredFields =
      requiredFields.every(
        fieldName =>
          Object.prototype
            .hasOwnProperty
            .call(
              record.fields,
              fieldName
            )
      );

    if (!hasRequiredFields) {
      continue;
    }

    validRecordCount++;

    if (
      countPopulatedRows(record)
    ) {
      populatedRowCount++;
    }
  }

  return {
    valid:
      validRecordCount > 0 &&
      populatedRowCount > 0,

    validRecordCount,
    populatedRowCount
  };
}

function isPopulatedBowlGameRecord(
  record
) {
  return Boolean(
    String(record.Name ?? '')
      .trim()
  );
}

function isPopulatedConferenceRecord(
  record
) {
  return Boolean(
    String(record.Name ?? '')
      .trim()
  );
}

async function resolveRecruitTable({
  franchise,
  onProgress = () => {}
}) {
  const requiredFields = [
    'CommitScore',
    'RecruitStage',
    'NationalRank'
  ];

  onProgress({
    stage: 'resolve',
    tableName: 'Recruit',
    message: 'Finding Recruit table...'
  });

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
      normalizeName(
        table.name
      ) !== 'recruit'
    ) {
      continue;
    }

    if (Boolean(table.isArray)) {
      continue;
    }

    try {
      await mutedReadRecords(table);
    } catch {
      continue;
    }

    let validRecordCount = 0;
    let populatedRecordCount = 0;

    for (
      const record
      of table.records ?? []
    ) {
      if (
        !record ||
        record.isEmpty ||
        !record.fields
      ) {
        continue;
      }

      const hasRequiredFields =
        requiredFields.every(
          fieldName =>
            Object.prototype
              .hasOwnProperty
              .call(
                record.fields,
                fieldName
              )
        );

      if (!hasRequiredFields) {
        continue;
      }

      validRecordCount++;

      const commitScore =
        Number.parseInt(
          record.CommitScore,
          10
        );

      const recruitStage =
        Number.parseInt(
          record.RecruitStage,
          10
        );

      const nationalRank =
        Number.parseInt(
          record.NationalRank,
          10
        );

      if (
        Number.isInteger(commitScore) ||
        Number.isInteger(recruitStage) ||
        Number.isInteger(nationalRank)
      ) {
        populatedRecordCount++;
      }
    }

    if (
      validRecordCount === 0 ||
      populatedRecordCount === 0
    ) {
      continue;
    }

    candidates.push({
      index: tableIndex,

      name:
        String(
          table.name ??
          'Recruit'
        ),

      tableId:
        getTableId(table),

      uniqueId:
        table.header?.uniqueId ??
        null,

      isArray:
        Boolean(table.isArray),

      validRecordCount,
      populatedRecordCount,

      requiredFields:
        [...requiredFields]
    });
  }

  if (!candidates.length) {
    throw new Error(
      'Could not find the Recruit table containing CommitScore, RecruitStage, and NationalRank.'
    );
  }

  candidates.sort(
    (left, right) => {
      const populatedDifference =
        right.populatedRecordCount -
        left.populatedRecordCount;

      if (populatedDifference !== 0) {
        return populatedDifference;
      }

      const validDifference =
        right.validRecordCount -
        left.validRecordCount;

      if (validDifference !== 0) {
        return validDifference;
      }

      return (
        left.index -
        right.index
      );
    }
  );

  const selected =
    candidates[0];

  onProgress({
    stage: 'resolved',
    tableName: 'Recruit',
    tableIndex:
      selected.index,

    message:
      `Recruit verified at index ${selected.index}.`
  });

  return selected;
}


async function resolveUniqueNamedTable({
  franchise,
  tableName,
  onProgress = () => {}
}) {
  onProgress({
    stage: 'resolve',
    tableName,
    message:
      `Finding ${tableName} table...`
  });

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
      String(table.name ?? '') !==
      tableName
    ) {
      continue;
    }

    const resolved = {
      index: tableIndex,
      name: tableName,

      tableId:
        getTableId(table),

      uniqueId:
        table.header?.uniqueId ??
        null,

      isArray:
        Boolean(table.isArray)
    };

    onProgress({
      stage: 'resolved',
      tableName,
      tableIndex,

      message:
        `${tableName} found at index ${tableIndex}.`
    });

    return resolved;
  }

  throw new Error(
    `Could not find table named ${tableName}.`
  );
}


async function resolveUserRecruitingHoursTable({
  franchise,
  tableName,
  requiredFields,
  onProgress = () => {}
}) {
  onProgress({
    stage: 'resolve',
    tableName,
    message:
      `Finding ${tableName} table...`
  });

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
      String(table.name ?? '') !==
      tableName
    ) {
      continue;
    }

    if (Boolean(table.isArray)) {
      continue;
    }

    try {
      await mutedReadRecords(table);
    } catch {
      continue;
    }

    let validRecordCount = 0;
    let populatedRecordCount = 0;
    let userControlledCount = 0;

    for (
      const record
      of table.records ?? []
    ) {
      if (
        !record ||
        record.isEmpty ||
        !record.fields
      ) {
        continue;
      }

      const hasRequiredFields =
        requiredFields.every(
          fieldName =>
            Object.prototype
              .hasOwnProperty
              .call(
                record.fields,
                fieldName
              )
        );

      if (!hasRequiredFields) {
        continue;
      }

      validRecordCount++;

      if (
        tableName === 'Coach' &&
        (
          record.IsUserControlled === true ||
          record.IsUserControlled === 1 ||
          String(
            record.IsUserControlled
          ).toLowerCase() === 'true'
        )
      ) {
        userControlledCount++;
      }

      if (
        tableName ===
        'RecruitingBoard'
      ) {
        const total =
          Number.parseInt(
            record.RecruitingHoursTotal,
            10
          );

        const assigned =
          Number.parseInt(
            record.RecruitingHoursAssigned,
            10
          );

        const processed =
          Number.parseInt(
            record.RecruitingHoursProcessed,
            10
          );

        if (
          Number.isInteger(total) ||
          Number.isInteger(assigned) ||
          Number.isInteger(processed)
        ) {
          populatedRecordCount++;
        }
      } else {
        populatedRecordCount++;
      }
    }

    if (validRecordCount === 0) {
      continue;
    }

    if (
      tableName === 'Coach' &&
      userControlledCount === 0
    ) {
      continue;
    }

    if (
      tableName ===
        'RecruitingBoard' &&
      populatedRecordCount === 0
    ) {
      continue;
    }

    candidates.push({
      index: tableIndex,
      name: tableName,

      tableId:
        getTableId(table),

      uniqueId:
        table.header?.uniqueId ??
        null,

      isArray:
        Boolean(table.isArray),

      validRecordCount,
      populatedRecordCount,
      userControlledCount,

      requiredFields:
        [...requiredFields]
    });
  }

  if (!candidates.length) {
    throw new Error(
      `Could not find a valid ${tableName} table.`
    );
  }

  candidates.sort(
    (left, right) => {
      if (tableName === 'Coach') {
        const userDifference =
          right.userControlledCount -
          left.userControlledCount;

        if (userDifference !== 0) {
          return userDifference;
        }
      }

      const populatedDifference =
        right.populatedRecordCount -
        left.populatedRecordCount;

      if (populatedDifference !== 0) {
        return populatedDifference;
      }

      const validDifference =
        right.validRecordCount -
        left.validRecordCount;

      if (validDifference !== 0) {
        return validDifference;
      }

      return (
        left.index -
        right.index
      );
    }
  );

  const selected =
    candidates[0];

  onProgress({
    stage: 'resolved',
    tableName,
    tableIndex:
      selected.index,

    message:
      `${tableName} verified at index ${selected.index}.`
  });

  return selected;
}


function verifyTableFields(
  table,
  requiredFields
) {
  const foundFields =
    new Set();

  for (
    const record of table.records ?? []
  ) {
    if (
      !record ||
      record.isEmpty ||
      !record.fields
    ) {
      continue;
    }

    for (
      const fieldName
      of requiredFields
    ) {
      if (
        Object.prototype
          .hasOwnProperty
          .call(
            record.fields,
            fieldName
          )
      ) {
        foundFields.add(
          fieldName
        );
      }
    }

    if (
      foundFields.size ===
      requiredFields.length
    ) {
      break;
    }
  }

  const missing =
    requiredFields.filter(
      fieldName =>
        !foundFields.has(fieldName)
    );

  return {
    valid:
      missing.length === 0,
    missing
  };
}

function getTableId(table) {
  const rawValue =
    table?.header?.tableId ??
    table?.header?.data1TableId ??
    null;

  const parsed =
    Number.parseInt(
      rawValue,
      10
    );

  return Number.isInteger(parsed)
    ? parsed
    : null;
}

function shouldReportTable(
  tableName
) {
  const importantNames =
    new Set([
      'team',

      'leaguesetting',

      'teamhistoricaldata',
      'schoolpipelineinfluence',
      'activetalenttree',
      'talentsubtreestatus'
    ]);

  return importantNames.has(
    normalizeName(tableName)
  );
}

function normalizeName(value) {
  return String(value)
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
}

function normalizePath(value) {
  return path
    .resolve(value)
    .toLowerCase();
}

async function mutedReadRecords(table) {
  const originalLog =
    console.log;

  const originalWarn =
    console.warn;

  const originalError =
    console.error;

  function suppress(args) {
    return args.some(argument =>
      String(argument ?? '')
        .includes(
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
