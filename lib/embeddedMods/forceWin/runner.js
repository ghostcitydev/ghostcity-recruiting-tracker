// Ghost City RLT's Force Win stage. Ported from Ace's CFB Toolkit 0.9.3's
// "Automatic Force Win" v3.1 (public/other mods/Ace's CFB Toolkit 0.9.3.exe),
// trimmed to the one mode this app supports: evaluate the remainder of the
// regular season (weeks 1-15) in a single pass at Week 0.
//
// Unlike Fang / Pipelines / Transfer Wave (which run during the Preseason
// import, while the save's CurrentWeekType is still OffSeason), Force Win
// requires CurrentWeekType to already be RegularSeason -- so it runs as its
// own, later "Week 0" import, after the save has advanced past Preseason.
//
// Unlike the standalone tool (which also supports specific-week and
// next-actionable-week scopes, plus a separate "clear" mode), this runner
// only exposes scope "regular" -- per the plan for Ghost City RLT 1.1.1, the
// per-week / clear-assignment modes are intentionally not wired up.
const path = require('path');
const {
  TABLE_UIDS, openSave, readForceWinTables, createBackup
} = require('./io/saveFile');
const { FORCE_WIN_SCHEMA, validateTableSchema } = require('./core/schema');
const FORCE_WIN_CONFIG = require('./core/config');
const {
  processSchedule, applyAssignments, buildDepthChartRatings, buildPairSet,
  createRandom, availableTeamNames, resolveSkippedTeamNames
} = require('./engine/forceWinEngine');
const { sf } = require('./openSave');

// Reads SeasonInfo without judging whether it's a runnable week -- used by
// prepareForceWin() so Toolbox settings (like the team skip-list) can be
// configured any time, regardless of what stage the save is currently at.
function readSeasonInfo(records) {
  const record = (records || []).find(candidate => candidate && !candidate.isEmpty);
  if (!record) throw new Error('SeasonInfo has no active record.');
  const f = FORCE_WIN_SCHEMA.seasonInfo;
  const info = {
    currentSeasonRecord: Number(sf(record, f.currentSeasonRecord)),
    currentSeasonDisplay: Number(sf(record, f.currentSeasonDisplay)),
    currentWeek: Number(sf(record, f.currentWeek)),
    currentWeekType: sf(record, f.currentWeekType),
    conferenceChampionshipWeek: Number(sf(record, f.conferenceChampionshipWeek))
  };
  for (const key of ['currentSeasonRecord', 'currentSeasonDisplay', 'currentWeek', 'conferenceChampionshipWeek']) {
    if (!Number.isFinite(info[key])) throw new Error(`SeasonInfo ${key} value is invalid.`);
  }
  return info;
}

function isRunnableWeek(info) {
  return info.currentWeekType === FORCE_WIN_SCHEMA.game.regularSeasonType && info.currentWeek >= 0 && info.currentWeek <= 15;
}

// Strict version used by runForceWin() -- this is the real gate that keeps
// Force Win from touching a save that isn't actually at regular-season
// Week 0-15 yet.
function seasonContext(records) {
  const info = readSeasonInfo(records);
  if (!isRunnableWeek(info)) {
    throw new Error(`Force Win supports saves currently in regular-season Week 0 through Week 15. This save is ${info.currentWeekType}, week ${info.currentWeek}.`);
  }
  return info;
}

async function loadTables(savePath, keys) {
  const franchise = await openSave(savePath);
  const tables = await readForceWinTables(franchise, keys);
  for (const key of keys) validateTableSchema(key, tables[key].records);
  return { franchise, tables };
}

/**
 * Team list + current week, for the Toolbox "select teams to skip" UI.
 * Deliberately does NOT enforce the regular-season Week 0-15 requirement --
 * that's a real gate on running Force Win (see runForceWin below), but these
 * are just saved preferences the user should be able to set up any time,
 * whether their save is at Signing Day, Preseason, or already at Week 0.
 */
