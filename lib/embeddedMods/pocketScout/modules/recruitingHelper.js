/* PocketScout Athlete Position Change height and enum fix v2 */
/* PocketScout skip sub-70 FB Assign All Unsigned v46 */
/* PocketScout observed-only TraitDevelopment options v42 */
/* PocketScout known-good IdealPitch TraitDevelopment options v41 */
/* PocketScout observed IdealPitch TraitDevelopment options v40 */
/* PocketScout IdealRecruitingPitch enum values v39 */
/* PocketScout Player Mass Edit roster scope and enum options v38 */
/* PocketScout Player Mass Edit TeamIndex values v37 */
/* PocketScout Player Mass Edit team scope v36 */
/* PocketScout structural committed players resolver v33 */
/* PocketScout board hard commit structural table ID resolution v54 */
/* PocketScout dynamic committed players table index v32 */
/* PocketScout assigned recruit dealbreaker invalid v31 */
/* PocketScout committed player duplicate capacity repair v30 */
/* PocketScout zero board slot table lookup repair v29 */
/* PocketScout use zero recruiting board slots v28 */
/* PocketScout individual hard commit save committed sync v27 */
/* PocketScout board hard commit authoritative committed array v26 */
/* PocketScout board hard commit direct Player array resolution v25 */
/* PocketScout board hard commit reserve committed slots v24 */
/* PocketScout unsigned player position round robin v23 */
/* PocketScout assign all unsigned players offseason week 6 v22 */
/* PocketScout zero offer WR HB top two only v21 */
/* PocketScout zero offer projected roster deficiency priority v20 */
/* PocketScout zero offer transfer positional distribution v19 */
/* PocketScout zero offer transfer positional limits with specialist starters v18 */
/* PocketScout recruiting board replace by committed player membership v16 */
/* PocketScout zero offer transfer previous season ranked placement v14 */
/* PocketScout zero offer transfer recruit board membership cache v13 */
/* PocketScout zero offer transfer lazy full board cache v12 */
/* PocketScout zero offer transfer board capacity cache v11 */
/* PocketScout zero offer transfer next school fallback v10 */
/* PocketScout zero offer transfer committed limit v9 */
/* PocketScout preserve destination committed reference v8 */
/* PocketScout committed players final row lookup v7 */
/* PocketScout committed players table 6123 fallback v6 */
/* PocketScout committed players direct property compatibility v5 */
/* PocketScout committed players array record compatibility v4 */
/* PocketScout hard commit committed players synchronization v3 */
/* PocketScout add missing recruit to destination recruiting board v2 */
/* PocketScout hard commit scholarship offer synchronization v1 */
/* PocketScout calculate Athlete projections on demand v1 */
/* PocketScout local merge roster repair reports v9-fix1 */
/* PocketScout smart transfer actual roster placement v9 */
/* PocketScout debug transfer week bypass after 10 logo clicks v1 */
/* PocketScout Recruiting Helper height weight profile filters v1 */
/* PocketScout editable automatic Athlete Position PlayerType v2 */
/* PocketScout smart transfer OVR-first processing v8 */
/* PocketScout smart transfer program-quality need matching v7 */
/* PocketScout smart transfer depth-priority search v6 */
/* PocketScout smart transfer signed class depth v5 */
/* PocketScout smart transfer destination concentration fix v4 */
/* PocketScout all-smart transfer placement minimum 55 v3 */
/* PocketScout smart unsigned player placement and report v2 */
/* PocketScout hard commit actual Top School target table v2 */
/* PocketScout hard commit invalidate stale Recruiting Helper details v1 */
/* PocketScout remove Recruiting Helper Ideal Pitch tab v1 */
/* PocketScout lazy Recruiting Helper projections v2 */
/* PocketScout StartingHotCold hard-coded options v2 */
/* PocketScout Player Mass Edit user-team StartingHotCold v1 */
/* PocketScout OVR preview ignore non-OVR player fields v1 */
/* PocketScout refresh Recruiting Helper OVR metadata after save v1 */
/* PocketScout MFE Player Profile dropdown options v2 */
/* PocketScout untested Player Profile visual dropdowns v1 */
/* PocketScout Recruiting Helper Athlete OVR projections v1 */
/* PocketScout Recruiting Helper portable module path v1 */
/* PocketScout unified transfer assignment chooser v1 */
/* PocketScout previous school transfer target table fix v1 */
/* PocketScout invalidate Recruiting Helper cache after transfer bulk actions v1 */
/* PocketScout transfer walk-on favorite team and previous school direct fix v1 */
/* PocketScout send unsigned players to random school v1 */
/* PocketScout transfer return All filter popup and Signed green v1 */
/* PocketScout return unsigned players to previous school v1 */
/* PocketScout Recruiting Helper Class advanced filter layout v1 */
﻿import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Franchise from 'madden-franchise';
import {
  buildTeamByIndex,
  buildTeamNameByIndex,
  createTableResolver,
  syncDepthCharts,
  syncRosterStore,
  reconcileRosterStore,
  reconcileDepthCharts,
  atomicSave,
  backupBeforeSave,
  FREE_AGENT_TEAM_INDEX
} from './playerTradeCenter.js';

const RECRUIT_TABLE_NAME = 'Recruit';

/*
 * PocketScout local merge roster repair reports v9-fix1
 *
 * playerTradeCenter.js uses this internally but does not export it.
 * Keep the small report-merging helper local so Electron can load the
 * module without requesting a nonexistent ESM export.
 */
function mergeReportEntries(
  rosterEntries = [],
  depthChartEntries = []
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
          Number(entry.teamIndex) ===
          Number(depthEntry.teamIndex)
      );

    if (existing) {
      existing.resortedDepthChartSlots =
        depthEntry.resortedDepthChartSlots;

      existing.addedMissingDepthChartEntries =
        depthEntry.addedMissingDepthChartEntries;

      continue;
    }

    report.push({
      teamIndex:
        depthEntry.teamIndex,

      displayName:
        depthEntry.displayName,

      removedStaleEntries:
        0,

      addedMissingRosterEntries:
        0,

      resortedDepthChartSlots:
        depthEntry.resortedDepthChartSlots,

      addedMissingDepthChartEntries:
        depthEntry.addedMissingDepthChartEntries
    });
  }

  return report;
}

/* PocketScout MFE Player Profile dropdown options v2 */

const PLAYER_PROFILE_MFE_OPTIONS = {
  PLYR_STYLE: [
    'First_',
    'Normal',
    'SidearmPassing',
    'LowRunning',
    'Max',
    'Invalid_'
  ],

  PLYR_QBSTYLE: [
    'First_',
    'GenericSlow',
    'Generic',
    'BasedonTomBrady',
    'BasedonJoeBurrow',
    'BasedonMacJones',
    'BasedonLamarJackson',
    'BasedonRussellWilson',
    'BasedonAaronRodgers',
    'BasedonPatrickMahomes',
    'Generic3QH',
    'BasedonJoshAllen',
    'BasedonKylerMurray',
    'BasedonJustinHerbert',
    'BasedonMattStafford',
    'BasedonBakerMayfield',
    'GenericOVRT',
    'Reserved1',
    'Generic3QL',
    'BasedonTrevorLawrence',
    'BasedonBoNix',
    'BasedonBrockPurdy',
    'BasedonBryceYoung',
    'BasedonCalebWilliams',
    'BasedonCamWard',
    'BasedonCJStroud',
    'BasedonDakPrescott',
    'BasedonDrakeMaye',
    'BasedonJalenHurts',
    'BasedonJaredGoff',
    'BasedonJaydenDaniels',
    'BasedonJordanLove',
    'BasedonShadeurSanders',
    'BasedonTuaTagovailoa',
    'BasedonMichaelPenixJr',
    'BasedonJJMccarthy',
    'BasedonGenoSmith',
    'BasedonSamDarnold',
    'BasedonAnthonyRichardson',
    'BasedonJaxsonDart',
    'BasedonKirkCousins',
    'BasedonDerekCarr',
    'BasedonJustinFields',
    'BasedonJalenMilroe',
    'BasedonQuinnEwers'
  ],

  PlayerVisMoveType: [
    'Default',
    'Agile',
    'AgileSmall',
    'AgileTall',
    'Bruiser',
    'BruiserQuick',
    'BruiserHeavy',
    'Max',
    'Invalid'
  ],

  PLYR_STANCE: [
    'First_',
    'FirstQB_',
    'Generic',
    'TEdwards',
    'Pennington',
    'Favre',
    'Brady',
    'DAnderson',
    'Garcia',
    'Roethlisberger',
    'PManning',
    'Garrard',
    'Orton',
    'Young',
    'Cutler',
    'Rivers',
    'Flacco',
    'JRussell',
    'Romo',
    'McNabb',
    'EManning',
    'Campbell',
    'Grossman',
    'Kitna',
    'Rodgers',
    'Cassel',
    'Stafford',
    'Ryan',
    'Delhomme',
    'Brees',
    'ASmith',
    'Warner',
    'Bulger',
    'Hasselbeck',
    'Palmer',
    'Sanchez',
    'Bradford',
    'Clausen',
    'Tebow',
    'Vick',
    'Freeman',
    'Aikman',
    'Blanda',
    'Elway',
    'Graham',
    'Montana',
    'Moon',
    'LastQB_',
    'SYoung',
    'FirstK_',
    'RBironas',
    'SSuisham',
    'JHanson',
    'KBrown',
    'JKasay',
    'NRackers',
    'SGraham',
    'JElam',
    'RGould',
    'JScobee',
    'JBrown',
    'PDawson',
    'SJanikowski',
    'LastK_',
    'MStover'
  ]
};

function mergeMfeProfileOptions(
  observedOptions = {}
) {
  const merged = {
    ...observedOptions
  };

  for (
    const [
      fieldName,
      mfeValues
    ]
    of Object.entries(
      PLAYER_PROFILE_MFE_OPTIONS
    )
  ) {
    const observedValues =
      Array.isArray(
        observedOptions[fieldName]
      )
        ? observedOptions[fieldName]
        : [];

    merged[fieldName] = [
      ...new Set([
        ...mfeValues,
        ...observedValues
      ])
    ];
  }

  return merged;
}


/* PocketScout Recruiting Helper calculated OVR v1 */
const RECRUITING_HELPER_MODULE_DIRECTORY =
  path.dirname(
    fileURLToPath(import.meta.url)
  );

const RECRUITING_HELPER_OVR_FORMULA_PATH =
  path.join(
    RECRUITING_HELPER_MODULE_DIRECTORY,
    '..',
    'data',
    'CFB27_OVR_Formulas_AppReady_v1.json'
  );

let recruitingHelperOvrModelCache = null;
let recruitingHelperOvrIndexCache = null;
/* END PocketScout Recruiting Helper calculated OVR v1 */

const RECRUIT_REQUIRED_FIELDS = [
  'TopSchoolsList',
  'Player',
  'RecruitStage',
  'NationalRank',
  'SurnameAudioID'
];

const EDITABLE_RECRUIT_FIELDS = [
  'RecruitStage',
  'NationalRank',
  'ProductionGrade',
  'PositionRank',
  'StateRank',
  'Class',
  'CommitScore',
  'TotalScholarshipOffers'
];

const EDITABLE_PLAYER_FIELDS = [
  'FirstName',
  'LastName',
  'TraitDevelopment',
  'PlayerType',
  'Position',
  /* PocketScout Recruiting Helper height weight profile filters v1 */
  'Height',
  'Weight',
  /* PocketScout untested Player Profile visual dropdowns v1 */
  'PLYR_STYLE',
  'PLYR_QBSTYLE',
  'PLYR_HANDEDNESS',
  'PLYR_STANCE',
  'PLYR_TENDENCY',
  'PlayerVisMoveType',
  'Personality',
  'RecruitingDealbreaker',
  'PLYR_HOME_STATE',
  'HomePipeline',
  'Scheme',
  'IdealRecruitingPitch',
  'ProspectStarRating',
  'SkillGroupCap1',
  'SkillGroupCap2',
  'SkillGroupCap3',
  'SkillGroupCap4',
  'SkillGroupCap5',
  'SkillGroupCap6',
  'MentalAbility1',
  'MentalAbility2',
  'MentalAbility3',
  'MentalAbilityRank1',
  'MentalAbilityRank2',
  'MentalAbilityRank3',

  /* Recruiting Helper Physical Abilities tab */
  'PhysicalAbility1',
  'PhysicalAbility2',
  'PhysicalAbility3',
  'PhysicalAbility4',
  'PhysicalAbility5'
];

const MENTAL_ABILITY_OPTIONS = [
  'None',
  'RoadFanFavorite',
  'Toughness',
  'FieldGeneral',
  'ClutchKicker',
  'Captain',
  'TeamPlayer',
  'ClearHeaded',
  'Headstrong',
  'Adrenaline',
  'HomeFanFavorite',
  'WinningTime',
  'TheNatural',
  'Rhythm',
  'BestFriend',
  'OLRally',
  'DLRally',
  'DBRally',
  'BellCow',
  'Instinct',
  'HotHead'
];

const MENTAL_ABILITY_RANK_OPTIONS = [
  'None',
  'Bronze',
  'Silver',
  'Gold',
  'Platinum'
];

/* PocketScout Recruiting Helper preload during dynasty scan v1 */
/* PocketScout Recruiting Helper live module load without recruit session cache v1 */
export async function preloadRecruitingHelperCache({
  inputPath,
  session
}) {
  /*
   * Recruiting Helper now reads the recruit list only when its page is
   * selected. Keep this exported hook for compatibility with the existing
   * dynasty scan, but do not open the dynasty or build a recruit cache here.
   */
  if (session) {
    session.recruitingHelperCache =
      null;
  }

  return {
    inputPath:
      path.resolve(
        inputPath
      ),

    cacheStatus:
      'preload-disabled',

    recruits:
      []
  };
}

export const recruitingHelperModule = {
  id: 'recruiting-helper',
  type: 'recruiting-helper',
  name: 'Recruiting Helper',

  description:
    'Edit recruit information, player ratings, mental and physical abilities, and Top 10 schools.',

  async run({
    inputPath,
    outputPath,
    options = {},
    session = null
  }) {
    const mode =
      String(
        options.mode ?? 'loadRecruits'
      );

    if (mode === 'loadRecruits') {
      return loadRecruits({
        inputPath,
        session
      });
    }

    if (mode === 'loadRecruitDetails') {
      return loadRecruitDetails({
        inputPath,
        recruitKey:
          options.recruitKey,
        session
      });
    }

    /* PocketScout lazy Recruiting Helper projections v2 */
    if (
      mode ===
        'loadRecruitAthleteProjections'
    ) {
      return loadRecruitAthleteProjections({
        inputPath,
        recruitKey:
          options.recruitKey,
        session
      });
    }

    if (mode === 'previewRecruitOverallChanges') {
      return previewRecruitOverallChanges({
        inputPath,
        entries:
          options.entries ?? [],
        session
      });
    }

    /* PocketScout Commit Recruit To Currently Selected School */
    if (
      mode ===
        'commitRecruitToSelectedSchool'
    ) {
      return commitRecruitToSelectedSchool({
        inputPath,
        outputPath:
          outputPath || inputPath,
        recruitKey:
          options.recruitKey,
        selectedTeamId:
          options.selectedTeamId,
        session
      });
    }

    /* PocketScout Recruiting Helper board-wide actions v1 */
    if (mode === 'zeroNilForBoard') {
      return zeroNilForRecruitingHelperBoard({
        inputPath,
        outputPath: outputPath || inputPath,
        selectedTeamId: options.selectedTeamId,
        session
      });
    }

    if (mode === 'setMyTeamAsTopSchoolForBoard') {
      return setMyTeamAsTopSchoolForRecruitingHelperBoard({
        inputPath,
        outputPath: outputPath || inputPath,
        selectedTeamId: options.selectedTeamId,
        session
      });
    }

    /* PocketScout hard commit selected prospect board v1 */
    if (mode === 'hardCommitSelectedProspectBoard') {
      return hardCommitSelectedRecruitingHelperBoard({
        inputPath,
        outputPath: outputPath || inputPath,
        selectedTeamId: options.selectedTeamId,
        session
      });
    }

    /* PocketScout transfer return All filter popup and Signed green v1 */
    if (
      mode ===
        'validateReturnZeroOfferTransfersWeek'
    ) {
      return validateReturnZeroOfferTransfersWeek({
        inputPath,
        bypassWeekRequirement:
          options.bypassWeekRequirement === true,
        session
      });
    }

    /* PocketScout unified transfer assignment chooser v1 */
    if (
      mode ===
        'assignZeroOfferTransfers'
    ) {
      return assignZeroOfferTransfers({
        inputPath,
        outputPath:
          outputPath || inputPath,
        assignmentMode:
          options.assignmentMode,
        reportDirectory:
          options.reportDirectory,
        placementSettings:
          options.placementSettings ?? {},
        bypassWeekRequirement:
          options.bypassWeekRequirement === true,
        session
      });
    }

    /* PocketScout return unsigned players to previous school v1 */
    if (
      mode ===
        'returnZeroOfferTransfersToPreviousSchool'
    ) {
      return returnZeroOfferTransfersToPreviousSchool({
        inputPath,
        outputPath:
          outputPath || inputPath,
        session
      });
    }

    /* PocketScout send unsigned players to random school v1 */
    if (
      mode ===
        'sendZeroOfferTransfersToRandomSchool'
    ) {
      return sendZeroOfferTransfersToRandomSchool({
        inputPath,
        outputPath:
          outputPath || inputPath,
        session
      });
    }

    if (mode === 'saveRecruit') {
      return saveRecruit({
        inputPath,
        outputPath:
          outputPath || inputPath,
        recruitKey:
          options.recruitKey,
        recruitEdits:
          options.recruitEdits ?? [],
        playerEdits:
          options.playerEdits ?? [],

        topSchoolEdits:
          options.topSchoolEdits ?? [],

        nilEdits:
          options.nilEdits ?? [],

        session
      });
    }

    throw new Error(
      `Unknown Recruiting Helper mode: ${mode}`
    );
  }
};


/* PocketScout Recruiting Helper session cache v1 */
function getRecruitingHelperSessionCache({
  session,
  inputPath
}) {
  if (!session || !inputPath) {
    return null;
  }

  const resolvedInput =
    path.resolve(inputPath);

  const cache =
    session.recruitingHelperCache;

  if (
    !cache ||
    path.resolve(
      cache.inputPath ?? ''
    ).toLowerCase() !==
      resolvedInput.toLowerCase() ||
    !cache.payload ||
    !Array.isArray(
      cache.payload.recruits
    )
  ) {
    return null;
  }

  return cache;
}

function storeRecruitingHelperSessionCache({
  session,
  inputPath,
  payload
}) {
  if (
    !session ||
    !inputPath ||
    !payload ||
    !Array.isArray(
      payload.recruits
    )
  ) {
    return;
  }

  session.recruitingHelperCache = {
    inputPath:
      path.resolve(inputPath),

    createdAt:
      new Date().toISOString(),

    payload
  };
}

function refreshRecruitingHelperCachedRecruit({
  session,
  recruitKey,
  recruitRecord,
  tableIdMap,
  topSchoolsContext = null
}) {
  const cache =
    getRecruitingHelperSessionCache({
      session,
      inputPath:
        session?.inputPath
    });

  if (!cache) {
    return false;
  }

  const cachedRecruit =
    cache.payload.recruits.find(
      recruit =>
        String(recruit.key) ===
        String(recruitKey)
    );

  if (
    !cachedRecruit ||
    !isUsableRecord(
      recruitRecord
    )
  ) {
    return false;
  }

  const playerReference =
    decodeBinaryReference(
      recruitRecord.Player,
      tableIdMap
    );

  const playerRecord =
    playerReference
      ?.table
      ?.records?.[
        playerReference.row
      ];

  if (
    !playerReference ||
    !isUsableRecord(
      playerRecord
    )
  ) {
    return false;
  }

  const nationalRank =
    toInteger(
      recruitRecord.NationalRank,
      999999
    );

  const firstName =
    toText(
      playerRecord.FirstName
    );

  const lastName =
    toText(
      playerRecord.LastName
    );

  const position =
    toText(
      playerRecord.Position
    );

  const height =
    toInteger(
      playerRecord.Height,
      0
    );

  const weight =
    toInteger(
      playerRecord.Weight,
      0
    );

  const homeState =
    toText(
      playerRecord.PLYR_HOME_STATE
    );

  const homePipeline =
    toText(
      playerRecord.HomePipeline
    );

  const starRating =
    parseProspectStarRating(
      playerRecord.ProspectStarRating
    );

  const overallRating =
    findOverallRating(
      playerRecord
    );

  /* PocketScout Recruiting Helper BaseNILValue list label v1 */
  const baseNILValue =
    hasField(
      playerRecord,
      'BaseNILValue'
    )
      ? serializeValue(
          playerRecord.BaseNILValue
        )
      : null;

  const totalScholarshipOffers =
    toInteger(
      recruitRecord
        .TotalScholarshipOffers,
      0
    );

  const recruitStage =
    toText(
      recruitRecord.RecruitStage
    );

  const recruitClass =
    toText(
      recruitRecord.Class
    );

  let topSchoolTeamIds =
    Array.isArray(
      cachedRecruit.topSchoolTeamIds
    )
      ? [
          ...cachedRecruit
            .topSchoolTeamIds
        ]
      : [];

  if (topSchoolsContext) {
    try {
      topSchoolTeamIds =
        resolveRecruitTopSchools({
          recruitRecord,
          context:
            topSchoolsContext
        })
          .map(
            school =>
              Number(
                school.teamId
              )
          )
          .filter(
            teamId =>
              Number.isInteger(
                teamId
              )
          );
    } catch {
      topSchoolTeamIds = [];
    }
  }

  Object.assign(
    cachedRecruit,
    {
      recruitRow:
        Number(
          String(recruitKey)
            .split(':')[1]
        ),

      playerTableIndex:
        playerReference.tableIndex,

      playerRow:
        playerReference.row,

      nationalRank,
      firstName,
      lastName,
      position,
      height,
      weight,
      homeState,
      homePipeline,

      fullName:
        [
          firstName,
          lastName
        ]
          .filter(Boolean)
          .join(' '),

      starRating,
      overallRating,
      traitDevelopment:
        toText(
          playerRecord.TraitDevelopment
        ),
      qualityModifier:
        hasField(
          recruitRecord,
          'QualityModifier'
        )
          ? serializeValue(
              recruitRecord.QualityModifier
            )
          : '',
      ratingValues:
        getRecruitingHelperFilterRatings(
          playerRecord
        ),
      baseNILValue,
      totalScholarshipOffers,
      recruitStage,
      recruitClass,
      topSchoolTeamIds,

      label:
        buildRecruitLabel({
          nationalRank,
          firstName,
          lastName,
          position,
          homeState,
          homePipeline,
          starRating,
          overallRating,
          recruitStage,
          totalScholarshipOffers,
          baseNILValue
        })
    }
  );

  cache.payload.recruits.sort(
    compareByNationalRank
  );

  cache.updatedAt =
    new Date().toISOString();

  return true;
}

/* PocketScout Recruiting Helper incremental save refresh v1 */
function refreshRecruitingHelperCachedDetails({
  session,
  recruitKey,
  recruitRecord,
  playerReference,
  playerRecord,
  resolutionMode,
  topSchoolsContext,
  userRecruitTargetForNil = null
}) {
  const cache =
    getRecruitingHelperSessionCache({
      session,
      inputPath:
        session?.inputPath
    });

  const cachedRecruit =
    cache?.payload?.recruits?.find(
      recruit =>
        String(recruit.key) ===
        String(recruitKey)
    );

  if (
    !cachedRecruit ||
    !isUsableRecord(recruitRecord) ||
    !playerReference ||
    !isUsableRecord(playerRecord)
  ) {
    return null;
  }

  let topSchools = [];

  try {
    topSchools =
      resolveRecruitTopSchools({
        recruitRecord,
        context:
          topSchoolsContext
      });
  } catch {
    topSchools = [];
  }

  const previousNilData =
    cachedRecruit
      .prefetchedDetails
      ?.nilData ?? {};

  const nilData = {
    ...previousNilData,

    baseNILValue:
      hasField(
        playerRecord,
        'BaseNILValue'
      )
        ? serializeValue(
            playerRecord.BaseNILValue
          )
        : null
  };

  if (
    isUsableRecord(
      userRecruitTargetForNil
    )
  ) {
    nilData.hasUserRecruitTarget =
      true;

    for (
      const [
        resultName,
        fieldName
      ]
      of [
        [
          'nilExpectation',
          'NILExpectation'
        ],
        [
          'originalNilExpectation',
          'OriginalNILExpectation'
        ],
        [
          'currentNILOffer',
          'CurrentNILOffer'
        ]
      ]
    ) {
      nilData[resultName] =
        hasField(
          userRecruitTargetForNil,
          fieldName
        )
          ? serializeValue(
              userRecruitTargetForNil[
                fieldName
              ]
            )
          : null;
    }
  }

  cachedRecruit.prefetchedDetails = {
    recruitKey:
      String(recruitKey),

    recruitTableIndex:
      cachedRecruit.recruitTableIndex,

    recruitRow:
      cachedRecruit.recruitRow,

    playerTableIndex:
      playerReference.tableIndex,

    playerRow:
      playerReference.row,

    resolutionMode,
    totalMilliseconds:
      0,

    recruitFields:
      buildFieldList(
        recruitRecord,
        EDITABLE_RECRUIT_FIELDS
      ),

    playerFields:
      buildRecruitingHelperPlayerFields(
        playerRecord,
        topSchoolsContext
          .teamOptions
      ),

    /*
     * PocketScout refresh Recruiting Helper OVR metadata after save v1
     *
     * Saving any Recruit or linked Player field refreshes the cached detail
     * payload. Keep the OVR formula metadata in that refreshed payload so
     * the Ratings tab continues to know which fields are red/orange and the
     * Athlete tab continues to have its projection data.
     */
    ovrMetadata:
      buildRecruitingHelperOvrMetadata(
        playerRecord
      ),

    topSchools,
    nilData
  };

  cache.updatedAt =
    new Date().toISOString();

  return JSON.parse(
    JSON.stringify(
      cachedRecruit
    )
  );
}

/* PocketScout Recruiting Helper minimum rating filter v1 */
function getRecruitingHelperFilterRatings(
  playerRecord
) {
  const ratings = {};

  for (
    const fieldName
    of Object.keys(
      playerRecord?.fields ??
      playerRecord ??
      {}
    )
  ) {
    if (
      !/Rating$/i.test(fieldName) ||
      [
        'OverallRating',
        'ProspectStarRating',
        'RunningStyleRating',
        'InjuryRating'
      ].includes(fieldName)
    ) {
      continue;
    }

    const value =
      Number(
        playerRecord[fieldName]
      );

    if (
      Number.isFinite(value) &&
      value >= 0 &&
      value <= 99
    ) {
      ratings[fieldName] =
        Math.trunc(value);
    }
  }

  return ratings;
}
/* END PocketScout Recruiting Helper minimum rating filter v1 */

/* Recruiting Helper lightweight summary payload */
async function loadRecruits({
  inputPath,
  session = null
}) {
  const totalStartedAt =
    performance.now();

  /*
   * Always read current Recruit and linked Player data when Recruiting
   * Helper is selected. This prevents edits made by another module from
   * being hidden behind a recruit-list snapshot created earlier.
   */
  if (session) {
    session.recruitingHelperCache =
      null;
  }

  const recruitingHelperDiagnostics =
    [];

  function addDiagnostic(
    phase,
    startedAt,
    details = {}
  ) {
    recruitingHelperDiagnostics.push({
      phase,

      milliseconds:
        Math.round(
          (
            performance.now() -
            startedAt
          ) * 100
        ) / 100,

      ...details
    });
  }

  let phaseStartedAt =
    performance.now();

  const {
    franchise,
    resolvedInput
  } = await openFranchise(
    inputPath
  );

  addDiagnostic(
    'Open dynasty file',
    phaseStartedAt
  );

  phaseStartedAt =
    performance.now();

  const {
    tableIdMap,
    recruitTableInfo,
    resolutionMode
  } =
    await buildRecruitingHelperTableContext({
      franchise,
      session
    });

  addDiagnostic(
    'Resolve Recruit and Player tables',
    phaseStartedAt,
    {
      resolutionMode,

      recruitTableIndex:
        recruitTableInfo.tableIndex,

      mappedTableCount:
        tableIdMap.size
    }
  );

  phaseStartedAt =
    performance.now();

  /* Recruiting Helper By Team filter */
  const topSchoolsFilterContext =
    await buildRecruitTopSchoolsContext({
      franchise,
      session
    });

  addDiagnostic(
    'Resolve Team and Top 10 school filter tables',
    phaseStartedAt,
    {
      teamOptions:
        topSchoolsFilterContext
          .teamOptions
          .length,

      listTableIndex:
        topSchoolsFilterContext
          .listTableInfo
          .tableIndex,

      targetTableIndex:
        topSchoolsFilterContext
          .targetTableInfo
          .tableIndex
    }
  );

  phaseStartedAt =
    performance.now();

  /* PocketScout Prospect Board commit visibility and user team default */
  const userTeamId =
    await resolveRecruitingHelperUserTeamId({
      franchise,
      session,
      teamTableInfo:
        topSchoolsFilterContext
          .teamTableInfo
    });

  /* PocketScout Recruiting Helper Prospect Board filter */
  const prospectBoardMembership =
    await buildRecruitProspectBoardMembership({
      franchise,
      session,
      recruitTableInfo,
      teamTableInfo:
        topSchoolsFilterContext.teamTableInfo,
      userTeamId
    });

  addDiagnostic(
    'Resolve team prospect board memberships',
    phaseStartedAt,
    {
      teamsWithBoards:
        prospectBoardMembership
          .teamsWithBoards,

      boardRecruitMemberships:
        prospectBoardMembership
          .membershipCount
    }
  );

  phaseStartedAt =
    performance.now();

  const recruits = [];

  /* PocketScout Recruiting Helper minimum rating filter v1 */
  const ratingFilterFieldNames =
    new Set();

  /* PocketScout Recruiting Helper QualityModifier rating popup filter v1 */
  const recruitEnumFields = [
    'RecruitStage',
    'Class',
    'QualityModifier'
  ];

  const playerEnumFields = [
    'TraitDevelopment',
    'PlayerType',
    'Position',
    /* PocketScout untested Player Profile visual dropdowns v1 */
    'PLYR_STYLE',
    'PLYR_QBSTYLE',
    'PLYR_HANDEDNESS',
    'PLYR_STANCE',
    'PLYR_TENDENCY',
    'PlayerVisMoveType',
    'Personality',
    'RecruitingDealbreaker',
    'PLYR_HOME_STATE',
    'HomePipeline',
    'Scheme',
    'IdealRecruitingPitch',
    'ProspectStarRating'
  ];

  const enumSets = {
    recruit:
      Object.fromEntries(
        recruitEnumFields.map(
          fieldName => [
            fieldName,
            new Set()
          ]
        )
      ),

    player:
      Object.fromEntries(
        playerEnumFields.map(
          fieldName => [
            fieldName,
            new Set()
          ]
        )
      )
  };

  let recordsScanned = 0;
  let usableRecruitRecords = 0;
  let invalidPlayerReferences = 0;
  let unusablePlayerRecords = 0;
  let placeholderRecordsSkipped = 0;

  for (
    let recruitRow = 0;
    recruitRow <
      (recruitTableInfo.table.records ?? [])
        .length;
    recruitRow++
  ) {
    recordsScanned++;

    const recruitRecord =
      recruitTableInfo.table.records[
        recruitRow
      ];

    if (
      !isUsableRecord(
        recruitRecord
      ) ||
      !hasFields(
        recruitRecord,
        RECRUIT_REQUIRED_FIELDS
      )
    ) {
      continue;
    }

    usableRecruitRecords++;

    const playerReference =
      decodeBinaryReference(
        recruitRecord.Player,
        tableIdMap
      );

    if (!playerReference) {
      invalidPlayerReferences++;
      continue;
    }

    const playerRecord =
      playerReference.table.records?.[
        playerReference.row
      ];

    if (
      !isUsableRecord(
        playerRecord
      )
    ) {
      unusablePlayerRecords++;
      continue;
    }

    for (
      const fieldName
      of recruitEnumFields
    ) {
      if (
        hasField(
          recruitRecord,
          fieldName
        )
      ) {
        const value =
          toText(
            recruitRecord[
              fieldName
            ]
          );

        if (value) {
          enumSets.recruit[
            fieldName
          ].add(
            value
          );
        }
      }
    }

    for (
      const fieldName
      of playerEnumFields
    ) {
      if (
        hasField(
          playerRecord,
          fieldName
        )
      ) {
        const value =
          toText(
            playerRecord[
              fieldName
            ]
          );

        if (value) {
          enumSets.player[
            fieldName
          ].add(
            value
          );
        }
      }
    }

    const nationalRank =
      toInteger(
        recruitRecord.NationalRank,
        999999
      );

    const firstName =
      toText(
        playerRecord.FirstName
      );

    const lastName =
      toText(
        playerRecord.LastName
      );

    const position =
      toText(
        playerRecord.Position
      );

    const height =
      toInteger(
        playerRecord.Height,
        0
      );

    const weight =
      toInteger(
        playerRecord.Weight,
        0
      );

    const homeState =
      toText(
        playerRecord.PLYR_HOME_STATE
      );

    const homePipeline =
      toText(
        playerRecord.HomePipeline
      );

    const starRating =
      parseProspectStarRating(
        playerRecord.ProspectStarRating
      );

    const overallRating =
      findOverallRating(
        playerRecord
      );

    const ratingValues =
      getRecruitingHelperFilterRatings(
        playerRecord
      );

    for (
      const fieldName
      of Object.keys(
        ratingValues
      )
    ) {
      ratingFilterFieldNames.add(
        fieldName
      );
    }

    const baseNILValue =
      hasField(
        playerRecord,
        'BaseNILValue'
      )
        ? serializeValue(
            playerRecord.BaseNILValue
          )
        : null;

    const totalScholarshipOffers =
      toInteger(
        recruitRecord
          .TotalScholarshipOffers,
        0
      );

    if (
      nationalRank === 0 &&
      !firstName &&
      !lastName &&
      overallRating === 0
    ) {
      placeholderRecordsSkipped++;
      continue;
    }

    const recruitStage =
      toText(
        recruitRecord.RecruitStage
      );

    const recruitClass =
      toText(
        recruitRecord.Class
      );

    let topSchools = [];
    let topSchoolTeamIds = [];

    try {
      topSchools =
        resolveRecruitTopSchools({
          recruitRecord,

          context:
            topSchoolsFilterContext
        });

      topSchoolTeamIds =
        topSchools
          .map(
            school =>
              Number(
                school.teamId
              )
          )
          .filter(
            teamId =>
              Number.isInteger(
                teamId
              )
          );
    } catch {
      /*
       * Keep the recruit visible in other filters.
       * A recruit with an invalid TopSchoolsList
       * simply will not match the By Team filter.
       */
      topSchoolTeamIds = [];
    }

    recruits.push({
      key:
        `${recruitTableInfo.tableIndex}:${recruitRow}`,

      recruitTableIndex:
        recruitTableInfo.tableIndex,

      recruitRow,

      playerTableIndex:
        playerReference.tableIndex,

      playerRow:
        playerReference.row,

      nationalRank,
      firstName,
      lastName,
      position,
      height,
      weight,
      homeState,
      homePipeline,

      fullName:
        [
          firstName,
          lastName
        ]
          .filter(Boolean)
          .join(' '),

      starRating,
      overallRating,
      traitDevelopment:
        toText(
          playerRecord.TraitDevelopment
        ),
      qualityModifier:
        hasField(
          recruitRecord,
          'QualityModifier'
        )
          ? serializeValue(
              recruitRecord.QualityModifier
            )
          : '',
      ratingValues,
      baseNILValue,
      totalScholarshipOffers,
      recruitStage,
      recruitClass,
      topSchoolTeamIds,

      prospectBoardTeamIds:
        prospectBoardMembership
          .teamIdsByRecruitKey
          .get(
            `${recruitTableInfo.tableIndex}:${recruitRow}`
          ) ?? [],

      /* PocketScout Recruiting Helper prefetched detail table v1 */
      prefetchedDetails: {
        recruitKey:
          `${recruitTableInfo.tableIndex}:${recruitRow}`,

        recruitTableIndex:
          recruitTableInfo.tableIndex,

        recruitRow,

        playerTableIndex:
          playerReference.tableIndex,

        playerRow:
          playerReference.row,

        resolutionMode,

        totalMilliseconds:
          0,

        recruitFields:
          buildFieldList(
            recruitRecord,
            EDITABLE_RECRUIT_FIELDS
          ),

        playerFields:
          buildRecruitingHelperPlayerFields(
            playerRecord,
            topSchoolsFilterContext
              .teamOptions
          ),

        ovrMetadata:
          buildRecruitingHelperOvrMetadata(
            playerRecord
          ),

        topSchools,

        nilData: {
          baseNILValue,

          userTeamId,

          ...(
            prospectBoardMembership
              .userTargetNilByRecruitKey
              .get(
                `${recruitTableInfo.tableIndex}:${recruitRow}`
              ) ?? {
                hasUserRecruitTarget:
                  false,

                nilExpectation:
                  null,

                originalNilExpectation:
                  null,

                currentNILOffer:
                  null
              }
          )
        }
      },

      label:
        buildRecruitLabel({
          nationalRank,
          firstName,
          lastName,
          position,
          homeState,
          homePipeline,
          starRating,
          overallRating,
          recruitStage,

          /* Recruiting Helper dropdown offer count */
          totalScholarshipOffers,

          /* PocketScout Recruiting Helper BaseNILValue list label v1 */
          baseNILValue
        })
    });
  }

  addDiagnostic(
    'Build lightweight recruit summaries',
    phaseStartedAt,
    {
      recordsScanned,
      usableRecruitRecords,

      recruitsReturned:
        recruits.length,

      invalidPlayerReferences,
      unusablePlayerRecords,
      placeholderRecordsSkipped
    }
  );

  phaseStartedAt =
    performance.now();

  recruits.sort(
    compareByNationalRank
  );

  addDiagnostic(
    'Sort recruits',
    phaseStartedAt,
    {
      recruitsSorted:
        recruits.length
    }
  );

  const enumOptions = {
    recruit:
      Object.fromEntries(
        Object.entries(
          enumSets.recruit
        ).map(
          ([
            fieldName,
            values
          ]) => [
            fieldName,

            [...values].sort(
              (
                left,
                right
              ) =>
                left.localeCompare(
                  right,
                  undefined,
                  {
                    sensitivity:
                      'base',

                    numeric:
                      true
                  }
                )
            )
          ]
        )
      ),

    player:
      mergeMfeProfileOptions(
        Object.fromEntries(
          Object.entries(
            enumSets.player
          ).map(
            ([
              fieldName,
              values
            ]) => [
              fieldName,

              [...values].sort(
                (
                  left,
                  right
                ) =>
                  left.localeCompare(
                    right,
                    undefined,
                    {
                      sensitivity:
                        'base',

                      numeric:
                        true
                    }
                  )
              )
            ]
          )
        )
      ),

    mentalAbility:
      [...MENTAL_ABILITY_OPTIONS],

    mentalAbilityRank:
      [...MENTAL_ABILITY_RANK_OPTIONS],

    /* Recruiting Helper dynamic physical help and rank dropdowns */
    physicalAbilityRank:
      [...MENTAL_ABILITY_RANK_OPTIONS]
  };

  const totalMilliseconds =
    Math.round(
      (
        performance.now() -
        totalStartedAt
      ) * 100
    ) / 100;

  const result = {
    moduleId:
      recruitingHelperModule.id,

    moduleName:
      recruitingHelperModule.name,

    inputPath:
      resolvedInput,

    recruitTableIndex:
      recruitTableInfo.tableIndex,

    resolutionMode,
    recruitingHelperDiagnostics,
    totalMilliseconds,
    enumOptions,

    filterTeamOptions:
      topSchoolsFilterContext
        .teamOptions,

    /* PocketScout Recruiting Helper minimum rating filter v1 */
    ratingFilterFields:
      [...ratingFilterFieldNames]
        .sort(
          (left, right) =>
            left.localeCompare(
              right,
              undefined,
              {
                sensitivity:
                  'base',
                numeric:
                  true
              }
            )
        ),

    /* PocketScout Prospect Board commit visibility and user team default */
    userTeamId,

    cacheStatus:
      'live-module-load',

    recruits
  };

  return result;
}




