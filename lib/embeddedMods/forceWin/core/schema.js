// Ported from Ace's CFB Toolkit 0.9.3's forceWin/core/schema.js. These are
// the verified CFB 27 save field names the upstream tool uses; unchanged
// here except for dropping the standalone tool's config-file-driven table
// Unique ID validation, which Ghost City RLT's own io/saveFile.js handles
// with a small set of hardcoded, already-verified table Unique IDs instead.
const { sf } = require('../openSave');

const FORCE_WIN_SCHEMA = Object.freeze({
  seasonInfo: Object.freeze({
    currentSeasonRecord: 'CurrentYear',
    currentSeasonDisplay: 'CurrentSeasonYear',
    currentWeek: 'CurrentWeek',
    currentWeekType: 'CurrentWeekType',
    conferenceChampionshipWeek: 'RegularSeasonWeekConferenceChampionship'
  }),
  game: Object.freeze({
    homeTeam: 'HomeTeam',
    awayTeam: 'AwayTeam',
    season: 'SeasonYear',
    week: 'SeasonWeek',
    weekType: 'SeasonWeekType',
    status: 'GameStatus',
    homeScore: 'HomeScore',
    awayScore: 'AwayScore',
    forceWin: 'ForceWin',
    bowlGame: 'BowlGame',
    unplayedStatus: 'Unplayed',
    homeWonStatus: 'HomeWon',
    awayWonStatus: 'AwayWon',
    noForceWin: 'None',
    homeForceWin: 'Home',
    awayForceWin: 'Away',
    regularSeasonType: 'RegularSeason'
  }),
  team: Object.freeze({
    nameCandidates: Object.freeze(['DisplayName', 'LongName', 'ShortName']),
    teamIndex: 'TeamIndex',
    teamType: 'TEAM_TYPE',
    isTeamBuilder: 'IsTeamBuilder',
    headCoach: 'HeadCoach',
    offensiveCoordinator: 'OffensiveCoordinator',
    defensiveCoordinator: 'DefensiveCoordinator',
    depthChart: 'DepthChart',
    stadiumAtmosphereGrade: 'ProgramPointsStadiumAtmosphereGrade',
    mediaPollRank: 'MediaPoll_CurrentRank',
    overall: 'TEAM_RATINGOVR',
    offense: 'TEAM_RATINGOFF',
    defense: 'TEAM_RATINGDEF',
    qb: 'TEAM_RATINGQB',
    wr: 'TEAM_RATINGWR',
    te: 'TEAM_RATINGTE',
    rb: 'TEAM_RATINGRB',
    ol: 'TEAM_RATINGOL',
    dl: 'TEAM_RATINGDL',
    lb: 'TEAM_RATINGLB',
    db: 'TEAM_RATINGDB',
    st: 'TEAM_RATINGST'
  }),
  coach: Object.freeze({
    nameCandidates: Object.freeze(['Name', 'LastName']),
    level: 'Level',
    dominantArchetype: 'DominantArchetype',
    position: 'Position'
  }),
  rivalry: Object.freeze({ team1: 'Team1', team2: 'Team2' }),
  neutral: Object.freeze({ team1: 'Team1', team2: 'Team2', enabled: 'IsEnabled' })
});

function readable(record, field) {
  return sf(record, field) !== undefined;
}

const REQUIRED_FIELDS = Object.freeze({
  seasonInfo: Object.freeze(Object.values(FORCE_WIN_SCHEMA.seasonInfo)),
  seasonGame: Object.freeze([
    'HomeTeam', 'AwayTeam', 'SeasonYear', 'SeasonWeek', 'SeasonWeekType',
    'GameStatus', 'HomeScore', 'AwayScore', 'ForceWin', 'BowlGame'
  ]),
  team: Object.freeze([
    'TeamIndex', 'DepthChart', 'TEAM_RATINGOVR', 'TEAM_RATINGOFF', 'TEAM_RATINGDEF',
    'TEAM_RATINGQB', 'TEAM_RATINGWR', 'TEAM_RATINGTE', 'TEAM_RATINGRB',
    'TEAM_RATINGOL', 'TEAM_RATINGDL', 'TEAM_RATINGLB', 'TEAM_RATINGDB',
    'TEAM_RATINGST', 'HeadCoach', 'OffensiveCoordinator', 'DefensiveCoordinator',
    'ProgramPointsStadiumAtmosphereGrade', 'MediaPoll_CurrentRank'
  ]),
  coach: Object.freeze(['Level', 'DominantArchetype', 'Position']),
  rivalry: Object.freeze(['Team1', 'Team2']),
  scheduleNeutralStadium: Object.freeze(['Team1', 'Team2', 'IsEnabled']),
  player: Object.freeze(['Position', 'OverallRating', 'AwarenessRating', 'Age', 'SchoolYear', 'RedshirtStatus', 'TeamIndex']),
  depthChart: Object.freeze(['QB', 'HB', 'WR', 'TE', 'K', 'P']),
  depthChartPlayers: Object.freeze(['Player0'])
});

function validateForceWinEncoding(records, schema = FORCE_WIN_SCHEMA) {
  const allowed = new Set([schema.game.noForceWin, schema.game.homeForceWin, schema.game.awayForceWin]);
  const unknown = [...new Set(records
    .map(record => sf(record, schema.game.forceWin))
    .filter(value => value !== undefined && !allowed.has(value)))];
  if (unknown.length) {
    throw new Error(`SeasonGame contains unknown ForceWin value(s): ${unknown.join(', ')}`);
  }
  if (!records.some(record => sf(record, schema.game.forceWin) === schema.game.noForceWin)) {
    throw new Error(`SeasonGame does not contain the verified no-force-win value ${schema.game.noForceWin}.`);
  }
}

// Runtime validation stops the tool if a table's fields don't look like what we expect --
// e.g. a title update renamed something, or the wrong table Unique ID matched.
function validateTableSchema(kind, records) {
  const fields = REQUIRED_FIELDS[kind];
  if (!fields) throw new Error(`No schema validator is defined for ${kind}.`);
  const allActive = (records || []).filter(record => !(record && record.isEmpty === true) && record);
  const sample = allActive.slice(0, 100);
  if (!sample.length) throw new Error(`${kind} table is empty.`);
  const missing = fields.filter(field => !sample.some(record => readable(record, field)));
  if (missing.length) {
    throw new Error(`${kind} table is missing required fields: ${missing.join(', ')}`);
  }
  if (kind === 'seasonGame') validateForceWinEncoding(allActive);
}

// Direction is expressed with the schema-backed enum labels confirmed by the CSV evidence.
function getForceWinValue({ favoriteTeamId, homeTeamId, awayTeamId, schema = FORCE_WIN_SCHEMA }) {
  if (favoriteTeamId === homeTeamId) return schema.game.homeForceWin;
  if (favoriteTeamId === awayTeamId) return schema.game.awayForceWin;
  throw new Error('Favorite does not match either schedule team reference.');
}

module.exports = { FORCE_WIN_SCHEMA, validateTableSchema, validateForceWinEncoding, getForceWinValue };