async function prepareForceWin(savePath) {
  const { tables } = await loadTables(savePath, ['seasonInfo', 'team']);
  const info = readSeasonInfo(tables.seasonInfo.records);
  const ready = isRunnableWeek(info);
  return {
    teams: availableTeamNames(tables.team),
    currentWeek: info.currentWeek,
    currentWeekType: info.currentWeekType,
    season: info.currentSeasonDisplay,
    ready,
    readyMessage: ready
      ? null
      : `This save is currently ${info.currentWeekType}, week ${info.currentWeek}. Force Win only runs once the season has advanced to regular-season Week 0 -- your settings here are saved and will be used whenever you do run it.`,
    involvement: Object.entries(FORCE_WIN_CONFIG.involvement.levels).map(([value, item]) => ({ value, label: item.label })),
    modelProfiles: Object.entries(FORCE_WIN_CONFIG.modelProfiles.profiles).map(([value, item]) => ({ value, label: item.label, description: item.description }))
  };
}

function defaultSettings() {
  return {
    enabled: false,
    involvement: FORCE_WIN_CONFIG.involvement.default,
    modelProfile: FORCE_WIN_CONFIG.modelProfiles.default,
    forceAllTeams: true,
    skippedTeams: [],
    forceAllFcs: false,
    seed: undefined,
    requireWeekZero: true
  };
}

function normalizedSettings(supplied = {}) {
  const settings = { ...defaultSettings(), ...supplied };
  if (!FORCE_WIN_CONFIG.involvement.levels[String(settings.involvement).toLowerCase()]) {
    throw new Error('Force Win involvement must be minimum, low, medium, high, or maximum.');
  }
  if (!FORCE_WIN_CONFIG.modelProfiles.profiles[String(settings.modelProfile).toLowerCase()]) {
    throw new Error('Force Win model profile must be ratings, balanced, coaching, matchup, or chaos.');
  }
  return settings;
}

// Short labels + icons for the reason string -- the DB record keeps the
// full label in each *Value field; this is just for the compact,
// icon-tagged one-line summary, e.g. "Talent 💪, Matchups ⚔️".
const REASON_TAGS = Object.freeze({
  'Starter-weighted talent': { label: 'Talent', icon: '💪' },
  'Unit matchups': { label: 'Matchups', icon: '⚔️' },
  Coaching: { label: 'Coaching', icon: '📋' },
  'Home field': { label: 'Home field', icon: '🏟️' },
  'Home environment': { label: 'Crowd', icon: '📣' }
});
const MODIFIER_TAGS = Object.freeze({
  Rivalry: { label: 'Rivalry', icon: '🔥' },
  'FCS opponent': { label: 'FCS', icon: '🎯' }
});

// Concise "why" summary: the top one or two factors by magnitude, tagged
// with an icon, e.g. "Talent 💪, Matchups ⚔️" instead of a long sentence.
function summarizeReason(contributions, modifiers) {
  const ranked = contributions
    .filter(item => item.band !== 'minimal')
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 2)
    .map(item => {
      const tag = REASON_TAGS[item.label];
      return tag ? `${tag.label} ${tag.icon}` : item.label;
    });
  const modifierTags = (modifiers || []).map(mod => {
    const tag = MODIFIER_TAGS[mod.label];
    return tag ? `${tag.label} ${tag.icon}` : mod.label;
  });
  const parts = [...ranked, ...modifierTags];
  return parts.join(', ') || 'Close call';
}