/* PocketScout lazy Recruiting Helper projections v2 */
async function loadRecruitAthleteProjections({
  inputPath,
  recruitKey,
  session = null
}) {
  const {
    franchise,
    resolvedInput
  } =
    await openFranchise(
      inputPath
    );

  const {
    tableIdMap,
    recruitTableInfo
  } =
    await buildRecruitingHelperTableContext({
      franchise,
      session
    });

  const [
    submittedTableIndexText,
    recruitRowText
  ] =
    String(
      recruitKey ?? ''
    ).split(':');

  const submittedTableIndex =
    Number.parseInt(
      submittedTableIndexText,
      10
    );

  const recruitRow =
    Number.parseInt(
      recruitRowText,
      10
    );

  if (
    !Number.isInteger(
      submittedTableIndex
    ) ||
    !Number.isInteger(
      recruitRow
    ) ||
    submittedTableIndex !==
      recruitTableInfo.tableIndex
  ) {
    throw new Error(
      'Invalid Recruit selection.'
    );
  }

  const recruitRecord =
    recruitTableInfo.table.records?.[
      recruitRow
    ];

  if (
    !isUsableRecord(
      recruitRecord
    )
  ) {
    throw new Error(
      'The selected Recruit row is no longer valid.'
    );
  }

  const playerReference =
    decodeBinaryReference(
      recruitRecord.Player,
      tableIdMap
    );

  const playerRecord =
    playerReference
      ?.table
      ?.records?.[
        playerReference.row
      ];

  if (
    !playerReference ||
    !isUsableRecord(
      playerRecord
    )
  ) {
    throw new Error(
      'The selected Recruit no longer has a valid Player record.'
    );
  }

  return {
    moduleId:
      recruitingHelperModule.id,

    moduleName:
      recruitingHelperModule.name,

    inputPath:
      resolvedInput,

    recruitKey:
      String(recruitKey),

    athleteProjections:
      buildRecruitingHelperAthleteProjections(
        playerRecord
      )
  };
}
/* END PocketScout lazy Recruiting Helper projections v2 */

async function loadRecruitDetails({
  inputPath,
  recruitKey,
  session = null
}) {
  const totalStartedAt =
    performance.now();

  const {
    franchise,
    resolvedInput
  } = await openFranchise(
    inputPath
  );

  const {
    tableIdMap,
    recruitTableInfo,
    resolutionMode
  } =
    await buildRecruitingHelperTableContext({
      franchise,
      session
    });

  const [
    submittedTableIndexText,
    recruitRowText
  ] = String(
    recruitKey ?? ''
  ).split(':');

  const submittedTableIndex =
    Number.parseInt(
      submittedTableIndexText,
      10
    );

  const recruitRow =
    Number.parseInt(
      recruitRowText,
      10
    );

  if (
    !Number.isInteger(
      submittedTableIndex
    ) ||
    !Number.isInteger(
      recruitRow
    )
  ) {
    throw new Error(
      'Invalid Recruit selection.'
    );
  }

  if (
    submittedTableIndex !==
    recruitTableInfo.tableIndex
  ) {
    throw new Error(
      'The Recruit table changed after the list was loaded. Reload Recruiting Helper and try again.'
    );
  }

  const recruitRecord =
    recruitTableInfo.table.records?.[
      recruitRow
    ];

  if (
    !isUsableRecord(
      recruitRecord
    ) ||
    !hasFields(
      recruitRecord,
      RECRUIT_REQUIRED_FIELDS
    )
  ) {
    throw new Error(
      'The selected Recruit row is no longer valid.'
    );
  }

  const playerReference =
    decodeBinaryReference(
      recruitRecord.Player,
      tableIdMap
    );

  if (!playerReference) {
    throw new Error(
      'The selected Recruit no longer has a valid Player reference.'
    );
  }

  const playerRecord =
    playerReference.table.records?.[
      playerReference.row
    ];

  if (
    !isUsableRecord(
      playerRecord
    )
  ) {
    throw new Error(
      'The linked Player record is no longer valid.'
    );
  }

  const recruitFields =
    buildFieldList(
      recruitRecord,
      EDITABLE_RECRUIT_FIELDS
    );

  const topSchoolsContext =
    await buildRecruitTopSchoolsContext({
      franchise,
      session
    });

  const playerFields =
    buildRecruitingHelperPlayerFields(
      playerRecord,
      topSchoolsContext
        .teamOptions
    );

  const topSchools =
    resolveRecruitTopSchools({
      recruitRecord,
      context:
        topSchoolsContext
    });

  /* PocketScout Recruiting Helper NIL tab v1 */
  const userTeamId =
    await resolveRecruitingHelperUserTeamId({
      franchise,
      session,
      teamTableInfo:
        topSchoolsContext
          .teamTableInfo
    });

  let userRecruitTarget =
    null;

  if (
    Number.isInteger(
      userTeamId
    )
  ) {
    userRecruitTarget =
      await findSelectedTeamRecruitTarget({
        franchise,
        session,
        teamTableInfo:
          topSchoolsContext
            .teamTableInfo,
        recruitTableInfo,
        recruitRow,
        selectedTeamId:
          userTeamId
      });
  }

  const nilData = {
    baseNILValue:
      hasField(
        playerRecord,
        'BaseNILValue'
      )
        ? serializeValue(
            playerRecord.BaseNILValue
          )
        : null,

    userTeamId,

    hasUserRecruitTarget:
      Boolean(
        userRecruitTarget
      ),

    nilExpectation:
      userRecruitTarget &&
      hasField(
        userRecruitTarget,
        'NILExpectation'
      )
        ? serializeValue(
            userRecruitTarget
              .NILExpectation
          )
        : null,

    originalNilExpectation:
      userRecruitTarget &&
      hasField(
        userRecruitTarget,
        'OriginalNILExpectation'
      )
        ? serializeValue(
            userRecruitTarget
              .OriginalNILExpectation
          )
        : null,

    currentNILOffer:
      userRecruitTarget &&
      hasField(
        userRecruitTarget,
        'CurrentNILOffer'
      )
        ? serializeValue(
            userRecruitTarget
              .CurrentNILOffer
          )
        : null
  };

  return {
    moduleId:
      recruitingHelperModule.id,

    moduleName:
      recruitingHelperModule.name,

    inputPath:
      resolvedInput,

    recruitKey,

    recruitTableIndex:
      recruitTableInfo.tableIndex,

    recruitRow,

    playerTableIndex:
      playerReference.tableIndex,

    playerRow:
      playerReference.row,

    resolutionMode,

    totalMilliseconds:
      Math.round(
        (
          performance.now() -
          totalStartedAt
        ) * 100
      ) / 100,

    recruitFields,
    playerFields,

    ovrMetadata:
      buildRecruitingHelperOvrMetadata(
        playerRecord
      ),

    /* PocketScout Recruiting Helper NIL tab v1 */
    nilData,

    topSchools,
    teamOptions:
      topSchoolsContext.teamOptions,

    topSchoolsResolution: {
      listTableIndex:
        topSchoolsContext
          .listTableInfo
          .tableIndex,

      targetTableIndex:
        topSchoolsContext
          .targetTableInfo
          .tableIndex,

      targetTableStoreName:
        topSchoolsContext
          .targetTableInfo
          .tableStoreName,

      teamTableIndex:
        topSchoolsContext
          .teamTableInfo
          .tableIndex
    }
  };
}


/* PocketScout Commit Recruit To Currently Selected School */
const RECRUITING_HELPER_COMMITTED_STAGE =
  'HardCommitted';

/* PocketScout NSD Assign Unsigned Players restore HardCommitted stage v2 */
/*
 * PocketScout assigned recruit dealbreaker invalid v31
 *
 * Forced commitments and automatic unsigned-player assignments bypass the
 * game's normal dealbreaker evaluation. Clear RecruitingDealbreaker on every
 * affected Player record so a stale dealbreaker cannot block or undo the
 * assignment.
 */
async function loadCommittedPlayersArrayTable({
  franchise,
  session = null,
  tableIdMap = null,
  teamTableInfo = null
}) {
  /*
   * PocketScout structural committed players resolver v33
   *
   * Resolve the table through Team.CommittedPlayers references and verify
   * the exact Player0 through Player34 array structure. Do not depend on a
   * fixed table index, runtime table ID, or table name.
   */
  const expectedPlayerFields =
    Array.from(
      { length: 35 },
      (_, index) => `Player${index}`
    );

  function getPlayerFields(table) {
    const sampleRecord =
      (table?.records ?? []).find(
        record =>
          record &&
          expectedPlayerFields.some(
            fieldName =>
              Object.prototype
                .hasOwnProperty
                .call(
                  record.fields ??
                  record,
                  fieldName
                )
          )
      );

    if (!sampleRecord) {
      return [];
    }

    return Object.keys(
      sampleRecord.fields ??
      sampleRecord
    )
      .filter(
        fieldName =>
          /^Player\d+$/.test(fieldName)
      )
      .sort(
        (left, right) =>
          Number.parseInt(
            left.replace('Player', ''),
            10
          ) -
          Number.parseInt(
            right.replace('Player', ''),
            10
          )
      );
  }

  function hasExactShape(table) {
    const playerFields =
      getPlayerFields(table);

    return (
      playerFields.length === 35 &&
      expectedPlayerFields.every(
        (fieldName, index) =>
          playerFields[index] === fieldName
      )
    );
  }

  function isBinaryReference(value) {
    return /^[01]{32}$/.test(
      String(value ?? '')
    );
  }

  let resolvedTeamTableInfo =
    teamTableInfo;

  if (!resolvedTeamTableInfo?.table) {
    resolvedTeamTableInfo =
      await findValidatedTeamTable({
        franchise,
        session
      });
  }

  const referencedRowsByTableId =
    new Map();

  for (
    const teamRecord
    of (
      resolvedTeamTableInfo
        ?.table
        ?.records ??
      []
    )
  ) {
    const reference =
      String(
        teamRecord
          ?.CommittedPlayers ??
        ''
      );

    if (
      !isBinaryReference(reference) ||
      /^0{32}$/.test(reference)
    ) {
      continue;
    }

    const tableId =
      Number.parseInt(
        reference.slice(0, 15),
        2
      );

    const row =
      Number.parseInt(
        reference.slice(15),
        2
      );

    if (
      !Number.isInteger(tableId) ||
      !Number.isInteger(row)
    ) {
      continue;
    }

    const rows =
      referencedRowsByTableId.get(
        tableId
      ) ??
      new Set();

    rows.add(row);

    referencedRowsByTableId.set(
      tableId,
      rows
    );
  }

  if (
    referencedRowsByTableId.size === 0
  ) {
    throw new Error(
      'No valid Team.CommittedPlayers references were available for structural resolution.'
    );
  }

  const candidateIndexes =
    new Set();

  for (
    const tableId
    of referencedRowsByTableId.keys()
  ) {
    const mappedIndex =
      Number(
        tableIdMap?.get?.(
          tableId
        )?.tableIndex
      );

    if (
      Number.isInteger(mappedIndex) &&
      mappedIndex >= 0
    ) {
      candidateIndexes.add(
        mappedIndex
      );
    }

    const sessionIndex =
      Number(
        session?.tablesById?.[
          String(tableId)
        ]?.index
      );

    if (
      Number.isInteger(sessionIndex) &&
      sessionIndex >= 0
    ) {
      candidateIndexes.add(
        sessionIndex
      );
    }
  }

  for (
    const info
    of Object.values(
      session?.tablesById ??
      {}
    )
  ) {
    const index =
      Number(info?.index);

    if (
      Number.isInteger(index) &&
      index >= 0
    ) {
      candidateIndexes.add(index);
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

      await table.readRecords();
    } catch {
      table = null;
    }

    if (
      !table ||
      !hasExactShape(table)
    ) {
      continue;
    }

    const runtimeTableId =
      getRuntimeTableId(table);

    const referencedRows =
      referencedRowsByTableId.get(
        runtimeTableId
      );

    if (
      !Number.isInteger(runtimeTableId) ||
      !referencedRows ||
      referencedRows.size === 0
    ) {
      continue;
    }

    let validRows = 0;
    let invalidRows = 0;

    for (
      const row
      of referencedRows
    ) {
      const record =
        table.records?.[row] ??
        (table.records ?? []).find(
          candidate =>
            Number(candidate?._row) === row
        );

      if (!record) {
        invalidRows++;
        continue;
      }

      // CFB's current save reader exposes Player-slot values through field
      // wrappers during this structural scan. The Team reference, matching
      // runtime table ID, existing row, and exact Player0-Player34 shape are
      // sufficient validation; serializing every slot here rejects valid
      // post-update arrays.
      const rowIsValid =
        expectedPlayerFields.every(
          fieldName =>
            Object.prototype.hasOwnProperty.call(
              record.fields ?? record,
              fieldName
            )
        );

      if (rowIsValid) {
        validRows++;
      } else {
        invalidRows++;
      }
    }

    if (
      validRows > 0 &&
      invalidRows === 0
    ) {
      matches.push({
        table,
        tableIndex,
        runtimeTableId,
        validReferencedRows:
          validRows
      });
    }
  }

  if (matches.length !== 1) {
    const detail =
      matches.length
        ? matches.map(
            match =>
              `index ${match.tableIndex}, table ID ${match.runtimeTableId}, referenced rows ${match.validReferencedRows}`
          ).join('; ')
        : 'none';

    throw new Error(
      `Could not uniquely resolve the committed-player Player[35] array by Team.CommittedPlayers references and Player0-Player34 structure. Matches: ${detail}.`
    );
  }

  return matches[0];
}

function setAssignedRecruitDealbreakerInvalid(
  playerRecord
) {
  if (
    !isUsableRecord(
      playerRecord
    ) ||
    !hasField(
      playerRecord,
      'RecruitingDealbreaker'
    )
  ) {
    return false;
  }

  if (
    String(
      playerRecord
        .RecruitingDealbreaker ??
      ''
    ) === 'Invalid'
  ) {
    return false;
  }

  playerRecord.RecruitingDealbreaker =
    'Invalid';

  return true;
}

async function commitRecruitToSelectedSchool({
  inputPath,
  outputPath,
  recruitKey,
  selectedTeamId,
  session = null
}) {
  const {
    franchise,
    resolvedInput
  } = await openFranchise(
    inputPath
  );

  const resolvedOutput =
    path.resolve(
      outputPath || inputPath
    );

  const {
    tableIdMap,
    recruitTableInfo
  } =
    await buildRecruitingHelperTableContext({
      franchise,
      session
    });

  const [
    submittedTableIndexText,
    recruitRowText
  ] = String(
    recruitKey ?? ''
  ).split(':');

  const submittedTableIndex =
    Number.parseInt(
      submittedTableIndexText,
      10
    );

  const recruitRow =
    Number.parseInt(
      recruitRowText,
      10
    );

  const teamId =
    Number.parseInt(
      selectedTeamId,
      10
    );

  if (
    !Number.isInteger(
      submittedTableIndex
    ) ||
    !Number.isInteger(
      recruitRow
    )
  ) {
    throw new Error(
      'Invalid Recruit selection.'
    );
  }

  if (
    submittedTableIndex !==
      recruitTableInfo.tableIndex
  ) {
    throw new Error(
      'The Recruit table changed after the editor was loaded. Reload Recruiting Helper and try again.'
    );
  }

  const recruitRecord =
    recruitTableInfo.table.records?.[
      recruitRow
    ];

  if (
    !isUsableRecord(
      recruitRecord
    ) ||
    !hasFields(
      recruitRecord,
      RECRUIT_REQUIRED_FIELDS
    )
  ) {
    throw new Error(
      'The selected Recruit row is no longer valid.'
    );
  }

  const topSchoolsContext =
    await buildRecruitTopSchoolsContext({
      franchise,
      session
    });

  if (
    !Number.isInteger(
      teamId
    ) ||
    !topSchoolsContext
      .teamIds
      .has(
        teamId
      )
  ) {
    throw new Error(
      'Choose a valid school in the Recruiting Helper team dropdown.'
    );
  }

  const selectedTeam =
    topSchoolsContext
      .teamOptions
      .find(
        option =>
          Number(
            option.value
          ) ===
            teamId
      );

  const topSchools =
    resolveRecruitTopSchools({
      recruitRecord,
      context:
        topSchoolsContext
    });

  const slot0 =
    topSchools.find(
      school =>
        Number(
          school.slot
        ) === 0
    );

  if (!slot0) {
    throw new Error(
      'The selected recruit has no valid first Top 10 school slot.'
    );
  }

  const existingSlot =
    topSchools.find(
      school =>
        Number(
          school.teamId
        ) ===
          teamId
    );

  const otherSchools =
    topSchools.filter(
      school =>
        Number(
          school.teamId
        ) !==
          teamId
    );

  const secondPlaceInfluence =
    otherSchools.length
      ? Math.max(
          ...otherSchools.map(
            school =>
              Number.isFinite(
                Number(
                  school.teamInfluence
                )
              )
                ? Number(
                    school.teamInfluence
                  )
                : 0
          )
        )
      : 0;

  const newTopInfluence =
    Math.min(
      100,
      secondPlaceInfluence + 30
    );

  const displacementCandidates =
    otherSchools.filter(
      school =>
        Number(
          school.slot
        ) !== 0
    );

  const displacementSlot =
    existingSlot ??
    (
      displacementCandidates.length
        ? displacementCandidates.reduce(
            (
              lowest,
              school
            ) =>
              Number(
                school.teamInfluence
              ) <
              Number(
                lowest.teamInfluence
              )
                ? school
                : lowest,
            displacementCandidates[0]
          )
        : null
    );

  if (!displacementSlot) {
    throw new Error(
      'Could not find a safe Top 10 school slot to use for the commitment.'
    );
  }

  /*
   * PocketScout hard commit actual Top School target table v2
   *
   * A recruit's Top 10 slots can resolve through a different target-school
   * table than topSchoolsContext.targetTableInfo. Read and write each slot
   * through the exact table referenced by that slot.
   */
  const slot0TableInfo =
    topSchoolsContext
      .targetTablesByIndex
      .get(
        Number(
          slot0.targetTableIndex
        )
      );

  const displacementTableInfo =
    topSchoolsContext
      .targetTablesByIndex
      .get(
        Number(
          displacementSlot
            .targetTableIndex
        )
      );

  const slot0Record =
    slot0TableInfo
      ?.table
      ?.records?.[
        slot0.targetRow
      ];

  const displacementRecord =
    displacementTableInfo
      ?.table
      ?.records?.[
        displacementSlot.targetRow
      ];

  if (
    !isUsableRecord(
      slot0Record
    ) ||
    !hasFields(
      slot0Record,
      [
        'TeamId',
        'TeamInfluence'
      ]
    ) ||
    !isUsableRecord(
      displacementRecord
    ) ||
    !hasFields(
      displacementRecord,
      [
        'TeamId',
        'TeamInfluence'
      ]
    )
  ) {
    throw new Error(
      'The resolved Top 10 school records are no longer valid.'
    );
  }

  const previousSlot0TeamId =
    Number.parseInt(
      slot0Record.TeamId,
      10
    );

  const previousSlot0Influence =
    Number(
      slot0Record.TeamInfluence
    );

  let topSchoolFieldsChanged = 0;

  if (
    Number.parseInt(
      slot0Record.TeamId,
      10
    ) !==
      teamId
  ) {
    slot0Record.TeamId =
      teamId;

    topSchoolFieldsChanged++;
  }

  if (
    Number(
      slot0Record.TeamInfluence
    ) !==
      newTopInfluence
  ) {
    slot0Record.TeamInfluence =
      Number.isInteger(
        Number(
          slot0Record.TeamInfluence
        )
      )
        ? Math.trunc(
            newTopInfluence
          )
        : newTopInfluence;

    topSchoolFieldsChanged++;
  }

  if (
    existingSlot &&
    Number(
      existingSlot.slot
    ) !== 0
  ) {
    if (
      Number.parseInt(
        displacementRecord.TeamId,
        10
      ) !==
        previousSlot0TeamId
    ) {
      displacementRecord.TeamId =
        previousSlot0TeamId;

      topSchoolFieldsChanged++;
    }

    if (
      Number(
        displacementRecord.TeamInfluence
      ) !==
        previousSlot0Influence
    ) {
      displacementRecord.TeamInfluence =
        previousSlot0Influence;

      topSchoolFieldsChanged++;
    }
  } else if (!existingSlot) {
    const wouldDuplicate =
      topSchools.some(
        school =>
          Number(
            school.slot
          ) !== 0 &&
          Number(
            school.slot
          ) !==
            Number(
              displacementSlot.slot
            ) &&
          Number(
            school.teamId
          ) ===
            previousSlot0TeamId
      );

    if (!wouldDuplicate) {
      if (
        Number.parseInt(
          displacementRecord.TeamId,
          10
        ) !==
          previousSlot0TeamId
      ) {
        displacementRecord.TeamId =
          previousSlot0TeamId;

        topSchoolFieldsChanged++;
      }

      if (
        Number(
          displacementRecord.TeamInfluence
        ) !==
          previousSlot0Influence
      ) {
        displacementRecord.TeamInfluence =
          previousSlot0Influence;

        topSchoolFieldsChanged++;
      }
    }
  }

  let recruitStageChanged = false;

  if (
    hasField(
      recruitRecord,
      'RecruitStage'
    ) &&
    String(
      recruitRecord.RecruitStage ??
      ''
    ) !==
      RECRUITING_HELPER_COMMITTED_STAGE
  ) {
    recruitRecord.RecruitStage =
      RECRUITING_HELPER_COMMITTED_STAGE;

    recruitStageChanged = true;
  }

  const selectedBoardTargetResult =
    await ensureSelectedTeamRecruitTarget({
      franchise,
      session,
      teamTableInfo:
        topSchoolsContext.teamTableInfo,
      recruitTableInfo,
      recruitRow,
      selectedTeamId:
        teamId
    });

  const selectedBoardTarget =
    selectedBoardTargetResult
      .targetRecord;

  const scholarshipOffer =
    applyRecruitScholarshipOffer({
      recruitRecord,
      targetRecord:
        selectedBoardTarget,
      recruitLabel:
        String(
          recruitRecord.Player ??
          recruitKey ??
          ''
        ),
      teamLabel:
        String(
          selectedTeam?.label ??
          `Team ${teamId}`
        )
    });

  const committedPlayerSync =
    await synchronizeCommittedPlayerDestination({
      franchise,
      teamTableInfo:
        topSchoolsContext.teamTableInfo,
      selectedTeamId:
        teamId,
      playerReference:
        recruitRecord.Player
    });

  const committedPlayerReference =
    decodeBinaryReference(
      recruitRecord.Player,
      tableIdMap
    );

  const committedPlayerRecord =
    committedPlayerReference
      ?.table
      ?.records?.[
        committedPlayerReference.row
      ];

  const recruitingDealbreakerChanged =
    setAssignedRecruitDealbreakerInvalid(
      committedPlayerRecord
    );

  let prospectInfluenceChanged =
    false;

  if (
    selectedBoardTarget &&
    hasField(
      selectedBoardTarget,
      'ProspectInfluenceTotal'
    )
  ) {
    const currentInfluence =
      Number.parseInt(
        selectedBoardTarget
          .ProspectInfluenceTotal,
        10
      );

    if (
      !Number.isInteger(
        currentInfluence
      ) ||
      currentInfluence <
        newTopInfluence
    ) {
      selectedBoardTarget
        .ProspectInfluenceTotal =
          newTopInfluence;

      prospectInfluenceChanged =
        true;
    }
  }

  /*
   * PocketScout individual hard commit save committed sync v27
   *
   * An individual recruit can already be HardCommitted and already have
   * the selected school at #1 while still be missing from that school's
   * Team.CommittedPlayers array. Count scholarship and committed-array
   * changes so those repairs are saved to the dynasty.
   */
  const totalFieldsChanged =
    topSchoolFieldsChanged +
    (
      recruitStageChanged
        ? 1
        : 0
    ) +
    (
      prospectInfluenceChanged
        ? 1
        : 0
    ) +
    (
      scholarshipOffer
        .scholarshipOfferChanged
        ? 1
        : 0
    ) +
    (
      committedPlayerSync
        .addedToDestination
        ? 1
        : 0
    ) +
    (
      committedPlayerSync
        .removedFromOtherTeams >
        0
        ? 1
        : 0
    ) +
    (
      committedPlayerSync
        .removedDuplicateDestinationEntries >
        0
        ? 1
        : 0
    ) +
    (
      recruitingDealbreakerChanged
        ? 1
        : 0
    );

  if (totalFieldsChanged > 0) {
    await franchise.save(
      resolvedOutput
    );

    /*
     * PocketScout hard commit invalidate stale Recruiting Helper details v1
     *
     * The lightweight cache and prefetchedDetails contain separate copies
     * of RecruitStage and Top 10 school data. Updating only the list summary
     * made the recruit turn green while the Recruit and Top Schools tabs
     * continued showing the old values.
     */
    if (session) {
      session.recruitingHelperCache =
        null;
    }
  }

  return {
    moduleId:
      recruitingHelperModule.id,

    moduleName:
      recruitingHelperModule.name,

    inputPath:
      resolvedInput,

    outputPath:
      resolvedOutput,

    overwrittenOriginal:
      true,

    recruitKey,

    teamId,

    teamName:
      String(
        selectedTeam?.label ??
        `Team ${teamId}`
      ),

    newTopInfluence,

    topSchoolFieldsChanged,
    recruitStageChanged,
    prospectInfluenceChanged,

    scholarshipStatusChanged:
      scholarshipOffer
        .scholarshipStatusChanged,

    totalScholarshipOffersChanged:
      scholarshipOffer
        .totalScholarshipOffersChanged,

    addedToRecruitingBoard:
      selectedBoardTargetResult
        .addedToBoard,

    replacedRecruitRow:
      selectedBoardTargetResult
        .replacedRecruitRow,

    committedPlayerSync,

    recruitingDealbreakerChanged,

    totalFieldsChanged
  };
}

async function findSelectedTeamRecruitTarget({
  franchise,
  session,
  teamTableInfo,
  recruitTableInfo,
  recruitRow,
  selectedTeamId
}) {
  const runtimeTableCache =
    new Map();

  function cacheTableInfo(
    tableInfo
  ) {
    if (!tableInfo?.table) {
      return;
    }

    const tableId =
      getRuntimeTableId(
        tableInfo.table
      );

    if (
      Number.isInteger(
        tableId
      )
    ) {
      runtimeTableCache.set(
        tableId,
        {
          table:
            tableInfo.table,

          tableIndex:
            Number(
              tableInfo.tableIndex
            )
        }
      );
    }
  }

  cacheTableInfo(
    teamTableInfo
  );

  cacheTableInfo(
    recruitTableInfo
  );

  async function resolveReference(
    value
  ) {
    const binary =
      String(
        value ?? ''
      ).trim();

    if (
      !/^[01]{32}$/.test(
        binary
      ) ||
      /^0{32}$/.test(
        binary
      )
    ) {
      return null;
    }

    const tableId =
      Number.parseInt(
        binary.slice(0, 15),
        2
      );

    const row =
      Number.parseInt(
        binary.slice(15),
        2
      );

    let tableInfo =
      runtimeTableCache.get(
        tableId
      );

    if (!tableInfo) {
      const sessionInfo =
        session?.tablesById?.[
          String(
            tableId
          )
        ];

      if (
        !sessionInfo ||
        !Number.isInteger(
          Number(
            sessionInfo.index
          )
        )
      ) {
        return null;
      }

      let table = null;

      try {
        table =
          franchise.getTableByIndex(
            Number(
              sessionInfo.index
            )
          );

        await table.readRecords();
      } catch {
        return null;
      }

      if (
        !table ||
        getRuntimeTableId(
          table
        ) !==
          tableId
      ) {
        return null;
      }

      tableInfo = {
        table,
        tableIndex:
          Number(
            sessionInfo.index
          )
      };

      runtimeTableCache.set(
        tableId,
        tableInfo
      );
    }

    if (
      !Number.isInteger(
        row
      ) ||
      row < 0 ||
      row >=
        (
          tableInfo.table.records ??
          []
        ).length
    ) {
      return null;
    }

    return {
      ...tableInfo,
      row
    };
  }

  const selectedTeamRecord =
    (
      teamTableInfo.table.records ??
      []
    ).find(
      record =>
        isUsableRecord(
          record
        ) &&
        hasFields(
          record,
          [
            'TeamIndex',
            'RecruitingBoard'
          ]
        ) &&
        Number.parseInt(
          record.TeamIndex,
          10
        ) ===
          selectedTeamId
    );

  if (!selectedTeamRecord) {
    return null;
  }

  const boardReference =
    await resolveReference(
      selectedTeamRecord
        .RecruitingBoard
    );

  const boardRecord =
    boardReference
      ?.table
      ?.records?.[
        boardReference.row
      ];

  if (
    !isUsableRecord(
      boardRecord
    ) ||
    !hasField(
      boardRecord,
      'Recruits'
    )
  ) {
    return null;
  }

  const recruitsReference =
    await resolveReference(
      boardRecord.Recruits
    );

  const recruitsRecord =
    recruitsReference
      ?.table
      ?.records?.[
        recruitsReference.row
      ];

  if (
    !isUsableRecord(
      recruitsRecord
    )
  ) {
    return null;
  }

  const targetFieldNames =
    Object.keys(
      recruitsRecord.fields ?? {}
    ).filter(
      fieldName =>
        /^RecruitTarget\d+$/.test(
          fieldName
        )
    );

  for (
    const fieldName
    of targetFieldNames
  ) {
    const targetReference =
      await resolveReference(
        recruitsRecord[
          fieldName
        ]
      );

    const targetRecord =
      targetReference
        ?.table
        ?.records?.[
          targetReference.row
        ];

    if (
      !isUsableRecord(
        targetRecord
      ) ||
      !hasField(
        targetRecord,
        'Recruit'
      )
    ) {
      continue;
    }

    const recruitReference =
      await resolveReference(
        targetRecord.Recruit
      );

    if (
      recruitReference &&
      recruitReference.tableIndex ===
        recruitTableInfo.tableIndex &&
      recruitReference.row ===
        recruitRow
    ) {
      return targetRecord;
    }
  }

  return null;
}



/*
 * PocketScout add missing recruit to destination recruiting board v2
 *
 * When a forced destination is not already recruiting the player, reuse
 * the weakest non-committed board target and point it at the selected
 * Recruit row. This keeps the fixed 35-slot recruiting board valid.
 */
function buildRecruitReference(
  recruitTableInfo,
  recruitRow
) {
  const tableId =
    getRuntimeTableId(
      recruitTableInfo.table
    );

  if (
    !Number.isInteger(tableId) ||
    !Number.isInteger(recruitRow) ||
    recruitRow < 0
  ) {
    throw new Error(
      'Could not build the Recruit reference for the destination recruiting board.'
    );
  }

  return (
    tableId
      .toString(2)
      .padStart(15, '0') +
    recruitRow
      .toString(2)
      .padStart(17, '0')
  );
}

async function ensureSelectedTeamRecruitTarget({
  franchise,
  session,
  teamTableInfo,
  recruitTableInfo,
  recruitRow,
  selectedTeamId
}) {
  const existing =
    await findSelectedTeamRecruitTarget({
      franchise,
      session,
      teamTableInfo,
      recruitTableInfo,
      recruitRow,
      selectedTeamId
    });

  if (existing) {
    return {
      targetRecord:
        existing,
      addedToBoard:
        false,
      replacedRecruitRow:
        null
    };
  }

  const membership =
    await buildRecruitProspectBoardMembership({
      franchise,
      session,
      recruitTableInfo,
      teamTableInfo
    });

  const teamRecord =
    (teamTableInfo.table.records ?? [])
      .find(
        record =>
          isUsableRecord(record) &&
          hasFields(
            record,
            [
              'TeamIndex',
              'RecruitingBoard'
            ]
          ) &&
          Number.parseInt(
            record.TeamIndex,
            10
          ) === selectedTeamId
      );

  if (!teamRecord) {
    throw new Error(
      `Could not resolve Team ${selectedTeamId} while adding the recruit to its board.`
    );
  }

  const tableIdMap =
    await buildTableIdMap(
      franchise
    );

  const boardReference =
    decodeBinaryReference(
      teamRecord.RecruitingBoard,
      tableIdMap
    );

  const boardRecord =
    boardReference
      ?.table
      ?.records?.[
        boardReference.row
      ];

  const recruitsReference =
    decodeBinaryReference(
      boardRecord?.Recruits,
      tableIdMap
    );

  const recruitsRecord =
    recruitsReference
      ?.table
      ?.records?.[
        recruitsReference.row
      ];

  if (!isUsableRecord(recruitsRecord)) {
    throw new Error(
      'Could not resolve the destination team recruiting-board target list.'
    );
  }

  /*
   * PocketScout recruiting board replace by committed player membership v16
   *
   * The Top Classes total is driven by Team.CommittedPlayers, not by every
   * RecruitStage value currently sitting on the school's 35-slot recruiting
   * board. Protect only recruits whose Player reference is actually present
   * in this team's CommittedPlayers row. Every other board target is safe to
   * recycle for a unsigned player.
   */
  const committedPlayerReferences =
    new Set();

  const committedReference =
    decodeBinaryReference(
      teamRecord.CommittedPlayers,
      tableIdMap
    );

  if (committedReference?.table) {
    try {
      await mutedReadRecords(
        committedReference.table
      );
    } catch {
      await committedReference.table
        .readRecords();
    }

    const committedRecord =
      committedReference.table.records?.[
        committedReference.row
      ] ??
      (
        committedReference.table.records ??
        []
      ).find(
        record =>
          Number(record?._row) ===
          Number(committedReference.row)
      );

    for (
      const fieldName
      of Object.keys(
        committedRecord?.fields ??
        committedRecord ??
        {}
      )
    ) {
      if (
        !/^Player\d+$/.test(fieldName)
      ) {
        continue;
      }

      const playerReference =
        String(
          committedRecord?.[fieldName] ??
          ''
        );

      if (
        /^[01]{32}$/.test(
          playerReference
        ) &&
        playerReference !==
          '00000000000000000000000000000000'
      ) {
        committedPlayerReferences.add(
          playerReference
        );
      }
    }
  }

  const candidates = [];

  const targetFieldNames =
    Object.keys(
      recruitsRecord.fields ?? {}
    )
      .filter(
        fieldName =>
          /^RecruitTarget\d+$/.test(
            fieldName
          )
      )
      .sort(
        (left, right) =>
          Number.parseInt(
            left.replace(
              'RecruitTarget',
              ''
            ),
            10
          ) -
          Number.parseInt(
            right.replace(
              'RecruitTarget',
              ''
            ),
            10
          )
      );

  /*
   * PocketScout use zero recruiting board slots v28
   *
   * A 32-bit zero value in RecruitTarget[] is a genuinely unused board
   * slot. Allocate an unused RecruitTarget row for that slot before
   * considering replacement of an existing board entry.
   */
  const zeroReference =
    '00000000000000000000000000000000';

  const emptyBoardFieldName =
    targetFieldNames.find(
      fieldName =>
        String(
          recruitsRecord[fieldName] ??
          ''
        ) === zeroReference
    );

  if (emptyBoardFieldName) {
    let recruitTargetTable =
      null;

    for (
      const fieldName
      of targetFieldNames
    ) {
      const existingReference =
        String(
          recruitsRecord[fieldName] ??
          ''
        );

      if (
        existingReference ===
          zeroReference
      ) {
        continue;
      }

      const resolvedTarget =
        decodeBinaryReference(
          existingReference,
          tableIdMap
        );

      if (resolvedTarget?.table) {
        recruitTargetTable =
          resolvedTarget.table;
        break;
      }
    }

    if (!recruitTargetTable) {
      const recruitTargetTableInfo =
        await findTableByNameAndStore({
          franchise,
          session,
          tableName:
            'RecruitTarget',
          tableStoreName:
            '',
          requiredFields: [
            'Recruit',
            'ProspectInfluenceTotal',
            'ScholarshipStatus'
          ],
          requireArray:
            false
        });

      recruitTargetTable =
        recruitTargetTableInfo?.table ??
        null;
    }

    if (!recruitTargetTable) {
      throw new Error(
        'Could not resolve the RecruitTarget table for the empty recruiting-board slot.'
      );
    }

    try {
      await mutedReadRecords(
        recruitTargetTable
      );
    } catch {
      await recruitTargetTable
        .readRecords();
    }

    const targetRecords =
      recruitTargetTable.records ??
      [];

    const emptyTargetRecord =
      targetRecords.find(
        record =>
          record &&
          record.isEmpty &&
          record.fields
      );

    if (!emptyTargetRecord) {
      throw new Error(
        'The recruiting board has an empty slot, but no unused RecruitTarget row is available.'
      );
    }

    const targetRow =
      Number.isInteger(
        emptyTargetRecord._row
      )
        ? emptyTargetRecord._row
        : targetRecords.indexOf(
            emptyTargetRecord
          );

    const targetTableId =
      getRuntimeTableId(
        recruitTargetTable
      );

    if (
      !Number.isInteger(targetTableId) ||
      !Number.isInteger(targetRow) ||
      targetRow < 0
    ) {
      throw new Error(
        'Could not build the RecruitTarget reference for the empty recruiting-board slot.'
      );
    }

    emptyTargetRecord.isEmpty =
      false;

    recruitsRecord[
      emptyBoardFieldName
    ] =
      targetTableId
        .toString(2)
        .padStart(15, '0') +
      targetRow
        .toString(2)
        .padStart(17, '0');

    candidates.push({
      fieldName:
        emptyBoardFieldName,
      targetRecord:
        emptyTargetRecord,
      oldRecruitReference:
        null,
      influence:
        -1,
      offered:
        false,
      emptyBoardSlot:
        true
    });
  }

  for (
    const fieldName
    of targetFieldNames
  ) {
    if (
      fieldName ===
        emptyBoardFieldName
    ) {
      continue;
    }
    const targetReference =
      decodeBinaryReference(
        recruitsRecord[fieldName],
        tableIdMap
      );

    const targetRecord =
      targetReference
        ?.table
        ?.records?.[
          targetReference.row
        ];

    if (
      !isUsableRecord(targetRecord) ||
      !hasField(
        targetRecord,
        'Recruit'
      )
    ) {
      continue;
    }

    const oldRecruitReference =
      decodeBinaryReference(
        targetRecord.Recruit,
        tableIdMap
      );

    const oldRecruitRecord =
      oldRecruitReference
        ?.table
        ?.records?.[
          oldRecruitReference.row
        ];

    const oldPlayerReference =
      String(
        oldRecruitRecord
          ?.Player ??
        ''
      );

    if (
      committedPlayerReferences.has(
        oldPlayerReference
      )
    ) {
      continue;
    }

    const influence =
      Number(
        targetRecord
          .ProspectInfluenceTotal
      );

    const offered =
      String(
        targetRecord
          .ScholarshipStatus ??
        ''
      ) === 'Offered';

    candidates.push({
      fieldName,
      targetRecord,
      oldRecruitReference,
      influence:
        Number.isFinite(influence)
          ? influence
          : 0,
      offered
    });
  }

  if (!candidates.length) {
    throw new Error(
      'The school already has 35 committed players and no more can be added.'
    );
  }

  candidates.sort(
    (left, right) =>
      Number(
        !left.emptyBoardSlot
      ) -
        Number(
          !right.emptyBoardSlot
        ) ||
      Number(left.offered) -
        Number(right.offered) ||
      left.influence -
        right.influence ||
      right.fieldName.localeCompare(
        left.fieldName,
        undefined,
        {
          numeric: true
        }
      )
  );

  const selected =
    candidates[0];

  selected.targetRecord.Recruit =
    buildRecruitReference(
      recruitTableInfo,
      recruitRow
    );

  if (
    selected.emptyBoardSlot
  ) {
    const neutralReferenceFields = [
      'ScheduledVisit',
      'ActivePitches'
    ];

    for (
      const fieldName
      of neutralReferenceFields
    ) {
      if (
        hasField(
          selected.targetRecord,
          fieldName
        )
      ) {
        selected.targetRecord[
          fieldName
        ] =
          '00000000000000000000000000000000';
      }
    }

    for (
      const fieldName
      of [
        'UnlockedIntelBitfield',
        'NILExpectation',
        'OriginalNILExpectation',
        'CurrentNILOffer'
      ]
    ) {
      if (
        hasField(
          selected.targetRecord,
          fieldName
        )
      ) {
        selected.targetRecord[
          fieldName
        ] =
          0;
      }
    }
  }

  for (
    const fieldName
    of [
      'ProspectHoursSpentCurrent',
      'ProspectInfluenceDelta',
      'ProspectInfluenceTotal',
      'ProspectInfluenceTotalLastWeek',
      'CurrentScholarshipBonus',
      'CommittedWeekNumber'
    ]
  ) {
    if (
      hasField(
        selected.targetRecord,
        fieldName
      )
    ) {
      selected.targetRecord[fieldName] =
        0;
    }
  }

  for (
    const fieldName
    of [
      'SendTheHouse',
      'VisitRecruitsSchool',
      'ContactFriendsAndFamily',
      'ContactHighSchoolCoaches',
      'SearchSocialMedia',
      'SwayPitch'
    ]
  ) {
    if (
      hasField(
        selected.targetRecord,
        fieldName
      )
    ) {
      selected.targetRecord[fieldName] =
        fieldName === 'SwayPitch'
          ? 'Invalid'
          : false;
    }
  }

  selected.targetRecord
    .ScholarshipStatus =
      'Offered';

  return {
    targetRecord:
      selected.targetRecord,
    addedToBoard:
      true,
    replacedRecruitRow:
      selected
        .oldRecruitReference
        ?.row ??
      null
  };
}


/*
 * PocketScout hard commit committed players synchronization v3
 *
 * Team.CommittedPlayers points to a fixed Player[35] row. Keep the
 * selected player's reference in exactly one team's committed-player
 * list so weekly recruiting processing has one authoritative destination.
 */