// Builds each forced game's persistable row: the four explanation factors
// Ghost City RLT records (Starter-weighted talent, Unit matchups, Coaching,
// Home field -- "Home environment" folded in as a fifth when non-zero), plus
// the disparity/probability inputs that produced the decision.
function toHistoryRow(game) {
  const byLabel = Object.fromEntries(game.explanation.contributions.map(item => [item.label, item]));
  return {
    week: game.week,
    homeTeam: game.homeTeam.name,
    awayTeam: game.awayTeam.name,
    forcedWinner: game.favorite.name,
    favorite: game.favorite.name,
    disparity: game.breakdown.finalDisparity,
    probability: game.decision.probability,
    roll: game.decision.roll,
    talentValue: byLabel['Starter-weighted talent'] ? byLabel['Starter-weighted talent'].value : null,
    matchupValue: byLabel['Unit matchups'] ? byLabel['Unit matchups'].value : null,
    coachingValue: byLabel.Coaching ? byLabel.Coaching.value : null,
    homeFieldValue: byLabel['Home field'] ? byLabel['Home field'].value : null,
    homeEnvValue: byLabel['Home environment'] ? byLabel['Home environment'].value : null,
    rivalryApplied: Boolean(game.rivalry),
    rivalryMultiplier: game.breakdown.rivalryMultiplier,
    fcsApplied: Boolean(game.fcsMismatch),
    fcsMultiplier: game.breakdown.fcsMultiplier,
    reason: summarizeReason(game.explanation.contributions, game.explanation.modifiers)
  };
}

/**
 * Evaluate and apply the remainder-of-season force wins in a single pass.
 * Intended to run once per season, as its own dedicated Week 0 import --
 * after Signing Day and Preseason, once the save has actually advanced from
 * OffSeason into regular-season Week 0 (something only happens in-game, not
 * through Ghost City).
 */
async function runForceWin(savePath, suppliedSettings = {}) {
  const settings = normalizedSettings(suppliedSettings);
  const { franchise, tables } = await loadTables(savePath, [
    'seasonInfo', 'seasonGame', 'team', 'coach', 'rivalry', 'scheduleNeutralStadium',
    'player', 'depthChart', 'depthChartPlayers'
  ]);
  const context = seasonContext(tables.seasonInfo.records);
  if (settings.requireWeekZero && context.currentWeek !== 0) {
    throw new Error(`Force Win is intended to run once at Week 0, right after import. This save is at Week ${context.currentWeek}.`);
  }

  const depthRatings = buildDepthChartRatings({
    teamTable: tables.team, playerTable: tables.player,
    depthChartTable: tables.depthChart, depthChartPlayersTable: tables.depthChartPlayers
  });
  const skippedTeams = settings.forceAllTeams
    ? new Set()
    : resolveSkippedTeamNames((settings.skippedTeams || []).join(','), tables.team);

  const coreResult = processSchedule({
    records: tables.seasonGame.records,
    teamTable: tables.team,
    coachTable: tables.coach,
    context,
    scope: 'regular',
    rivalryPairs: buildPairSet(tables.rivalry.records, FORCE_WIN_SCHEMA.rivalry),
    neutralPairs: buildPairSet(tables.scheduleNeutralStadium.records, FORCE_WIN_SCHEMA.neutral, FORCE_WIN_SCHEMA.neutral.enabled),
    skippedTeamNames: skippedTeams,
    random: createRandom(settings.seed),
    involvement: settings.involvement,
    modelProfile: settings.modelProfile,
    depthRatings,
    forceAllFcs: settings.forceAllFcs
  });

  let backupPath = null;
  if (coreResult.changes.length) {
    backupPath = await createBackup(savePath, path.join(path.dirname(savePath), 'RLT Backups'));
    applyAssignments(coreResult.changes);
    await franchise.save();
  }

  const history = coreResult.changes.map(toHistoryRow).sort((a, b) => a.week - b.week);
  return {
    backupPath,
    outputPath: savePath,
    currentWeek: context.currentWeek,
    season: context.currentSeasonDisplay,
    involvement: settings.involvement,
    modelProfile: settings.modelProfile,
    forceAllTeams: settings.forceAllTeams,
    skippedTeams: [...skippedTeams],
    summary: coreResult.summary,
    forcedGames: history,
    log: [
      `${coreResult.summary.gamesFound} games in scope, ${coreResult.summary.gamesEligible} eligible`,
      `${coreResult.summary.forceWinsApplied} force win(s) applied`,
      `${coreResult.summary.gamesSkipped} game(s) skipped`
    ]
  };
}

module.exports = { TABLE_UIDS, defaultSettings, prepareForceWin, runForceWin };