async function synchronizeCommittedPlayerDestination({
  franchise,
  teamTableInfo,
  selectedTeamId,
  playerReference,
  tableIdMap: suppliedTableIdMap = null,
  session = null
}) {
  const normalizedPlayerReference =
    String(
      playerReference ??
      ''
    );

  if (
    !/^[01]{32}$/.test(
      normalizedPlayerReference
    ) ||
    normalizedPlayerReference ===
      '00000000000000000000000000000000'
  ) {
    throw new Error(
      'Could not resolve the selected recruit Player reference.'
    );
  }

  /*
   * PocketScout preserve destination committed reference v8
   *
   * Capture the destination Team record and its CommittedPlayers reference
   * before buildTableIdMap() reads other tables. Some franchise reads can
   * replace or truncate the Team records collection, especially the final
   * Team row used by Wyoming.
   */
  const destinationTeamRecordBeforeMap =
    (
      teamTableInfo.table.records ?? []
    ).find(
      record =>
        Number.parseInt(
          record?.TeamIndex,
          10
        ) === selectedTeamId
    );

  const preservedDestinationCommittedReference =
    String(
      destinationTeamRecordBeforeMap
        ?.CommittedPlayers ??
      ''
    );

  if (
    !/^[01]{32}$/.test(
      preservedDestinationCommittedReference
    )
  ) {
    throw new Error(
      `Could not capture Team ${selectedTeamId} CommittedPlayers reference before table-map loading.`
    );
  }

  // Assignment can process hundreds of transfers. Reuse the map built for
  // this run instead of asynchronously reading every dynasty table once per
  // player, which exhausts Turbopack's development tracing map.
  const tableIdMap =
    suppliedTableIdMap ??
    await buildTableIdMap(
      franchise
    );

  // The game update changed the Player[] runtime table ID. Read it from the
  // destination Team.CommittedPlayers reference rather than assuming 6123.
  const committedPlayersTableId =
    Number.parseInt(
      preservedDestinationCommittedReference.slice(0, 15),
      2
    );

  if (!tableIdMap.has(committedPlayersTableId)) {
    const sessionTableIndex = Number(
      session?.tablesById?.[
        String(committedPlayersTableId)
      ]?.index
    );

    if (Number.isInteger(sessionTableIndex)) {
      const table = franchise.getTableByIndex(sessionTableIndex);
      await table.readRecords();
      tableIdMap.set(committedPlayersTableId, {
        table,
        tableIndex: sessionTableIndex,
        tableName: String(table.name ?? 'Player[]')
      });
    } else {
      const committedPlayersTableInfo =
        await loadCommittedPlayersArrayTable({
          franchise,
          tableIdMap,
          teamTableInfo
        });

      tableIdMap.set(
        committedPlayersTableId,
        {
          table:
            committedPlayersTableInfo.table,
          tableIndex:
            committedPlayersTableInfo.tableIndex,
          tableName:
            String(
              committedPlayersTableInfo
                .table
                .name ??
              'Player[]'
            )
        }
      );
    }
  }

  /* PocketScout committed Player[] canonical duplicate guard v64 */

  function canonicalPlayerIdentity(
    value
  ) {
    const decoded =
      decodeBinaryReference(
        value,
        tableIdMap
      );

    if (
      !decoded ||
      !Number.isInteger(
        Number(decoded.tableIndex)
      ) ||
      !Number.isInteger(
        Number(decoded.row)
      )
    ) {
      return null;
    }

    return (
      `${Number(decoded.tableIndex)}:` +
      `${Number(decoded.row)}`
    );
  }

  const selectedPlayerIdentity =
    canonicalPlayerIdentity(
      normalizedPlayerReference
    );

  if (!selectedPlayerIdentity) {
    throw new Error(
      'Could not decode the selected recruit Player reference.'
    );
  }

  const loadedCommittedTables =
    new Set();

  async function ensureCommittedTableLoaded(
    table
  ) {
    if (
      !table ||
      loadedCommittedTables.has(table)
    ) {
      return;
    }

    try {
      await mutedReadRecords(table);
    } catch {
      await table.readRecords();
    }

    loadedCommittedTables.add(table);
  }

  const teams =
    teamTableInfo.table.records ?? [];

  let destinationArrayRecord =
    null;

  let destinationTeamFound =
    false;

  let removedFromOtherTeams =
    0;

  let removedDuplicateDestinationEntries =
    0;

  let alreadyPresent =
    false;

  for (const teamRecord of teams) {
    if (
      !teamRecord ||
      !Object.prototype.hasOwnProperty.call(
        teamRecord,
        'TeamIndex'
      ) ||
      !Object.prototype.hasOwnProperty.call(
        teamRecord,
        'CommittedPlayers'
      )
    ) {
      continue;
    }

    const teamId =
      Number.parseInt(
        teamRecord.TeamIndex,
        10
      );

    const committedReference =
      decodeBinaryReference(
        teamRecord.CommittedPlayers,
        tableIdMap
      );

    if (!committedReference?.table) {
      if (teamId === selectedTeamId) {
        throw new Error(
          `Team ${selectedTeamId} CommittedPlayers reference ${String(teamRecord.CommittedPlayers ?? '')} could not resolve table ID 6123.`
        );
      }

      continue;
    }

    try {
      await ensureCommittedTableLoaded(
        committedReference.table
      );
    } catch (error) {
      if (teamId === selectedTeamId) {
        throw new Error(
          `Could not read Team ${selectedTeamId} CommittedPlayers table: ${error?.message ?? String(error)}`
        );
      }

      continue;
    }

    let arrayRecord =
      committedReference.table.records?.[
        committedReference.row
      ] ??
      (
        committedReference.table.records ?? []
      ).find(
        record =>
          Number(
            record?._row
          ) ===
            Number(
              committedReference.row
            )
      );

    /*
     * PocketScout committed players final row lookup v7
     *
     * Some runtime reads omit the final array record from the indexed
     * records collection even though the table header reports capacity
     * 143. Force a direct reread and then search by both array index and
     * the record's _row value.
     */
    if (!arrayRecord) {
      try {
        await committedReference
          .table
          .readRecords();
      } catch {
        // The detailed destination error below will report the missing row.
      }

      arrayRecord =
        committedReference.table.records?.[
          committedReference.row
        ] ??
        (
          committedReference.table.records ?? []
        ).find(
          record =>
            Number(
              record?._row
            ) ===
              Number(
                committedReference.row
              )
        );
    }

    if (!arrayRecord) {
      if (teamId === selectedTeamId) {
        throw new Error(
          `Team ${selectedTeamId} CommittedPlayers points to Player[] row ${committedReference.row}, but that row was not loaded. Table record count: ${committedReference.table.records?.length ?? 0}.`
        );
      }

      continue;
    }

    const playerFields =
      Object.keys(
        arrayRecord.fields ??
        arrayRecord
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

    if (teamId === selectedTeamId) {
      destinationTeamFound =
        true;

      destinationArrayRecord =
        arrayRecord;

      let destinationMatchKept =
        false;

      for (const fieldName of playerFields) {
        if (
          canonicalPlayerIdentity(
            arrayRecord[fieldName]
          ) !== selectedPlayerIdentity
        ) {
          continue;
        }

        if (!destinationMatchKept) {
          destinationMatchKept =
            true;

          alreadyPresent =
            true;

          continue;
        }

        arrayRecord[fieldName] =
          '00000000000000000000000000000000';

        removedDuplicateDestinationEntries++;
      }

      continue;
    }

    for (const fieldName of playerFields) {
      if (
        canonicalPlayerIdentity(
          arrayRecord[fieldName]
        ) !== selectedPlayerIdentity
      ) {
        continue;
      }

      arrayRecord[fieldName] =
        '00000000000000000000000000000000';

      removedFromOtherTeams++;
    }
  }

  if (
    !destinationTeamFound ||
    !destinationArrayRecord
  ) {
    const preservedReference =
      decodeBinaryReference(
        preservedDestinationCommittedReference,
        tableIdMap
      );

    if (!preservedReference?.table) {
      throw new Error(
        `Team ${selectedTeamId} preserved CommittedPlayers reference ${preservedDestinationCommittedReference} could not resolve.`
      );
    }

    await ensureCommittedTableLoaded(
      preservedReference.table
    );

    destinationArrayRecord =
      preservedReference.table.records?.[
        preservedReference.row
      ] ??
      (
        preservedReference.table.records ?? []
      ).find(
        record =>
          Number(
            record?._row
          ) ===
            Number(
              preservedReference.row
            )
      );

    if (!destinationArrayRecord) {
      throw new Error(
        `Team ${selectedTeamId} preserved CommittedPlayers points to Player[] row ${preservedReference.row}, but the loaded table contains ${preservedReference.table.records?.length ?? 0} records.`
      );
    }

    destinationTeamFound =
      true;
  }

  /*
   * PocketScout committed player duplicate capacity repair v30
   *
   * The game can leave the same Player reference in more than one field of
   * a team's fixed 35-slot CommittedPlayers array. The recruiting UI counts
   * unique committed players, but the old capacity check counted every
   * occupied field. Remove duplicate destination references before looking
   * for an open slot so 31 unique commitments plus four duplicates is
   * correctly treated as 31 committed players.
   */
  const destinationPlayerFields =
    Object.keys(
      destinationArrayRecord.fields ??
      destinationArrayRecord
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

  const destinationReferencesSeen =
    new Set();

  let removedOtherDuplicateDestinationEntries =
    0;

  for (
    const fieldName
    of destinationPlayerFields
  ) {
    const existingReference =
      String(
        destinationArrayRecord[
          fieldName
        ] ??
        ''
      );

    if (
      existingReference ===
        '00000000000000000000000000000000'
    ) {
      continue;
    }

    const existingIdentity =
      canonicalPlayerIdentity(
        existingReference
      );

    /*
     * Preserve an undecodable non-empty value rather than deleting unknown
     * data. It cannot be treated as the selected player or as a duplicate.
     */
    if (!existingIdentity) {
      continue;
    }

    if (
      destinationReferencesSeen.has(
        existingIdentity
      )
    ) {
      destinationArrayRecord[
        fieldName
      ] =
        '00000000000000000000000000000000';

      removedOtherDuplicateDestinationEntries++;

      continue;
    }

    destinationReferencesSeen.add(
      existingIdentity
    );

    if (
      existingIdentity ===
        selectedPlayerIdentity
    ) {
      alreadyPresent = true;
    }
  }

  let addedToDestination =
    false;

  let destinationField =
    null;

  if (!alreadyPresent) {
    const emptyField =
      destinationPlayerFields
        .find(
          fieldName =>
            String(
              destinationArrayRecord[
                fieldName
              ] ??
              ''
            ) ===
              '00000000000000000000000000000000'
        );

    if (!emptyField) {
      throw new Error(
        `Team ${selectedTeamId} already has 35 committed players. The hard commit was not saved.`
      );
    }

    destinationArrayRecord[
      emptyField
    ] =
      normalizedPlayerReference;

    destinationField =
      emptyField;

    addedToDestination =
      true;
  }

  return {
    addedToDestination,
    alreadyPresent,
    destinationField,
    removedFromOtherTeams,
    removedDuplicateDestinationEntries:
      removedDuplicateDestinationEntries +
      removedOtherDuplicateDestinationEntries,
    removedOtherDuplicateDestinationEntries
  };
}

/*
 * PocketScout hard commit scholarship offer synchronization v1
 *
 * A RecruitStage change alone does not create a scholarship offer.
 * The destination school's RecruitTarget must reference the recruit and
 * ScholarshipStatus must be Offered. Recruit.TotalScholarshipOffers is
 * also kept at a minimum of one.
 */
function applyRecruitScholarshipOffer({
  recruitRecord,
  targetRecord,
  recruitLabel,
  teamLabel
}) {
  if (
    !isUsableRecord(
      targetRecord
    ) ||
    !hasFields(
      targetRecord,
      [
        'Recruit',
        'ScholarshipStatus'
      ]
    )
  ) {
    throw new Error(
      `Could not find ${recruitLabel || 'the recruit'} on ${teamLabel || 'the destination school'} recruiting board. The hard commit was not saved.`
    );
  }

  let scholarshipStatusChanged =
    false;

  if (
    String(
      targetRecord
        .ScholarshipStatus ??
      ''
    ) !==
      'Offered'
  ) {
    targetRecord.ScholarshipStatus =
      'Offered';

    scholarshipStatusChanged =
      true;
  }

  let totalScholarshipOffersChanged =
    false;

  if (
    hasField(
      recruitRecord,
      'TotalScholarshipOffers'
    ) &&
    Number(
      recruitRecord
        .TotalScholarshipOffers
    ) < 1
  ) {
    recruitRecord
      .TotalScholarshipOffers =
        1;

    totalScholarshipOffersChanged =
      true;
  }

  return {
    scholarshipStatusChanged,
    totalScholarshipOffersChanged,
    scholarshipOfferChanged:
      scholarshipStatusChanged ||
      totalScholarshipOffersChanged
  };
}

/* PocketScout Recruiting Helper board-wide actions v1 */
async function getRecruitingHelperBoardTargets({
  franchise,
  session,
  teamTableInfo,
  recruitTableInfo,
  selectedTeamId
}) {
  const membership =
    await buildRecruitProspectBoardMembership({
      franchise,
      session,
      recruitTableInfo,
      teamTableInfo
    });

  const recruitKeys = [];

  for (const [recruitKey, teamIds] of membership.teamIdsByRecruitKey) {
    if (teamIds.includes(selectedTeamId)) {
      recruitKeys.push(recruitKey);
    }
  }

  const targets = [];

  for (const recruitKey of recruitKeys) {
    const recruitRow = Number.parseInt(recruitKey.split(':')[1], 10);
    const targetRecord = await findSelectedTeamRecruitTarget({
      franchise,
      session,
      teamTableInfo,
      recruitTableInfo,
      recruitRow,
      selectedTeamId
    });

    if (targetRecord) {
      targets.push({ recruitKey, recruitRow, targetRecord });
    }
  }

  return {
    targets,
    recruitsOnBoard: recruitKeys.length
  };
}

async function validateRecruitingHelperUserTeam({
  franchise,
  session,
  teamTableInfo,
  selectedTeamId
}) {
  const userTeamId =
    await resolveRecruitingHelperUserTeamId({
      franchise,
      session,
      teamTableInfo
    });

  if (!Number.isInteger(userTeamId)) {
    throw new Error('Could not resolve the user-controlled team.');
  }

  if (selectedTeamId !== userTeamId) {
    throw new Error('Board-wide actions are only available for the user-controlled team.');
  }

  const teamOption = (teamTableInfo.table.records ?? []).find(
    record =>
      isUsableRecord(record) &&
      hasField(record, 'TeamIndex') &&
      Number.parseInt(record.TeamIndex, 10) === userTeamId
  );

  return {
    userTeamId,
    teamName: String(teamOption?.DisplayName ?? `Team ${userTeamId}`)
  };
}

async function zeroNilForRecruitingHelperBoard({
  inputPath,
  outputPath,
  selectedTeamId,
  session = null
}) {
  const { franchise, resolvedInput } = await openFranchise(inputPath);
  const resolvedOutput = path.resolve(outputPath || inputPath);
  const { recruitTableInfo } = await buildRecruitingHelperTableContext({ franchise, session });
  const topSchoolsContext = await buildRecruitTopSchoolsContext({ franchise, session });
  const teamId = Number.parseInt(selectedTeamId, 10);

  const { teamName } = await validateRecruitingHelperUserTeam({
    franchise,
    session,
    teamTableInfo: topSchoolsContext.teamTableInfo,
    selectedTeamId: teamId
  });

  const { targets, recruitsOnBoard } = await getRecruitingHelperBoardTargets({
    franchise,
    session,
    teamTableInfo: topSchoolsContext.teamTableInfo,
    recruitTableInfo,
    selectedTeamId: teamId
  });

  let recruitsChanged = 0;

  for (const { targetRecord } of targets) {
    if (!hasField(targetRecord, 'NILExpectation')) continue;
    if (Number(targetRecord.NILExpectation) !== 0) {
      targetRecord.NILExpectation = 0;
      recruitsChanged++;
    }
  }

  if (recruitsChanged > 0) await franchise.save(resolvedOutput);

  return {
    moduleId: recruitingHelperModule.id,
    moduleName: recruitingHelperModule.name,
    inputPath: resolvedInput,
    outputPath: resolvedOutput,
    overwrittenOriginal: true,
    teamName,
    recruitsOnBoard,
    recruitsChanged
  };
}

function applyRecruitingHelperTopSchoolTakeover({
  recruitRecord,
  targetRecord,
  topSchoolsContext,
  selectedTeamId
}) {
  const topSchools = resolveRecruitTopSchools({
    recruitRecord,
    context: topSchoolsContext
  });

  const slot0 = topSchools.find(school => Number(school.slot) === 0);
  if (!slot0) return { changed: false, alreadyTop: false, skippedNoList: true };

  const existingSlot = topSchools.find(school => Number(school.teamId) === selectedTeamId);
  if (existingSlot && Number(existingSlot.slot) === 0) {
    return { changed: false, alreadyTop: true, skippedNoList: false };
  }

  const otherSchools = topSchools.filter(school => Number(school.teamId) !== selectedTeamId);
  const secondPlaceInfluence = otherSchools.length
    ? Math.max(...otherSchools.map(school => Number(school.teamInfluence) || 0))
    : 0;
  const newTopInfluence = Math.min(100, secondPlaceInfluence + 30);
  const displacementCandidates = otherSchools.filter(school => Number(school.slot) !== 0);
  const displacementSlot = existingSlot ?? (displacementCandidates.length
    ? displacementCandidates.reduce((lowest, school) =>
        Number(school.teamInfluence) < Number(lowest.teamInfluence) ? school : lowest,
        displacementCandidates[0])
    : null);

  if (!displacementSlot) return { changed: false, alreadyTop: false, skippedNoList: false };

  /*
   * PocketScout hard commit actual Top School target table v2
   * Resolve each Top 10 slot through the actual target table referenced by
   * that slot instead of assuming every recruit uses the default table.
   */
  const slot0TableInfo =
    topSchoolsContext
      .targetTablesByIndex
      .get(
        Number(
          slot0.targetTableIndex
        )
      );

  const displacementTableInfo =
    topSchoolsContext
      .targetTablesByIndex
      .get(
        Number(
          displacementSlot
            .targetTableIndex
        )
      );

  const slot0Record =
    slot0TableInfo
      ?.table
      ?.records?.[
        slot0.targetRow
      ];

  const displacementRecord =
    displacementTableInfo
      ?.table
      ?.records?.[
        displacementSlot.targetRow
      ];

  if (!isUsableRecord(slot0Record) || !hasFields(slot0Record, ['TeamId', 'TeamInfluence']) ||
      !isUsableRecord(displacementRecord) || !hasFields(displacementRecord, ['TeamId', 'TeamInfluence'])) {
    return { changed: false, alreadyTop: false, skippedNoList: false };
  }

  const previousSlot0TeamId = Number.parseInt(slot0Record.TeamId, 10);
  const previousSlot0Influence = Number(slot0Record.TeamInfluence);

  slot0Record.TeamId = selectedTeamId;
  slot0Record.TeamInfluence = Number.isInteger(Number(slot0Record.TeamInfluence))
    ? Math.trunc(newTopInfluence)
    : newTopInfluence;

  if (existingSlot) {
    displacementRecord.TeamId = previousSlot0TeamId;
    displacementRecord.TeamInfluence = previousSlot0Influence;
  } else {
    const wouldDuplicate = topSchools.some(school =>
      Number(school.slot) !== 0 &&
      Number(school.slot) !== Number(displacementSlot.slot) &&
      Number(school.teamId) === previousSlot0TeamId
    );

    if (!wouldDuplicate) {
      displacementRecord.TeamId = previousSlot0TeamId;
      displacementRecord.TeamInfluence = previousSlot0Influence;
    }
  }

  if (hasField(targetRecord, 'ProspectInfluenceTotal')) {
    const currentInfluence = Number.parseInt(targetRecord.ProspectInfluenceTotal, 10);
    if (!Number.isInteger(currentInfluence) || currentInfluence < newTopInfluence) {
      targetRecord.ProspectInfluenceTotal = newTopInfluence;
    }
  }

  return { changed: true, alreadyTop: false, skippedNoList: false };
}

/* PocketScout hard commit selected prospect board v1 */
async function hardCommitSelectedRecruitingHelperBoard({
  inputPath,
  outputPath,
  selectedTeamId,
  session = null
}) {
  const {
    franchise,
    resolvedInput
  } = await openFranchise(inputPath);

  const resolvedOutput =
    path.resolve(outputPath || inputPath);

  const {
    tableIdMap,
    recruitTableInfo
  } =
    await buildRecruitingHelperTableContext({
      franchise,
      session
    });

  const topSchoolsContext =
    await buildRecruitTopSchoolsContext({
      franchise,
      session
    });

  const teamId =
    Number.parseInt(
      selectedTeamId,
      10
    );

  if (
    !Number.isInteger(teamId) ||
    !topSchoolsContext.teamIds.has(teamId)
  ) {
    throw new Error(
      'Choose a valid school in the Prospect Board team dropdown.'
    );
  }

  const selectedTeam =
    topSchoolsContext.teamOptions.find(
      option =>
        Number(option.value) === teamId
    );

  const teamName =
    String(
      selectedTeam?.label ??
      `Team ${teamId}`
    );

  const {
    targets,
    recruitsOnBoard
  } =
    await getRecruitingHelperBoardTargets({
      franchise,
      session,
      teamTableInfo:
        topSchoolsContext.teamTableInfo,
      recruitTableInfo,
      selectedTeamId:
        teamId
    });

  /*
   * PocketScout board hard commit reserve committed slots v24
   *
   * Team.CommittedPlayers has only 35 slots. A full recruiting board can
   * still contain players who are not yet committed, while the committed
   * array may contain stale/non-board references. Before committing the
   * entire selected board, reserve the 35 committed slots for the players
   * currently on that board.
   */
  const boardPlayerReferences =
    new Set();

  for (
    const {
      recruitRow
    }
    of targets
  ) {
    const boardRecruitRecord =
      recruitTableInfo.table.records?.[
        recruitRow
      ];

    const boardPlayerReference =
      String(
        boardRecruitRecord?.Player ??
        ''
      );

    if (
      /^[01]{32}$/.test(
        boardPlayerReference
      ) &&
      boardPlayerReference !==
        '00000000000000000000000000000000'
    ) {
      boardPlayerReferences.add(
        boardPlayerReference
      );
    }
  }

  const selectedTeamRecord =
    (
      topSchoolsContext
        .teamTableInfo
        .table
        .records ??
      []
    ).find(
      record =>
        Number.parseInt(
          record?.TeamIndex,
          10
        ) === teamId
    );

  /*
   * PocketScout board hard commit structural table ID resolution v54
   *
   * Decode the selected Team.CommittedPlayers reference, then resolve the
   * destination table dynamically through Team.CommittedPlayers references.
   * The resolver verifies the exact Player0 through Player34 structure and
   * validates the referenced rows instead of assuming a fixed runtime table
   * ID or table index.
   */
  const committedBinaryReference =
    String(
      selectedTeamRecord
        ?.CommittedPlayers ??
      ''
    );

  if (
    !/^[01]{32}$/.test(
      committedBinaryReference
    )
  ) {
    throw new Error(
      `Team ${teamId} has an invalid CommittedPlayers reference.`
    );
  }

  const committedTableId =
    Number.parseInt(
      committedBinaryReference.slice(0, 15),
      2
    );

  const committedRow =
    Number.parseInt(
      committedBinaryReference.slice(15),
      2
    );

  const committedPlayersTableInfo =
    await loadCommittedPlayersArrayTable({
      franchise,
      session,
      tableIdMap,
      teamTableInfo:
        topSchoolsContext
          .teamTableInfo
    });

  /*
   * The selected team's binary reference is authoritative. The structurally
   * validated table returned by loadCommittedPlayersArrayTable() must have
   * the same runtime table ID as that reference.
   */
  if (
    Number(
      committedPlayersTableInfo
        .runtimeTableId
    ) !== committedTableId
  ) {
    throw new Error(
      `Team ${teamId} CommittedPlayers references table ID ${committedTableId}, but structural resolution returned table ID ${committedPlayersTableInfo.runtimeTableId} at table index ${committedPlayersTableInfo.tableIndex}.`
    );
  }

  const committedPlayersTable =
    committedPlayersTableInfo.table;

  const destinationCommittedRecord =
    committedPlayersTable.records?.[
      committedRow
    ] ??
    (
      committedPlayersTable.records ??
      []
    ).find(
      record =>
        Number(record?._row) ===
        committedRow
    );

  if (!destinationCommittedRecord) {
    throw new Error(
      `Team ${teamId} CommittedPlayers points to Player[] row ${committedRow}, but only ${committedPlayersTable.records?.length ?? 0} records were loaded.`
    );
  }

  /*
   * PocketScout board hard commit authoritative committed array v26
   *
   * Build Team.CommittedPlayers once from the current board instead of
   * clearing slots and then calling synchronizeCommittedPlayerDestination()
   * 35 times. That helper rereads Player[] and can discard unsaved slot
   * cleanup, causing the array to look full again.
   */
  const destinationPlayerFields =
    Object.keys(
      destinationCommittedRecord.fields ??
      destinationCommittedRecord
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
            left.replace('Player', ''),
            10
          ) -
          Number.parseInt(
            right.replace('Player', ''),
            10
          )
      );

  if (
    boardPlayerReferences.size >
    destinationPlayerFields.length
  ) {
    throw new Error(
      `The selected board contains ${boardPlayerReferences.size} valid players but Team.CommittedPlayers has only ${destinationPlayerFields.length} slots.`
    );
  }

  const previousDestinationPlayerReferences =
    new Set(
      destinationPlayerFields
        .map(
          fieldName =>
            String(
              destinationCommittedRecord[
                fieldName
              ] ??
              ''
            )
        )
        .filter(
          value =>
            value !==
              '00000000000000000000000000000000'
        )
    );

  let removedNonBoardCommittedPlayers =
    0;

  for (
    const previousReference
    of previousDestinationPlayerReferences
  ) {
    if (
      !boardPlayerReferences.has(
        previousReference
      )
    ) {
      removedNonBoardCommittedPlayers++;
    }
  }

  let removedBoardPlayersFromOtherTeams =
    0;

  for (
    const committedRecord
    of (
      committedPlayersTable.records ??
      []
    )
  ) {
    if (
      !committedRecord ||
      committedRecord ===
        destinationCommittedRecord
    ) {
      continue;
    }

    for (
      const fieldName
      of Object.keys(
        committedRecord.fields ??
        committedRecord
      )
    ) {
      if (
        !/^Player\d+$/.test(
          fieldName
        )
      ) {
        continue;
      }

      const existingReference =
        String(
          committedRecord[fieldName] ??
          ''
        );

      if (
        boardPlayerReferences.has(
          existingReference
        )
      ) {
        committedRecord[fieldName] =
          '00000000000000000000000000000000';

        removedBoardPlayersFromOtherTeams++;
      }
    }
  }

  const orderedBoardPlayerReferences =
    [...boardPlayerReferences];

  for (
    let slotIndex = 0;
    slotIndex <
      destinationPlayerFields.length;
    slotIndex++
  ) {
    destinationCommittedRecord[
      destinationPlayerFields[
        slotIndex
      ]
    ] =
      orderedBoardPlayerReferences[
        slotIndex
      ] ??
      '00000000000000000000000000000000';
  }

  let recruitsChanged = 0;
  let recruitingDealbreakersCleared = 0;
  let recruitsCommitted = 0;
  let recruitsAlreadyCommitted = 0;
  let recruitsAlreadyTop = 0;
  let recruitsSkippedNoList = 0;
  let recruitsSkippedInvalid = 0;

  for (
    const {
      recruitKey,
      recruitRow,
      targetRecord
    }
    of targets
  ) {
    const recruitRecord =
      recruitTableInfo.table.records?.[
        recruitRow
      ];

    if (!isUsableRecord(recruitRecord)) {
      recruitsSkippedInvalid++;
      continue;
    }

    const takeover =
      applyRecruitingHelperTopSchoolTakeover({
        recruitRecord,
        targetRecord,
        topSchoolsContext,
        selectedTeamId:
          teamId
      });

    if (takeover.skippedNoList) {
      recruitsSkippedNoList++;
      continue;
    }

    if (takeover.alreadyTop) {
      recruitsAlreadyTop++;
    }

    const scholarshipOffer =
      applyRecruitScholarshipOffer({
        recruitRecord,
        targetRecord,
        recruitLabel:
          recruitKey,
        teamLabel:
          teamName
      });

    const normalizedBoardPlayerReference =
      String(
        recruitRecord.Player ??
        ''
      );

    const boardPlayerReference =
      decodeBinaryReference(
        recruitRecord.Player,
        tableIdMap
      );

    const boardPlayerRecord =
      boardPlayerReference
        ?.table
        ?.records?.[
          boardPlayerReference.row
        ];

    const recruitingDealbreakerChanged =
      setAssignedRecruitDealbreakerInvalid(
        boardPlayerRecord
      );

    if (
      recruitingDealbreakerChanged
    ) {
      recruitingDealbreakersCleared++;
    }

    const committedPlayerSync = {
      addedToDestination:
        !previousDestinationPlayerReferences.has(
          normalizedBoardPlayerReference
        ),
      alreadyPresent:
        previousDestinationPlayerReferences.has(
          normalizedBoardPlayerReference
        ),
      destinationField:
        destinationPlayerFields[
          orderedBoardPlayerReferences.indexOf(
            normalizedBoardPlayerReference
          )
        ] ?? null,
      removedFromOtherTeams:
        0,
      removedDuplicateDestinationEntries:
        0
    };

    let stageChanged = false;

    if (
      hasField(
        recruitRecord,
        'RecruitStage'
      )
    ) {
      if (
        String(
          recruitRecord.RecruitStage ??
          ''
        ) !==
          RECRUITING_HELPER_COMMITTED_STAGE
      ) {
        recruitRecord.RecruitStage =
          RECRUITING_HELPER_COMMITTED_STAGE;

        stageChanged = true;
        recruitsCommitted++;
      } else {
        recruitsAlreadyCommitted++;
      }
    }

    if (
      takeover.changed ||
      stageChanged ||
      scholarshipOffer
        .scholarshipOfferChanged ||
      committedPlayerSync
        .addedToDestination ||
      committedPlayerSync
        .removedFromOtherTeams > 0 ||
      recruitingDealbreakerChanged
    ) {
      recruitsChanged++;

      refreshRecruitingHelperCachedRecruit({
        session,
        recruitKey,
        recruitRecord,
        tableIdMap,
        topSchoolsContext
      });
    }
  }

  if (recruitsChanged > 0) {
    await franchise.save(
      resolvedOutput
    );

    /*
     * PocketScout hard commit invalidate stale Recruiting Helper details v1
     * Force the next Recruiting Helper load to reread RecruitStage and
     * Top 10 school records from the saved dynasty.
     */
    if (session) {
      session.recruitingHelperCache =
        null;
    }
  }

  return {
    moduleId:
      recruitingHelperModule.id,

    moduleName:
      recruitingHelperModule.name,

    inputPath:
      resolvedInput,

    outputPath:
      resolvedOutput,

    overwrittenOriginal:
      true,

    teamId,
    teamName,
    recruitsOnBoard,
    recruitsChanged,
    recruitsCommitted,
    recruitsAlreadyCommitted,
    recruitsAlreadyTop,
    recruitsSkippedNoList,
    recruitsSkippedInvalid,
    recruitingDealbreakersCleared,
    removedNonBoardCommittedPlayers,
    removedBoardPlayersFromOtherTeams
  };
}

/* PocketScout return unsigned players to previous school v1 */
const RECRUITING_HELPER_TRANSFER_CLASSES =
  new Set([
    'HighSchool',
    'JuniorCollege_Sophomore',
    'JuniorCollege_Junior',
    'JuniorCollege_Senior',
    'Transfer_Freshman',
    'Transfer_Sophomore',
    'Transfer_Junior'
  ]);

const RECRUITING_HELPER_RETURN_TRANSFER_OFFSEASON_STAGE =
  6;

const RECRUITING_HELPER_RETURN_TRANSFER_WEEK =
  5;

/* PocketScout transfer return All filter popup and Signed green v1 */
async function validateReturnZeroOfferTransfersWeek({
  inputPath,
  bypassWeekRequirement = false,
  session = null
}) {
  const {
    franchise
  } = await openFranchise(
    inputPath
  );

  const seasonInfoTable =
    await findTableByNameAndStore({
      franchise,
      session,
      tableName:
        'SeasonInfo',
      tableStoreName:
        '',
      requiredFields: [
        'CurrentWeekType',
        'CurrentWeek'
      ],
      requireArray:
        false
    });

  const seasonInfoRecord =
    (
      seasonInfoTable.table.records ??
      []
    ).find(
      record =>
        isUsableRecord(record) &&
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
    String(
      seasonInfoRecord
        .CurrentWeekType ??
      ''
    )
      .trim()
      .toLowerCase();

  const currentOffseasonStage =
    Number.parseInt(
      seasonInfoRecord
        .CurrentOffseasonStage,
      10
    );

  const currentWeek =
    Number.parseInt(
      seasonInfoRecord
        .CurrentWeek,
      10
    );

  const weekIsValid =
    currentWeekType ===
      'offseason' &&
    currentWeek ===
      6;

  return {
    valid:
      weekIsValid ||
      bypassWeekRequirement === true,

    bypassed:
      bypassWeekRequirement === true &&
      !weekIsValid,

    seasonInfoTableIndex:
      seasonInfoTable.tableIndex,

    currentOffseasonStage,
    currentWeekType,
    currentWeek
  };
}
/* END PocketScout transfer return All filter popup and Signed green v1 */

/* PocketScout transfer walk-on favorite team and previous school direct fix v1 */
async function sendZeroOfferTransfersToRandomSchool({
  inputPath,
  outputPath,
  session = null
}) {
  const {
    franchise,
    resolvedInput
  } = await openFranchise(
    inputPath
  );

  const resolvedOutput =
    path.resolve(
      outputPath || inputPath
    );

  const weekCheck =
    await validateReturnZeroOfferTransfersWeek({
      inputPath,
      session
    });

  if (!weekCheck.valid) {
    throw new Error(
      'This can only be run when CurrentWeekType is OffSeason and CurrentWeek is 6.'
    );
  }

  const {
    tableIdMap,
    recruitTableInfo
  } =
    await buildRecruitingHelperTableContext({
      franchise,
      session
    });

  const topSchoolsContext =
    await buildRecruitTopSchoolsContext({
      franchise,
      session
    });

  let transferCandidates = 0;
  let zeroOfferTransfers = 0;
  let transfersAssigned = 0;
  let transfersChanged = 0;
  let alreadyHardCommitted = 0;
  let skippedInvalidPlayer = 0;
  let skippedNoTopSchoolsList = 0;

  for (
    let recruitRow = 0;
    recruitRow <
      (
        recruitTableInfo.table.records ??
        []
      ).length;
    recruitRow++
  ) {
    const recruitRecord =
      recruitTableInfo.table.records?.[
        recruitRow
      ];

    if (
      !isUsableRecord(recruitRecord) ||
      !hasFields(
        recruitRecord,
        [
          'Class',
          'TotalScholarshipOffers',
          'Player',
          'RecruitStage'
        ]
      )
    ) {
      continue;
    }

    if (
      !RECRUITING_HELPER_TRANSFER_CLASSES.has(
        String(
          recruitRecord.Class ??
          ''
        )
      )
    ) {
      continue;
    }

    transferCandidates++;

    if (
      Number(
        recruitRecord.TotalScholarshipOffers
      ) !== 0
    ) {
      continue;
    }

    zeroOfferTransfers++;

    const playerReference =
      decodeBinaryReference(
        recruitRecord.Player,
        tableIdMap
      );

    const playerRecord =
      playerReference?.table?.records?.[
        playerReference.row
      ];

    if (
      !playerReference ||
      !isUsableRecord(playerRecord)
    ) {
      skippedInvalidPlayer++;
      continue;
    }

    let topSchools = [];

    try {
      topSchools =
        resolveRecruitTopSchools({
          recruitRecord,
          context:
            topSchoolsContext
        });
    } catch {
      skippedNoTopSchoolsList++;
      continue;
    }

    const favoriteSchool =
      topSchools.find(
        school =>
          Number(school.slot) === 0
      );

    if (!favoriteSchool) {
      skippedNoTopSchoolsList++;
      continue;
    }

    const recruitKey =
      `${recruitTableInfo.tableIndex}:${recruitRow}`;

    if (
      String(
        recruitRecord.RecruitStage ??
        ''
      ) ===
        RECRUITING_HELPER_COMMITTED_STAGE
    ) {
      alreadyHardCommitted++;
      continue;
    }

    recruitRecord.RecruitStage =
      RECRUITING_HELPER_COMMITTED_STAGE;

    transfersChanged++;
    transfersAssigned++;

    refreshRecruitingHelperCachedRecruit({
      session,
      recruitKey,
      recruitRecord,
      tableIdMap,
      topSchoolsContext
    });
  }

  if (transfersChanged > 0) {
    await franchise.save(
      resolvedOutput
    );

    /*
     * Bulk transfer actions mutate Recruit and Top Schools records.
     * Discard the lightweight/prefetched cache so the next page load
     * rereads the saved dynasty instead of mixing updated list labels
     * with stale RecruitStage and Top 10 detail data.
     */
    if (session) {
      session.recruitingHelperCache =
        null;
    }
  }

  return {
    moduleId:
      recruitingHelperModule.id,

    moduleName:
      recruitingHelperModule.name,

    inputPath:
      resolvedInput,

    outputPath:
      resolvedOutput,

    overwrittenOriginal:
      true,

    seasonInfoTableIndex:
      weekCheck.seasonInfoTableIndex,

    currentOffseasonStage:
      weekCheck.currentOffseasonStage,

    currentWeek:
      weekCheck.currentWeek,

    transferCandidates,
    zeroOfferTransfers,

    weekRequirementBypassed:
      weekCheck.bypassed === true,

    transfersAssigned,
    transfersChanged,
    alreadyHardCommitted,
    skippedInvalidPlayer,
    skippedNoTopSchoolsList,
    skippedNoRandomSchool:
      0
  };
}
/* END PocketScout transfer walk-on favorite team and previous school direct fix v1 */

/* PocketScout unified transfer assignment chooser v1 */
/* PocketScout smart unsigned player placement and report v2 */

function psTransferPositionGroup(position) {
  const value = String(position ?? '').trim().toUpperCase();

  if (['FS', 'SS'].includes(value)) return 'S';
  if (['LE', 'RE'].includes(value)) return 'EDGE';
  if (['LOLB', 'MLB', 'ROLB'].includes(value)) return 'LB';

  return value;
}

/* PocketScout NSD exact zero-position emergency priority v4 */
function psTransferExactPosition(position) {
  return String(position ?? '')
    .trim()
    .toUpperCase();
}

/*
 * PocketScout zero offer transfer positional limits with specialist starters v18
 *
 * Practical roster maximums used only by automatic unsigned player
 * placement. Kickers and punters remain eligible, but only when they project
 * as the starter.
 */
function psTransferPositionRosterLimit(positionGroup) {
  const limits = {
    QB: 4,
    HB: 6,
    FB: 2,
    WR: 10,
    TE: 5,
    LT: 4,
    LG: 4,
    C: 4,
    RG: 4,
    RT: 4,
    EDGE: 6,
    DT: 6,
    LB: 8,
    CB: 10,
    S: 8,
    K: 2,
    P: 2
  };

  return limits[positionGroup] ?? 6;
}

function psTransferClassLevel(recruitClass) {
  const value = String(recruitClass ?? '');

  if (value === 'Transfer_Junior') return 'junior';
  if (value === 'Transfer_Sophomore') return 'sophomore';
  return 'freshman';
}

function psTransferMinimumOverall() {
  /*
   * PocketScout all-smart transfer placement minimum 55 v3
   * Players below 55 are left unassigned. Players from 55 through 66 are
   * only eligible when they project as the starter at the destination.
   */
  return 55;
}

function psTransferMaximumDepth({
  classLevel,
  positionGroup
}) {
  if (classLevel === 'junior') {
    if (positionGroup === 'QB') return 2;
    if (['WR', 'CB'].includes(positionGroup)) return 4;
    if (['S', 'EDGE', 'DT', 'LB'].includes(positionGroup)) return 3;
    return 2;
  }

  if (classLevel === 'sophomore') {
    if (positionGroup === 'QB') return 2;
    if (['WR', 'CB'].includes(positionGroup)) return 5;
    if (['S', 'EDGE', 'DT', 'LB'].includes(positionGroup)) return 4;
    return 3;
  }

  if (positionGroup === 'QB') return 3;
  if (['WR', 'CB'].includes(positionGroup)) return 6;
  if (['S', 'EDGE', 'DT', 'LB'].includes(positionGroup)) return 5;
  return 4;
}

function psCsvCell(value) {
  const text = String(value ?? '');

  return /[",\r\n]/.test(text)
    ? '"' + text.replace(/"/g, '""') + '"'
    : text;
}

function psSafeReportName(value) {
  return String(value ?? 'Dynasty')
    .replace(/[^a-z0-9._-]+/gi, '_')
    .replace(/^_+|_+$/g, '') ||
    'Dynasty';
}

function psBuildTeamRosterContext({
  playerTable,
  transferPlayerKeys,
  teamIds
}) {
  const rosterByTeam = new Map();

  for (const teamId of teamIds) {
    rosterByTeam.set(teamId, []);
  }

  for (
    let row = 0;
    row < (playerTable.records ?? []).length;
    row++
  ) {
    const playerRecord = playerTable.records?.[row];

    if (
      !isUsableRecord(playerRecord) ||
      !hasField(playerRecord, 'TeamIndex') ||
      !hasField(playerRecord, 'Position')
    ) {
      continue;
    }

    if (transferPlayerKeys.has(row)) {
      continue;
    }

    const teamId = Number.parseInt(
      playerRecord.TeamIndex,
      10
    );

    if (!rosterByTeam.has(teamId)) {
      continue;
    }

    const overall = findOverallRating(
      playerRecord
    );

    if (!Number.isFinite(overall) || overall <= 0) {
      continue;
    }

    rosterByTeam.get(teamId).push({
      overall,

      exactPosition:
        psTransferExactPosition(
          playerRecord.Position
        ),

      positionGroup:
        psTransferPositionGroup(
          playerRecord.Position
        )
    });
  }

  const teamStrengthById = new Map();

  for (const [teamId, roster] of rosterByTeam) {
    const topPlayers = roster
      .map(player => player.overall)
      .sort((left, right) => right - left)
      .slice(0, 44);

    const strength = topPlayers.length
      ? topPlayers.reduce(
          (total, value) => total + value,
          0
        ) / topPlayers.length
      : 0;

    teamStrengthById.set(teamId, strength);
  }

  return {
    rosterByTeam,
    teamStrengthById
  };
}

function psIsSignedRecruitStage(
  recruitStage
) {
  const normalized =
    String(recruitStage ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');

  return (
    normalized === 'signed' ||
    normalized === 'hardcommitted'
  );
}

function psAddSignedRecruitingClassToRoster({
  recruitTableInfo,
  tableIdMap,
  topSchoolsContext,
  rosterByTeam,
  excludedRecruitRows
}) {
  let signedClassPlayersIncluded = 0;
  let signedClassAlreadyOnRoster = 0;
  let signedClassSkippedInvalid = 0;

  for (
    let recruitRow = 0;
    recruitRow <
      (
        recruitTableInfo.table.records ??
        []
      ).length;
    recruitRow++
  ) {
    if (
      excludedRecruitRows.has(
        recruitRow
      )
    ) {
      continue;
    }

    const recruitRecord =
      recruitTableInfo.table.records?.[
        recruitRow
      ];

    if (
      !isUsableRecord(recruitRecord) ||
      !hasFields(
        recruitRecord,
        [
          'Player',
          'RecruitStage',
          'TopSchoolsList'
        ]
      ) ||
      !psIsSignedRecruitStage(
        recruitRecord.RecruitStage
      )
    ) {
      continue;
    }

    const playerReference =
      decodeBinaryReference(
        recruitRecord.Player,
        tableIdMap
      );

    const playerRecord =
      playerReference
        ?.table
        ?.records?.[
          playerReference.row
        ];

    if (
      !playerReference ||
      !isUsableRecord(playerRecord)
    ) {
      signedClassSkippedInvalid++;
      continue;
    }

    let topSchools = [];

    try {
      topSchools =
        resolveRecruitTopSchools({
          recruitRecord,
          context:
            topSchoolsContext
        });
    } catch {
      signedClassSkippedInvalid++;
      continue;
    }

    const destination =
      topSchools.find(
        school =>
          Number(school.slot) === 0
      );

    const destinationTeamId =
      Number.parseInt(
        destination?.teamId,
        10
      );

    if (
      !Number.isInteger(
        destinationTeamId
      ) ||
      !rosterByTeam.has(
        destinationTeamId
      )
    ) {
      signedClassSkippedInvalid++;
      continue;
    }

    const currentTeamId =
      Number.parseInt(
        playerRecord.TeamIndex,
        10
      );

    if (
      Number.isInteger(
        currentTeamId
      ) &&
      currentTeamId ===
        destinationTeamId
    ) {
      signedClassAlreadyOnRoster++;
      continue;
    }

    const overall =
      findOverallRating(
        playerRecord
      );

    const positionGroup =
      psTransferPositionGroup(
        playerRecord.Position
      );

    if (
      !Number.isFinite(overall) ||
      overall <= 0 ||
      !positionGroup
    ) {
      signedClassSkippedInvalid++;
      continue;
    }

    rosterByTeam
      .get(destinationTeamId)
      .push({
        overall,

        exactPosition:
          psTransferExactPosition(
            playerRecord.Position
          ),

        positionGroup,
        isSignedRecruit:
          true
      });

    signedClassPlayersIncluded++;
  }

  return {
    signedClassPlayersIncluded,
    signedClassAlreadyOnRoster,
    signedClassSkippedInvalid
  };
}

function psProjectedDepth({
  roster,
  positionGroup,
  overall
}) {
  const samePosition = (roster ?? [])
    .filter(
      player =>
        player.positionGroup ===
        positionGroup
    )
    .sort(
      (left, right) =>
        right.overall -
        left.overall
    );

  /*
   * PocketScout smart transfer destination concentration fix v4
   * Equal-rated players already on the roster count as competition so
   * multiple same-OVR transfers cannot all be projected as starters.
   */
  const playersAhead = samePosition.filter(
    player =>
      player.overall >=
      overall
  ).length;

  return {
    depthRank:
      playersAhead + 1,
    playersAhead,
    samePositionCount:
      samePosition.length
  };
}

function psProgramQualityFitScore({
  playerOverall,
  teamStrength
}) {
  /*
   * PocketScout smart transfer program-quality need matching v7
   *
   * Better players are matched toward stronger programs, while lower-rated
   * players are not over-rewarded for landing at a program far above their
   * competitive level.
   */
  const targetProgramStrength =
    Math.max(
      55,
      Math.min(
        95,
        Number(playerOverall) + 4
      )
    );

  const difference =
    Math.abs(
      Number(teamStrength) -
      targetProgramStrength
    );

  return Math.max(
    0,
    100 - difference * 7
  );
}

function psPositionalQualityNeedScore({
  roster,
  positionGroup,
  playerOverall
}) {
  const positionPlayers =
    (roster ?? [])
      .filter(
        player =>
          player.positionGroup ===
            positionGroup
      )
      .sort(
        (left, right) =>
          right.overall -
          left.overall
      );

  if (!positionPlayers.length) {
    return 100;
  }

  const bestExisting =
    Number(
      positionPlayers[0].overall
    );

  const gap =
    Number(playerOverall) -
    bestExisting;

  if (gap >= 5) return 100;
  if (gap >= 2) return 90;
  if (gap >= 0) return 80;
  if (gap >= -2) return 65;
  if (gap >= -5) return 45;
  if (gap >= -8) return 25;
  return 5;
}

function psPreferenceScore({
  teamId,
  topSchools,
  previousTeamId
}) {
  const topIndex = topSchools.findIndex(
    school =>
      Number(school.teamId) ===
      teamId
  );

  if (topIndex >= 0) {
    return Math.max(
      20,
      100 - topIndex * 10
    );
  }

  if (teamId === previousTeamId) {
    return 50;
  }

  return 0;
}

function psOpportunityScore({
  depthRank,
  maximumDepth
}) {
  if (depthRank <= 1) return 100;
  if (depthRank === 2) return 82;
  if (depthRank === 3) return 64;
  if (depthRank === 4) return 46;
  if (depthRank === 5) return 28;

  return Math.max(
    0,
    20 -
      (depthRank - maximumDepth) * 10
  );
}

function psMaximumIncomingTransfersForPosition(
  positionGroup
) {
  if (['QB', 'K', 'P', 'FB'].includes(positionGroup)) return 1;
  if (['WR', 'CB'].includes(positionGroup)) return 3;
  if (['S', 'EDGE', 'DT', 'LB'].includes(positionGroup)) return 2;
  return 2;
}

function psTeamNeedScore({
  samePositionCount,
  positionGroup
}) {
  const desired = {
    QB: 4,
    HB: 5,
    FB: 2,
    WR: 9,
    TE: 4,
    LT: 4,
    LG: 4,
    C: 4,
    RG: 4,
    RT: 4,
    EDGE: 6,
    DT: 6,
    LB: 8,
    CB: 8,
    S: 6,
    K: 2,
    P: 2
  }[positionGroup] ?? 4;

  const shortage =
    desired -
    samePositionCount;

  if (shortage >= 2) return 100;
  if (shortage === 1) return 80;
  if (shortage === 0) return 50;
  if (shortage === -1) return 25;
  return 0;
}

/* PocketScout NSD dynamic placement limit messages and 99 roster UI caps v1 */
/* PocketScout four-pass unsigned player placement v49 */
/* PocketScout blue grouped sidebar and Pass 4 position maximum v61 */
/* PocketScout NSD Pass 4 depth and compact UI v59 */
/* PocketScout aggressive 70 OVR Pass 4 distribution v52 */
/* PocketScout 95-player Smart Placement roster limit v53 */
/* PocketScout Pass 4 unrestricted position placement v51 */
function psChooseSmartTransferDestination({
  playerRecord,
  rosterByTeam,
  committedCountByTeam,
  excludedTeamIds,
  boardTeamIdsByRecruitRow,
  recruitRow,
  rankedTeamsByPreviousFinish,
  assignedPositionCountByTeam,
  placementSettings = {}
}) {

  const psPositionGroups = [
    'QB', 'HB', 'FB', 'WR', 'TE',
    'LT', 'LG', 'C', 'RG', 'RT',
    'EDGE', 'DT', 'LB', 'CB', 'S',
    'K', 'P'
  ];

  function psUnsignedInteger(
    value,
    fallback,
    minimum,
    maximum
  ) {
    const parsed =
      Number.parseInt(
        value,
        10
      );

    return Number.isInteger(parsed)
      ? Math.min(
          maximum,
          Math.max(
            minimum,
            parsed
          )
        )
      : fallback;
  }

  function psUnsignedPositionMap(
    settingName,
    defaults,
    minimum,
    maximum
  ) {
    const supplied =
      placementSettings?.[settingName] ??
      {};

    return Object.fromEntries(
      psPositionGroups.map(
        position => [
          position,
          psUnsignedInteger(
            supplied[position],
            defaults[position],
            minimum,
            maximum
          )
        ]
      )
    );
  }

  const signingLimit =
    psUnsignedInteger(
      placementSettings.signingLimit,
      35,
      1,
      35
    );

  const finalRosterLimit =
    psUnsignedInteger(
      placementSettings.finalRosterLimit,
      95,
      1,
      99
    );

  const classTarget =
    psUnsignedInteger(
      placementSettings.classTarget,
      25,
      1,
      signingLimit
    );

  const overall =
    findOverallRating(playerRecord);

  const positionGroup =
    psTransferPositionGroup(
      playerRecord.Position
    );

  const originalPositionLimit =
    psTransferPositionRosterLimit(
      positionGroup
    );

  const preferredCountDefaults = {
    QB: 4, HB: 5, FB: 2, WR: 8, TE: 5,
    LT: 4, LG: 4, C: 4, RG: 4, RT: 4,
    EDGE: 7, DT: 6, LB: 8, CB: 8, S: 6,
    K: 1, P: 1
  };

  const preferredCountByPosition =
    psUnsignedPositionMap(
      'preferredCountByPosition',
      preferredCountDefaults,
      0,
      30
    );

  const hardMaximumDefaults = {
    QB: 5, HB: 7, FB: 3, WR: 11, TE: 7,
    LT: 6, LG: 6, C: 5, RG: 6, RT: 6,
    EDGE: 9, DT: 8, LB: 10, CB: 11, S: 8,
    K: 2, P: 2
  };

  const hardMaximumByPosition =
    psUnsignedPositionMap(
      'hardMaximumByPosition',
      hardMaximumDefaults,
      1,
      40
    );

  const perRunAdditionCapDefaults = {
    QB: 1, HB: 2, FB: 1, WR: 3, TE: 2,
    LT: 2, LG: 2, C: 1, RG: 2, RT: 2,
    EDGE: 2, DT: 2, LB: 2, CB: 3, S: 2,
    K: 1, P: 1
  };

  const perRunAdditionCapByPosition =
    psUnsignedPositionMap(
      'perRunAdditionCapByPosition',
      perRunAdditionCapDefaults,
      0,
      35
    );

  const preferredCount =
    preferredCountByPosition[
      positionGroup
    ] ??
    Math.max(
      1,
      originalPositionLimit - 1
    );

  /*
   * PocketScout Pass 4 unrestricted position placement v51
   *
   * Use the explicit hard maximum table for Passes 1-3. The previous
   * Math.min call accidentally kept QB at the older limit of 4 instead
   * of the intended hard maximum of 5.
   */
  const hardMaximum =
    hardMaximumByPosition[
      positionGroup
    ] ??
    originalPositionLimit;

  const perRunAdditionCap =
    perRunAdditionCapByPosition[
      positionGroup
    ] ??
    2;

  /*
   * PocketScout aggressive 70 OVR Pass 4 distribution v52
   *
   * Pass 4 is intentionally aggressive, but each team receives players
   * at the same position in a round-robin style. Quarterbacks, kickers,
   * and punters are limited to one Pass 4 addition per team per run.
   */
  const passFourAdditionCapDefaults = {
    QB: 1, HB: 4, FB: 2, WR: 5, TE: 3,
    LT: 3, LG: 3, C: 3, RG: 3, RT: 3,
    EDGE: 4, DT: 4, LB: 4, CB: 5, S: 4,
    K: 1, P: 1
  };

  const passFourAdditionCapByPosition =
    psUnsignedPositionMap(
      'passFourAdditionCapByPosition',
      passFourAdditionCapDefaults,
      0,
      35
    );

  const passFourAdditionCap =
    passFourAdditionCapByPosition[
      positionGroup
    ] ??
    4;

  const recruitClass =
    String(
      playerRecord.__recruitClass ??
      ''
    );

  const isTransferJunior =
    recruitClass ===
      'Transfer_Junior';

  const isDevelopmentalClass =
    recruitClass ===
      'Transfer_Freshman' ||
    recruitClass ===
      'Transfer_Sophomore';

  const isSpecialist =
    positionGroup === 'K' ||
    positionGroup === 'P';

  const isHighVolumeSkillPosition =
    positionGroup === 'WR' ||
    positionGroup === 'HB';

  const passOne =
    placementSettings.passOne ?? {};

  const passTwo =
    placementSettings.passTwo ?? {};

  const passThree =
    placementSettings.passThree ?? {};

  const passFour =
    placementSettings.passFour ?? {};

  const passDefinitions = [
    {
      pass: 1,
      label:
        'Immediate Contributor',
      maximumCommittedCount:
        psUnsignedInteger(
          passOne.maximumCommittedCount,
          34,
          0,
          signingLimit - 1
        ),
      maximumRosterCount:
        Number.POSITIVE_INFINITY,
      developmentalOnly:
        false,
      minimumOverall:
        psUnsignedInteger(
          passOne.minimumOverall,
          0,
          0,
          99
        ),
      enforcePerRunPositionCap:
        true,
      maximumDepth:
        isTransferJunior
          ? psUnsignedInteger(
              passOne.transferJuniorDepth,
              1,
              1,
              20
            )
          : isSpecialist
            ? psUnsignedInteger(
                passOne.specialistDepth,
                1,
                1,
                20
              )
            : isHighVolumeSkillPosition
              ? psUnsignedInteger(
                  passOne.skillDepth,
                  2,
                  1,
                  20
                )
              : positionGroup === 'QB'
                ? psUnsignedInteger(
                    passOne.qbDepth,
                    2,
                    1,
                    20
                  )
                : psUnsignedInteger(
                    passOne.otherDepth,
                    3,
                    1,
                    20
                  )
    },
    {
      pass: 2,
      label:
        'Balanced Class Recovery',
      maximumCommittedCount:
        psUnsignedInteger(
          passTwo.maximumCommittedCount,
          24,
          0,
          signingLimit - 1
        ),
      maximumRosterCount:
        Number.POSITIVE_INFINITY,
      developmentalOnly:
        false,
      minimumOverall:
        psUnsignedInteger(
          passTwo.minimumOverall,
          0,
          0,
          99
        ),
      enforcePerRunPositionCap:
        true,
      maximumDepth:
        isTransferJunior
          ? psUnsignedInteger(
              passTwo.transferJuniorDepth,
              2,
              1,
              20
            )
          : isSpecialist
            ? psUnsignedInteger(
                passTwo.specialistDepth,
                1,
                1,
                20
              )
            : positionGroup === 'QB'
              ? psUnsignedInteger(
                  passTwo.qbDepth,
                  3,
                  1,
                  20
                )
              : isHighVolumeSkillPosition
                ? psUnsignedInteger(
                    passTwo.skillDepth,
                    4,
                    1,
                    20
                  )
                : psUnsignedInteger(
                    passTwo.otherDepth,
                    4,
                    1,
                    20
                  )
    },
    {
      pass: 3,
      label:
        'Developmental Roster Filling',
      maximumCommittedCount:
        psUnsignedInteger(
          passThree.maximumCommittedCount,
          21,
          0,
          signingLimit - 1
        ),
      maximumRosterCount:
        Number.POSITIVE_INFINITY,
      developmentalOnly:
        passThree.developmentalOnly !== false,
      minimumOverall:
        psUnsignedInteger(
          passThree.minimumOverall,
          0,
          0,
          99
        ),
      enforcePerRunPositionCap:
        true,
      maximumDepth:
        isSpecialist
          ? psUnsignedInteger(
              passThree.specialistDepth,
              1,
              1,
              20
            )
          : positionGroup === 'QB'
            ? psUnsignedInteger(
                passThree.qbDepth,
                4,
                1,
                20
              )
            : isHighVolumeSkillPosition
              ? psUnsignedInteger(
                  passThree.skillDepth,
                  5,
                  1,
                  20
                )
              : psUnsignedInteger(
                  passThree.otherDepth,
                  5,
                  1,
                  20
                )
    },
    {
      pass: 4,
      label:
        'Aggressive Roster Completion',
      maximumCommittedCount:
        psUnsignedInteger(
          passFour.maximumCommittedCount,
          signingLimit - 1,
          0,
          signingLimit - 1
        ),
      maximumRosterCount:
        psUnsignedInteger(
          passFour.maximumRosterCount,
          finalRosterLimit - 1,
          0,
          99
        ),
      developmentalOnly:
        false,
      minimumOverall:
        psUnsignedInteger(
          passFour.minimumOverall,
          70,
          0,
          99
        ),
      enforcePerRunPositionCap:
        passFour.enforcePerRunPositionCap !== false,
      /* PocketScout Stage 4 default maximum depth 7 v66 */
      maximumDepth:
        psUnsignedInteger(
          passFour.maximumDepth,
          7,
          1,
          20
        )
    }
  ];

  for (
    const passDefinition
    of passDefinitions
  ) {
    if (
      overall <
        passDefinition.minimumOverall
    ) {
      continue;
    }

    if (
      passDefinition.developmentalOnly &&
      !isDevelopmentalClass
    ) {
      continue;
    }

    const destinationCandidates = [];

    for (
      const rankedTeam
      of rankedTeamsByPreviousFinish
    ) {
      const teamId =
        rankedTeam.teamId;

      const recruitAlreadyOnBoard =
        boardTeamIdsByRecruitRow
          ?.get(recruitRow)
          ?.has(teamId) === true;

      if (
        excludedTeamIds?.has(teamId) &&
        !recruitAlreadyOnBoard
      ) {
        continue;
      }

      const committedCount =
        committedCountByTeam.get(
          teamId
        ) ??
        0;

      if (
        committedCount >
          passDefinition
            .maximumCommittedCount ||
        committedCount >=
          signingLimit
      ) {
        continue;
      }

      const roster =
        rosterByTeam.get(teamId);

      if (!Array.isArray(roster)) {
        continue;
      }

      const projectedRosterCount =
        roster.length;

      if (
        projectedRosterCount >
          passDefinition
            .maximumRosterCount ||
        projectedRosterCount >=
          finalRosterLimit
      ) {
        continue;
      }

      const depth =
        psProjectedDepth({
          roster,
          positionGroup,
          overall
        });

      /*
       * Pass 4 remains the final roster-completion fallback and continues
       * to ignore the Passes 1-3 positional hard maximum. It now honors the
       * user-configured all-position maximum depth rank.
       */
      /*
       * PocketScout Pass 4 position maximum v61
       *
       * Every stage, including Pass 4, must honor the configured positional
       * hard maximum. Pass 4 may still use its own depth and per-run addition
       * settings, but it may not stack a player beyond the position maximum.
       */
      if (
        depth.samePositionCount >=
          hardMaximum ||
        depth.depthRank < 1 ||
        depth.depthRank >
          passDefinition.maximumDepth
      ) {
        continue;
      }

      const distributionKey =
        `${teamId}:${positionGroup}`;

      const assignedAtPosition =
        assignedPositionCountByTeam
          ?.get(
            distributionKey
          ) ??
        0;

      const activePositionAdditionCap =
        passDefinition.pass === 4
          ? passFourAdditionCap
          : perRunAdditionCap;

      if (
        passDefinition
          .enforcePerRunPositionCap &&
        assignedAtPosition >=
          activePositionAdditionCap
      ) {
        continue;
      }

      const classDeficiency =
        Math.max(
          0,
          classTarget - committedCount
        );

      const rosterDeficiency =
        Math.max(
          0,
          finalRosterLimit - projectedRosterCount
        );

      const positionalDeficiency =
        Math.max(
          0,
          preferredCount -
            depth.samePositionCount
        );

      const belowPreferredPosition =
        depth.samePositionCount <
          preferredCount;

      if (
        passDefinition.pass === 2 &&
        !belowPreferredPosition &&
        committedCount >= 22
      ) {
        continue;
      }

      if (
        passDefinition.pass === 3 &&
        !belowPreferredPosition
      ) {
        continue;
      }

      destinationCandidates.push({
        teamId,
        teamName:
          rankedTeam.teamName,
        previousSeasonStanding:
          rankedTeam.previousSeasonStanding,
        previousSeasonWins:
          rankedTeam.previousSeasonWins,
        teamStrength:
          rankedTeam.teamStrength,
        pass:
          passDefinition.pass,
        passLabel:
          passDefinition.label,
        committedCount,
        projectedRosterCount,
        rosterDeficiency,
        classDeficiency,
        positionalDeficiency,
        assignedAtPosition,
        preferredCount,
        hardMaximum,
        perRunAdditionCap,
        activePositionAdditionCap,
        ...depth
      });
    }

    if (
      passDefinition.pass === 1
    ) {
      destinationCandidates.sort(
        (left, right) =>
          right.positionalDeficiency -
            left.positionalDeficiency ||
          left.depthRank -
            right.depthRank ||
          right.classDeficiency -
            left.classDeficiency ||
          left.assignedAtPosition -
            right.assignedAtPosition ||
          left.previousSeasonStanding -
            right.previousSeasonStanding ||
          right.previousSeasonWins -
            left.previousSeasonWins ||
          right.teamStrength -
            left.teamStrength ||
          left.teamName.localeCompare(
            right.teamName
          )
      );
    } else if (
      passDefinition.pass === 4
    ) {
      destinationCandidates.sort(
        (left, right) =>
          /*
           * Distribute the position across schools before considering
           * roster size. This sends one QB to many teams instead of
           * repeatedly stacking quarterbacks at the same school.
           */
          left.assignedAtPosition -
            right.assignedAtPosition ||
          left.samePositionCount -
            right.samePositionCount ||
          right.rosterDeficiency -
            left.rosterDeficiency ||
          right.positionalDeficiency -
            left.positionalDeficiency ||
          right.classDeficiency -
            left.classDeficiency ||
          left.depthRank -
            right.depthRank ||
          left.previousSeasonStanding -
            right.previousSeasonStanding ||
          right.previousSeasonWins -
            left.previousSeasonWins ||
          right.teamStrength -
            left.teamStrength ||
          left.teamName.localeCompare(
            right.teamName
          )
      );
    } else {
      destinationCandidates.sort(
        (left, right) =>
          right.classDeficiency -
            left.classDeficiency ||
          right.positionalDeficiency -
            left.positionalDeficiency ||
          left.assignedAtPosition -
            right.assignedAtPosition ||
          left.depthRank -
            right.depthRank ||
          left.previousSeasonStanding -
            right.previousSeasonStanding ||
          right.previousSeasonWins -
            left.previousSeasonWins ||
          right.teamStrength -
            left.teamStrength ||
          left.teamName.localeCompare(
            right.teamName
          )
      );
    }

    const destination =
      destinationCandidates[0] ??
      null;

    if (destination) {
      return {
        destination,
        reason:
          destination.pass === 4
            ? `Pass 4 - ${destination.passLabel}: ${overall} OVR player assigned with projected ${positionGroup} depth rank ${destination.depthRank}. The school has ${destination.samePositionCount}/${destination.hardMaximum} players at the position, ${destination.projectedRosterCount}/${finalRosterLimit} projected players, and ${destination.assignedAtPosition}/${destination.activePositionAdditionCap} Pass 4 ${positionGroup} additions this run.`
            : `Pass ${destination.pass} - ${destination.passLabel}: class size ${destination.committedCount}/25, ${positionGroup} count ${destination.samePositionCount}/${destination.preferredCount} preferred (${destination.hardMaximum} hard maximum), projected depth rank ${destination.depthRank}, and ${destination.assignedAtPosition}/${destination.perRunAdditionCap} ${positionGroup} additions already used this run.`
      };
    }
  }

  return {
    destination:
      null,
    reason:
      overall <= 66
        ? `No destination passed the first three Smart Placement stages for ${positionGroup}, and the player was not eligible for Pass 4 because ${overall} OVR is not over 66.`
        : `No destination passed all four Smart Placement stages for ${positionGroup}. Every remaining school was at the selected maximum of ${signingLimit} signings, at the selected final projected roster limit of ${finalRosterLimit} players, or lacked recruiting-board capacity.`
  };
}
/* END PocketScout four-pass unsigned player placement v49 */

function psSetTransferTopSchool({
  recruitRecord,
  topSchools,
  topSchoolsContext,
  selectedTeamId
}) {
  const slot0 =
    topSchools.find(
      school =>
        Number(school.slot) === 0
    );

  if (!slot0) {
    return false;
  }

  const slot0TableInfo =
    topSchoolsContext
      .targetTablesByIndex
      .get(
        Number(
          slot0.targetTableIndex
        )
      );

  const slot0Record =
    slot0TableInfo
      ?.table
      ?.records?.[
        slot0.targetRow
      ];

  if (
    !isUsableRecord(slot0Record) ||
    !hasFields(
      slot0Record,
      [
        'TeamId',
        'TeamInfluence'
      ]
    )
  ) {
    return false;
  }

  const existingSelectedSlot =
    topSchools.find(
      school =>
        Number(school.teamId) ===
        selectedTeamId
    );

  const oldTopTeamId =
    Number.parseInt(
      slot0Record.TeamId,
      10
    );

  const oldTopInfluence =
    Number(
      slot0Record.TeamInfluence
    );

  if (
    existingSelectedSlot &&
    Number(existingSelectedSlot.slot) !== 0
  ) {
    const selectedSlotTableInfo =
      topSchoolsContext
        .targetTablesByIndex
        .get(
          Number(
            existingSelectedSlot
              .targetTableIndex
          )
        );

    const selectedSlotRecord =
      selectedSlotTableInfo
        ?.table
        ?.records?.[
          existingSelectedSlot.targetRow
        ];

    if (
      isUsableRecord(selectedSlotRecord) &&
      hasFields(
        selectedSlotRecord,
        [
          'TeamId',
          'TeamInfluence'
        ]
      )
    ) {
      selectedSlotRecord.TeamId =
        oldTopTeamId;

      selectedSlotRecord.TeamInfluence =
        oldTopInfluence;
    }
  }

  const secondHighestInfluence =
    topSchools
      .filter(
        school =>
          Number(school.slot) !== 0
      )
      .reduce(
        (highest, school) =>
          Math.max(
            highest,
            Number(school.teamInfluence) ||
            0
          ),
        0
      );

  slot0Record.TeamId =
    selectedTeamId;

  slot0Record.TeamInfluence =
    Math.min(
      100,
      secondHighestInfluence + 30
    );

  return true;
}

async function psZeroAssignedTransferNil({
  franchise,
  session,
  playerRecord,
  recruitTableInfo,
  recruitRow,
  teamTableInfo,
  selectedTeamId
}) {
  let baseNilReset = false;
  let targetNilFieldsReset = 0;

  if (
    hasField(
      playerRecord,
      'BaseNILValue'
    ) &&
    Number(
      playerRecord.BaseNILValue
    ) !== 0
  ) {
    playerRecord.BaseNILValue = 0;
    baseNilReset = true;
  }

  const targetRecord =
    await findSelectedTeamRecruitTarget({
      franchise,
      session,
      teamTableInfo,
      recruitTableInfo,
      recruitRow,
      selectedTeamId
    });

  if (isUsableRecord(targetRecord)) {
    for (
      const fieldName
      of [
        'NILExpectation',
        'OriginalNILExpectation',
        'CurrentNILOffer'
      ]
    ) {
      if (
        hasField(
          targetRecord,
          fieldName
        ) &&
        Number(
          targetRecord[fieldName]
        ) !== 0
      ) {
        targetRecord[fieldName] = 0;
        targetNilFieldsReset++;
      }
    }
  }

  return {
    baseNilReset,
    targetNilFieldsReset
  };
}

async function assignZeroOfferTransfers({
  inputPath,
  outputPath,
  assignmentMode,
  reportDirectory = null,
  placementSettings = {},
  bypassWeekRequirement = false,
  session = null
}) {
  const normalizedMode =
    'smart';

  const {
    franchise,
    resolvedInput
  } = await openFranchise(
    inputPath
  );

  const resolvedOutput =
    path.resolve(
      outputPath || inputPath
    );

  const weekCheck =
    await validateReturnZeroOfferTransfersWeek({
      inputPath,
      bypassWeekRequirement,
      session
    });

  if (!weekCheck.valid) {
    throw new Error(
      'This can only be run when CurrentWeekType is OffSeason and CurrentWeek is 6.'
    );
  }

  const {
    tableIdMap,
    recruitTableInfo
  } =
    await buildRecruitingHelperTableContext({
      franchise,
      session
    });

  const topSchoolsContext =
    await buildRecruitTopSchoolsContext({
      franchise,
      session
    });

  /*
   * PocketScout smart transfer actual roster placement v9
   *
   * Top School and RecruitStage changes only affect recruiting data.
   * These structures are required to place the linked Player record onto
   * the destination team's actual roster.
   */
  const teamByIndex =
    buildTeamByIndex(
      topSchoolsContext
        .teamTableInfo
        .table
    );

  const teamNameByIndex =
    buildTeamNameByIndex(
      topSchoolsContext
        .teamTableInfo
        .table
    );

  const resolveTableById =
    createTableResolver(
      franchise
    );

  /*
   * PocketScout zero offer transfer committed limit v9
   *
   * Snapshot each school's current Team.CommittedPlayers usage before
   * assigning transfers. Table index 2000 is Player[] (table ID 6123),
   * with one 35-slot row referenced by each Team record.
   */
  const committedPlayersTableInfo =
    await loadCommittedPlayersArrayTable({
      franchise,
      session,
      tableIdMap,
      teamTableInfo:
        topSchoolsContext
          .teamTableInfo
    });

  const committedPlayersTable =
    committedPlayersTableInfo.table;

  const committedCountByTeam =
    new Map();

  for (
    const teamRecord
    of (
      topSchoolsContext
        .teamTableInfo
        .table
        .records ??
      []
    )
  ) {
    const teamId =
      Number.parseInt(
        teamRecord?.TeamIndex,
        10
      );

    const committedReference =
      String(
        teamRecord?.CommittedPlayers ??
        ''
      );

    if (
      !Number.isInteger(teamId) ||
      !/^[01]{32}$/.test(
        committedReference
      )
    ) {
      continue;
    }

    const tableId =
      Number.parseInt(
        committedReference.slice(0, 15),
        2
      );

    const row =
      Number.parseInt(
        committedReference.slice(15),
        2
      );

    // Table IDs change between game updates. The resolver above has already
    // identified the current Player[35] table from Team.CommittedPlayers;
    // use that runtime ID instead of the obsolete 6123 constant.
    if (tableId !== committedPlayersTableInfo.runtimeTableId) {
      continue;
    }

    const committedRecord =
      committedPlayersTable.records?.[
        row
      ] ??
      (
        committedPlayersTable.records ??
        []
      ).find(
        record =>
          Number(record?._row) === row
      );

    if (!committedRecord) {
      throw new Error(
        `Could not load Team ${teamId} committed-player row ${row}.`
      );
    }

    const committedCount =
      Object.keys(
        committedRecord.fields ??
        committedRecord
      )
        .filter(
          fieldName =>
            /^Player\d+$/.test(
              fieldName
            )
        )
        .reduce(
          (count, fieldName) =>
            String(
              committedRecord[
                fieldName
              ] ??
              ''
            ) !==
              '00000000000000000000000000000000'
              ? count + 1
              : count,
          0
        );

    committedCountByTeam.set(
      teamId,
      committedCount
    );
  }

  /*
   * PocketScout zero offer transfer lazy full board cache v12
   *
   * Do not pre-decode all recruiting boards. The v11 prescan treated
   * unresolved board references as zero capacity, which rejected every
   * school. Cache only teams that the authoritative board helper proves
   * are completely full.
   */
  const globallyFullRecruitingBoardTeamIds =
    new Set();

  /*
   * PocketScout zero offer transfer positional distribution v19
   *
   * Key format: TeamIndex:PositionGroup
   * Value: number of unsigned players assigned during this run.
   */
  const assignedPositionCountByTeam =
    new Map();

  /*
   * PocketScout zero offer transfer recruit board membership cache v13
   *
   * Build recruit-to-school board membership once by scanning RecruitTarget
   * records directly. A school whose board has no replaceable slots can
   * still accept a recruit who is already present on that board.
   */
  const boardTeamIdsByRecruitRow =
    new Map();

  for (
    const targetTableInfo
    of topSchoolsContext
      .targetTablesByIndex
      .values()
  ) {
    for (
      const targetRecord
      of (
        targetTableInfo.table.records ??
        []
      )
    ) {
      if (
        !targetRecord ||
        !hasFields(
          targetRecord,
          [
            'Recruit',
            'TeamId'
          ]
        )
      ) {
        continue;
      }

      const recruitReference =
        decodeBinaryReference(
          targetRecord.Recruit,
          tableIdMap
        );

      const teamId =
        Number.parseInt(
          targetRecord.TeamId,
          10
        );

      if (
        !recruitReference ||
        recruitReference.tableIndex !==
          recruitTableInfo.tableIndex ||
        !Number.isInteger(teamId)
      ) {
        continue;
      }

      const teamIds =
        boardTeamIdsByRecruitRow.get(
          recruitReference.row
        ) ??
        new Set();

      teamIds.add(teamId);

      boardTeamIdsByRecruitRow.set(
        recruitReference.row,
        teamIds
      );
    }
  }

  const resolvedRosterMoves = [];

  const transferCandidates = [];
  const transferPlayerRows =
    new Set();

  const zeroOfferTransferRecruitRows =
    new Set();

  /*
   * PocketScout skip sub-70 FB Assign All Unsigned v46
   *
   * Do not place a fullback below 70 OVR, even when a destination has a
   * severe FB shortage. Keep the resolved Player table available so a run
   * containing only skipped fullbacks completes normally instead of
   * reporting that no Player table was found.
   */
  let unsignedPlayerTable =
    null;

  let skippedLowOverallFullbacks =
    0;

  for (
    let recruitRow = 0;
    recruitRow <
      (
        recruitTableInfo.table.records ??
        []
      ).length;
    recruitRow++
  ) {
    const recruitRecord =
      recruitTableInfo.table.records?.[
        recruitRow
      ];

    if (
      !isUsableRecord(recruitRecord) ||
      !hasFields(
        recruitRecord,
        [
          'Class',
          'TotalScholarshipOffers',
          'Player',
          'RecruitStage'
        ]
      ) ||
      !RECRUITING_HELPER_TRANSFER_CLASSES.has(
        String(
          recruitRecord.Class ??
          ''
        )
      ) ||
      [
        'hardcommitted',
        'signed',
        'invalid'
      ].includes(
        String(
          recruitRecord.RecruitStage ??
          ''
        )
          .trim()
          .toLowerCase()
      ) ||
      Number(
        recruitRecord.TotalScholarshipOffers
      ) !== 0
    ) {
      continue;
    }

    const playerReference =
      decodeBinaryReference(
        recruitRecord.Player,
        tableIdMap
      );

    const playerRecord =
      playerReference
        ?.table
        ?.records?.[
          playerReference.row
        ];

    if (
      !playerReference ||
      !isUsableRecord(playerRecord)
    ) {
      continue;
    }

    unsignedPlayerTable =
      unsignedPlayerTable ??
      playerReference.table;

    const candidatePositionGroup =
      psTransferPositionGroup(
        playerRecord.Position
      );

    const candidateOverall =
      findOverallRating(
        playerRecord
      );

    if (
      candidatePositionGroup === 'FB' &&
      (
        !Number.isFinite(
          candidateOverall
        ) ||
        candidateOverall < 70
      )
    ) {
      skippedLowOverallFullbacks++;
      continue;
    }

    transferPlayerRows.add(
      playerReference.row
    );

    zeroOfferTransferRecruitRows.add(
      recruitRow
    );

    playerRecord.__recruitClass =
      String(
        recruitRecord.Class ??
        ''
      );

    transferCandidates.push({
      recruitRow,
      recruitRecord,
      playerReference,
      playerRecord
    });
  }

  const playerTable =
    transferCandidates[0]
      ?.playerReference
      ?.table ??
    unsignedPlayerTable;

  if (!playerTable) {
    throw new Error(
      'No valid unsigned zero-offer Player records were found.'
    );
  }

  const {
    rosterByTeam,
    teamStrengthById
  } =
    psBuildTeamRosterContext({
      playerTable,
      transferPlayerKeys:
        transferPlayerRows,
      teamIds:
        topSchoolsContext.teamIds
    });

  /* PocketScout zero offer ranked list initialization order v15 */
  /*
   * PocketScout zero offer transfer previous season ranked placement v14
   *
   * Build one ordered school list before processing players:
   *   1. schools with fewer than 35 committed players;
   *   2. best previous-season league finish first;
   *   3. previous-season wins and current team strength as tie-breakers.
   *
   * The list is reused for every transfer. Capacity is still checked live
   * because successful assignments increase the committed count.
   */
  const rankedTeamsByPreviousFinish =
    (
      topSchoolsContext
        .teamTableInfo
        .table
        .records ??
      []
    )
      .map(
        teamRecord => {
          const teamId =
            Number.parseInt(
              teamRecord?.TeamIndex,
              10
            );

          if (
            !Number.isInteger(teamId) ||
            (
              committedCountByTeam.get(
                teamId
              ) ?? 35
            ) >= 35
          ) {
            return null;
          }

          const teamOption =
            topSchoolsContext
              .teamOptions
              .find(
                option =>
                  Number.parseInt(
                    option.value,
                    10
                  ) === teamId
              );

          if (!teamOption) {
            return null;
          }

          const rawStanding =
            Number.parseInt(
              teamRecord
                ?.PrevSeasonLeagStanding,
              10
            );

          const previousSeasonStanding =
            Number.isInteger(
              rawStanding
            ) &&
            rawStanding >= 0
              ? rawStanding
              : 9999;

          return {
            teamId,
            teamName:
              String(
                teamOption.label
              ),
            previousSeasonStanding,
            previousSeasonWins:
              Number.parseInt(
                teamRecord
                  ?.TEAM_PREVSEASWINS,
                10
              ) || 0,
            teamStrength:
              teamStrengthById.get(
                teamId
              ) ?? 0
          };
        }
      )
      .filter(Boolean)
      .sort(
        (left, right) =>
          left.previousSeasonStanding -
            right.previousSeasonStanding ||
          right.previousSeasonWins -
            left.previousSeasonWins ||
          right.teamStrength -
            left.teamStrength ||
          left.teamName.localeCompare(
            right.teamName
          )
      );

  const {
    signedClassPlayersIncluded,
    signedClassAlreadyOnRoster,
    signedClassSkippedInvalid
  } =
    psAddSignedRecruitingClassToRoster({
      recruitTableInfo,
      tableIdMap,
      topSchoolsContext,
      rosterByTeam,
      excludedRecruitRows:
        zeroOfferTransferRecruitRows
    });

  /* PocketScout NSD zero projected position emergency pass v1 */
  const zeroDepthPriorityByRecruitRow =
    new Map();

  const zeroDepthReservedRecruitRows =
    new Set();

  const zeroDepthReservedCommittedByTeam =
    new Map();

  const zeroDepthMinimumOverall =
    Math.min(
      99,
      Math.max(
        0,
        Number.parseInt(
          placementSettings
            ?.passFour
            ?.minimumOverall,
          10
        ) || 70
      )
    );

  const zeroDepthMaximumDepthOverall =
    Math.min(
      99,
      zeroDepthMinimumOverall + 5
    );

  /* PocketScout NSD zero-depth emergency pass ignores FB v3 */
  const zeroDepthExactPositions = [
    'QB', 'HB', 'WR', 'TE',
    'LT', 'LG', 'C', 'RG', 'RT',
    'LE', 'RE', 'DT',
    'LOLB', 'MLB', 'ROLB',
    'CB', 'FS', 'SS',
    'K', 'P'
  ];

  function getZeroDepthCandidatePool(
    exactPosition
  ) {
    return transferCandidates
      .filter(candidate => {
        if (
          zeroDepthReservedRecruitRows.has(
            candidate.recruitRow
          )
        ) {
          return false;
        }

        return (
          psTransferExactPosition(
            candidate.playerRecord.Position
          ) === exactPosition
        );
      })
      .sort(
        (left, right) =>
          findOverallRating(
            right.playerRecord
          ) -
          findOverallRating(
            left.playerRecord
          ) ||
          left.recruitRow -
          right.recruitRow
      );
  }

  function reserveZeroDepthCandidate({
    candidate,
    rankedTeam,
    exactPosition,
    priorityType,
    availablePositionRank
  }) {
    zeroDepthReservedRecruitRows.add(
      candidate.recruitRow
    );

    zeroDepthPriorityByRecruitRow.set(
      candidate.recruitRow,
      {
        teamId:
          rankedTeam.teamId,

        teamName:
          rankedTeam.teamName,

        previousSeasonStanding:
          rankedTeam.previousSeasonStanding,

        previousSeasonWins:
          rankedTeam.previousSeasonWins,

        teamStrength:
          rankedTeam.teamStrength,

        pass:
          0,

        passLabel:
          priorityType === 'best'
            ? 'Zero-Depth Best Available'
            : 'Zero-Depth Developmental Depth',

        depthRank:
          priorityType === 'best'
            ? 1
            : 2,

        playersAhead:
          priorityType === 'best'
            ? 0
            : 1,

        samePositionCount:
          priorityType === 'best'
            ? 0
            : 1,

        priorityType,

        exactPosition,

        positionGroup:
          psTransferPositionGroup(
            exactPosition
          ),

        availablePositionRank
      }
    );

    zeroDepthReservedCommittedByTeam.set(
      rankedTeam.teamId,
      (
        zeroDepthReservedCommittedByTeam.get(
          rankedTeam.teamId
        ) ?? 0
      ) + 1
    );
  }

  for (
    const rankedTeam
    of rankedTeamsByPreviousFinish
  ) {
    const roster =
      rosterByTeam.get(
        rankedTeam.teamId
      );

    if (!Array.isArray(roster)) {
      continue;
    }

    for (
      const exactPosition
      of zeroDepthExactPositions
    ) {
      const projectedCount =
        roster.filter(
          player =>
            player.exactPosition ===
              exactPosition
        ).length;

      if (projectedCount !== 0) {
        continue;
      }

      const currentCommitted =
        committedCountByTeam.get(
          rankedTeam.teamId
        ) ?? 0;

      const reservedCommitted =
        zeroDepthReservedCommittedByTeam.get(
          rankedTeam.teamId
        ) ?? 0;

      /*
       * Emergency zero-position fills override the user's normal placement
       * limits. Only the game's absolute 35-player signing capacity and
       * 99-player roster capacity may block this pass.
       */
      const signingLimit =
        35;

      const finalRosterLimit =
        99;

      if (
        currentCommitted +
          reservedCommitted >=
            signingLimit ||
        roster.length +
          reservedCommitted >=
            finalRosterLimit
      ) {
        continue;
      }

      const rankedPositionPool =
        getZeroDepthCandidatePool(
          exactPosition
        );

      /*
       * Prefer the fifth through tenth best available unsigned player at
       * this exact position. Use the fifth-ranked candidate deterministically.
       * If fewer than five exist, use the best remaining candidate so the
       * emergency need is not left empty.
       */
      const preferredPositionIndex =
        rankedPositionPool.length >= 5
          ? 4
          : 0;

      const bestCandidate =
        rankedPositionPool[
          preferredPositionIndex
        ] ??
        null;

      if (!bestCandidate) {
        continue;
      }

      reserveZeroDepthCandidate({
        candidate:
          bestCandidate,
        rankedTeam,
        exactPosition,
        priorityType:
          'best',

        availablePositionRank:
          preferredPositionIndex + 1
      });

      if (
        currentCommitted +
          reservedCommitted + 1 >=
            signingLimit ||
        roster.length +
          reservedCommitted + 1 >=
            finalRosterLimit
      ) {
        continue;
      }

      const depthCandidate =
        getZeroDepthCandidatePool(
          exactPosition
        )
          .filter(candidate => {
            const overall =
              findOverallRating(
                candidate.playerRecord
              );

            return (
              overall >=
                zeroDepthMinimumOverall &&
              overall <=
                zeroDepthMaximumDepthOverall
            );
          })
          .sort(
            (left, right) =>
              findOverallRating(
                right.playerRecord
              ) -
              findOverallRating(
                left.playerRecord
              ) ||
              left.recruitRow -
              right.recruitRow
          )[0] ??
        null;

      if (depthCandidate) {
        reserveZeroDepthCandidate({
          candidate:
            depthCandidate,
          rankedTeam,
          exactPosition,
          priorityType:
            'depth',

          availablePositionRank:
            null
        });
      }
    }
  }

  /*
   * PocketScout smart transfer OVR-first processing v8
   *
   * Process the best available transfers first so high-OVR players receive
   * the first opportunity to claim strong programs with legitimate need.
   * Later, lower-OVR players see the updated roster after those earlier
   * assignments and are routed to the next-best realistic opportunity.
   *
   * Ties are resolved by class urgency, then position and name to keep the
   * run deterministic.
   */
  const classPriority = {
    Transfer_Junior: 3,
    Transfer_Sophomore: 2,
    Transfer_Freshman: 1
  };

  transferCandidates.sort(
    (left, right) => {
      const leftPriority =
        zeroDepthPriorityByRecruitRow.has(
          left.recruitRow
        )
          ? (
              zeroDepthPriorityByRecruitRow
                .get(left.recruitRow)
                ?.priorityType === 'best'
                ? 0
                : 1
            )
          : 2;

      const rightPriority =
        zeroDepthPriorityByRecruitRow.has(
          right.recruitRow
        )
          ? (
              zeroDepthPriorityByRecruitRow
                .get(right.recruitRow)
                ?.priorityType === 'best'
                ? 0
                : 1
            )
          : 2;

      if (
        leftPriority !==
          rightPriority
      ) {
        return (
          leftPriority -
          rightPriority
        );
      }

      const rightOverall =
        findOverallRating(
          right.playerRecord
        );

      const leftOverall =
        findOverallRating(
          left.playerRecord
        );

      if (
        rightOverall !==
        leftOverall
      ) {
        return (
          rightOverall -
          leftOverall
        );
      }

      const rightClassPriority =
        classPriority[
          String(
            right.recruitRecord.Class ??
            ''
          )
        ] ?? 0;

      const leftClassPriority =
        classPriority[
          String(
            left.recruitRecord.Class ??
            ''
          )
        ] ?? 0;

      if (
        rightClassPriority !==
        leftClassPriority
      ) {
        return (
          rightClassPriority -
          leftClassPriority
        );
      }

      const positionCompare =
        String(
          left.playerRecord.Position ??
          ''
        ).localeCompare(
          String(
            right.playerRecord.Position ??
            ''
          )
        );

      if (positionCompare !== 0) {
        return positionCompare;
      }

      const leftName =
        [
          toText(
            left.playerRecord.FirstName
          ),
          toText(
            left.playerRecord.LastName
          )
        ]
          .filter(Boolean)
          .join(' ');

      const rightName =
        [
          toText(
            right.playerRecord.FirstName
          ),
          toText(
            right.playerRecord.LastName
          )
        ]
          .filter(Boolean)
          .join(' ');

      return leftName.localeCompare(
        rightName
      );
    }
  );

  let transfersAssigned = 0;
  let previousSchoolCount = 0;
  let smartPlacementCount = 0;
  let favoriteWalkOnCount = 0;
  let transfersLeftUnassigned = 0;
  let previousFallbackToSmart = 0;
  let alreadyHardCommitted = 0;
  let skippedNoPreviousTeam = 0;
  let skippedNoTopSchoolsList = 0;
  let baseNilPlayersReset = 0;
  let targetNilFieldsReset = 0;
  let recruitingDealbreakersCleared = 0;

  const reportRows = [];

  for (
    const transfer
    of transferCandidates
  ) {
    const {
      recruitRow,
      recruitRecord,
      playerRecord
    } = transfer;

    let topSchools = [];

    try {
      topSchools =
        resolveRecruitTopSchools({
          recruitRecord,
          context:
            topSchoolsContext
        });
    } catch {
      skippedNoTopSchoolsList++;
      continue;
    }

    const originalTopSchool =
      topSchools.find(
        school =>
          Number(school.slot) === 0
      );

    if (!originalTopSchool) {
      skippedNoTopSchoolsList++;
      continue;
    }

    const previousTeamId =
      Number.parseInt(
        playerRecord.PrevTeamIndex,
        10
      );

    const previousTeam =
      topSchoolsContext
        .teamOptions
        .find(
          option =>
            Number(option.value) ===
            previousTeamId
        );

    let selectedMode =
      'smart';

    let destination = null;
    let reason = '';
    let projectedDepthRank = '';
    let playersAhead = '';
    let teamStrength = '';

    if (selectedMode === 'previous') {
      if (
        Number.isInteger(previousTeamId) &&
        previousTeamId >= 0 &&
        previousTeamId < 255 &&
        previousTeam
      ) {
        destination = {
          teamId:
            previousTeamId,
          teamName:
            String(previousTeam.label)
        };

        reason =
          'Returned to previous school by user selection.';
      } else {
        skippedNoPreviousTeam++;

        transfersLeftUnassigned++;
        reason =
          'No valid previous school was available.';
      }
    }

    if (selectedMode === 'favorite') {
      destination = {
        teamId:
          Number(originalTopSchool.teamId),
        teamName:
          String(originalTopSchool.teamName)
      };

      reason =
        'Walked on to the existing favorite school.';
    }

    if (
      selectedMode === 'smart' &&
      !destination
    ) {
      const zeroDepthPriority =
        zeroDepthPriorityByRecruitRow.get(
          recruitRow
        );

      if (zeroDepthPriority) {
        const roster =
          rosterByTeam.get(
            zeroDepthPriority.teamId
          ) ?? [];

        const currentPositionCount =
          roster.filter(
            player =>
              player.exactPosition ===
                zeroDepthPriority.exactPosition
          ).length;

        const expectedMaximumCount =
          zeroDepthPriority.priorityType ===
            'best'
              ? 0
              : 1;

        const destinationCommittedCount =
          committedCountByTeam.get(
            zeroDepthPriority.teamId
          ) ?? 0;

        const signingLimit =
          35;

        const finalRosterLimit =
          99;

        if (
          currentPositionCount <=
            expectedMaximumCount &&
          destinationCommittedCount <
            signingLimit &&
          roster.length <
            finalRosterLimit
        ) {
          destination = {
            ...zeroDepthPriority,
            projectedRosterCount:
              roster.length,
            committedCount:
              destinationCommittedCount
          };

          reason =
            zeroDepthPriority.priorityType ===
              'best'
              ? `Zero-depth emergency pass: ${zeroDepthPriority.teamName} had zero projected ${zeroDepthPriority.exactPosition} players, so available unsigned player rank #${zeroDepthPriority.availablePositionRank} at that exact position was assigned first.`
              : `Zero-depth emergency pass: ${zeroDepthPriority.teamName} began with zero projected ${zeroDepthPriority.exactPosition} players, so a second depth player between ${zeroDepthMinimumOverall} and ${zeroDepthMaximumDepthOverall} OVR was assigned.`;

          projectedDepthRank =
            zeroDepthPriority.depthRank;

          playersAhead =
            zeroDepthPriority.playersAhead;

          teamStrength =
            Math.round(
              zeroDepthPriority.teamStrength *
                10
            ) / 10;
        }
      }

      const result =
        destination
          ? {
              destination,
              reason
            }
          :
        psChooseSmartTransferDestination({
          playerRecord,
          rosterByTeam,
          committedCountByTeam,
          excludedTeamIds:
            globallyFullRecruitingBoardTeamIds,
          boardTeamIdsByRecruitRow,
          recruitRow,
          rankedTeamsByPreviousFinish,
          assignedPositionCountByTeam,
          placementSettings
        });

      destination =
        result.destination;

      reason =
        result.reason;

      if (destination) {
        projectedDepthRank =
          destination.depthRank;

        playersAhead =
          destination.playersAhead;

        teamStrength =
          Math.round(
            destination.teamStrength * 10
          ) / 10;
      }
    }

    const fullName =
      [
        toText(playerRecord.FirstName),
        toText(playerRecord.LastName)
      ]
        .filter(Boolean)
        .join(' ') ||
      'Unknown Player';

    /*
     * PocketScout zero offer transfer lazy full board cache v12
     *
     * Validate only the selected destination. If its board is proven full,
     * remember that school for every remaining transfer and immediately try
     * the next-best destination. No player is changed until a destination
     * board has been confirmed.
     */
    let destinationBoardTargetResult =
      null;

    while (destination) {
      try {
        destinationBoardTargetResult =
          await ensureSelectedTeamRecruitTarget({
            franchise,
            session,
            teamTableInfo:
              topSchoolsContext
                .teamTableInfo,
            recruitTableInfo,
            recruitRow,
            selectedTeamId:
              destination.teamId
          });

        break;
      } catch (error) {
        const message =
          String(
            error?.message ??
            error
          );

        if (
          !message.includes(
            'no replaceable slot'
          ) &&
          !message.includes(
            'All 35 entries are HardCommitted or Signed'
          )
        ) {
          throw error;
        }

        globallyFullRecruitingBoardTeamIds.add(
          destination.teamId
        );

        const fallbackResult =
          psChooseSmartTransferDestination({
            playerRecord,
            rosterByTeam,
            committedCountByTeam,
            excludedTeamIds:
              globallyFullRecruitingBoardTeamIds,
            boardTeamIdsByRecruitRow,
            recruitRow,
            rankedTeamsByPreviousFinish,
            assignedPositionCountByTeam,
            placementSettings
          });

        destination =
          fallbackResult.destination;

        reason =
          destination
            ? fallbackResult.reason
            : 'No school had both an open committed-player slot and a replaceable recruiting-board slot.';

        selectedMode =
          'smart';

        if (destination) {
          projectedDepthRank =
            destination.depthRank;

          playersAhead =
            destination.playersAhead;

          teamStrength =
            Math.round(
              destination.teamStrength * 10
            ) / 10;
        }
      }
    }

    if (!destination) {
      transfersLeftUnassigned++;

      reportRows.push({
        player:
          fullName,
        class:
          toText(recruitRecord.Class),
        position:
          toText(playerRecord.Position),
        overall:
          findOverallRating(playerRecord),
        decision:
          'Left Unassigned',
        destination:
          '',
        previousSchool:
          previousTeam?.label ?? '',
        originalTopSchool:
          originalTopSchool.teamName,
        projectedDepthRank:
          '',
        playersAhead:
          '',
        teamStrength:
          '',
        reason,
        baseNilReset:
          'No',
        targetNilFieldsReset:
          0
      });

      continue;
    }

    const destinationCommittedCount =
      committedCountByTeam.get(
        destination.teamId
      ) ?? 0;

    if (
      destinationCommittedCount >= 35
    ) {
      transfersLeftUnassigned++;

      reportRows.push({
        player:
          fullName,
        class:
          toText(recruitRecord.Class),
        position:
          toText(playerRecord.Position),
        overall:
          findOverallRating(playerRecord),
        decision:
          'Left Unassigned',
        destination:
          '',
        previousSchool:
          previousTeam?.label ?? '',
        originalTopSchool:
          originalTopSchool.teamName,
        projectedDepthRank:
          '',
        playersAhead:
          '',
        teamStrength:
          '',
        reason:
          String(
            destination.teamName ??
            'Team ' + destination.teamId
          ) +
          ' already has 35 committed players.',
        baseNilReset:
          'No',
        targetNilFieldsReset:
          0
      });

      continue;
    }

    const topSchoolChanged =
      psSetTransferTopSchool({
        recruitRecord,
        topSchools,
        topSchoolsContext,
        selectedTeamId:
          destination.teamId
      });

    if (!topSchoolChanged) {
      transfersLeftUnassigned++;

      reportRows.push({
        player:
          fullName,
        class:
          toText(recruitRecord.Class),
        position:
          toText(playerRecord.Position),
        overall:
          findOverallRating(playerRecord),
        decision:
          'Left Unassigned',
        destination:
          '',
        previousSchool:
          previousTeam?.label ?? '',
        originalTopSchool:
          originalTopSchool.teamName,
        projectedDepthRank:
          '',
        playersAhead:
          '',
        teamStrength:
          '',
        reason:
          'Could not safely update the Top School record.',
        baseNilReset:
          'No',
        targetNilFieldsReset:
          0
      });

      continue;
    }

    const recruitingDealbreakerChanged =
      setAssignedRecruitDealbreakerInvalid(
        playerRecord
      );

    if (
      recruitingDealbreakerChanged
    ) {
      recruitingDealbreakersCleared++;
    }

    if (
      String(
        recruitRecord.RecruitStage ??
        ''
      ) ===
      RECRUITING_HELPER_COMMITTED_STAGE
    ) {
      alreadyHardCommitted++;
    } else {
      recruitRecord.RecruitStage =
        RECRUITING_HELPER_COMMITTED_STAGE;
    }

    const nilResult =
      await psZeroAssignedTransferNil({
        franchise,
        session,
        playerRecord,
        recruitTableInfo,
        recruitRow,
        teamTableInfo:
          topSchoolsContext.teamTableInfo,
        selectedTeamId:
          destination.teamId
      });

    if (
      destinationBoardTargetResult
        .addedToBoard
    ) {
      const destinationMembership =
        boardTeamIdsByRecruitRow.get(
          recruitRow
        ) ??
        new Set();

      destinationMembership.add(
        destination.teamId
      );

      boardTeamIdsByRecruitRow.set(
        recruitRow,
        destinationMembership
      );
    }

    /*
     * destinationBoardTargetResult was created by the preflight loop
     * before any recruit, NIL, scholarship, or commitment mutation.
     */
    const destinationBoardTarget =
      destinationBoardTargetResult
        .targetRecord;

    const scholarshipOffer =
      applyRecruitScholarshipOffer({
        recruitRecord,
        targetRecord:
          destinationBoardTarget,
        recruitLabel:
          fullName,
        teamLabel:
          destination.teamName ??
          `Team ${destination.teamId}`
      });

    const committedPlayerSync =
      await synchronizeCommittedPlayerDestination({
        franchise,
        teamTableInfo:
          topSchoolsContext.teamTableInfo,
        selectedTeamId:
          destination.teamId,
        playerReference:
          recruitRecord.Player,
        tableIdMap,
        session
      });

    if (
      committedPlayerSync
        .addedToDestination
    ) {
      committedCountByTeam.set(
        destination.teamId,
        (
          committedCountByTeam.get(
            destination.teamId
          ) ?? 0
        ) + 1
      );

      const assignedPositionGroup =
        psTransferPositionGroup(
          playerRecord.Position
        );

      const distributionKey =
        `${destination.teamId}:${assignedPositionGroup}`;

      assignedPositionCountByTeam.set(
        distributionKey,
        (
          assignedPositionCountByTeam.get(
            distributionKey
          ) ??
          0
        ) + 1
      );
    }

    if (nilResult.baseNilReset) {
      baseNilPlayersReset++;
    }

    targetNilFieldsReset +=
      nilResult.targetNilFieldsReset;

    /*
     * PocketScout smart transfer actual roster placement v9
     *
     * Move the Player record itself. HardCommitted plus Top School alone
     * does not make the player a member of the destination roster.
     */
    const oldTeamIndex =
      Number.parseInt(
        playerRecord.TeamIndex,
        10
      );

    playerRecord.TeamIndex =
      destination.teamId;

    // Keep the original team reference intact. It is the only durable source
    // for the transfer's previous-school history when Ghost City re-imports
    // this save after assignment.

    if (
      hasField(
        playerRecord,
        'PLYR_CONSECYEARSWITHTEAM'
      )
    ) {
      playerRecord
        .PLYR_CONSECYEARSWITHTEAM =
          0;
    }

    if (
      hasField(
        playerRecord,
        'CurrentNILCompensation'
      )
    ) {
      playerRecord
        .CurrentNILCompensation =
          0;
    }

    resolvedRosterMoves.push({
      record:
        playerRecord,

      recordIndex:
        transfer.playerReference.row,

      fromTeamIndex:
        Number.isInteger(
          oldTeamIndex
        )
          ? oldTeamIndex
          : FREE_AGENT_TEAM_INDEX,

      toTeamIndex:
        destination.teamId,

      position:
        toText(
          playerRecord.Position
        ),

      playerName:
        fullName
    });

    transfersAssigned++;

    if (selectedMode === 'previous') {
      previousSchoolCount++;
    } else if (selectedMode === 'favorite') {
      favoriteWalkOnCount++;
    } else {
      smartPlacementCount++;
    }

    /*
     * Add the assigned transfer to the destination roster so later players
     * do not all choose the same school and depth-chart opening.
     */
    rosterByTeam
      .get(destination.teamId)
      ?.push({
        overall:
          findOverallRating(
            playerRecord
          ),

        exactPosition:
          psTransferExactPosition(
            playerRecord.Position
          ),

        positionGroup:
          psTransferPositionGroup(
            playerRecord.Position
          ),
        isSmartTransfer:
          true
      });

    reportRows.push({
      player:
        fullName,
      class:
        toText(recruitRecord.Class),
      position:
        toText(playerRecord.Position),
      overall:
        findOverallRating(playerRecord),
      decision:
        selectedMode === 'previous'
          ? 'Returned to Previous School'
          : selectedMode === 'favorite'
            ? 'Favorite School Walk-On'
            : 'Smart Placement',
      destination:
        destination.teamName,
      previousSchool:
        previousTeam?.label ?? '',
      originalTopSchool:
        originalTopSchool.teamName,
      projectedDepthRank:
        projectedDepthRank,
      playersAhead:
        playersAhead,
      teamStrength:
        teamStrength,
      reason,
      baseNilReset:
        nilResult.baseNilReset
          ? 'Yes'
          : 'Already 0 / unavailable',
      targetNilFieldsReset:
        nilResult.targetNilFieldsReset,

      recruitingDealbreaker:
        recruitingDealbreakerChanged
          ? 'Changed to Invalid'
          : 'Already Invalid / unavailable',

      scholarshipOffered:
        scholarshipOffer
          .scholarshipOfferChanged
          ? 'Yes'
          : 'Already Offered',

      addedToRecruitingBoard:
        destinationBoardTargetResult
          .addedToBoard
          ? 'Yes'
          : 'Already Present',

      addedToCommittedPlayers:
        committedPlayerSync
          .addedToDestination
          ? 'Yes'
          : 'Already Present',

      removedFromOtherCommittedLists:
        committedPlayerSync
          .removedFromOtherTeams
    });
  }

  let reportPath = null;

  if (
    reportDirectory &&
    reportRows.length
  ) {
    const resolvedReportDirectory =
      path.resolve(
        String(reportDirectory)
      );

    fs.mkdirSync(
      resolvedReportDirectory,
      { recursive: true }
    );

    const dynastyName =
      psSafeReportName(
        path.basename(
          resolvedInput
        )
      );

    const reportStamp =
      new Date()
        .toISOString()
        .replace(/[:.]/g, '-');

    reportPath =
      path.join(
        resolvedReportDirectory,
        `${dynastyName}_Smart_Transfer_Placement_${reportStamp}.csv`
      );

    const headers = [
      'Player',
      'Class',
      'Position',
      'OVR',
      'Decision',
      'Destination',
      'Previous School',
      'Original Top School',
      'Projected Depth Rank',
      'Players Ahead',
      'Team Strength',
      'Reason',
      'Base NIL Reset',
      'Target NIL Fields Reset'
    ];

    const csvLines = [
      headers.map(psCsvCell).join(','),
      ...reportRows.map(row =>
        [
          row.player,
          row.class,
          row.position,
          row.overall,
          row.decision,
          row.destination,
          row.previousSchool,
          row.originalTopSchool,
          row.projectedDepthRank,
          row.playersAhead,
          row.teamStrength,
          row.reason,
          row.baseNilReset,
          row.targetNilFieldsReset
        ]
          .map(psCsvCell)
          .join(',')
      )
    ];

    fs.writeFileSync(
      reportPath,
      csvLines.join('\r\n'),
      'utf8'
    );
  }

  const rosterSyncWarnings = [];
  let autoRepairReport = [];
  let backupResult = {
    backupPath: null,
    backupError: null
  };

  if (
    transfersAssigned > 0 &&
    resolvedRosterMoves.length
  ) {
    backupResult =
      backupBeforeSave(
        resolvedInput,
        'before-smart-transfer-roster-placement'
      );

    if (backupResult.backupError) {
      rosterSyncWarnings.push(
        `Could not create a backup before saving: ${backupResult.backupError}`
      );
    }

    const tradedAwayRecordIndexesByTeam =
      new Map();

    const tradedInRecordIndexesByTeam =
      new Map();

    const involvedTargetTeams =
      new Set();

    for (
      const move
      of resolvedRosterMoves
    ) {
      if (
        !tradedAwayRecordIndexesByTeam
          .has(
            move.fromTeamIndex
          )
      ) {
        tradedAwayRecordIndexesByTeam
          .set(
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

      if (
        !tradedInRecordIndexesByTeam
          .has(
            move.toTeamIndex
          )
      ) {
        tradedInRecordIndexesByTeam
          .set(
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

      involvedTargetTeams.add(
        move.toTeamIndex
      );
    }

    const depthChartWarnings =
      await syncDepthCharts({
        playerTable,
        teamByIndex,
        resolvedMoves:
          resolvedRosterMoves,
        tradedAwayRecordIndexesByTeam,
        teamNameByIndex,
        resolveTableById
      });

    const rosterStoreWarnings =
      await syncRosterStore({
        playerTable,
        teamByIndex,
        tradedAwayRecordIndexesByTeam,
        tradedInRecordIndexesByTeam,
        teamNameByIndex,
        resolveTableById
      });

    const expectedRecordIndexesByTeam =
      new Map();

    for (
      const teamIndex
      of involvedTargetTeams
    ) {
      const expected =
        new Set();

      for (
        let recordIndex = 0;
        recordIndex <
          (
            playerTable.records ??
            []
          ).length;
        recordIndex++
      ) {
        const record =
          playerTable.records?.[
            recordIndex
          ];

        if (
          !isUsableRecord(record) ||
          !hasField(
            record,
            'TeamIndex'
          )
        ) {
          continue;
        }

        if (
          Number.parseInt(
            record.TeamIndex,
            10
          ) ===
            teamIndex
        ) {
          expected.add(
            recordIndex
          );
        }
      }

      expectedRecordIndexesByTeam
        .set(
          teamIndex,
          expected
        );
    }

    const rosterResult =
      await reconcileRosterStore({
        targetTeamIndexes:
          [...involvedTargetTeams],
        playerTable,
        teamByIndex,
        teamNameByIndex,
        resolveTableById,
        expectedRecordIndexesByTeam
      });

    const depthChartResult =
      await reconcileDepthCharts({
        targetTeamIndexes:
          [...involvedTargetTeams],
        playerTable,
        teamByIndex,
        teamNameByIndex,
        resolveTableById,
        expectedRecordIndexesByTeam
      });

    rosterSyncWarnings.push(
      ...depthChartWarnings,
      ...rosterStoreWarnings,
      ...rosterResult.warnings,
      ...depthChartResult.warnings
    );

    autoRepairReport =
      mergeReportEntries(
        rosterResult.entries,
        depthChartResult.entries
      );

    await atomicSave(
      franchise,
      resolvedOutput
    );

    if (session) {
      session.recruitingHelperCache =
        null;
    }
  }

  return {
    moduleId:
      recruitingHelperModule.id,

    moduleName:
      recruitingHelperModule.name,

    inputPath:
      resolvedInput,

    outputPath:
      resolvedOutput,

    overwrittenOriginal:
      true,

    assignmentMode:
      normalizedMode,

    seasonInfoTableIndex:
      weekCheck.seasonInfoTableIndex,

    currentOffseasonStage:
      weekCheck.currentOffseasonStage,

    currentWeek:
      weekCheck.currentWeek,

    transferCandidates:
      transferCandidates.length,

    processingOrder:
      'OVR descending, then class urgency',

    zeroOfferTransfers:
      transferCandidates.length,

    transfersAssigned,

    playersMovedToRoster:
      resolvedRosterMoves.length,

    backupPath:
      backupResult.backupPath,

    rosterSyncWarnings,
    autoRepairReport,

    previousSchoolCount,
    smartPlacementCount,
    favoriteWalkOnCount,
    transfersLeftUnassigned,
    previousFallbackToSmart:
      0,
    alreadyHardCommitted,
    skippedInvalidPlayer:
      0,
    skippedNoPreviousTeam,
    skippedInvalidPreviousTeam:
      0,
    skippedNoTopSchoolsList,
    skippedLowOverallFullbacks,
    baseNilPlayersReset,
    targetNilFieldsReset,
    recruitingDealbreakersCleared,
    signedClassPlayersIncluded,
    signedClassAlreadyOnRoster,
    signedClassSkippedInvalid,

    zeroDepthPriorityNeeds:
      zeroDepthPriorityByRecruitRow.size,

    zeroDepthMinimumOverall,

    zeroDepthMaximumDepthOverall,

    reportPath
  };
}
/* END PocketScout unified transfer assignment chooser v1 */

async function returnZeroOfferTransfersToPreviousSchool({
  inputPath,
  outputPath,
  session = null
}) {
  const {
    franchise,
    resolvedInput
  } = await openFranchise(
    inputPath
  );

  const resolvedOutput =
    path.resolve(
      outputPath || inputPath
    );

  const weekCheck =
    await validateReturnZeroOfferTransfersWeek({
      inputPath,
      session
    });

  if (!weekCheck.valid) {
    throw new Error(
      'This can only be run when CurrentWeekType is OffSeason and CurrentWeek is 6.'
    );
  }

  const {
    tableIdMap,
    recruitTableInfo
  } =
    await buildRecruitingHelperTableContext({
      franchise,
      session
    });

  const topSchoolsContext =
    await buildRecruitTopSchoolsContext({
      franchise,
      session
    });

  let transferCandidates = 0;
  let zeroOfferTransfers = 0;
  let transfersReturned = 0;
  let transfersChanged = 0;
  let alreadyHardCommitted = 0;
  let alreadyPreviousTeamOnTop = 0;
  let skippedInvalidPlayer = 0;
  let skippedNoPreviousTeam = 0;
  let skippedInvalidPreviousTeam = 0;
  let skippedNoTopSchoolsList = 0;

  for (
    let recruitRow = 0;
    recruitRow <
      (
        recruitTableInfo.table.records ??
        []
      ).length;
    recruitRow++
  ) {
    const recruitRecord =
      recruitTableInfo.table.records?.[
        recruitRow
      ];

    if (
      !isUsableRecord(recruitRecord) ||
      !hasFields(
        recruitRecord,
        [
          'Class',
          'TotalScholarshipOffers',
          'Player',
          'RecruitStage'
        ]
      )
    ) {
      continue;
    }

    if (
      !RECRUITING_HELPER_TRANSFER_CLASSES.has(
        String(
          recruitRecord.Class ??
          ''
        )
      )
    ) {
      continue;
    }

    transferCandidates++;

    if (
      Number(
        recruitRecord.TotalScholarshipOffers
      ) !== 0
    ) {
      continue;
    }

    zeroOfferTransfers++;

    const playerReference =
      decodeBinaryReference(
        recruitRecord.Player,
        tableIdMap
      );

    const playerRecord =
      playerReference?.table?.records?.[
        playerReference.row
      ];

    if (
      !playerReference ||
      !isUsableRecord(playerRecord)
    ) {
      skippedInvalidPlayer++;
      continue;
    }

    const previousTeamId =
      Number.parseInt(
        playerRecord.PrevTeamIndex,
        10
      );

    if (
      !hasField(
        playerRecord,
        'PrevTeamIndex'
      ) ||
      !Number.isInteger(previousTeamId) ||
      previousTeamId < 0 ||
      previousTeamId >= 255
    ) {
      skippedNoPreviousTeam++;
      continue;
    }

    const previousTeamExists =
      topSchoolsContext.teamOptions.some(
        option =>
          Number.parseInt(
            option.value,
            10
          ) ===
            previousTeamId
      );

    if (!previousTeamExists) {
      skippedInvalidPreviousTeam++;
      continue;
    }

    let topSchools = [];

    try {
      topSchools =
        resolveRecruitTopSchools({
          recruitRecord,
          context:
            topSchoolsContext
        });
    } catch {
      skippedNoTopSchoolsList++;
      continue;
    }

    const slot0 =
      topSchools.find(
        school =>
          Number(school.slot) === 0
      );

    if (!slot0) {
      skippedNoTopSchoolsList++;
      continue;
    }

    const slot0TableInfo =
      topSchoolsContext
        .targetTablesByIndex
        .get(
          Number(
            slot0.targetTableIndex
          )
        );

    const slot0Record =
      slot0TableInfo
        ?.table
        ?.records?.[
          slot0.targetRow
        ];

    if (
      !isUsableRecord(slot0Record) ||
      !hasFields(
        slot0Record,
        [
          'TeamId',
          'TeamInfluence'
        ]
      )
    ) {
      skippedNoTopSchoolsList++;
      continue;
    }

    const existingPreviousSlot =
      topSchools.find(
        school =>
          Number(school.teamId) ===
            previousTeamId
      );

    /*
     * Transfers can use a separate ProspectTargetSchool table from
     * high-school recruits. Every Top 10 slot must therefore be edited
     * through the table referenced by that slot, not through the default
     * high-school target table.
     */
    let topSchoolChanged = false;

    if (
      Number.parseInt(
        slot0Record.TeamId,
        10
      ) ===
        previousTeamId
    ) {
      alreadyPreviousTeamOnTop++;
    } else {
      const oldTopTeamId =
        Number.parseInt(
          slot0Record.TeamId,
          10
        );

      const oldTopInfluence =
        Number(
          slot0Record.TeamInfluence
        );

      if (
        existingPreviousSlot &&
        Number(existingPreviousSlot.slot) !== 0
      ) {
        const previousSlotTableInfo =
          topSchoolsContext
            .targetTablesByIndex
            .get(
              Number(
                existingPreviousSlot
                  .targetTableIndex
              )
            );

        const previousSlotRecord =
          previousSlotTableInfo
            ?.table
            ?.records?.[
              existingPreviousSlot
                .targetRow
            ];

        if (
          isUsableRecord(previousSlotRecord) &&
          hasFields(
            previousSlotRecord,
            [
              'TeamId',
              'TeamInfluence'
            ]
          )
        ) {
          previousSlotRecord.TeamId =
            oldTopTeamId;

          previousSlotRecord.TeamInfluence =
            oldTopInfluence;
        }
      }

      const secondHighestInfluence =
        topSchools
          .filter(
            school =>
              Number(school.slot) !== 0
          )
          .reduce(
            (
              highest,
              school
            ) =>
              Math.max(
                highest,
                Number(
                  school.teamInfluence
                ) || 0
              ),
            0
          );

      slot0Record.TeamId =
        previousTeamId;

      slot0Record.TeamInfluence =
        Math.min(
          100,
          secondHighestInfluence + 30
        );

      topSchoolChanged = true;
    }

    let stageChanged = false;

    if (
      String(
        recruitRecord.RecruitStage ??
        ''
      ) !==
        RECRUITING_HELPER_COMMITTED_STAGE
    ) {
      recruitRecord.RecruitStage =
        RECRUITING_HELPER_COMMITTED_STAGE;

      stageChanged = true;
    } else {
      alreadyHardCommitted++;
    }

    if (
      topSchoolChanged ||
      stageChanged
    ) {
      const recruitKey =
        `${recruitTableInfo.tableIndex}:${recruitRow}`;

      transfersChanged++;
      transfersReturned++;

      refreshRecruitingHelperCachedRecruit({
        session,
        recruitKey,
        recruitRecord,
        tableIdMap,
        topSchoolsContext
      });
    }
  }

  if (transfersChanged > 0) {
    await franchise.save(
      resolvedOutput
    );

    /*
     * Bulk transfer actions mutate Recruit and Top Schools records.
     * Discard the lightweight/prefetched cache so the next page load
     * rereads the saved dynasty instead of mixing updated list labels
     * with stale RecruitStage and Top 10 detail data.
     */
    if (session) {
      session.recruitingHelperCache =
        null;
    }
  }

  return {
    moduleId:
      recruitingHelperModule.id,

    moduleName:
      recruitingHelperModule.name,

    inputPath:
      resolvedInput,

    outputPath:
      resolvedOutput,

    overwrittenOriginal:
      true,

    seasonInfoTableIndex:
      weekCheck.seasonInfoTableIndex,

    currentOffseasonStage:
      weekCheck.currentOffseasonStage,

    currentWeek:
      weekCheck.currentWeek,

    transferCandidates,
    zeroOfferTransfers,
    transfersReturned,
    transfersChanged,
    alreadyHardCommitted,
    alreadyPreviousTeamOnTop,
    skippedInvalidPlayer,
    skippedNoPreviousTeam,
    skippedInvalidPreviousTeam,
    skippedNoTopSchoolsList
  };
}
/* END PocketScout return unsigned players to previous school v1 */

async function setMyTeamAsTopSchoolForRecruitingHelperBoard({
  inputPath,
  outputPath,
  selectedTeamId,
  session = null
}) {
  const { franchise, resolvedInput } = await openFranchise(inputPath);
  const resolvedOutput = path.resolve(outputPath || inputPath);
  const { tableIdMap, recruitTableInfo } = await buildRecruitingHelperTableContext({ franchise, session });
  const topSchoolsContext = await buildRecruitTopSchoolsContext({ franchise, session });
  const teamId = Number.parseInt(selectedTeamId, 10);

  const { teamName } = await validateRecruitingHelperUserTeam({
    franchise,
    session,
    teamTableInfo: topSchoolsContext.teamTableInfo,
    selectedTeamId: teamId
  });

  const { targets, recruitsOnBoard } = await getRecruitingHelperBoardTargets({
    franchise,
    session,
    teamTableInfo: topSchoolsContext.teamTableInfo,
    recruitTableInfo,
    selectedTeamId: teamId
  });

  let recruitsChanged = 0;
  let recruitsAlreadyTop = 0;
  let recruitsSkippedNoList = 0;

  for (const { recruitRow, targetRecord } of targets) {
    const recruitRecord = recruitTableInfo.table.records?.[recruitRow];
    if (!isUsableRecord(recruitRecord)) continue;

    const outcome = applyRecruitingHelperTopSchoolTakeover({
      recruitRecord,
      targetRecord,
      topSchoolsContext,
      selectedTeamId: teamId
    });

    if (outcome.skippedNoList) recruitsSkippedNoList++;
    else if (outcome.alreadyTop) recruitsAlreadyTop++;
    else if (outcome.changed) {
      recruitsChanged++;

      refreshRecruitingHelperCachedRecruit({
        session,
        recruitKey:
          `${recruitTableInfo.tableIndex}:${recruitRow}`,
        recruitRecord,
        tableIdMap,
        topSchoolsContext
      });
    }
  }

  if (recruitsChanged > 0) await franchise.save(resolvedOutput);

  return {
    moduleId: recruitingHelperModule.id,
    moduleName: recruitingHelperModule.name,
    inputPath: resolvedInput,
    outputPath: resolvedOutput,
    overwrittenOriginal: true,
    teamName,
    recruitsOnBoard,
    recruitsChanged,
    recruitsAlreadyTop,
    recruitsSkippedNoList
  };
}


/* PocketScout Recruiting Helper calculated OVR v1 */
function normalizeRecruitingHelperOvrKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function loadRecruitingHelperOvrModel() {
  if (recruitingHelperOvrModelCache) {
    return recruitingHelperOvrModelCache;
  }

  const parsed = JSON.parse(
    fs.readFileSync(
      RECRUITING_HELPER_OVR_FORMULA_PATH,
      'utf8'
    )
  );

  if (!Array.isArray(parsed?.formulas)) {
    throw new Error(
      'Player OVR formula package contains no formulas.'
    );
  }

  recruitingHelperOvrModelCache = parsed;
  return parsed;
}

function getRecruitingHelperOvrIndex() {
  if (recruitingHelperOvrIndexCache) {
    return recruitingHelperOvrIndexCache;
  }

  const exact = new Map();
  const byPosition = new Map();

  for (const formula of loadRecruitingHelperOvrModel().formulas) {
    const positionKey =
      normalizeRecruitingHelperOvrKey(
        formula.position
      );

    if (!byPosition.has(positionKey)) {
      byPosition.set(positionKey, []);
    }

    byPosition.get(positionKey).push(formula);

    for (const alias of [
      formula.playerType,
      formula.sourceType,
      formula.sourcePLTY
    ]) {
      const aliasKey =
        normalizeRecruitingHelperOvrKey(alias);

      if (aliasKey) {
        exact.set(
          `${positionKey}|${aliasKey}`,
          formula
        );
      }
    }
  }

  recruitingHelperOvrIndexCache = {
    exact,
    byPosition
  };

  return recruitingHelperOvrIndexCache;
}

function resolveRecruitingHelperOvrFormula(
  position,
  playerType
) {
  const index =
    getRecruitingHelperOvrIndex();

  const positionKey =
    normalizeRecruitingHelperOvrKey(position);

  const playerTypeKey =
    normalizeRecruitingHelperOvrKey(playerType);

  const exact =
    index.exact.get(
      `${positionKey}|${playerTypeKey}`
    );

  if (exact) {
    return exact;
  }

  const positionMatches =
    index.byPosition.get(positionKey) ?? [];

  if (positionMatches.length === 1) {
    return positionMatches[0];
  }

  throw new Error(
    `No exact OVR formula matched Position "${position}" and PlayerType "${playerType}".`
  );
}

function isNumericRecruitingHelperRatingField(
  fieldName,
  fieldMetadata = null
) {
  return (
    /Rating$/i.test(String(fieldName ?? '')) &&
    ![
      'OverallRating',
      'ProspectStarRating',
      'RunningStyleRating'
    ].includes(String(fieldName ?? '')) &&
    (
      fieldMetadata?.valueType === 'number' ||
      fieldMetadata == null
    )
  );
}

function calculateRecruitingHelperOverallForFormula(
  playerRecord,
  formula
) {
  let rawOverall =
    Number(formula.intercept);

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
      formula.coefficients ?? {}
    )
  ) {
    const rating =
      Number(playerRecord[fieldName]);

    const numericCoefficient =
      Number(coefficient);

    if (
      !Number.isFinite(rating) ||
      !Number.isFinite(numericCoefficient)
    ) {
      throw new Error(
        `Cannot calculate ${formula.position}/${formula.playerType} because ${fieldName} is not numeric.`
      );
    }

    rawOverall +=
      rating *
      numericCoefficient;
  }

  const rounded =
    Math.ceil(rawOverall - 0.5);

  const model =
    loadRecruitingHelperOvrModel();

  return Math.min(
    Math.max(
      rounded,
      Number(
        model?.calculation
          ?.minimumOverall ??
        12
      )
    ),
    Number(
      model?.calculation
        ?.maximumOverall ??
      99
    )
  );
}

function buildRecruitingHelperAthleteProjections(
  playerRecord
) {
  const currentPosition =
    String(
      playerRecord.Position ??
      ''
    );

  const currentPlayerType =
    String(
      playerRecord.PlayerType ??
      ''
    );

  const results = [];

  for (
    const formula
    of loadRecruitingHelperOvrModel()
      .formulas
  ) {
    try {
      const position =
        String(
          formula.position ??
          ''
        );

      const playerType =
        String(
          formula.playerType ??
          formula.sourceType ??
          formula.sourcePLTY ??
          ''
        );

      if (!position || !playerType) {
        continue;
      }

      results.push({
        position,
        playerType,

        overall:
          calculateRecruitingHelperOverallForFormula(
            playerRecord,
            formula
          ),

        isCurrent:
          normalizeRecruitingHelperOvrKey(
            position
          ) ===
            normalizeRecruitingHelperOvrKey(
              currentPosition
            ) &&
          normalizeRecruitingHelperOvrKey(
            playerType
          ) ===
            normalizeRecruitingHelperOvrKey(
              currentPlayerType
            )
      });
    } catch {
      /*
       * A formula is skipped only when this Player record is missing a
       * numeric rating required by that specific position/player type.
       */
    }
  }

  return results.sort(
    (left, right) =>
      Number(right.overall) -
        Number(left.overall) ||
      left.position.localeCompare(
        right.position,
        undefined,
        {
          sensitivity: 'base',
          numeric: true
        }
      ) ||
      left.playerType.localeCompare(
        right.playerType,
        undefined,
        {
          sensitivity: 'base',
          numeric: true
        }
      )
  );
}

function buildRecruitingHelperOvrMetadata(
  playerRecord,
  includeAthleteProjections = false
) {
  const athleteProjections =
    includeAthleteProjections
      ? buildRecruitingHelperAthleteProjections(
          playerRecord
        )
      : [];

  try {
    const formula =
      resolveRecruitingHelperOvrFormula(
        playerRecord.Position,
        playerRecord.PlayerType
      );

    const weights =
      Object.fromEntries(
        Object.entries(
          formula.originalScale?.weights ??
          {}
        )
          .filter(
            ([fieldName, weight]) =>
              /Rating$/i.test(fieldName) &&
              Number.isFinite(Number(weight))
          )
          .map(
            ([fieldName, weight]) => [
              fieldName,
              Number(weight)
            ]
          )
      );

    const meaningfulEntries =
      Object.entries(weights)
        .filter(([, weight]) => weight > 1);

    const highestWeight =
      meaningfulEntries.length
        ? Math.max(...meaningfulEntries.map(([, weight]) => weight))
        : null;

    return {
      position:
        String(playerRecord.Position ?? ''),
      playerType:
        String(formula.playerType ?? playerRecord.PlayerType ?? ''),
      weights,
      meaningfulFields:
        meaningfulEntries.map(([fieldName]) => fieldName),
      highestWeightFields:
        meaningfulEntries
          .filter(([, weight]) => weight === highestWeight)
          .map(([fieldName]) => fieldName),
      athleteProjections
    };
  } catch {
    return {
      position:
        String(playerRecord.Position ?? ''),
      playerType:
        String(playerRecord.PlayerType ?? ''),
      weights: {},
      meaningfulFields: [],
      highestWeightFields: [],
      athleteProjections
    };
  }
}

function calculateRecruitingHelperOverall(
  playerRecord,
  overrides = new Map()
) {
  const getValue = fieldName =>
    overrides.has(fieldName)
      ? overrides.get(fieldName)
      : playerRecord[fieldName];

  const formula =
    resolveRecruitingHelperOvrFormula(
      getValue('Position'),
      getValue('PlayerType')
    );

  let rawOverall =
    Number(formula.intercept);

  for (const [fieldName, coefficient] of Object.entries(formula.coefficients ?? {})) {
    const rating =
      Number(getValue(fieldName));

    if (!Number.isFinite(rating)) {
      throw new Error(
        `Cannot calculate OVR because ${fieldName} is not numeric.`
      );
    }

    rawOverall +=
      rating *
      Number(coefficient);
  }

  const rounded =
    Math.ceil(rawOverall - 0.5);

  const model =
    loadRecruitingHelperOvrModel();

  return Math.min(
    Math.max(
      rounded,
      Number(model?.calculation?.minimumOverall ?? 12)
    ),
    Number(model?.calculation?.maximumOverall ?? 99)
  );
}

function buildRecruitingHelperPlayerOverrides(
  playerRecord,
  edits
) {
  const overrides = new Map();
  let shouldRecalculate = false;

  for (const edit of edits ?? []) {
    const fieldName =
      String(edit?.field ?? '');

    if (!hasField(playerRecord, fieldName)) {
      continue;
    }

    /*
     * PocketScout OVR preview ignore non-OVR player fields v1
     *
     * This function exists only to build inputs for the OVR preview.
     * Ignore visual/profile fields such as PLYR_TENDENCY before coercion.
     * Some of those fields are stored as numeric enums internally while
     * the editor submits their readable enum labels, such as "Intense".
     */
    const affectsOverall =
      isNumericRecruitingHelperRatingField(
        fieldName
      ) ||
      fieldName === 'Position' ||
      fieldName === 'PlayerType';

    if (!affectsOverall) {
      continue;
    }

    const newValue =
      coerceEditedValue(
        edit.value,
        playerRecord[fieldName],
        playerRecord.fields?.[fieldName],
        fieldName
      );

    overrides.set(fieldName, newValue);

    if (
      !valuesEqual(
        playerRecord[fieldName],
        newValue
      )
    ) {
      shouldRecalculate = true;
    }
  }

  return {
    overrides,
    shouldRecalculate
  };
}

async function previewRecruitOverallChanges({
  inputPath,
  entries,
  session = null
}) {
  const {
    franchise
  } = await openFranchise(inputPath);

  const {
    tableIdMap,
    recruitTableInfo
  } = await buildRecruitingHelperTableContext({
    franchise,
    session
  });

  const previews = [];

  for (const entry of entries ?? []) {
    const [tableText, rowText] =
      String(entry?.recruitKey ?? '').split(':');

    const tableIndex =
      Number.parseInt(tableText, 10);

    const recruitRow =
      Number.parseInt(rowText, 10);

    if (
      tableIndex !== recruitTableInfo.tableIndex ||
      !Number.isInteger(recruitRow)
    ) {
      continue;
    }

    const recruitRecord =
      recruitTableInfo.table.records?.[recruitRow];

    if (!isUsableRecord(recruitRecord)) {
      continue;
    }

    const playerReference =
      decodeBinaryReference(
        recruitRecord.Player,
        tableIdMap
      );

    const playerRecord =
      playerReference?.table?.records?.[
        playerReference.row
      ];

    if (!isUsableRecord(playerRecord)) {
      continue;
    }

    const {
      overrides,
      shouldRecalculate
    } = buildRecruitingHelperPlayerOverrides(
      playerRecord,
      entry.playerEdits
    );

    const oldOverall =
      toInteger(playerRecord.OverallRating, 0);

    const newOverall =
      shouldRecalculate
        ? calculateRecruitingHelperOverall(
            playerRecord,
            overrides
          )
        : oldOverall;

    previews.push({
      recruitKey:
        String(entry.recruitKey),
      recalculated:
        shouldRecalculate,
      oldOverall,
      newOverall,
      overallChanged:
        oldOverall !== newOverall
    });
  }

  return {
    previewCount:
      previews.length,
    previews
  };
}
/* END PocketScout Recruiting Helper calculated OVR v1 */


async function saveRecruit({
  inputPath,
  outputPath,
  recruitKey,
  recruitEdits,
  playerEdits,
  topSchoolEdits,
  nilEdits,
  session = null
}) {
  const {
    franchise,
    resolvedInput
  } = await openFranchise(
    inputPath
  );

  const resolvedOutput =
    path.resolve(
      outputPath || inputPath
    );

  const {
    tableIdMap,
    recruitTableInfo,
    resolutionMode
  } =
    await buildRecruitingHelperTableContext({
      franchise,
      session
    });

  const [
    submittedTableIndexText,
    recruitRowText
  ] = String(
    recruitKey ?? ''
  ).split(':');

  const submittedTableIndex =
    Number.parseInt(
      submittedTableIndexText,
      10
    );

  const recruitRow =
    Number.parseInt(
      recruitRowText,
      10
    );

  if (
    !Number.isInteger(
      submittedTableIndex
    ) ||
    !Number.isInteger(
      recruitRow
    )
  ) {
    throw new Error(
      'Invalid Recruit selection.'
    );
  }

  if (
    submittedTableIndex !==
    recruitTableInfo.tableIndex
  ) {
    throw new Error(
      'The Recruit table changed after the editor was loaded. Reload Recruiting Helper and try again.'
    );
  }

  const recruitRecord =
    recruitTableInfo.table.records?.[
      recruitRow
    ];

  if (
    !isUsableRecord(
      recruitRecord
    ) ||
    !hasFields(
      recruitRecord,
      RECRUIT_REQUIRED_FIELDS
    )
  ) {
    throw new Error(
      'The selected Recruit row is no longer valid.'
    );
  }

  const playerReference =
    decodeBinaryReference(
      recruitRecord.Player,
      tableIdMap
    );

  if (!playerReference) {
    throw new Error(
      'The selected Recruit no longer has a valid Player reference.'
    );
  }

  const playerRecord =
    playerReference.table.records?.[
      playerReference.row
    ];

  if (
    !isUsableRecord(
      playerRecord
    )
  ) {
    throw new Error(
      'The linked Player record is no longer valid.'
    );
  }

  const allowedRecruitFields =
    new Set(
      EDITABLE_RECRUIT_FIELDS
    );

  const allowedPlayerFields =
    new Set(
      getEditablePlayerFieldNames(
        playerRecord
      )
    );

  const topSchoolsContext =
    await buildRecruitTopSchoolsContext({
      franchise,
      session
    });

  const resolvedTopSchools =
    resolveRecruitTopSchools({
      recruitRecord,
      context:
        topSchoolsContext
    });

  const topSchoolsBySlot =
    new Map(
      resolvedTopSchools.map(
        school => [
          Number(
            school.slot
          ),
          school
        ]
      )
    );

  let recruitFieldsChanged = 0;
  let playerFieldsChanged = 0;
  let topSchoolFieldsChanged = 0;
  let nilFieldsChanged = 0;

  for (
    const edit
    of recruitEdits ?? []
  ) {
    const fieldName =
      String(
        edit?.field ?? ''
      );

    if (
      !allowedRecruitFields.has(
        fieldName
      )
    ) {
      throw new Error(
        `Recruit field is not editable: ${fieldName}`
      );
    }

    if (
      !hasField(
        recruitRecord,
        fieldName
      )
    ) {
      continue;
    }

    const oldValue =
      recruitRecord[fieldName];

    const newValue =
      coerceEditedValue(
        edit.value,
        oldValue,
        recruitRecord.fields?.[
          fieldName
        ],
        fieldName
      );

    if (
      !valuesEqual(
        oldValue,
        newValue
      )
    ) {
      recruitRecord[fieldName] =
        newValue;

      recruitFieldsChanged++;
    }
  }

  let shouldRecalculateOverall =
    false;

  for (
    const edit
    of playerEdits ?? []
  ) {
    const fieldName =
      String(
        edit?.field ?? ''
      );

    if (
      !allowedPlayerFields.has(
        fieldName
      )
    ) {
      throw new Error(
        `Player field is not editable: ${fieldName}`
      );
    }

    if (
      !hasField(
        playerRecord,
        fieldName
      )
    ) {
      continue;
    }

    const oldValue =
      playerRecord[fieldName];

    const newValue =
      coerceEditedValue(
        edit.value,
        oldValue,
        playerRecord.fields?.[
          fieldName
        ],
        fieldName
      );

    if (
      !valuesEqual(
        oldValue,
        newValue
      )
    ) {
      playerRecord[fieldName] =
        newValue;

      if (
        isNumericRecruitingHelperRatingField(
          fieldName
        ) ||
        fieldName === 'Position' ||
        fieldName === 'PlayerType'
      ) {
        shouldRecalculateOverall =
          true;
      }

      playerFieldsChanged++;
    }
  }

  if (shouldRecalculateOverall) {
    const calculatedOverall =
      calculateRecruitingHelperOverall(
        playerRecord
      );

    if (
      toInteger(
        playerRecord.OverallRating,
        0
      ) !== calculatedOverall
    ) {
      playerRecord.OverallRating =
        calculatedOverall;

      playerFieldsChanged++;
    }
  }

  /* PocketScout Recruiting Helper editable NIL fields v1 */
  const allowedNilFields =
    new Map([
      [
        'BaseNILValue',
        {
          source: 'player',
          record: playerRecord
        }
      ],
      [
        'NILExpectation',
        {
          source: 'target',
          record: null
        }
      ],
      [
        'OriginalNILExpectation',
        {
          source: 'target',
          record: null
        }
      ],
      [
        'CurrentNILOffer',
        {
          source: 'target',
          record: null
        }
      ]
    ]);

  let userRecruitTargetForNil =
    null;

  const submittedTargetNilEdit =
    (nilEdits ?? []).some(
      edit =>
        String(
          edit?.source ?? ''
        ) === 'target'
    );

  if (submittedTargetNilEdit) {
    const userTeamId =
      await resolveRecruitingHelperUserTeamId({
        franchise,
        session,
        teamTableInfo:
          topSchoolsContext
            .teamTableInfo
      });

    if (!Number.isInteger(userTeamId)) {
      throw new Error(
        'Could not resolve the user-controlled team for NIL edits.'
      );
    }

    userRecruitTargetForNil =
      await findSelectedTeamRecruitTarget({
        franchise,
        session,
        teamTableInfo:
          topSchoolsContext
            .teamTableInfo,
        recruitTableInfo,
        recruitRow,
        selectedTeamId:
          userTeamId
      });

    if (!isUsableRecord(userRecruitTargetForNil)) {
      throw new Error(
        'The selected recruit is not on the user-controlled team recruiting board, so UserRecruitTarget NIL fields cannot be edited.'
      );
    }

    for (
      const fieldName
      of [
        'NILExpectation',
        'OriginalNILExpectation',
        'CurrentNILOffer'
      ]
    ) {
      allowedNilFields.set(
        fieldName,
        {
          source: 'target',
          record:
            userRecruitTargetForNil
        }
      );
    }
  }

  for (const edit of nilEdits ?? []) {
    const fieldName =
      String(
        edit?.field ?? ''
      );

    const source =
      String(
        edit?.source ?? ''
      );

    const fieldTarget =
      allowedNilFields.get(
        fieldName
      );

    if (
      !fieldTarget ||
      fieldTarget.source !== source
    ) {
      throw new Error(
        `NIL field is not editable: ${fieldName}`
      );
    }

    const targetRecord =
      fieldTarget.record;

    if (
      !isUsableRecord(targetRecord) ||
      !hasField(
        targetRecord,
        fieldName
      )
    ) {
      continue;
    }

    const oldValue =
      targetRecord[fieldName];

    const newValue =
      coerceEditedValue(
        edit.value,
        oldValue,
        targetRecord.fields?.[
          fieldName
        ],
        fieldName
      );

    if (
      !valuesEqual(
        oldValue,
        newValue
      )
    ) {
      targetRecord[fieldName] =
        newValue;

      nilFieldsChanged++;
    }
  }

  /* PocketScout Recruiting Helper Recruit Board Top 10 save chain v1 */
  const currentTopSchoolSlots =
    resolvedTopSchools.map(
      school => ({
        slot: Number(school.slot),
        tableIndex:
          Number(
            school.targetTableIndex
          ),
        row:
          Number(
            school.targetRow
          ),
        teamId:
          Number(
            school.teamId
          ),
        teamInfluence:
          Number(
            school.teamInfluence
          )
      })
    );

  for (
    const edit
    of topSchoolEdits ?? []
  ) {
    const slot =
      Number.parseInt(
        edit?.slot,
        10
      );

    const tableIndex =
      Number.parseInt(
        edit?.tableIndex,
        10
      );

    const row =
      Number.parseInt(
        edit?.row,
        10
      );

    if (
      !Number.isInteger(slot) ||
      slot < 0 ||
      slot > 9 ||
      !Number.isInteger(
        tableIndex
      ) ||
      !Number.isInteger(
        row
      )
    ) {
      throw new Error(
        'Invalid Top School selection.'
      );
    }

    const resolvedSchool =
      topSchoolsBySlot.get(
        slot
      );

    if (
      !resolvedSchool ||
      Number(
        resolvedSchool
          .targetTableIndex
      ) !==
        tableIndex ||
      Number(
        resolvedSchool
          .targetRow
      ) !==
        row
    ) {
      throw new Error(
        `Top 10 school slot ${slot + 1} no longer resolves to the submitted HighSchoolProspectTopSchoolsStore record. Reload Recruiting Helper and try again.`
      );
    }

    const resolvedTargetTableInfo =
      topSchoolsContext
        .targetTablesByIndex
        .get(
          tableIndex
        );

    if (!resolvedTargetTableInfo) {
      throw new Error(
        `Top 10 school slot ${slot + 1} resolved outside the supported high-school and transfer-portal Top Schools tables.`
      );
    }

    const schoolRecord =
      resolvedTargetTableInfo
        .table
        .records?.[
          row
        ];

    if (
      !isUsableRecord(
        schoolRecord
      ) ||
      !hasFields(
        schoolRecord,
        [
          'TeamId',
          'TeamInfluence'
        ]
      )
    ) {
      throw new Error(
        `Top 10 school slot ${slot + 1} target row is invalid.`
      );
    }

    if (
      edit.teamId !==
        undefined &&
      edit.teamId !== null &&
      edit.teamId !== ''
    ) {
      const newTeamId =
        Number.parseInt(
          edit.teamId,
          10
        );

      if (
        !Number.isInteger(
          newTeamId
        ) ||
        !topSchoolsContext
          .teamIds
          .has(
            newTeamId
          )
      ) {
        throw new Error(
          `Invalid Top School team: ${edit.teamId}`
        );
      }

      if (
        !valuesEqual(
          schoolRecord.TeamId,
          newTeamId
        )
      ) {
        const conflictingSlot =
          currentTopSchoolSlots.find(
            school =>
              school.teamId ===
                newTeamId &&
              !(
                school.tableIndex ===
                  tableIndex &&
                school.row ===
                  row
              )
          );

        if (conflictingSlot) {
          const conflictTableInfo =
            topSchoolsContext
              .targetTablesByIndex
              .get(
                conflictingSlot.tableIndex
              );

          const conflictRecord =
            conflictTableInfo
              ?.table
              ?.records?.[
                conflictingSlot.row
              ];

          if (
            isUsableRecord(
              conflictRecord
            ) &&
            hasFields(
              conflictRecord,
              [
                'TeamId',
                'TeamInfluence'
              ]
            )
          ) {
            const displacedTeamId =
              schoolRecord.TeamId;

            const displacedInfluence =
              schoolRecord.TeamInfluence;

            if (
              !valuesEqual(
                conflictRecord.TeamId,
                displacedTeamId
              )
            ) {
              conflictRecord.TeamId =
                displacedTeamId;

              topSchoolFieldsChanged++;
            }

            if (
              !valuesEqual(
                conflictRecord.TeamInfluence,
                displacedInfluence
              )
            ) {
              conflictRecord.TeamInfluence =
                displacedInfluence;

              topSchoolFieldsChanged++;
            }
          }
        }

        schoolRecord.TeamId =
          newTeamId;

        topSchoolFieldsChanged++;
      }
    }

    if (
      edit.teamInfluence !==
        undefined &&
      edit.teamInfluence !==
        null &&
      edit.teamInfluence !== ''
    ) {
      const newInfluence =
        Number(
          edit.teamInfluence
        );

      if (
        !Number.isFinite(
          newInfluence
        )
      ) {
        throw new Error(
          `Invalid Top School influence: ${edit.teamInfluence}`
        );
      }

      if (
        !valuesEqual(
          schoolRecord.TeamInfluence,
          newInfluence
        )
      ) {
        schoolRecord.TeamInfluence =
          Number.isInteger(
            Number(
              schoolRecord.TeamInfluence
            )
          )
            ? Math.trunc(
                newInfluence
              )
            : newInfluence;

        topSchoolFieldsChanged++;
      }
    }
  }

  /* TODO: MODIFIED 2026-07-13
   */
  let topSchoolHeadstartApplied = false;

  const slot0School =
    topSchoolsBySlot.get(0);

  if (slot0School) {
    const slot0Record =
      topSchoolsContext
        .targetTableInfo
        .table
        .records?.[
          slot0School.targetRow
        ];

    if (
      isUsableRecord(
        slot0Record
      ) &&
      hasFields(
        slot0Record,
        [
          'TeamId',
          'TeamInfluence'
        ]
      )
    ) {
      const slot0TeamId =
        Number.parseInt(
          slot0Record.TeamId,
          10
        );

      const slot0Influence =
        Number(
          slot0Record.TeamInfluence
        );

      const userTeamId =
        await resolveRecruitingHelperUserTeamId({
          franchise,
          session,
          teamTableInfo:
            topSchoolsContext
              .teamTableInfo
        });

      if (
        Number.isInteger(
          userTeamId
        ) &&
        Number.isFinite(
          slot0Influence
        ) &&
        slot0TeamId ===
          userTeamId
      ) {
        const boardEntryRecord =
          await findSelectedTeamRecruitTarget({
            franchise,
            session,
            teamTableInfo:
              topSchoolsContext
                .teamTableInfo,
            recruitTableInfo,
            recruitRow,
            selectedTeamId:
              userTeamId
          });

        if (
          isUsableRecord(
            boardEntryRecord
          ) &&
          hasField(
            boardEntryRecord,
            'ProspectInfluenceTotal'
          )
        ) {
          const currentTotal =
            toInteger(
              boardEntryRecord.ProspectInfluenceTotal,
              0
            );

          if (
            currentTotal <
            slot0Influence
          ) {
            boardEntryRecord.ProspectInfluenceTotal =
              slot0Influence;

            topSchoolHeadstartApplied = true;
            topSchoolFieldsChanged++;
          }
        }
      }
    }
  }
  /* TODO: END */

  const totalFieldsChanged =
    recruitFieldsChanged +
    playerFieldsChanged +
    topSchoolFieldsChanged +
    nilFieldsChanged;

  let updatedRecruit =
    null;

  if (totalFieldsChanged > 0) {
    await franchise.save(
      resolvedOutput
    );

    refreshRecruitingHelperCachedRecruit({
      session,
      recruitKey,
      recruitRecord,
      tableIdMap,
      topSchoolsContext
    });

    updatedRecruit =
      refreshRecruitingHelperCachedDetails({
        session,
        recruitKey,
        recruitRecord,
        playerReference,
        playerRecord,
        resolutionMode,
        topSchoolsContext,
        userRecruitTargetForNil
      });
  } else {
    const cache =
      getRecruitingHelperSessionCache({
        session,
        inputPath:
          session?.inputPath
      });

    const cachedRecruit =
      cache?.payload?.recruits?.find(
        item =>
          String(item.key) ===
          String(recruitKey)
      );

    updatedRecruit =
      cachedRecruit
        ? JSON.parse(
            JSON.stringify(
              cachedRecruit
            )
          )
        : null;
  }

  return {
    moduleId:
      recruitingHelperModule.id,

    moduleName:
      recruitingHelperModule.name,

    inputPath:
      resolvedInput,

    outputPath:
      resolvedOutput,

    overwrittenOriginal: true,

    recruitFieldsChanged,
    playerFieldsChanged,
    topSchoolFieldsChanged,
    nilFieldsChanged,
    topSchoolHeadstartApplied, /* TODO: CHANGED 2026-07-13 - new result field */
    totalFieldsChanged,

    /* PocketScout Recruiting Helper incremental save refresh v1 */
    updatedRecruit
  };
}

/* Recruiting Helper Top 10 Schools */

const RECRUIT_TOP_SCHOOLS_LIST_STORE =
  'ProspectTopSchoolsListStore';

const RECRUIT_TARGET_SCHOOLS_STORE =
  'HighSchoolProspectTopSchoolsStore';

const TRANSFER_TARGET_SCHOOLS_STORE =
  'TransferPortalProspectTopSchoolsStore';

const TOP_SCHOOL_LIST_FIELDS =
  Array.from(
    {
      length: 10
    },
    (_, index) =>
      `ProspectTargetSchool${index}`
  );


/* PocketScout Recruiting Helper Prospect Board filter */

/* PocketScout Prospect Board commit visibility and user team default */
async function resolveRecruitingHelperUserTeamId({
  franchise,
  session,
  teamTableInfo
}) {
  const coachInfo =
    session?.resolvedTables?.Coach;

  if (
    !coachInfo ||
    !Number.isInteger(
      Number(
        coachInfo.index
      )
    )
  ) {
    return null;
  }

  let coachTable = null;

  try {
    coachTable =
      franchise.getTableByIndex(
        Number(
          coachInfo.index
        )
      );

    await coachTable.readRecords();
  } catch {
    return null;
  }

  if (
    !coachTable ||
    String(
      coachTable.name ?? ''
    ) !==
      'Coach'
  ) {
    return null;
  }

  const userCoachRow =
    (
      coachTable.records ??
      []
    ).findIndex(
      record =>
        isUsableRecord(
          record
        ) &&
        hasField(
          record,
          'IsUserControlled'
        ) &&
        (
          record.IsUserControlled ===
            true ||
          record.IsUserControlled ===
            1 ||
          String(
            record.IsUserControlled ??
            ''
          ).toLowerCase() ===
            'true'
        )
    );

  if (userCoachRow < 0) {
    return null;
  }

  const coachTableId =
    getRuntimeTableId(
      coachTable
    );

  if (
    !Number.isInteger(
      coachTableId
    )
  ) {
    return null;
  }

  const coachReference =
    coachTableId
      .toString(2)
      .padStart(15, '0') +
    userCoachRow
      .toString(2)
      .padStart(17, '0');

  const matchingTeams =
    (
      teamTableInfo
        .table
        .records ??
      []
    ).filter(
      record =>
        isUsableRecord(
          record
        ) &&
        hasField(
          record,
          'TeamIndex'
        ) &&
        (
          (
            hasField(
              record,
              'HeadCoach'
            ) &&
            String(
              record.HeadCoach ??
              ''
            ) ===
              coachReference
          ) ||
          (
            hasField(
              record,
              'UserCharacter'
            ) &&
            String(
              record.UserCharacter ??
              ''
            ) ===
              coachReference
          )
        )
    );

  if (
    matchingTeams.length !==
      1
  ) {
    return null;
  }

  const teamId =
    Number.parseInt(
      matchingTeams[0]
        .TeamIndex,
      10
    );

  return Number.isInteger(
    teamId
  )
    ? teamId
    : null;
}

async function buildRecruitProspectBoardMembership({
  franchise,
  session,
  recruitTableInfo,
  teamTableInfo,
  userTeamId = null
}) {
  const teamIdsByRecruitKey =
    new Map();

  const userTargetNilByRecruitKey =
    new Map();

  const runtimeTableCache =
    new Map();

  function cacheTableInfo(tableInfo) {
    if (!tableInfo?.table) {
      return;
    }

    const runtimeTableId =
      getRuntimeTableId(
        tableInfo.table
      );

    if (
      Number.isInteger(
        runtimeTableId
      )
    ) {
      runtimeTableCache.set(
        runtimeTableId,
        {
          table:
            tableInfo.table,

          tableIndex:
            Number(
              tableInfo.tableIndex
            ),

          tableName:
            String(
              tableInfo.tableName ??
              tableInfo.table.name ??
              ''
            )
        }
      );
    }
  }

  cacheTableInfo(
    teamTableInfo
  );

  cacheTableInfo(
    recruitTableInfo
  );

  async function getTableInfoByRuntimeId(
    tableId
  ) {
    if (
      runtimeTableCache.has(
        tableId
      )
    ) {
      return runtimeTableCache.get(
        tableId
      );
    }

    const sessionInfo =
      session?.tablesById?.[
        String(tableId)
      ];

    if (
      !sessionInfo ||
      !Number.isInteger(
        Number(
          sessionInfo.index
        )
      )
    ) {
      return null;
    }

    let table = null;

    try {
      table =
        franchise.getTableByIndex(
          Number(
            sessionInfo.index
          )
        );

      await table.readRecords();
    } catch {
      return null;
    }

    if (
      !table ||
      getRuntimeTableId(
        table
      ) !==
        tableId
    ) {
      return null;
    }

    const tableInfo = {
      table,

      tableIndex:
        Number(
          sessionInfo.index
        ),

      tableName:
        String(
          table.name ?? ''
        )
    };

    runtimeTableCache.set(
      tableId,
      tableInfo
    );

    return tableInfo;
  }

  async function resolveReference(
    value
  ) {
    const binary =
      String(
        value ?? ''
      ).trim();

    if (
      !/^[01]{32}$/.test(
        binary
      ) ||
      /^0{32}$/.test(
        binary
      )
    ) {
      return null;
    }

    const tableId =
      Number.parseInt(
        binary.slice(0, 15),
        2
      );

    const row =
      Number.parseInt(
        binary.slice(15),
        2
      );

    const tableInfo =
      await getTableInfoByRuntimeId(
        tableId
      );

    if (
      !tableInfo ||
      !Number.isInteger(
        row
      ) ||
      row < 0 ||
      row >=
        (
          tableInfo.table.records ??
          []
        ).length
    ) {
      return null;
    }

    return {
      ...tableInfo,
      tableId,
      row,
      raw:
        binary
    };
  }

  let teamsWithBoards = 0;
  let membershipCount = 0;

  for (
    const teamRecord
    of teamTableInfo.table.records ?? []
  ) {
    if (
      !isUsableRecord(
        teamRecord
      ) ||
      !hasFields(
        teamRecord,
        [
          'TeamIndex',
          'RecruitingBoard'
        ]
      )
    ) {
      continue;
    }

    const teamId =
      Number.parseInt(
        teamRecord.TeamIndex,
        10
      );

    if (
      !Number.isInteger(
        teamId
      )
    ) {
      continue;
    }

    const boardReference =
      await resolveReference(
        teamRecord.RecruitingBoard
      );

    const boardRecord =
      boardReference
        ?.table
        ?.records?.[
          boardReference.row
        ];

    if (
      !isUsableRecord(
        boardRecord
      ) ||
      !hasField(
        boardRecord,
        'Recruits'
      )
    ) {
      continue;
    }

    const recruitsReference =
      await resolveReference(
        boardRecord.Recruits
      );

    const recruitsRecord =
      recruitsReference
        ?.table
        ?.records?.[
          recruitsReference.row
        ];

    if (
      !isUsableRecord(
        recruitsRecord
      )
    ) {
      continue;
    }

    teamsWithBoards++;

    const targetFieldNames =
      Object.keys(
        recruitsRecord.fields ?? {}
      )
        .filter(
          fieldName =>
            /^RecruitTarget\d+$/.test(
              fieldName
            )
        )
        .sort(
          (left, right) =>
            Number.parseInt(
              left.replace(
                /^RecruitTarget/,
                ''
              ),
              10
            ) -
            Number.parseInt(
              right.replace(
                /^RecruitTarget/,
                ''
              ),
              10
            )
        );

    for (
      const fieldName
      of targetFieldNames
    ) {
      const targetReference =
        await resolveReference(
          recruitsRecord[
            fieldName
          ]
        );

      const targetRecord =
        targetReference
          ?.table
          ?.records?.[
            targetReference.row
          ];

      if (
        !isUsableRecord(
          targetRecord
        ) ||
        !hasField(
          targetRecord,
          'Recruit'
        )
      ) {
        continue;
      }

      const recruitReference =
        await resolveReference(
          targetRecord.Recruit
        );

      if (
        !recruitReference ||
        recruitReference.tableIndex !==
          recruitTableInfo.tableIndex
      ) {
        continue;
      }

      const recruitKey =
        `${recruitReference.tableIndex}:${recruitReference.row}`;

      const existingTeamIds =
        teamIdsByRecruitKey.get(
          recruitKey
        ) ?? [];

      if (
        !existingTeamIds.includes(
          teamId
        )
      ) {
        existingTeamIds.push(
          teamId
        );

        teamIdsByRecruitKey.set(
          recruitKey,
          existingTeamIds
        );

        membershipCount++;
      }

      if (
        Number.isInteger(
          userTeamId
        ) &&
        teamId === userTeamId
      ) {
        userTargetNilByRecruitKey.set(
          recruitKey,
          {
            hasUserRecruitTarget:
              true,

            nilExpectation:
              hasField(
                targetRecord,
                'NILExpectation'
              )
                ? serializeValue(
                    targetRecord.NILExpectation
                  )
                : null,

            originalNilExpectation:
              hasField(
                targetRecord,
                'OriginalNILExpectation'
              )
                ? serializeValue(
                    targetRecord
                      .OriginalNILExpectation
                  )
                : null,

            currentNILOffer:
              hasField(
                targetRecord,
                'CurrentNILOffer'
              )
                ? serializeValue(
                    targetRecord.CurrentNILOffer
                  )
                : null
          }
        );
      }
    }
  }

  return {
    teamIdsByRecruitKey,
    userTargetNilByRecruitKey,
    teamsWithBoards,
    membershipCount
  };
}

async function buildRecruitTopSchoolsContext({
  franchise,
  session = null
}) {
  const listTableInfo =
    await findTableByNameAndStore({
      franchise,
      session,
      tableName:
        'ProspectTargetSchool[]',
      tableStoreName:
        RECRUIT_TOP_SCHOOLS_LIST_STORE,
      requiredFields:
        TOP_SCHOOL_LIST_FIELDS,
      requireArray:
        true
    });

  const highSchoolTargetTableInfo =
    await findTableByNameAndStore({
      franchise,
      session,
      tableName:
        'ProspectTargetSchool',
      tableStoreName:
        RECRUIT_TARGET_SCHOOLS_STORE,
      requiredFields: [
        'TeamId',
        'TeamInfluence'
      ],
      requireArray:
        false
    });

  let transferTargetTableInfo =
    null;

  try {
    transferTargetTableInfo =
      await findTableByNameAndStore({
        franchise,
        session,
        tableName:
          'ProspectTargetSchool',
        tableStoreName:
          TRANSFER_TARGET_SCHOOLS_STORE,
        requiredFields: [
          'TeamId',
          'TeamInfluence'
        ],
        requireArray:
          false
      });
  } catch {
    transferTargetTableInfo =
      null;
  }

  const targetTableInfos = [
    highSchoolTargetTableInfo,
    transferTargetTableInfo
  ].filter(Boolean);

  const targetTablesByIndex =
    new Map(
      targetTableInfos.map(
        tableInfo => [
          Number(
            tableInfo.tableIndex
          ),
          tableInfo
        ]
      )
    );

  const teamTableInfo =
    await findValidatedTeamTable({
      franchise,
      session
    });

  const referenceMap =
    new Map();

  addRuntimeTableToMap(
    referenceMap,
    listTableInfo
  );

  for (
    const tableInfo
    of targetTableInfos
  ) {
    addRuntimeTableToMap(
      referenceMap,
      tableInfo
    );
  }

  const teamOptions = [];
  const teamIds =
    new Set();

  for (
    const record
    of teamTableInfo.table.records ?? []
  ) {
    if (
      !isUsableRecord(
        record
      ) ||
      !hasFields(
        record,
        [
          'TeamIndex',
          'DisplayName'
        ]
      )
    ) {
      continue;
    }

    const teamId =
      Number.parseInt(
        record.TeamIndex,
        10
      );

    const displayName =
      String(
        record.DisplayName ?? ''
      ).trim();

    if (
      !Number.isInteger(
        teamId
      ) ||
      !displayName ||
      teamIds.has(
        teamId
      )
    ) {
      continue;
    }

    teamIds.add(
      teamId
    );

    teamOptions.push({
      value:
        teamId,
      label:
        displayName
    });
  }

  if (
    teamOptions.length < 100
  ) {
    throw new Error(
      `The dynamically resolved Team table contained only ${teamOptions.length} valid unique teams.`
    );
  }

  teamOptions.sort(
    (left, right) =>
      left.label.localeCompare(
        right.label,
        undefined,
        {
          sensitivity:
            'base',
          numeric:
            true
        }
      )
  );

  return {
    listTableInfo,
    targetTableInfo:
      highSchoolTargetTableInfo,
    highSchoolTargetTableInfo,
    transferTargetTableInfo,
    targetTableInfos,
    targetTablesByIndex,
    teamTableInfo,
    referenceMap,
    teamOptions,
    teamIds
  };
}

/* PocketScout Recruiting Helper partial Top 10 support v1 */
function resolveRecruitTopSchools({
  recruitRecord,
  context
}) {
  const topSchoolsListReference =
    decodeBinaryReference(
      recruitRecord.TopSchoolsList,
      context.referenceMap
    );

  if (
    !topSchoolsListReference ||
    topSchoolsListReference
      .tableIndex !==
      context.listTableInfo
        .tableIndex
  ) {
    throw new Error(
      'Recruit.TopSchoolsList did not resolve to ProspectTopSchoolsListStore.'
    );
  }

  const listRecord =
    topSchoolsListReference
      .table
      .records?.[
        topSchoolsListReference.row
      ];

  if (
    !isUsableRecord(
      listRecord
    )
  ) {
    throw new Error(
      'The selected recruit TopSchoolsList row is invalid.'
    );
  }

  const resolvedSchools = [];

  for (
    let slot = 0;
    slot < TOP_SCHOOL_LIST_FIELDS.length;
    slot++
  ) {
    const fieldName =
      TOP_SCHOOL_LIST_FIELDS[slot];

    if (
      !hasField(
        listRecord,
        fieldName
      )
    ) {
      continue;
    }

    const targetReference =
      decodeBinaryReference(
        listRecord[fieldName],
        context.referenceMap
      );

    const targetTableInfo =
      targetReference
        ? context.targetTablesByIndex
            ?.get(
              Number(
                targetReference.tableIndex
              )
            )
        : null;

    /*
     * Game-created recruits can contain fewer than 10 valid target-school
     * references. Skip only the missing/bad slot instead of rejecting the
     * entire recruit.
     */
    if (
      !targetReference ||
      !targetTableInfo
    ) {
      continue;
    }

    const targetRecord =
      targetReference
        .table
        .records?.[
          targetReference.row
        ];

    if (
      !isUsableRecord(
        targetRecord
      ) ||
      !hasFields(
        targetRecord,
        [
          'TeamId',
          'TeamInfluence'
        ]
      )
    ) {
      continue;
    }

    const teamId =
      Number.parseInt(
        targetRecord.TeamId,
        10
      );

    if (
      !Number.isInteger(
        teamId
      )
    ) {
      continue;
    }

    const matchingTeam =
      context.teamOptions.find(
        option =>
          Number(
            option.value
          ) ===
          teamId
      );

    resolvedSchools.push({
      slot,
      listField:
        fieldName,
      targetTableIndex:
        targetReference.tableIndex,
      targetTableStoreName:
        targetTableInfo
          .tableStoreName,
      targetRow:
        targetReference.row,
      teamId,
      teamName:
        matchingTeam?.label ??
        `Unknown Team ${teamId}`,
      teamInfluence:
        Number(
          targetRecord.TeamInfluence
        )
    });
  }

  return resolvedSchools;
}
/* END PocketScout Recruiting Helper partial Top 10 support v1 */

async function findTableByNameAndStore({
  franchise,
  session,
  tableName,
  tableStoreName,
  requiredFields,
  requireArray
}) {
  const candidateIndexes =
    new Set();

  for (
    const info
    of session?.tablesByName?.[
      tableName
    ] ?? []
  ) {
    if (
      Number.isInteger(
        Number(
          info?.index
        )
      )
    ) {
      candidateIndexes.add(
        Number(
          info.index
        )
      );
    }
  }

  const sessionTables =
    session?.tables ?? [];

  for (const info of sessionTables) {
    if (
      String(
        info?.name ?? ''
      ) ===
        tableName &&
      Number.isInteger(
        Number(
          info?.index
        )
      )
    ) {
      candidateIndexes.add(
        Number(
          info.index
        )
      );
    }
  }

  if (
    candidateIndexes.size === 0
  ) {
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
        String(
          table.name ?? ''
        ) ===
        tableName
      ) {
        candidateIndexes.add(
          tableIndex
        );
      }
    }
  }

  const validCandidates = [];

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
    } catch {
      continue;
    }

    if (
      !table ||
      String(
        table.name ?? ''
      ) !==
        tableName
    ) {
      continue;
    }

    const actualStoreName =
      String(
        table.header
          ?.tableStoreName ??
        ''
      );

    if (
      actualStoreName !==
      tableStoreName
    ) {
      continue;
    }

    if (
      Boolean(
        table.isArray
      ) !==
      Boolean(
        requireArray
      )
    ) {
      continue;
    }

    try {
      await table.readRecords();
    } catch {
      continue;
    }

    const validRecordCount =
      (
        table.records ?? []
      ).filter(
        record =>
          isUsableRecord(
            record
          ) &&
          hasFields(
            record,
            requiredFields
          )
      ).length;

    if (
      validRecordCount === 0
    ) {
      continue;
    }

    validCandidates.push({
      table,
      tableIndex,
      tableName:
        String(
          table.name ?? ''
        ),
      tableStoreName:
        actualStoreName,
      validRecordCount
    });
  }

  if (
    validCandidates.length === 0
  ) {
    throw new Error(
      `Could not dynamically resolve ${tableName} with tableStoreName ${tableStoreName} and required fields: ${requiredFields.join(', ')}.`
    );
  }

  validCandidates.sort(
    (left, right) =>
      right.validRecordCount -
        left.validRecordCount ||
      left.tableIndex -
        right.tableIndex
  );

  if (
    validCandidates.length > 1 &&
    validCandidates[0]
      .validRecordCount ===
      validCandidates[1]
        .validRecordCount
  ) {
    throw new Error(
      `Multiple ambiguous ${tableName} tables matched tableStoreName ${tableStoreName}.`
    );
  }

  return validCandidates[0];
}

async function findValidatedTeamTable({
  franchise,
  session
}) {
  const resolvedTeam =
    session?.resolvedTables?.Team;

  if (
    !resolvedTeam ||
    !Number.isInteger(
      Number(
        resolvedTeam.index
      )
    )
  ) {
    throw new Error(
      'The current dynasty session does not contain a dynamically resolved Team table.'
    );
  }

  const tableIndex =
    Number(
      resolvedTeam.index
    );

  let table = null;

  try {
    table =
      franchise.getTableByIndex(
        tableIndex
      );
  } catch {
    throw new Error(
      'Could not open the dynamically resolved Team table.'
    );
  }

  if (
    !table ||
    String(
      table.name ?? ''
    ) !==
      'Team'
  ) {
    throw new Error(
      'The dynamically resolved Team table no longer has the expected Team name.'
    );
  }

  await table.readRecords();

  const uniqueTeams =
    new Set();

  for (
    const record
    of table.records ?? []
  ) {
    if (
      !isUsableRecord(
        record
      ) ||
      !hasFields(
        record,
        [
          'TeamIndex',
          'DisplayName',
          'LongName',
          'CurrentPopularity',
          'TeamBuilderData',
          'ContractOfferBlacklist',
          'TeamFan_Family',
          'TeamFan_Hardcore'
        ]
      )
    ) {
      continue;
    }

    const teamIndex =
      Number.parseInt(
        record.TeamIndex,
        10
      );

    const displayName =
      String(
        record.DisplayName ?? ''
      ).trim();

    if (
      Number.isInteger(
        teamIndex
      ) &&
      displayName
    ) {
      uniqueTeams.add(
        teamIndex
      );
    }
  }

  if (
    uniqueTeams.size < 100
  ) {
    throw new Error(
      `The Team candidate at runtime index ${tableIndex} contained only ${uniqueTeams.size} valid unique teams.`
    );
  }

  return {
    table,
    tableIndex,
    tableName:
      'Team',
    validTeamCount:
      uniqueTeams.size
  };
}

function addRuntimeTableToMap(
  tableMap,
  tableInfo
) {
  const tableId =
    getRuntimeTableId(
      tableInfo.table
    );

  if (
    !Number.isInteger(
      tableId
    )
  ) {
    throw new Error(
      `Could not determine the runtime table ID for ${tableInfo.tableName} at index ${tableInfo.tableIndex}.`
    );
  }

  tableMap.set(
    tableId,
    {
      table:
        tableInfo.table,
      tableIndex:
        tableInfo.tableIndex,
      tableName:
        tableInfo.tableName
    }
  );
}

async function openFranchise(
  inputPath
) {
  if (!inputPath) {
    throw new Error(
      'Missing dynasty file.'
    );
  }

  const resolvedInput =
    path.resolve(inputPath);

  if (
    !fs.existsSync(
      resolvedInput
    )
  ) {
    throw new Error(
      `Dynasty file does not exist: ${resolvedInput}`
    );
  }

  const franchise =
    await Franchise.create(
      resolvedInput,
      {
        gameTypeOverride:
          'college',

        gameYearOverride:
          27,

        saveOnChange:
          false
      }
    );

  return {
    franchise,
    resolvedInput
  };
}

async function findRecruitTable(
  franchise,
  tableIdMap
) {
  const candidates = [];

  for (
    const tableInfo
    of tableIdMap.values()
  ) {
    const table =
      tableInfo.table;

    if (
      String(
        table?.name ?? ''
      ) !== RECRUIT_TABLE_NAME
    ) {
      continue;
    }

    if (
      Boolean(
        table?.isArray
      )
    ) {
      continue;
    }

    let validRecruitCount = 0;

    for (
      const record
      of table.records ?? []
    ) {
      if (
        !isUsableRecord(
          record
        ) ||
        !hasFields(
          record,
          RECRUIT_REQUIRED_FIELDS
        )
      ) {
        continue;
      }

      const playerReference =
        decodeBinaryReference(
          record.Player,
          tableIdMap
        );

      if (!playerReference) {
        continue;
      }

      const playerRecord =
        playerReference.table.records?.[
          playerReference.row
        ];

      if (
        isUsableRecord(
          playerRecord
        )
      ) {
        validRecruitCount++;
      }
    }

    if (
      validRecruitCount > 0
    ) {
      candidates.push({
        table,
        tableIndex:
          tableInfo.tableIndex,
        validRecruitCount
      });
    }
  }

  if (!candidates.length) {
    throw new Error(
      'Could not find a Recruit table containing TopSchoolsList, Player, RecruitStage, NationalRank, and SurnameAudioID with valid Player references.'
    );
  }

  candidates.sort(
    (left, right) =>
      right.validRecruitCount -
        left.validRecruitCount ||
      left.tableIndex -
        right.tableIndex
  );

  return candidates[0];
}


async function buildRecruitingHelperTableContext({
  franchise,
  session = null
}) {
  const sessionContext =
    await tryBuildRecruitingHelperSessionContext({
      franchise,
      session
    });

  if (sessionContext) {
    return {
      ...sessionContext,
      resolutionMode:
        'session-fast-path'
    };
  }

  const tableIdMap =
    await buildTableIdMap(
      franchise
    );

  const recruitTableInfo =
    await findRecruitTable(
      franchise,
      tableIdMap
    );

  return {
    tableIdMap,
    recruitTableInfo,
    resolutionMode:
      'full-dynamic-scan'
  };
}

async function tryBuildRecruitingHelperSessionContext({
  franchise,
  session
}) {
  const recruitInfo =
    session?.resolvedTables?.Recruit;

  if (
    !recruitInfo ||
    !Number.isInteger(
      Number(recruitInfo.index)
    )
  ) {
    return null;
  }

  let recruitTable = null;

  try {
    recruitTable =
      franchise.getTableByIndex(
        Number(recruitInfo.index)
      );
  } catch {
    return null;
  }

  if (
    !recruitTable ||
    String(
      recruitTable.name ?? ''
    ) !== RECRUIT_TABLE_NAME ||
    Boolean(recruitTable.isArray)
  ) {
    return null;
  }

  try {
    await recruitTable.readRecords();
  } catch {
    return null;
  }

  const signatureRecord =
    (recruitTable.records ?? [])
      .find(record =>
        isUsableRecord(record) &&
        hasFields(
          record,
          RECRUIT_REQUIRED_FIELDS
        )
      );

  if (!signatureRecord) {
    return null;
  }

  let playerTableId = null;
  let playerRow = null;

  for (
    const record
    of recruitTable.records ?? []
  ) {
    if (
      !isUsableRecord(record) ||
      !hasFields(
        record,
        RECRUIT_REQUIRED_FIELDS
      )
    ) {
      continue;
    }

    const binary =
      String(
        record.Player ?? ''
      ).trim();

    if (
      !/^[01]{32}$/.test(binary) ||
      /^0{32}$/.test(binary)
    ) {
      continue;
    }

    const decodedTableId =
      Number.parseInt(
        binary.slice(0, 15),
        2
      );

    const decodedRow =
      Number.parseInt(
        binary.slice(15),
        2
      );

    if (
      Number.isInteger(decodedTableId) &&
      Number.isInteger(decodedRow)
    ) {
      playerTableId =
        decodedTableId;

      playerRow =
        decodedRow;

      break;
    }
  }

  if (
    !Number.isInteger(playerTableId) ||
    !Number.isInteger(playerRow)
  ) {
    return null;
  }

  const playerInfo =
    session?.tablesById?.[
      String(playerTableId)
    ];

  if (
    !playerInfo ||
    !Number.isInteger(
      Number(playerInfo.index)
    )
  ) {
    return null;
  }

  let playerTable = null;

  try {
    playerTable =
      franchise.getTableByIndex(
        Number(playerInfo.index)
      );
  } catch {
    return null;
  }

  if (
    !playerTable ||
    String(
      playerTable.name ?? ''
    ) !== 'Player'
  ) {
    return null;
  }

  try {
    await playerTable.readRecords();
  } catch {
    return null;
  }

  const linkedPlayerRecord =
    playerTable.records?.[
      playerRow
    ];

  if (
    !isUsableRecord(
      linkedPlayerRecord
    )
  ) {
    return null;
  }

  const recruitTableId =
    getRuntimeTableId(
      recruitTable
    );

  if (
    !Number.isInteger(
      recruitTableId
    )
  ) {
    return null;
  }

  const tableIdMap =
    new Map();

  tableIdMap.set(
    recruitTableId,
    {
      table:
        recruitTable,

      tableIndex:
        Number(
          recruitInfo.index
        ),

      tableName:
        String(
          recruitTable.name ?? ''
        )
    }
  );

  tableIdMap.set(
    playerTableId,
    {
      table:
        playerTable,

      tableIndex:
        Number(
          playerInfo.index
        ),

      tableName:
        String(
          playerTable.name ?? ''
        )
    }
  );

  const recruitTableInfo =
    await findRecruitTable(
      franchise,
      tableIdMap
    );

  return {
    tableIdMap,
    recruitTableInfo
  };
}

function getRuntimeTableId(
  table
) {
  const candidates = [
    table?.header?.tableId,
    table?.header?.data1TableId,
    table?.tableId
  ];

  for (const candidate of candidates) {
    const parsed =
      Number.parseInt(
        candidate,
        10
      );

    if (
      Number.isInteger(parsed)
    ) {
      return parsed;
    }
  }

  return null;
}

async function buildTableIdMap(
  franchise
) {
  const foundByIndex =
    new Map();

  const possibleTables =
    franchise.tables;

  function addTable(
    table,
    tableIndex
  ) {
    if (
      !table ||
      !Number.isInteger(
        tableIndex
      ) ||
      foundByIndex.has(
        tableIndex
      )
    ) {
      return;
    }

    foundByIndex.set(
      tableIndex,
      table
    );
  }

  if (
    Array.isArray(
      possibleTables
    )
  ) {
    possibleTables.forEach(
      (table, index) =>
        addTable(
          table,
          index
        )
    );
  } else if (
    possibleTables &&
    typeof possibleTables ===
      'object'
  ) {
    for (
      const [
        key,
        value
      ] of Object.entries(
        possibleTables
      )
    ) {
      const parsedKey =
        Number.parseInt(
          key,
          10
        );

      if (
        Array.isArray(
          value
        )
      ) {
        value.forEach(
          (table, subIndex) =>
            addTable(
              table,
              Number.isInteger(
                parsedKey
              )
                ? parsedKey +
                    subIndex
                : subIndex
            )
        );
      } else {
        addTable(
          value,
          Number.isInteger(
            parsedKey
          )
            ? parsedKey
            : foundByIndex.size
        );
      }
    }
  }

  let misses = 0;

  for (
    let tableIndex = 0;
    tableIndex < 10000 &&
    misses < 50;
    tableIndex++
  ) {
    try {
      const table =
        franchise.getTableByIndex(
          tableIndex
        );

      if (table) {
        addTable(
          table,
          tableIndex
        );

        misses = 0;
      } else {
        misses++;
      }
    } catch {
      misses++;
    }
  }

  const tableIdMap =
    new Map();

  for (
    const [
      tableIndex,
      table
    ] of foundByIndex
  ) {
    try {
      await table.readRecords();
    } catch {
      continue;
    }

    const tableIds = [
      table.header?.tableId,
      table.header?.uniqueId,
      table.header?.id,
      table.tableId,
      table.uniqueId
    ];

    for (
      const possibleId
      of tableIds
    ) {
      const tableId =
        Number.parseInt(
          possibleId,
          10
        );

      if (
        !Number.isInteger(
          tableId
        )
      ) {
        continue;
      }

      if (
        !tableIdMap.has(
          tableId
        )
      ) {
        tableIdMap.set(
          tableId,
          {
            table,
            tableIndex,
            tableName:
              String(
                table.name ?? ''
              )
          }
        );
      }
    }
  }

  return tableIdMap;
}

function decodeBinaryReference(
  value,
  tableIdMap
) {
  const binary =
    String(
      value ?? ''
    ).trim();

  if (
    !/^[01]{32}$/.test(
      binary
    ) ||
    /^0{32}$/.test(
      binary
    )
  ) {
    return null;
  }

  const tableId =
    Number.parseInt(
      binary.slice(0, 15),
      2
    );

  const row =
    Number.parseInt(
      binary.slice(15),
      2
    );

  const tableInfo =
    tableIdMap.get(
      tableId
    );

  if (
    !tableInfo ||
    !Number.isInteger(
      row
    ) ||
    row < 0 ||
    row >=
      (tableInfo.table.records ?? [])
        .length
  ) {
    return null;
  }

  return {
    ...tableInfo,
    tableId,
    row,
    raw:
      binary
  };
}

function getEditablePlayerFieldNames(
  playerRecord
) {
  const availableFields =
    Object.keys(
      playerRecord.fields ?? {}
    );

  const ratingFields =
    availableFields
      .filter(
        fieldName =>
          /Rating$/i.test(
            fieldName
          )
      )
      .sort(
        (left, right) =>
          left.localeCompare(
            right
          )
      );

  return [
    ...new Set([
      ...EDITABLE_PLAYER_FIELDS,
      ...ratingFields
    ])
  ].filter(
    fieldName =>
      hasField(
        playerRecord,
        fieldName
      )
  );
}

function applyRecruitingHelperEnumOptions(
  recruits
) {
  /* PocketScout Recruiting Helper QualityModifier rating popup filter v1 */
  const recruitEnumFields = [
    'RecruitStage',
    'Class',
    'QualityModifier'
  ];

  const playerEnumFields = [
    'TraitDevelopment',
    'PlayerType',
    'Position',
    /* PocketScout untested Player Profile visual dropdowns v1 */
    'PLYR_STYLE',
    'PLYR_QBSTYLE',
    'PLYR_HANDEDNESS',
    'PLYR_STANCE',
    'PLYR_TENDENCY',
    'PlayerVisMoveType',
    'Personality',
    'RecruitingDealbreaker',
    'PLYR_HOME_STATE',
    'HomePipeline',
    'Scheme',
    'IdealRecruitingPitch',
    'ProspectStarRating'
  ];

  const optionsBySourceAndField =
    new Map();

  function optionKey(
    source,
    fieldName
  ) {
    return `${source}:${fieldName}`;
  }

  for (
    const fieldName
    of recruitEnumFields
  ) {
    optionsBySourceAndField.set(
      optionKey(
        'recruit',
        fieldName
      ),
      new Set()
    );
  }

  for (
    const fieldName
    of playerEnumFields
  ) {
    optionsBySourceAndField.set(
      optionKey(
        'player',
        fieldName
      ),
      new Set()
    );
  }

  for (const recruit of recruits) {
    for (
      const field
      of recruit.recruitFields ?? []
    ) {
      const values =
        optionsBySourceAndField.get(
          optionKey(
            'recruit',
            field.field
          )
        );

      if (!values) {
        continue;
      }

      const value =
        String(
          field.value ?? ''
        ).trim();

      if (value) {
        values.add(value);
      }
    }

    for (
      const field
      of recruit.playerFields ?? []
    ) {
      const values =
        optionsBySourceAndField.get(
          optionKey(
            'player',
            field.field
          )
        );

      if (!values) {
        continue;
      }

      const value =
        String(
          field.value ?? ''
        ).trim();

      if (value) {
        values.add(value);
      }
    }
  }

  function applyOptions(
    field,
    source
  ) {
    let values = null;

    if (
      /^MentalAbility[123]$/.test(
        field.field
      )
    ) {
      values =
        MENTAL_ABILITY_OPTIONS;
    } else if (
      /^(?:MentalAbilityRank[123]|PhysicalAbility[1-5])$/.test(
        field.field
      )
    ) {
      values =
        MENTAL_ABILITY_RANK_OPTIONS;
    } else {
      const collectedValues =
        optionsBySourceAndField.get(
          optionKey(
            source,
            field.field
          )
        );

      if (collectedValues) {
        values =
          [...collectedValues];
      }
    }

    if (!values) {
      return;
    }

    const currentValue =
      String(
        field.value ?? ''
      ).trim();

    const normalizedValues = [
      ...new Set([
        ...values,
        ...(currentValue
          ? [currentValue]
          : [])
      ])
    ];

    field.valueType =
      'enum';

    field.options =
      normalizedValues
        .map(value => ({
          value,

          label:
            formatRecruitingHelperEnumLabel(
              value
            )
        }));
  }

  for (const recruit of recruits) {
    for (
      const field
      of recruit.recruitFields ?? []
    ) {
      applyOptions(
        field,
        'recruit'
      );
    }

    for (
      const field
      of recruit.playerFields ?? []
    ) {
      applyOptions(
        field,
        'player'
      );
    }
  }
}

function formatRecruitingHelperEnumLabel(
  value
) {
  return String(value ?? '')
    .trim()
    .replace(
      /_/g,
      ' '
    )
    .replace(
      /([a-z0-9])([A-Z])/g,
      '$1 $2'
    )
    .replace(
      /\s+/g,
      ' '
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      character =>
        character.toUpperCase()
    );
}

/* PocketScout Recruiting Helper Previous Team v1 */
function buildRecruitingHelperPlayerFields(
  playerRecord,
  teamOptions = []
) {
  const fields =
    buildFieldList(
      playerRecord,
      getEditablePlayerFieldNames(
        playerRecord
      )
    );

  if (
    !hasField(
      playerRecord,
      'PrevTeamIndex'
    )
  ) {
    return fields;
  }

  const previousTeamIndex =
    toInteger(
      playerRecord.PrevTeamIndex,
      255
    );

  const matchingTeam =
    (teamOptions ?? []).find(
      option =>
        Number.parseInt(
          option?.value,
          10
        ) ===
          previousTeamIndex
    );

  let previousTeamName =
    matchingTeam?.label ??
    (
      previousTeamIndex === 255
        ? 'No Previous Team'
        : `Unknown Team ${previousTeamIndex}`
    );

  if (
    previousTeamIndex === 255
  ) {
    previousTeamName =
      'No Previous Team';
  }

  fields.push({
    field:
      'PreviousTeam',
    label:
      'Previous Team',
    value:
      previousTeamIndex === 255
        ? previousTeamName
        : `${previousTeamName} (${previousTeamIndex})`,
    valueType:
      'text',
    readOnly:
      true,
    sourceField:
      'PrevTeamIndex'
  });

  return fields;
}
/* END PocketScout Recruiting Helper Previous Team v1 */

function buildFieldList(
  record,
  fieldNames
) {
  return fieldNames
    .filter(
      fieldName =>
        hasField(
          record,
          fieldName
        )
    )
    .map(
      fieldName => {
        const value =
          record[fieldName];

        return {
          field:
            fieldName,

          value:
            serializeValue(
              value
            ),

          valueType:
            inferValueType(
              value,
              record.fields?.[
                fieldName
              ]
            )
        };
      }
    );
}

function inferValueType(
  value,
  fieldMetadata
) {
  if (
    typeof value ===
    'boolean'
  ) {
    return 'boolean';
  }

  if (
    typeof value ===
    'number'
  ) {
    return 'number';
  }

  /*
   * FranchiseFileField metadata contains a circular
   * _parent reference. Never JSON.stringify it.
   *
   * Only inspect shallow primitive properties.
   */
  const metadataParts = [];

  if (
    fieldMetadata &&
    typeof fieldMetadata ===
      'object'
  ) {
    for (
      const [
        key,
        metadataValue
      ] of Object.entries(
        fieldMetadata
      )
    ) {
      if (
        key === '_parent' ||
        key === 'parent'
      ) {
        continue;
      }

      const metadataType =
        typeof metadataValue;

      if (
        metadataType ===
          'string' ||
        metadataType ===
          'number' ||
        metadataType ===
          'boolean'
      ) {
        metadataParts.push(
          `${key}:${metadataValue}`
        );
      }
    }
  }

  const metadataText =
    metadataParts
      .join(' ')
      .toLowerCase();

  if (
    metadataText.includes(
      'bool'
    )
  ) {
    return 'boolean';
  }

  /* PocketScout Recruiting Helper enum coercion hard fix v3 */
  if (
    metadataText.includes(
      'enum'
    )
  ) {
    return 'text';
  }
  /* END PocketScout Recruiting Helper enum coercion hard fix v3 */

  if (
    metadataText.includes(
      'int'
    ) ||
    metadataText.includes(
      'uint'
    ) ||
    metadataText.includes(
      'float'
    ) ||
    metadataText.includes(
      'double'
    ) ||
    metadataText.includes(
      'number'
    )
  ) {
    return 'number';
  }

  /*
   * Numeric strings are common in generic schemas.
   * Treat them as numbers when the current value
   * contains only a valid numeric representation.
   */
  if (
    typeof value ===
      'string' &&
    value.trim() !== '' &&
    /^-?\d+(?:\.\d+)?$/.test(
      value.trim()
    )
  ) {
    return 'number';
  }

  return 'text';
}

function coerceEditedValue(
  submittedValue,
  oldValue,
  fieldMetadata,
  fieldName = ''
) {
  /* PocketScout Recruiting Helper explicit enum field coercion v4 */
  const stringEnumFields =
    new Set(
      [
      "RecruitStage",
      "Class",
      "TraitDevelopment",
      "PlayerType",
      "Position",
      "PLYR_STYLE",
      "PLYR_QBSTYLE",
      "PLYR_HANDEDNESS",
      "PLYR_STANCE",
      "PLYR_TENDENCY",
      "PlayerVisMoveType",
      "Personality",
      "RecruitingDealbreaker",
      "PLYR_HOME_STATE",
      "HomePipeline",
      "Scheme",
      "IdealRecruitingPitch",
      "ProspectStarRating",
      "MentalAbility1",
      "MentalAbility2",
      "MentalAbility3",
      "MentalAbilityRank1",
      "MentalAbilityRank2",
      "MentalAbilityRank3",
      "PhysicalAbility1",
      "PhysicalAbility2",
      "PhysicalAbility3",
      "PhysicalAbility4",
      "PhysicalAbility5"
]
    );

  if (
    stringEnumFields.has(
      String(fieldName)
    )
  ) {
    return String(
      submittedValue ?? ''
    );
  }
  /* END PocketScout Recruiting Helper explicit enum field coercion v4 */

  const valueType =
    inferValueType(
      oldValue,
      fieldMetadata
    );

  if (
    valueType ===
    'boolean'
  ) {
    const normalized =
      String(
        submittedValue ?? ''
      )
        .trim()
        .toLowerCase();

    return (
      normalized === 'true' ||
      normalized === '1' ||
      normalized === 'yes'
    );
  }

  if (
    valueType ===
    'number'
  ) {
    const metadataText =
      [
        fieldMetadata?.type,
        fieldMetadata?.valueType,
        fieldMetadata?.dataType,
        fieldMetadata?.fieldType,
        fieldMetadata?.schemaType,
        fieldMetadata?.constructor?.name
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    if (
      metadataText.includes(
        'enum'
      ) &&
      !Number.isFinite(
        Number(
          submittedValue
        )
      )
    ) {
      return String(
        submittedValue ?? ''
      );
    }

    const numericValue =
      Number(
        submittedValue
      );

    if (
      !Number.isFinite(
        numericValue
      )
    ) {
      throw new Error(
        `Invalid numeric value: ${submittedValue}`
      );
    }

    if (
      String(fieldName) ===
        'Height' &&
      numericValue > 95
    ) {
      throw new Error(
        'Height cannot be greater than 95.'
      );
    }

    if (
      Number.isInteger(
        oldValue
      )
    ) {
      return Math.trunc(
        numericValue
      );
    }

    return numericValue;
  }

  return String(
    submittedValue ?? ''
  );
}

function serializeValue(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  if (
    typeof value !==
    'object'
  ) {
    return String(value);
  }

  /*
   * Avoid serializing FranchiseFileRecord or
   * FranchiseFileField objects, which contain
   * circular parent references.
   */
  if (
    value.constructor?.name ===
      'FranchiseFileRecord' ||
    value.constructor?.name ===
      'FranchiseFileField'
  ) {
    return '';
  }

  const seen = new WeakSet();

  try {
    return JSON.stringify(
      value,
      (key, nestedValue) => {
        if (
          key === '_parent' ||
          key === 'parent'
        ) {
          return undefined;
        }

        if (
          nestedValue &&
          typeof nestedValue ===
            'object'
        ) {
          if (
            seen.has(
              nestedValue
            )
          ) {
            return undefined;
          }

          seen.add(
            nestedValue
          );
        }

        return nestedValue;
      }
    );
  } catch {
    return String(value);
  }
}

function findOverallRating(
  playerRecord
) {
  const preferredFields = [
    'OverallRating',
    'PLYR_OVERALLRATING',
    'PlayerOverallRating'
  ];

  for (
    const fieldName
    of preferredFields
  ) {
    if (
      hasField(
        playerRecord,
        fieldName
      )
    ) {
      return toInteger(
        playerRecord[fieldName],
        0
      );
    }
  }

  const overallField =
    Object.keys(
      playerRecord.fields ?? {}
    ).find(
      fieldName =>
        /overall.*rating/i.test(
          fieldName
        )
    );

  return overallField
    ? toInteger(
        playerRecord[overallField],
        0
      )
    : 0;
}

function parseProspectStarRating(
  value
) {
  if (
    typeof value ===
      'number' &&
    Number.isFinite(value)
  ) {
    return Math.max(
      0,
      Math.min(
        5,
        Math.trunc(value)
      )
    );
  }

  const normalized =
    String(value ?? '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

  if (!normalized) {
    return 0;
  }

  const directNumber =
    Number.parseInt(
      normalized,
      10
    );

  if (
    Number.isInteger(
      directNumber
    )
  ) {
    return Math.max(
      0,
      Math.min(
        5,
        directNumber
      )
    );
  }

  const starMap = {
    FIVE_STAR: 5,
    FIVESTAR: 5,
    FIVE: 5,
    FOUR_STAR: 4,
    FOURSTAR: 4,
    FOUR: 4,
    THREE_STAR: 3,
    THREESTAR: 3,
    THREE: 3,
    TWO_STAR: 2,
    TWOSTAR: 2,
    TWO: 2,
    ONE_STAR: 1,
    ONESTAR: 1,
    ONE: 1,
    ZERO_STAR: 0,
    ZEROSTAR: 0,
    ZERO: 0
  };

  if (
    Object.prototype
      .hasOwnProperty
      .call(
        starMap,
        normalized
      )
  ) {
    return starMap[
      normalized
    ];
  }

  const numericStarMatch =
    normalized.match(
      /(?:^|_)([0-5])(?:_?STAR)?$/
    );

  if (numericStarMatch) {
    return Number.parseInt(
      numericStarMatch[1],
      10
    );
  }

  return 0;
}

/* Recruiting Helper dropdown RecruitStage label */
function buildRecruitLabel({
  nationalRank,
  firstName,
  lastName,
  position,
  homeState,
  homePipeline,
  starRating,
  overallRating,
  recruitStage,
  totalScholarshipOffers,
  baseNILValue
}) {
  const rankText =
    Number.isFinite(
      nationalRank
    ) &&
    nationalRank < 999999
      ? nationalRank
      : '-';

  const fullName =
    [firstName, lastName]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    'Unknown Player';

  const positionText =
    String(
      position ?? ''
    ).trim() ||
    'Unknown';

  const homeStateText =
    String(
      homeState ?? ''
    ).trim();

  const homePipelineText =
    String(
      homePipeline ?? ''
    ).trim();

  const locationParts =
    [
      homeStateText,
      homePipelineText
    ].filter(Boolean);

  const nameAndLocation =
    locationParts.length
      ? `${fullName} (${locationParts.join(' - ')})`
      : fullName;

  const normalizedStars =
    Math.max(
      0,
      Math.min(
        5,
        Number.parseInt(
          starRating,
          10
        ) || 0
      )
    );

  const recruitStageText =
    String(
      recruitStage ?? ''
    ).trim() ||
    'Unknown Stage';

  const offerCount =
    Math.max(
      0,
      Number.parseInt(
        totalScholarshipOffers,
        10
      ) || 0
    );

  const nilText =
    baseNILValue ===
      null ||
    baseNILValue ===
      undefined ||
    String(
      baseNILValue
    ).trim() ===
      ''
      ? '-'
      : String(
          baseNILValue
        ).trim();

  return (
    `${rankText}. ` +
    `${nameAndLocation} - ` +
    `${positionText} - ` +
    `(${normalizedStars} Star) ` +
    `${overallRating} - ` +
    `${recruitStageText} ` +
    `(Offers: ${offerCount}) ` +
    `(NIL: ${nilText})`
  );
}

function compareByNationalRank(
  left,
  right
) {
  return (
    left.nationalRank -
      right.nationalRank ||
    left.fullName.localeCompare(
      right.fullName
    )
  );
}

function isUsableRecord(
  record
) {
  return Boolean(
    record &&
    !record.isEmpty &&
    record.fields
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

function toInteger(
  value,
  fallback = 0
) {
  const parsed =
    Number.parseInt(
      value,
      10
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : fallback;
}

function toText(
  value
) {
  return String(
    value ?? ''
  ).trim();
}

function valuesEqual(
  left,
  right
) {
  if (
    typeof left ===
      'number' &&
    typeof right ===
      'number'
  ) {
    return (
      Number(left) ===
      Number(right)
    );
  }

  return String(
    left ?? ''
  ) === String(
    right ?? ''
  );
}





/* PocketScout Player Mass Edit user-team StartingHotCold v1 */
/* PocketScout StartingHotCold hard-coded options v2 */
const PS_STARTING_HOT_COLD_OPTIONS = [
  'Hot',
  'Cold',
  'Neutral'
];

function isTruthyPlayerMassEditValue(
  value
) {
  return (
    value === true ||
    Number(value) === 1 ||
    String(value ?? '')
      .trim()
      .toLowerCase() ===
        'true'
  );
}

async function psFindPlayerMassEditTable(
  franchise,
  session
) {
  const {
    tableIdMap,
    recruitTableInfo,
    resolutionMode
  } =
    await buildRecruitingHelperTableContext({
      franchise,
      session
    });

  const playerTables =
    new Map();

  for (
    const recruitRecord
    of recruitTableInfo.table.records ?? []
  ) {
    if (
      !isUsableRecord(recruitRecord) ||
      !hasFields(
        recruitRecord,
        RECRUIT_REQUIRED_FIELDS
      )
    ) {
      continue;
    }

    const playerReference =
      decodeBinaryReference(
        recruitRecord.Player,
        tableIdMap
      );

    if (
      !playerReference ||
      String(
        playerReference.table?.name ?? ''
      ) !== 'Player' ||
      Boolean(
        playerReference.table?.isArray
      )
    ) {
      continue;
    }

    playerTables.set(
      Number(
        playerReference.tableIndex
      ),
      playerReference.table
    );
  }

  if (playerTables.size === 0) {
    throw new Error(
      'Could not dynamically resolve the Player table through Recruit.Player references.'
    );
  }

  if (playerTables.size > 1) {
    throw new Error(
      'Multiple Player tables were referenced by recruits; refusing an ambiguous mass edit.'
    );
  }

  const [
    [
      playerTableIndex,
      playerTable
    ]
  ] =
    playerTables;

  return {
    playerTable,
    playerTableIndex,
    resolutionMode
  };
}

function psIsValidUserCoachTable(
  table
) {
  return Boolean(
    table &&
    !table.isArray &&
    String(table.name ?? '') ===
      'Coach' &&
    (table.records ?? []).some(
      record =>
        isUsableRecord(record) &&
        hasField(
          record,
          'IsUserControlled'
        ) &&
        hasField(
          record,
          'TeamIndex'
        )
    )
  );
}

async function psFindUserCoachTable(
  franchise,
  session
) {
  const cachedIndex =
    Number.parseInt(
      session?.resolvedTables
        ?.Coach?.index ??
      session?.tablesByName
        ?.Coach?.[0]?.index,
      10
    );

  if (
    Number.isInteger(cachedIndex) &&
    cachedIndex >= 0
  ) {
    try {
      const table =
        franchise.getTableByIndex(
          cachedIndex
        );

      await table.readRecords();

      if (
        psIsValidUserCoachTable(
          table
        )
      ) {
        return {
          coachTable:
            table,
          coachTableIndex:
            cachedIndex,
          coachResolutionMode:
            'dynasty session'
        };
      }
    } catch {
      // Continue with dynamic discovery.
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
      String(table.name ?? '') !==
        'Coach' ||
      Boolean(table.isArray)
    ) {
      continue;
    }

    try {
      await table.readRecords();
    } catch {
      continue;
    }

    if (
      psIsValidUserCoachTable(
        table
      )
    ) {
      candidates.push({
        coachTable:
          table,
        coachTableIndex:
          tableIndex,
        coachResolutionMode:
          'field-signature discovery'
      });
    }
  }

  if (!candidates.length) {
    throw new Error(
      'Could not find the Coach table containing IsUserControlled and TeamIndex.'
    );
  }

  candidates.sort(
    (left, right) =>
      left.coachTableIndex -
      right.coachTableIndex
  );

  return candidates[0];
}

async function psLoadStartingHotColdContext({
  franchise,
  session
}) {
  const [
    playerContext,
    coachContext
  ] =
    await Promise.all([
      psFindPlayerMassEditTable(
        franchise,
        session
      ),
      psFindUserCoachTable(
        franchise,
        session
      )
    ]);

  const userControlledTeamIndexes =
    new Set();

  for (
    const coachRecord
    of coachContext.coachTable
      .records ?? []
  ) {
    if (
      !isUsableRecord(coachRecord) ||
      !hasField(
        coachRecord,
        'IsUserControlled'
      ) ||
      !hasField(
        coachRecord,
        'TeamIndex'
      ) ||
      !isTruthyPlayerMassEditValue(
        coachRecord.IsUserControlled
      )
    ) {
      continue;
    }

    const teamIndex =
      Number.parseInt(
        coachRecord.TeamIndex,
        10
      );

    if (
      Number.isInteger(teamIndex) &&
      teamIndex >= 0 &&
      teamIndex < 255
    ) {
      userControlledTeamIndexes.add(
        teamIndex
      );
    }
  }

  if (
    !userControlledTeamIndexes.size
  ) {
    throw new Error(
      'No user-controlled teams were found in the Coach table.'
    );
  }

  const startingHotColdOptions =
    new Set();

  let eligibleUserTeamPlayers = 0;

  for (
    const playerRecord
    of playerContext.playerTable
      .records ?? []
  ) {
    if (
      !isUsableRecord(playerRecord) ||
      !hasField(
        playerRecord,
        'TeamIndex'
      ) ||
      !hasField(
        playerRecord,
        'StartingHotCold'
      )
    ) {
      continue;
    }

    const teamIndex =
      Number.parseInt(
        playerRecord.TeamIndex,
        10
      );

    if (
      !userControlledTeamIndexes.has(
        teamIndex
      )
    ) {
      continue;
    }

    eligibleUserTeamPlayers++;

    const option =
      String(
        playerRecord.StartingHotCold ??
        ''
      ).trim();

    if (option) {
      startingHotColdOptions.add(
        option
      );
    }
  }

  if (!eligibleUserTeamPlayers) {
    throw new Error(
      'No valid Player records with StartingHotCold were found on user-controlled teams.'
    );
  }

  return {
    ...playerContext,
    ...coachContext,
    userControlledTeamIndexes,
    eligibleUserTeamPlayers,
    startingHotColdOptions:
      [...startingHotColdOptions]
        .sort(
          (left, right) =>
            left.localeCompare(
              right,
              undefined,
              {
                sensitivity:
                  'base',
                numeric:
                  true
              }
            )
        )
  };
}
/* END PocketScout Player Mass Edit user-team StartingHotCold v1 */


/* PocketScout Recruit Mass Edit */
/* PocketScout Dealbreaker OVR range filter v1 */
export async function runRecruitMassEdit({
  inputPath,
  outputPath,
  action,
  value,
  selectedTeamIndex = 'ALL',
  minimumOverall = 0,
  maximumOverall = 99,
  session = null
}) {
  const { franchise, resolvedInput } = await openFranchise(inputPath);
  const resolvedOutput = path.resolve(outputPath || inputPath);

  const normalizedSelectedTeamIndex =
    String(
      selectedTeamIndex ??
      'ALL'
    )
      .trim()
      .toUpperCase() === 'ALL'
        ? null
        : Number.parseInt(
            selectedTeamIndex,
            10
          );

  if (
    normalizedSelectedTeamIndex !== null &&
    (
      !Number.isInteger(
        normalizedSelectedTeamIndex
      ) ||
      normalizedSelectedTeamIndex < 0 ||
      normalizedSelectedTeamIndex > 254
    )
  ) {
    throw new Error(
      'Choose All or a valid team for Player Mass Edit.'
    );
  }

  function playerMatchesSelectedTeam(
    playerRecord
  ) {
    if (
      normalizedSelectedTeamIndex === null
    ) {
      return true;
    }

    return (
      isUsableRecord(playerRecord) &&
      hasField(
        playerRecord,
        'TeamIndex'
      ) &&
      Number.parseInt(
        playerRecord.TeamIndex,
        10
      ) ===
        normalizedSelectedTeamIndex
    );
  }

  const normalizedMinimumOverall =
    Number.parseInt(
      minimumOverall,
      10
    );

  const normalizedMaximumOverall =
    Number.parseInt(
      maximumOverall,
      10
    );

  if (
    action === 'dealbreaker' &&
    (
      !Number.isInteger(
        normalizedMinimumOverall
      ) ||
      !Number.isInteger(
        normalizedMaximumOverall
      ) ||
      normalizedMinimumOverall < 0 ||
      normalizedMaximumOverall > 99 ||
      normalizedMinimumOverall >
        normalizedMaximumOverall
    )
  ) {
    throw new Error(
      'Dealbreaker OVR range must be between 0 and 99, with minimum no greater than maximum.'
    );
  }

  function playerMatchesDealbreakerOverall(
    playerRecord
  ) {
    if (action !== 'dealbreaker') {
      return true;
    }

    const overall =
      findOverallRating(
        playerRecord
      );

    return (
      Number.isFinite(overall) &&
      overall >=
        normalizedMinimumOverall &&
      overall <=
        normalizedMaximumOverall
    );
  }

  /* PocketScout Player Mass Edit user-team StartingHotCold v1 */
  if (
    action ===
      'startingHotColdUserTeams'
  ) {
    const context =
      await psLoadStartingHotColdContext({
        franchise,
        session
      });

    const requestedValue =
      String(value ?? '')
        .trim();

    if (!requestedValue) {
      throw new Error(
        'Choose a StartingHotCold value.'
      );
    }

    const matchedValue =
      PS_STARTING_HOT_COLD_OPTIONS
        .find(
          option =>
            option.toLowerCase() ===
            requestedValue.toLowerCase()
        );

    if (!matchedValue) {
      throw new Error(
        'StartingHotCold must be Hot, Cold, or Neutral.'
      );
    }

    let recordsEdited = 0;
    let unchangedRecords = 0;
    let skippedRecords = 0;
    let playerRecordsScanned = 0;

    for (
      const playerRecord
      of context.playerTable
        .records ?? []
    ) {
      playerRecordsScanned++;

      if (
        !isUsableRecord(playerRecord) ||
        !hasField(
          playerRecord,
          'TeamIndex'
        ) ||
        !hasField(
          playerRecord,
          'StartingHotCold'
        )
      ) {
        skippedRecords++;
        continue;
      }

      const teamIndex =
        Number.parseInt(
          playerRecord.TeamIndex,
          10
        );

      if (
        normalizedSelectedTeamIndex !== null &&
        teamIndex !==
          normalizedSelectedTeamIndex
      ) {
        skippedRecords++;
        continue;
      }

      if (
        String(
          playerRecord.StartingHotCold ??
          ''
        ) === matchedValue
      ) {
        unchangedRecords++;
        continue;
      }

      playerRecord.StartingHotCold =
        matchedValue;

      recordsEdited++;
    }

    if (recordsEdited > 0) {
      await franchise.save(
        resolvedOutput
      );
    }

    return {
      moduleId:
        'recruiting-commit-score',
      moduleName:
        'Player Mass Edit',
      inputPath:
        resolvedInput,
      outputPath:
        resolvedOutput,
      overwrittenOriginal:
        true,
      action,
      value:
        matchedValue,
      playerTableIndex:
        context.playerTableIndex,
      coachTableIndex:
        context.coachTableIndex,
      resolutionMode:
        context.resolutionMode,
      coachResolutionMode:
        context.coachResolutionMode,
      userControlledTeams:
        context
          .userControlledTeamIndexes
          .size,
      eligibleUserTeamPlayers:
        context
          .eligibleUserTeamPlayers,
      selectedTeamIndex:
        normalizedSelectedTeamIndex,
      playerRecordsScanned,
      recordsEdited,
      unchangedRecords,
      skippedRecords
    };
  }

  /* PocketScout Unlock All Players for Editing v3 */
  if (action === 'unlockAllPlayersForEditing') {
    const {
      tableIdMap,
      recruitTableInfo,
      resolutionMode
    } = await buildRecruitingHelperTableContext({
      franchise,
      session
    });

    const referencedPlayerTables =
      new Map();

    for (
      const recruitRecord
      of recruitTableInfo.table.records ?? []
    ) {
      if (
        !isUsableRecord(recruitRecord) ||
        !hasFields(
          recruitRecord,
          RECRUIT_REQUIRED_FIELDS
        )
      ) {
        continue;
      }

      const playerReference =
        decodeBinaryReference(
          recruitRecord.Player,
          tableIdMap
        );

      if (
        !playerReference ||
        String(
          playerReference.table?.name ?? ''
        ) !== 'Player' ||
        Boolean(
          playerReference.table?.isArray
        )
      ) {
        continue;
      }

      referencedPlayerTables.set(
        Number(playerReference.tableIndex),
        playerReference.table
      );
    }

    if (referencedPlayerTables.size === 0) {
      throw new Error(
        'Could not dynamically resolve the Player table through Recruit.Player references.'
      );
    }

    if (referencedPlayerTables.size > 1) {
      throw new Error(
        'Multiple Player tables were referenced by recruits; refusing an ambiguous mass edit.'
      );
    }

    const [
      [
        playerTableIndex,
        playerTable
      ]
    ] = referencedPlayerTables;

    let recordsEdited = 0;
    let unchangedRecords = 0;
    let skippedRecords = 0;
    let playerRecordsScanned = 0;
    let validPlayerRecords = 0;

    for (
      const playerRecord
      of playerTable.records ?? []
    ) {
      playerRecordsScanned++;

      if (!isUsableRecord(playerRecord)) {
        skippedRecords++;
        continue;
      }

      if (!hasField(playerRecord, 'IsNIL')) {
        skippedRecords++;
        continue;
      }

      if (
        !playerMatchesSelectedTeam(
          playerRecord
        )
      ) {
        skippedRecords++;
        continue;
      }

      validPlayerRecords++;

      const oldValue =
        playerRecord.IsNIL;

      const isAlreadyFalse =
        oldValue === false ||
        oldValue === 0 ||
        String(oldValue ?? '')
          .trim()
          .toLowerCase() === 'false';

      if (isAlreadyFalse) {
        unchangedRecords++;
        continue;
      }

      playerRecord.IsNIL = false;
      recordsEdited++;
    }

    if (validPlayerRecords === 0) {
      throw new Error(
        'The dynamically resolved Player table contained no valid records with an IsNIL field.'
      );
    }

    if (recordsEdited > 0) {
      await franchise.save(resolvedOutput);
    }

    return {
      moduleId: 'recruiting-commit-score',
      moduleName: 'Player Mass Edit',
      inputPath: resolvedInput,
      outputPath: resolvedOutput,
      overwrittenOriginal: true,
      action,
      value: false,
      playerTableIndex,
      resolutionMode,
      selectedTeamIndex:
        normalizedSelectedTeamIndex,
      playerRecordsScanned,
      validPlayerRecords,
      recordsEdited,
      unchangedRecords,
      skippedRecords
    };
  }

  const {
    tableIdMap,
    recruitTableInfo,
    resolutionMode
  } = await buildRecruitingHelperTableContext({
    franchise,
    session
  });

  const supportedPlayerFields = {
    dealbreaker: 'RecruitingDealbreaker',
    idealPitch: 'IdealRecruitingPitch',
    developmentTrait: 'TraitDevelopment'
  };

  /*
   * PocketScout Player Mass Edit roster scope and enum options v38
   *
   * These are schema values, not merely values currently observed in the
   * dynasty. Keeping canonical options prevents a league-wide edit from
   * shrinking the dropdown to the one value that was just written.
   */
  const enumSets = {
    RecruitingDealbreaker:
      new Set([
        'Invalid',
        'AcademicPrestige',
        'AthleticFacilities',
        'BrandExposure',
        'CampusLifestyle',
        'ChampionshipContender',
        'CoachPrestige',
        'CoachStability',
        'ConferencePrestige',
        'PlayingStyle',
        'PlayingTime',
        'ProPotential',
        'ProgramTradition',
        'ProximityToHome',
        'StadiumAtmosphere'
      ]),

    /*
     * PocketScout known-good IdealPitch TraitDevelopment options v41
     *
     * Verified from known-good values captured from the game.
     * Values observed in the loaded dynasty are still merged below.
     */
    IdealRecruitingPitch:
      new Set([
        'Aspirational',
        'CampusPersonality',
        'CoachsFavorite',
        'CollegeExperience',
        'ConferenceSpotlight',
        'FootballInfluencer',
        'Grassroots',
        'HometownHero',
        'Invalid',
        'ItsGameTime',
        'Prestigious',
        'ProveYourself',
        'Starter',
        'StudentOfTheGame',
        'SundayBound',
        'TeamPlayer',
        'TheClutch',
        'TimeToGetToWork',
        'ToTheHouse',
        'TVTime',
        'WorkHorse'
      ]),

    /*
     * PocketScout observed-only TraitDevelopment options v42
     *
     * TraitDevelopment raw enum values vary from the display labels.
     * Use only values read from the loaded dynasty so duplicate labels with
     * invalid raw values cannot be submitted.
     */
    TraitDevelopment:
      new Set()
  };

  let recruitRecordsScanned = 0;
  let validRecruitRecords = 0;
  let validLinkedPlayers = 0;
  let invalidPlayerReferences = 0;
  const linkedRows = [];

  for (const recruitRecord of recruitTableInfo.table.records ?? []) {
    recruitRecordsScanned++;

    if (
      !isUsableRecord(recruitRecord) ||
      !hasFields(recruitRecord, RECRUIT_REQUIRED_FIELDS)
    ) {
      continue;
    }

    validRecruitRecords++;

    const playerReference = decodeBinaryReference(
      recruitRecord.Player,
      tableIdMap
    );

    if (!playerReference) {
      invalidPlayerReferences++;
      continue;
    }

    const playerRecord = playerReference.table.records?.[playerReference.row];

    if (!isUsableRecord(playerRecord)) {
      invalidPlayerReferences++;
      continue;
    }

    validLinkedPlayers++;
    linkedRows.push({ recruitRecord, playerRecord });

    for (const fieldName of Object.keys(enumSets)) {
      if (hasField(playerRecord, fieldName)) {
        const fieldValue = String(playerRecord[fieldName] ?? '').trim();
        if (fieldValue) enumSets[fieldName].add(fieldValue);
      }
    }
  }

  /*
   * Player actions must operate on the dynamically resolved full Player table,
   * not only Recruit.Player-linked records. Unsigned recruits usually have a
   * free-agent TeamIndex, which is why team selections previously found zero.
   */
  const fullPlayerContext =
    await psLoadStartingHotColdContext({
      franchise,
      session
    });

  const fullPlayerRecords =
    fullPlayerContext
      .playerTable
      ?.records ??
    [];

  for (
    const playerRecord
    of fullPlayerRecords
  ) {
    if (!isUsableRecord(playerRecord)) {
      continue;
    }

    for (
      const fieldName
      of Object.keys(enumSets)
    ) {
      if (hasField(playerRecord, fieldName)) {
        const fieldValue =
          String(
            playerRecord[fieldName] ??
            ''
          ).trim();

        if (fieldValue) {
          enumSets[fieldName].add(
            fieldValue
          );
        }
      }
    }
  }

  const enumOptions = Object.fromEntries(
    Object.entries(enumSets).map(([fieldName, values]) => [
      fieldName,
      [...values].sort((left, right) =>
        left.localeCompare(right, undefined, {
          sensitivity: 'base',
          numeric: true
        })
      )
    ])
  );

  if (action === 'loadOptions') {
    const startingHotColdContext =
      fullPlayerContext;
      await psLoadStartingHotColdContext({
        franchise,
        session
      });

    const massEditTeamContext =
      await buildRecruitTopSchoolsContext({
        franchise,
        session
      });

    /*
     * PocketScout Player Mass Edit TeamIndex values v37
     *
     * Top-school dropdown values can use recruiting TeamId values, which are
     * not guaranteed to equal Player.TeamIndex. Build this dropdown directly
     * from the Team table and use Team.TeamIndex as the submitted value.
     */
    const teamOptions =
      (
        massEditTeamContext
          .teamTableInfo
          ?.table
          ?.records ??
        []
      )
        .filter(teamRecord =>
          isUsableRecord(
            teamRecord
          ) &&
          hasField(
            teamRecord,
            'TeamIndex'
          )
        )
        .map(teamRecord => {
          const teamIndex =
            Number.parseInt(
              teamRecord.TeamIndex,
              10
            );

          const label =
            toText(
              teamRecord.DisplayName ??
              teamRecord.LongName ??
              teamRecord.ShortName
            );

          if (
            !Number.isInteger(
              teamIndex
            ) ||
            teamIndex < 0 ||
            teamIndex > 254 ||
            !label
          ) {
            return null;
          }

          return {
            value:
              String(teamIndex),
            label
          };
        })
        .filter(Boolean)
        .filter(
          (
            option,
            index,
            options
          ) =>
            options.findIndex(
              candidate =>
                candidate.value ===
                option.value
            ) === index
        )
        .sort(
          (left, right) =>
            left.label.localeCompare(
              right.label,
              undefined,
              {
                sensitivity: 'base',
                numeric: true
              }
            )
        );

    return {
      moduleId: 'recruiting-commit-score',
      moduleName: 'Player Mass Edit',
      inputPath: resolvedInput,
      recruitTableIndex: recruitTableInfo.tableIndex,
      resolutionMode,
      minCommitScore: 100,
      maxCommitScore: 999,
      enumOptions: {
        ...enumOptions,

        StartingHotCold:
          [...PS_STARTING_HOT_COLD_OPTIONS]
      },

      userControlledTeams:
        startingHotColdContext
          .userControlledTeamIndexes
          .size,

      eligibleUserTeamPlayers:
        startingHotColdContext
          .eligibleUserTeamPlayers,

      playerTableIndex:
        startingHotColdContext
          .playerTableIndex,

      coachTableIndex:
        startingHotColdContext
          .coachTableIndex,

      teamOptions,

      recruitRecordsScanned,
      validRecruitRecords,
      validLinkedPlayers,
      invalidPlayerReferences
    };
  }

  let recordsEdited = 0;
  let unchangedRecords = 0;
  let skippedRecords = 0;

  /* PocketScout PlayingStyle deal breaker None and coach warning v1 */
  if (
    action ===
      'removePlayingStyleDealbreaker'
  ) {
    for (
      const playerRecord
      of fullPlayerRecords
    ) {
      if (
        !isUsableRecord(
          playerRecord
        ) ||
        !hasField(
          playerRecord,
          'RecruitingDealbreaker'
        )
      ) {
        skippedRecords++;
        continue;
      }

      if (
        !playerMatchesSelectedTeam(
          playerRecord
        )
      ) {
        skippedRecords++;
        continue;
      }

      const oldValue =
        String(
          playerRecord
            .RecruitingDealbreaker ??
          ''
        ).trim();

      if (
        oldValue.toLowerCase() !==
          'playingstyle'
      ) {
        unchangedRecords++;
        continue;
      }

      playerRecord
        .RecruitingDealbreaker =
          'Invalid';

      recordsEdited++;
    }
  } else if (action === 'commitScore') {
    const newCommitScore = Number.parseInt(value, 10);

    if (!Number.isInteger(newCommitScore) || newCommitScore < 100 || newCommitScore > 999) {
      throw new Error('CommitScore must be between 100 and 999.');
    }

    for (
      const {
        recruitRecord,
        playerRecord
      }
      of linkedRows
    ) {
      if (
        !hasField(
          recruitRecord,
          'CommitScore'
        )
      ) {
        skippedRecords++;
        continue;
      }

      if (
        !playerMatchesSelectedTeam(
          playerRecord
        )
      ) {
        skippedRecords++;
        continue;
      }

      const oldValue = Number.parseInt(recruitRecord.CommitScore, 10);
      if (oldValue === newCommitScore) {
        unchangedRecords++;
        continue;
      }

      recruitRecord.CommitScore = newCommitScore;
      recordsEdited++;
    }
  } else {
    const fieldName = supportedPlayerFields[action];
    if (!fieldName) {
      throw new Error('Unsupported Recruit Mass Edit action: ' + action);
    }

    const newValue = String(value ?? '').trim();
    const validValues = enumOptions[fieldName] ?? [];
    const matchedValue = validValues.find(
      option => option.toLowerCase() === newValue.toLowerCase()
    );

    if (!matchedValue) {
      throw new Error(fieldName + ' must be one of the values dynamically found in the linked Player records.');
    }

    for (
      const playerRecord
      of fullPlayerRecords
    ) {
      if (
        !isUsableRecord(
          playerRecord
        ) ||
        !hasField(
          playerRecord,
          fieldName
        )
      ) {
        skippedRecords++;
        continue;
      }

      if (
        !playerMatchesSelectedTeam(
          playerRecord
        )
      ) {
        skippedRecords++;
        continue;
      }

      if (
        !playerMatchesDealbreakerOverall(
          playerRecord
        )
      ) {
        skippedRecords++;
        continue;
      }

      const oldValue = String(playerRecord[fieldName] ?? '');
      if (oldValue === matchedValue) {
        unchangedRecords++;
        continue;
      }

      playerRecord[fieldName] = matchedValue;
      recordsEdited++;
    }
  }

  if (recordsEdited > 0) {
    await franchise.save(resolvedOutput);
  }

  return {
    moduleId: 'recruiting-commit-score',
    moduleName: 'Player Mass Edit',
    inputPath: resolvedInput,
    outputPath: resolvedOutput,
    overwrittenOriginal: true,
    action,
    value,
    recruitTableIndex: recruitTableInfo.tableIndex,
    resolutionMode,
    recruitRecordsScanned,
    validRecruitRecords,
    validLinkedPlayers,
    invalidPlayerReferences,
    playerTableIndex:
      fullPlayerContext
        .playerTableIndex,
    playerRecordsScanned:
      fullPlayerRecords.length,
    selectedTeamIndex:
      normalizedSelectedTeamIndex,

    minimumOverall:
      action === 'dealbreaker'
        ? normalizedMinimumOverall
        : null,

    maximumOverall:
      action === 'dealbreaker'
        ? normalizedMaximumOverall
        : null,

    recordsEdited,
    unchangedRecords,
    skippedRecords
  };
}
