// Ported from Ace's CFB Toolkit 0.9.3's "Automatic Force Win" v3.1 engine
// (disparityCalculator.js, probabilityEngine.js, contextualFactors.js,
// protections.js, teamRatings.js, depthChartRatings.js, modelProfiles.js,
// bettingLines.js, favoriteExplanation.js, userTeams.js, and
// scheduleProcessor.js, combined into one file). The calculation logic is
// unchanged from upstream -- only the module format (CommonJS, one file)
// and the small I/O helpers it pulls in differ.
const FORCE_WIN_CONFIG = require('../core/config');
const { FORCE_WIN_SCHEMA, getForceWinValue } = require('../core/schema');
const { parseRef, sf } = require('../openSave');

// ── disparityCalculator ────────────────────────────────────────────────

const average = (...values) => values.reduce((sum, value) => sum + value, 0) / values.length;

function passingPersonnel(ratings, config) {
  const weights = config.passingPersonnelWeights;
  return ratings.qb * weights.qb + ratings.wr * weights.wr + ratings.te * weights.te;
}

// Normalize the 0.80 position-weight total before using it in base strength.
function calculatePositionComposite(ratings, config = FORCE_WIN_CONFIG) {
  const weighted = Object.entries(config.positionWeights)
    .reduce((sum, [key, weight]) => sum + ratings[key] * weight, 0);
  const weightTotal = Object.values(config.positionWeights).reduce((sum, weight) => sum + weight, 0);
  return weighted / weightTotal;
}

function calculateBaseStrength(ratings, config = FORCE_WIN_CONFIG) {
  const positionComposite = calculatePositionComposite(ratings, config);
  const w = config.baseStrengthWeights;
  return {
    positionComposite,
    value: w.overall * ratings.overall +
      w.offense * ratings.offense +
      w.defense * ratings.defense +
      w.positionComposite * positionComposite
  };
}

// Compare complementary units, such as passing offense against coverage.
function calculateMatchupAdvantage(favorite, underdog, config = FORCE_WIN_CONFIG) {
  const components = {
    passingOffense: passingPersonnel(favorite, config) - average(underdog.lb, underdog.db),
    rushingOffense: average(favorite.rb, favorite.ol) - average(underdog.dl, underdog.lb),
    passDefense: favorite.db - passingPersonnel(underdog, config),
    runDefense: average(favorite.dl, favorite.lb) - average(underdog.rb, underdog.ol),
    specialTeams: favorite.st - underdog.st
  };
  const value = Object.entries(config.matchupWeights)
    .reduce((sum, [key, weight]) => sum + components[key] * weight, 0);
  return { ...components, value };
}

// Combine team strength, matchup fit, location, and the optional rivalry compression.
function calculateDisparity({
  favorite,
  underdog,
  favoriteLocation,
  rivalry = false,
  fcsMismatch = false,
  coachingAdvantage = 0,
  homeContextAdjustment = 0,
  config = FORCE_WIN_CONFIG
}) {
  const favoriteBase = calculateBaseStrength(favorite.ratings, config);
  const underdogBase = calculateBaseStrength(underdog.ratings, config);
  const baseStrengthDifference = favoriteBase.value - underdogBase.value;
  const matchup = calculateMatchupAdvantage(favorite.ratings, underdog.ratings, config);
  const opponentMatchup = calculateMatchupAdvantage(underdog.ratings, favorite.ratings, config);
  // Comparing both directions lets matchup fit help identify the favorite instead of merely
  // reinforcing whichever team has the higher starter-weighted composite.
  const matchupEdge = (matchup.value - opponentMatchup.value) / 2;
  const homeFieldAdjustment = config.homeField[favoriteLocation];
  if (!Number.isFinite(homeFieldAdjustment)) throw new Error(`Invalid favorite location: ${favoriteLocation}`);
  const rawFinalDisparity =
    config.finalWeights.baseStrengthDifference * baseStrengthDifference +
    config.finalWeights.matchupAdvantage * matchupEdge +
    homeFieldAdjustment;
  const contextualDisparity = rawFinalDisparity + coachingAdvantage + homeContextAdjustment;
  const rivalryMultiplier = rivalry ? config.rivalry.disparityMultiplier : 1;
  const fcsMultiplier = fcsMismatch ? config.fcs.disparityMultiplier : 1;
  const disparityMultiplier = rivalryMultiplier * fcsMultiplier;
  // Profile-wide calibration targets non-FCS model strength. FCS games use one
  // shared multiplier so their long-run unforced rate stays consistent across profiles.
  const profileDisparityScale = fcsMismatch ? 1 : (config.activeModelProfile ? config.activeModelProfile.disparityScale : 1);
  const finalDisparity = contextualDisparity * disparityMultiplier * profileDisparityScale;
  return {
    favoriteBase, underdogBase, baseStrengthDifference, matchup, opponentMatchup, matchupEdge,
    homeFieldAdjustment, rivalry, fcsMismatch, rivalryMultiplier, fcsMultiplier, disparityMultiplier,
    profileDisparityScale, rawFinalDisparity, coachingAdvantage, homeContextAdjustment,
    contextualDisparity, finalDisparity
  };
}

// Select the favorite from the complete projected edge: ratings, matchup fit, staff, and venue.
function determineMatchupFavorite({
  homeTeam, awayTeam, neutral = false, homeCoachingScore = 0, awayCoachingScore = 0,
  homeContextValue = 0, config = FORCE_WIN_CONFIG
}) {
  const homeProjection = calculateDisparity({
    favorite: homeTeam, underdog: awayTeam, favoriteLocation: neutral ? 'neutral' : 'home',
    coachingAdvantage: homeCoachingScore - awayCoachingScore, homeContextAdjustment: homeContextValue, config
  });
  if (Math.abs(homeProjection.contextualDisparity) < Number.EPSILON) return null;
  if (homeProjection.contextualDisparity > 0) {
    return { favorite: homeTeam, underdog: awayTeam, side: 'home', projection: homeProjection };
  }
  const awayProjection = calculateDisparity({
    favorite: awayTeam, underdog: homeTeam, favoriteLocation: neutral ? 'neutral' : 'away',
    coachingAdvantage: awayCoachingScore - homeCoachingScore, homeContextAdjustment: -homeContextValue, config
  });
  return { favorite: awayTeam, underdog: homeTeam, side: 'away', projection: awayProjection };
}

// ── probabilityEngine ───────────────────────────────────────────────────

function probabilityForDisparity(disparity, config = FORCE_WIN_CONFIG) {
  if (!Number.isFinite(disparity)) throw new Error('Disparity must be a finite number.');
  const curve = config.probabilityCurve;
  const clampProbability = probability => Math.min(
    config.involvement.probabilityCap,
    Math.max(config.involvement.probabilityFloor, probability)
  );
  if (disparity <= curve[0].score) return clampProbability(curve[0].probability);
  if (disparity >= curve[curve.length - 1].score) return clampProbability(curve[curve.length - 1].probability);
  const upperIndex = curve.findIndex(point => disparity <= point.score);
  const upper = curve[upperIndex];
  if (disparity === upper.score || upperIndex === 0) return upper.probability;
  const lower = curve[upperIndex - 1];
  const progress = (disparity - lower.score) / (upper.score - lower.score);
  const interpolated = lower.probability + progress * (upper.probability - lower.probability);
  return clampProbability(interpolated);
}

function involvementRule(involvement = FORCE_WIN_CONFIG.involvement.default, config = FORCE_WIN_CONFIG) {
  const key = String(involvement).toLowerCase();
  const rule = config.involvement.levels[key];
  if (!rule) throw new Error(`Tool involvement must be one of: ${Object.keys(config.involvement.levels).join(', ')}.`);
  return { key, ...rule };
}

function hashSeed(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) return seed >>> 0;
  const text = String(seed);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed) {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createRandom(seed) {
  return seed === undefined || seed === null || seed === '' ? Math.random : createSeededRandom(seed);
}

function disparityCategory(disparity, config = FORCE_WIN_CONFIG) {
  return config.disparityLevels.find(level => disparity >= level.min) ||
    config.disparityLevels[config.disparityLevels.length - 1];
}

// Involvement selects categories. It never inflates the model's probability.
function decideForceWin(disparity, random, config = FORCE_WIN_CONFIG, involvement = config.involvement.default) {
  const probability = probabilityForDisparity(disparity, config);
  const category = disparityCategory(disparity, config);
  const rule = involvementRule(involvement, config);
  const selected = rule.categories.includes(category.label);
  if (!selected) return { baseProbability: probability, probability, roll: null, forced: false, selected, automatic: false };
  if (rule.automatic) return { baseProbability: probability, probability, roll: null, forced: true, selected, automatic: true };
  const roll = random();
  return { baseProbability: probability, probability, roll, forced: roll < probability, selected, automatic: false };
}

// ── modelProfiles ───────────────────────────────────────────────────────

function modelProfileRule(profile = FORCE_WIN_CONFIG.modelProfiles.default, config = FORCE_WIN_CONFIG) {
  const key = String(profile).toLowerCase();
  const rule = config.modelProfiles.profiles[key];
  if (!rule) throw new Error(`Model profile must be one of: ${Object.keys(config.modelProfiles.profiles).join(', ')}.`);
  return { key, ...rule };
}

// Return an isolated configuration view so selecting a profile never mutates global defaults.
function createModelConfig(profile = FORCE_WIN_CONFIG.modelProfiles.default, config = FORCE_WIN_CONFIG) {
  const rule = modelProfileRule(profile, config);
  const probabilityCurve = config.probabilityCurve.map(point => ({
    ...point,
    probability: 0.5 + (point.probability - 0.5) * rule.probabilityCompression
  }));
  return {
    ...config,
    activeModelProfile: rule,
    finalWeights: { baseStrengthDifference: rule.baseWeight, matchupAdvantage: rule.matchupWeight },
    coaching: { ...config.coaching, disparityMultiplier: config.coaching.disparityMultiplier * rule.coachingScale },
    probabilityCurve
  };
}

// ── bettingLines (display-only, surfaced for context in the review UI) ──

function calculateBettingLines({ homeTeam, awayTeam, favoriteSide, disparity, config = FORCE_WIN_CONFIG }) {
  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
  const halfPoint = value => Math.round(value * 2) / 2;
  const c = config.bettingLines;
  const spread = halfPoint(clamp(Math.abs(disparity) * c.spreadPointsPerDisparity, 0.5, c.maximumSpread));
  const rawTotal = c.totalBaseline +
    c.offenseTotalWeight * (homeTeam.ratings.offense + awayTeam.ratings.offense - 150) -
    c.defenseTotalWeight * (homeTeam.ratings.defense + awayTeam.ratings.defense - 150);
  const total = halfPoint(clamp(rawTotal, c.minimumTotal, c.maximumTotal));
  return {
    spread, total, favoriteSide,
    homeSpread: favoriteSide === 'home' ? -spread : spread,
    awaySpread: favoriteSide === 'away' ? -spread : spread,
    favoriteSpread: -spread
  };
}

// ── contextualFactors (coaching + home-context bonuses) ─────────────────

const STAFF_ROLES = Object.freeze([
  Object.freeze({ key: 'headCoach', position: 'HeadCoach' }),
  Object.freeze({ key: 'offensiveCoordinator', position: 'OffensiveCoordinator' }),
  Object.freeze({ key: 'defensiveCoordinator', position: 'DefensiveCoordinator' })
]);

function tableRuntimeId(table) {
  const value = Number(table && table.header ? table.header.tableId : table && table.tableId);
  return Number.isInteger(value) ? value : null;
}

// Resolve staff references only against the coach table already selected by Unique ID.
function resolveCoachingProfile(team, coachTable, schema = FORCE_WIN_SCHEMA) {
  if (!coachTable) return { available: false, reason: 'coach table Unique ID is not configured' };
  const expectedTableId = tableRuntimeId(coachTable);
  if (expectedTableId === null) return { available: false, reason: 'coach table has no runtime table ID' };
  const staff = {};
  for (const role of STAFF_ROLES) {
    const reference = team.coachReferences ? team.coachReferences[role.key] : undefined;
    const parsed = parseRef(reference);
    if (!parsed || parsed.tableId !== expectedTableId) {
      return { available: false, reason: `${role.position} reference is missing or targets another table` };
    }
    const record = coachTable.records[parsed.row];
    if (!record || record.isEmpty) return { available: false, reason: `${role.position} record is missing` };
    const level = Number(sf(record, schema.coach.level));
    const position = sf(record, schema.coach.position);
    const archetype = sf(record, schema.coach.dominantArchetype);
    if (!Number.isFinite(level) || level < 0 || position !== role.position) {
      return { available: false, reason: `${role.position} data is invalid` };
    }
    staff[role.key] = { level, archetype: String(archetype != null ? archetype : 'Invalid_') };
  }
  return { available: true, staff };
}

function calculateCoachingScore(profile, config = FORCE_WIN_CONFIG) {
  if (!profile || !profile.available) return { available: false, staff: null, levelScore: 0, archetypeScore: 0, value: 0 };
  let weightedLevel = 0;
  let archetypeScore = 0;
  for (const [role, coach] of Object.entries(profile.staff)) {
    const boundedLevel = Math.min(config.coaching.maximumLevel, coach.level);
    weightedLevel += boundedLevel * config.coaching.roleWeights[role];
    const treeBonus = config.coaching.archetypeBonuses[coach.archetype] || 0;
    archetypeScore += treeBonus * config.coaching.archetypeRoleWeights[role];
  }
  const levelScore = weightedLevel * config.coaching.levelPointScale;
  const unscaledValue = levelScore + archetypeScore;
  return { available: true, staff: profile.staff, levelScore, archetypeScore, unscaledValue, value: unscaledValue * config.coaching.disparityMultiplier };
}

// Stadium atmosphere and a top-15 ranking benefit whichever team is actually at home.
function calculateHomeContext({ homeTeam, favoriteSide, neutral }, config = FORCE_WIN_CONFIG) {
  if (neutral) return { atmosphere: 0, top15: 0, value: 0 };
  const direction = favoriteSide === 'home' ? 1 : -1;
  const atmosphere = config.homeContext.atmosphereBonuses[homeTeam.stadiumAtmosphereGrade] || 0;
  const rank = Number(homeTeam.mediaPollRank);
  const top15 = rank >= 1 && rank <= config.homeContext.topRankedMaximum ? config.homeContext.topRankedBonus : 0;
  return { atmosphere: direction * atmosphere, top15: direction * top15, value: direction * (atmosphere + top15) };
}

// ── favoriteExplanation (the "why" behind each forced win) ───────────────

const IMPACT_BANDS = Object.freeze([
  Object.freeze({ min: 7, label: 'major' }),
  Object.freeze({ min: 4, label: 'strong' }),
  Object.freeze({ min: 2, label: 'noticeable' }),
  Object.freeze({ min: 0.75, label: 'slight' }),
  Object.freeze({ min: 0, label: 'minimal' })
]);

function impactBand(value) {
  const magnitude = Math.abs(value);
  return IMPACT_BANDS.find(band => magnitude >= band.min).label;
}

function explainContribution(label, value) {
  const rounded = Number(value.toFixed(2));
  const band = impactBand(rounded);
  const direction = rounded > 0 ? 'favorite edge' : rounded < 0 ? 'opponent edge' : 'even';
  return { label, value: rounded, band, direction };
}

// Produces the 4-5 factor breakdown Ghost City RLT records per forced game:
// Starter-weighted talent, Unit matchups, Coaching, Home field, Home environment.
function buildFavoriteExplanation(breakdown, config) {
  const contributions = [
    explainContribution('Starter-weighted talent', config.finalWeights.baseStrengthDifference * breakdown.baseStrengthDifference),
    explainContribution('Unit matchups', config.finalWeights.matchupAdvantage * breakdown.matchupEdge),
    explainContribution('Coaching', breakdown.coachingAdvantage),
    explainContribution('Home field', breakdown.homeFieldAdjustment),
    explainContribution('Home environment', breakdown.homeContextAdjustment)
  ];
  const modifiers = [];
  if (breakdown.rivalry) modifiers.push({ label: 'Rivalry', multiplier: breakdown.rivalryMultiplier });
  if (breakdown.fcsMismatch) modifiers.push({ label: 'FCS opponent', multiplier: breakdown.fcsMultiplier });
  return { contributions, modifiers };
}

function formatExplanationItem(item) {
  const sign = item.value > 0 ? '+' : '';
  if (item.direction === 'even') return `${item.label}: minimal/even (${item.value.toFixed(1)})`;
  return `${item.label}: ${item.band} ${item.direction} (${sign}${item.value.toFixed(1)})`;
}

// ── protections (rivalry / neutral-site pairs, postseason lockouts) ─────

const ZERO_REF = '00000000000000000000000000000000';

// Team-pair keys are order-independent so home/away direction cannot break matching.
function pairKey(first, second) {
  return [first, second].sort().join('|');
}

function buildPairSet(records, fields, enabledField = null) {
  const pairs = new Set();
  for (const record of records || []) {
    if (record && record.isEmpty) continue;
    if (enabledField && ![true, 'true', 1, '1'].includes(sf(record, enabledField))) continue;
    const first = sf(record, fields.team1);
    const second = sf(record, fields.team2);
    if (!first || !second || first === ZERO_REF || second === ZERO_REF) continue;
    pairs.add(pairKey(first, second));
  }
  return pairs;
}

function isPostseasonGame(record, schema = FORCE_WIN_SCHEMA) {
  const bowlRef = sf(record, schema.game.bowlGame);
  const weekType = sf(record, schema.game.weekType);
  return (typeof bowlRef === 'string' && bowlRef !== ZERO_REF) ||
    Boolean(weekType && weekType !== schema.game.regularSeasonType);
}

function protectionReason({ record, conferenceChampionshipWeek, schema = FORCE_WIN_SCHEMA }) {
  if (isPostseasonGame(record, schema)) return 'postseason/championship game';
  if (Number(sf(record, schema.game.week)) === Number(conferenceChampionshipWeek)) return 'conference championship week';
  return null;
}

// ── teamRatings ───────────────────────────────────────────────────────

const RATING_KEYS = Object.freeze(['overall', 'offense', 'defense', 'qb', 'wr', 'te', 'rb', 'ol', 'dl', 'lb', 'db', 'st']);

// A schedule reference must target the runtime table selected by the configured team Unique ID.
function teamTableId(teamTable) {
  const value = Number(teamTable && teamTable.header ? teamTable.header.tableId : teamTable && teamTable.tableId);
  if (!Number.isInteger(value)) throw new Error('The selected team table does not expose a valid table ID.');
  return value;
}

function normalizeTeam(record, row) {
  const f = FORCE_WIN_SCHEMA.team;
  const ratings = Object.fromEntries(RATING_KEYS.map(key => [key, Number(sf(record, f[key]))]));
  const missing = RATING_KEYS
    .filter(key => !Number.isFinite(ratings[key]) || ratings[key] <= 0 || ratings[key] > 99)
    .map(key => f[key]);
  const name = f.nameCandidates.map(field => sf(record, field)).find(Boolean) || `Team row ${row}`;
  const teamType = sf(record, f.teamType);
  const teamIndex = sf(record, f.teamIndex);
  const isBuiltInFcs = String(name).startsWith('FCS ') ||
    (teamType === 'ProBowl' && Number(teamIndex) === 255);
  return {
    row, id: row, teamIndex, teamType,
    isTeamBuilder: [true, 'true', 1, '1'].includes(sf(record, f.isTeamBuilder)),
    isBuiltInFcs, name: String(name),
    coachReferences: {
      headCoach: sf(record, f.headCoach),
      offensiveCoordinator: sf(record, f.offensiveCoordinator),
      defensiveCoordinator: sf(record, f.defensiveCoordinator)
    },
    stadiumAtmosphereGrade: String(sf(record, f.stadiumAtmosphereGrade) || ''),
    mediaPollRank: Number(sf(record, f.mediaPollRank)),
    ratings, missing
  };
}

// Resolve the binary reference and reject missing or incomplete rating data.
function resolveTeamReference(reference, teamTable, depthRatings = null) {
  const parsed = parseRef(reference);
  if (!parsed) return { error: 'team reference is null or malformed' };
  const expectedTableId = teamTableId(teamTable);
  if (parsed.tableId !== expectedTableId) {
    return { error: `team reference targets table ID ${parsed.tableId}, expected ${expectedTableId}` };
  }
  const record = teamTable.records[parsed.row];
  if (!record || record.isEmpty) return { error: `team row ${parsed.row} is missing or empty` };
  const team = normalizeTeam(record, parsed.row);
  if (depthRatings && depthRatings.has(parsed.row)) {
    const depth = depthRatings.get(parsed.row);
    team.ratings = { ...team.ratings, ...depth.ratings };
    team.starters = depth.starters;
    team.depthWarnings = depth.warnings;
  } else if (depthRatings) {
    team.starters = {};
    team.depthWarnings = ['depth-chart data is unavailable; aggregate team ratings are being used'];
  }
  if (team.missing.length) return { error: `${team.name} is missing valid ratings: ${team.missing.join(', ')}`, team };
  return { team };
}

// ── depthChartRatings (starter-composite ratings, more accurate than team OVR) ──

const POSITION_DEPTH = Object.freeze({
  QB: 1, HB: 2, WR: 3, TE: 2, LT: 1, LG: 1, C: 1, RG: 1, RT: 1,
  LE: 1, RE: 1, DT: 2, LOLB: 1, MLB: 2, ROLB: 1, CB: 3, FS: 1, SS: 1,
  K: 1, P: 1
});
const DEPTH_GROUPS = Object.freeze({
  qb: ['QB'], rb: ['HB'], wr: ['WR'], te: ['TE'],
  ol: ['LT', 'LG', 'C', 'RG', 'RT'], dl: ['LE', 'RE', 'DT'],
  lb: ['LOLB', 'MLB', 'ROLB'], db: ['CB', 'FS', 'SS'], st: ['K', 'P']
});

const COMPOSITE_SCALE = Object.freeze([
  [40, 40], [50, 48], [60, 57], [65, 63], [70, 70],
  [75, 78], [80, 87], [85, 95], [90, 99]
]);

function scaleStarterComposite(value) {
  if (!Number.isFinite(value)) return null;
  if (value <= COMPOSITE_SCALE[0][0]) return Math.max(0, Math.round(value));
  if (value >= COMPOSITE_SCALE[COMPOSITE_SCALE.length - 1][0]) return 99;
  const upperIndex = COMPOSITE_SCALE.findIndex(([raw]) => value <= raw);
  const [lowerRaw, lowerScaled] = COMPOSITE_SCALE[upperIndex - 1];
  const [upperRaw, upperScaled] = COMPOSITE_SCALE[upperIndex];
  const progress = (value - lowerRaw) / (upperRaw - lowerRaw);
  return Math.round(lowerScaled + progress * (upperScaled - lowerScaled));
}

function weightedAverage(values) {
  const valid = values.filter(item => Number.isFinite(item.rating));
  if (!valid.length) return null;
  return Math.round(valid.reduce((sum, item) => sum + item.rating * item.weight, 0) /
    valid.reduce((sum, item) => sum + item.weight, 0));
}

// Build ratings from the players who are actually listed on each team's active depth chart.
function buildDepthChartRatings({ teamTable, playerTable, depthChartTable, depthChartPlayersTable }) {
  const expectedDepthChartId = tableRuntimeId(depthChartTable);
  const expectedDepthPlayersId = tableRuntimeId(depthChartPlayersTable);
  const expectedPlayerId = tableRuntimeId(playerTable);
  const result = new Map();
  for (let teamRow = 0; teamRow < teamTable.records.length; teamRow += 1) {
    const team = teamTable.records[teamRow];
    if (!team || team.isEmpty) continue;
    const byPosition = new Map();
    const starters = {};
    const warnings = [];
    const depthRef = parseRef(sf(team, 'DepthChart'));
    if (!depthRef || depthRef.tableId !== expectedDepthChartId) {
      result.set(teamRow, { ratings: {}, starters, warnings: ['team DepthChart reference is missing or targets the wrong table'] });
      continue;
    }
    const depth = depthChartTable.records[depthRef.row];
    if (!depth || depth.isEmpty) {
      result.set(teamRow, { ratings: {}, starters, warnings: [`referenced DepthChart row ${depthRef.row} is missing or empty`] });
      continue;
    }
    for (const [position, limit] of Object.entries(POSITION_DEPTH)) {
      const listRef = parseRef(sf(depth, position));
      if (!listRef || listRef.tableId !== expectedDepthPlayersId) continue;
      const list = depthChartPlayersTable.records[listRef.row];
      const players = [];
      for (let slot = 0; slot < limit; slot += 1) {
        const playerRef = parseRef(sf(list, `Player${slot}`));
        if (!playerRef || playerRef.tableId !== expectedPlayerId) continue;
        const player = playerTable.records[playerRef.row];
        const rating = Number(sf(player, 'OverallRating'));
        if (player && !player.isEmpty && Number.isFinite(rating)) {
          players.push({ rating, weight: slot === 0 ? 1 : 0.35 });
          if (slot === 0) {
            starters[position] = {
              row: playerRef.row,
              name: `${sf(player, 'FirstName') || ''} ${sf(player, 'LastName') || ''}`.trim() || `Player row ${playerRef.row}`,
              position: String(sf(player, 'Position') || position),
              rating,
              awareness: Number(sf(player, 'AwarenessRating') || 0),
              schoolYear: String(sf(player, 'SchoolYear') || ''),
              redshirtStatus: String(sf(player, 'RedshirtStatus') || ''),
              age: Number(sf(player, 'Age') || 0)
            };
          }
        }
      }
      byPosition.set(position, players);
    }
    const ratings = {};
    for (const [group, positions] of Object.entries(DEPTH_GROUPS)) {
      const value = weightedAverage(positions.flatMap(position => byPosition.get(position) || []));
      if (value !== null) ratings[group] = value;
    }
    const rawOffense = weightedAverage(['qb', 'rb', 'wr', 'te', 'ol']
      .filter(key => ratings[key] !== undefined).map(key => ({ rating: ratings[key], weight: key === 'qb' ? 1.6 : key === 'ol' ? 1.3 : 1 })));
    const rawDefense = weightedAverage(['dl', 'lb', 'db']
      .filter(key => ratings[key] !== undefined).map(key => ({ rating: ratings[key], weight: key === 'dl' ? 1.3 : 1 })));
    ratings.rawOffense = rawOffense;
    ratings.rawDefense = rawDefense;
    ratings.offense = scaleStarterComposite(rawOffense);
    ratings.defense = scaleStarterComposite(rawDefense);
    const compositeParts = [
      { rating: rawOffense, weight: 1 },
      { rating: rawDefense, weight: 1 },
      { rating: ratings.st, weight: 0.2 }
    ];
    const rawComposite = weightedAverage(compositeParts);
    ratings.rawComposite = rawComposite;
    ratings.overall = scaleStarterComposite(rawComposite);
    for (const key of Object.keys(ratings)) if (ratings[key] === null) delete ratings[key];
    const required = Object.keys(POSITION_DEPTH);
    const missing = required.filter(position => !starters[position]);
    if (missing.length) warnings.push(`incomplete depth chart (${missing.join(', ')} missing)`);
    result.set(teamRow, { ratings, starters, warnings });
  }
  return result;
}

// ── userTeams ────────────────────────────────────────────────────────

function availableTeamNames(teamTable) {
  const fields = FORCE_WIN_SCHEMA.team.nameCandidates;
  return [...new Set(teamTable.records
    .filter(record => record && !record.isEmpty)
    .map(record => fields.map(field => sf(record, field)).find(Boolean))
    .filter(Boolean)
    .map(String))];
}

// Resolve comma-separated team input. Exact matches win; a unique partial match is accepted.
function resolveTeamNames(raw, teamTable, label = 'Team') {
  if (!raw || !raw.trim()) return new Set();
  const available = availableTeamNames(teamTable);
  const byLower = new Map(available.map(name => [name.toLowerCase(), name]));
  const resolved = new Set();
  for (const requested of raw.split(',').map(value => value.trim()).filter(Boolean)) {
    const query = requested.toLowerCase();
    let match = byLower.get(query);
    if (!match) {
      const partial = available.filter(name => name.toLowerCase().includes(query));
      if (partial.length === 1) match = partial[0];
      else if (partial.length > 1) throw new Error(`${label} "${requested}" is ambiguous: ${partial.slice(0, 8).join(', ')}`);
    }
    if (!match) throw new Error(`${label} "${requested}" was not found in the selected team table.`);
    resolved.add(match);
  }
  return resolved;
}

function resolveSkippedTeamNames(raw, teamTable) {
  return resolveTeamNames(raw, teamTable, 'Skipped team');
}

// ── scheduleProcessor (main orchestration) ─────────────────────────────

function recordIndex(record, fallback) {
  const value = (record && (record._index !== undefined ? record._index : record.index !== undefined ? record.index : fallback));
  return Number.isInteger(Number(value)) ? Number(value) : fallback;
}

function isFcsMismatch(favorite, underdog) {
  return Boolean(underdog && underdog.isBuiltInFcs);
}

// Only genuinely unplayed games are writable. Active-week CPU results may be
// staged before advancement, but changing their winner creates inconsistent stats.
function gameEligibilityState(record, context, schema = FORCE_WIN_SCHEMA) {
  const status = sf(record, schema.game.status);
  const homeScore = Number(sf(record, schema.game.homeScore));
  const awayScore = Number(sf(record, schema.game.awayScore));
  if (status === schema.game.unplayedStatus) return { eligible: true, status };
  return { eligible: false, status, reason: `game is completed (${status || 'missing'}, score ${homeScore}-${awayScore})` };
}

function findNextActionableWeek(records, context, schema = FORCE_WIN_SCHEMA) {
  const weeks = records
    .filter(record => record && !record.isEmpty)
    .filter(record => Number(sf(record, schema.game.season)) === context.currentSeasonRecord)
    .filter(record => {
      const week = Number(sf(record, schema.game.week));
      return week >= 1 && week <= 15 && week > context.currentWeek;
    })
    .filter(record => sf(record, schema.game.weekType) === schema.game.regularSeasonType)
    .filter(record => sf(record, schema.game.status) === schema.game.unplayedStatus)
    .map(record => Number(sf(record, schema.game.week)))
    .filter(Number.isFinite);
  return weeks.length ? Math.min(...weeks) : null;
}

function inSelectedScope(record, context, scope, specificWeek, schema = FORCE_WIN_SCHEMA, actionableWeek = null) {
  const season = Number(sf(record, schema.game.season));
  const week = Number(sf(record, schema.game.week));
  if (season !== context.currentSeasonRecord) return false;
  // Week 0 saves are valid inputs, but Week 0 games are never eligible for a
  // proposed or applied force win under any schedule scope.
  if (week < 1 || week > 15) return false;
  // The active week is always locked. Assigning it can corrupt staged sim
  // results or produce statistics that do not match the simulated outcome.
  if (week === context.currentWeek) return false;
  if (week < context.currentWeek) return false;
  if (scope === 'week') return week === Number(specificWeek);
  if (scope === 'next') return actionableWeek !== null && week === actionableWeek;
  if (scope === 'regular') return sf(record, schema.game.weekType) === schema.game.regularSeasonType;
  throw new Error(`Unknown schedule scope: ${scope}`);
}

const SNAPSHOT_FIELDS = Object.freeze([
  'HomeTeam', 'AwayTeam', 'SeasonYear', 'SeasonWeek', 'SeasonWeekType',
  'GameStatus', 'HomeScore', 'AwayScore', 'ForceWin', 'BowlGame'
]);

// Evaluate schedule records without mutating them. Writes happen later, after confirmation.
function processSchedule({
  records, teamTable, coachTable = null, context, scope = 'regular', specificWeek,
  rivalryPairs = new Set(), neutralPairs = new Set(), skippedTeamNames = new Set(),
  random = Math.random, involvement = FORCE_WIN_CONFIG.involvement.default,
  modelProfile = FORCE_WIN_CONFIG.modelProfiles.default, depthRatings = null,
  forceAllFcs = false, schema = FORCE_WIN_SCHEMA
}) {
  const modelConfig = createModelConfig(modelProfile);
  const results = [];
  const changes = [];
  const skippedTeamNamesLower = new Set([...skippedTeamNames].map(name => String(name).toLowerCase()));
  const summary = {
    involvement, modelProfile, modelProfileLabel: modelConfig.activeModelProfile.label,
    coachingModifiersEnabled: Boolean(coachTable), gamesFound: 0, gamesEligible: 0, gamesRolled: 0,
    gamesOutsideInvolvement: 0, automaticDecisions: 0, gamesSkipped: 0, smallDisparity: 0,
    mediumDisparity: 0, highDisparity: 0, extremeDisparity: 0, forceWinsApplied: 0,
    fcsGamesEligible: 0, fcsForceWinsApplied: 0, upsetChancesPreserved: 0, recordsModified: 0
  };
  const actionableWeek = scope === 'next' ? findNextActionableWeek(records, context, schema) : null;

  // Evaluate chronologically so seeded rolls and output consistently follow the schedule.
  const orderedRecords = records
    .map((record, fallbackIndex) => ({ record, fallbackIndex }))
    .sort((left, right) => {
      const leftWeek = Number(sf(left.record, schema.game.week));
      const rightWeek = Number(sf(right.record, schema.game.week));
      const weekDifference = (Number.isFinite(leftWeek) ? leftWeek : Number.MAX_SAFE_INTEGER) -
        (Number.isFinite(rightWeek) ? rightWeek : Number.MAX_SAFE_INTEGER);
      return weekDifference || recordIndex(left.record, left.fallbackIndex) - recordIndex(right.record, right.fallbackIndex);
    });

  orderedRecords.forEach(({ record, fallbackIndex }) => {
    if ((record && record.isEmpty) || !inSelectedScope(record, context, scope, specificWeek, schema, actionableWeek)) return;
    summary.gamesFound += 1;
    const index = recordIndex(record, fallbackIndex);
    const week = Number(sf(record, schema.game.week));
    const baseResult = { index, week, record, status: 'skipped' };
    const eligibility = gameEligibilityState(record, context, schema);
    if (!eligibility.eligible) {
      results.push({ ...baseResult, reason: eligibility.reason });
      summary.gamesSkipped += 1;
      return;
    }
    const existingForceWin = sf(record, schema.game.forceWin);
    if (existingForceWin !== schema.game.noForceWin) {
      results.push({ ...baseResult, reason: `existing force-win assignment is ${existingForceWin || 'missing'}` });
      summary.gamesSkipped += 1;
      return;
    }
    const homeReference = sf(record, schema.game.homeTeam);
    const awayReference = sf(record, schema.game.awayTeam);
    const homeResolution = resolveTeamReference(homeReference, teamTable, depthRatings);
    const awayResolution = resolveTeamReference(awayReference, teamTable, depthRatings);
    if (homeResolution.error || awayResolution.error) {
      const reasons = [
        homeResolution.error && `home ${homeResolution.error}`,
        awayResolution.error && `away ${awayResolution.error}`
      ].filter(Boolean);
      results.push({ ...baseResult, reason: reasons.join('; ') });
      summary.gamesSkipped += 1;
      return;
    }
    const homeTeam = homeResolution.team;
    const awayTeam = awayResolution.team;
    if (skippedTeamNamesLower.has(homeTeam.name.toLowerCase()) || skippedTeamNamesLower.has(awayTeam.name.toLowerCase())) {
      results.push({ ...baseResult, homeTeam, awayTeam, reason: 'user-selected team game' });
      summary.gamesSkipped += 1;
      return;
    }
    const protectedReason = protectionReason({ record, conferenceChampionshipWeek: context.conferenceChampionshipWeek, schema });
    if (protectedReason) {
      results.push({ ...baseResult, homeTeam, awayTeam, reason: protectedReason });
      summary.gamesSkipped += 1;
      return;
    }
    const neutral = neutralPairs.has(pairKey(homeReference, awayReference));
    const rivalry = rivalryPairs.has(pairKey(homeReference, awayReference));
    const fcsGame = homeTeam.isBuiltInFcs || awayTeam.isBuiltInFcs;
    const fcsCoaching = { available: false, staff: null, levelScore: 0, archetypeScore: 0, value: 0, ignoredForFcs: true };
    // Built-in FCS teams have placeholder staff, so coaching is neutral for the entire matchup.
    const homeCoaching = fcsGame ? fcsCoaching : calculateCoachingScore(resolveCoachingProfile(homeTeam, coachTable), modelConfig);
    const awayCoaching = fcsGame ? fcsCoaching : calculateCoachingScore(resolveCoachingProfile(awayTeam, coachTable), modelConfig);
    const coachingAvailable = homeCoaching.available && awayCoaching.available;
    const homeContextForSelection = calculateHomeContext({ homeTeam, favoriteSide: 'home', neutral }, modelConfig);
    let favoriteResult = determineMatchupFavorite({
      homeTeam, awayTeam, neutral,
      homeCoachingScore: coachingAvailable ? homeCoaching.value : 0,
      awayCoachingScore: coachingAvailable ? awayCoaching.value : 0,
      homeContextValue: homeContextForSelection.value, config: modelConfig
    });
    const automaticFcsGame = forceAllFcs && homeTeam.isBuiltInFcs !== awayTeam.isBuiltInFcs;
    if (automaticFcsGame) {
      const nonFcsIsHome = !homeTeam.isBuiltInFcs;
      favoriteResult = {
        favorite: nonFcsIsHome ? homeTeam : awayTeam,
        underdog: nonFcsIsHome ? awayTeam : homeTeam,
        side: nonFcsIsHome ? 'home' : 'away'
      };
    }
    if (!favoriteResult) {
      results.push({ ...baseResult, homeTeam, awayTeam, reason: 'complete matchup projection is exactly tied' });
      summary.gamesSkipped += 1;
      return;
    }
    summary.gamesEligible += 1;
    if (fcsGame) summary.fcsGamesEligible += 1;
    const fcsMismatch = isFcsMismatch(favoriteResult.favorite, favoriteResult.underdog);
    const favoriteLocation = neutral ? 'neutral' : favoriteResult.side;
    const favoriteCoaching = favoriteResult.side === 'home' ? homeCoaching : awayCoaching;
    const underdogCoaching = favoriteResult.side === 'home' ? awayCoaching : homeCoaching;
    const coachingAdvantage = favoriteCoaching.available && underdogCoaching.available
      ? favoriteCoaching.value - underdogCoaching.value : 0;
    const homeContext = calculateHomeContext({ homeTeam, favoriteSide: favoriteResult.side, neutral }, modelConfig);
    const breakdown = calculateDisparity({
      favorite: favoriteResult.favorite, underdog: favoriteResult.underdog, favoriteLocation,
      rivalry, fcsMismatch, coachingAdvantage, homeContextAdjustment: homeContext.value, config: modelConfig
    });
    const bettingLines = calculateBettingLines({ homeTeam, awayTeam, favoriteSide: favoriteResult.side, disparity: breakdown.finalDisparity, config: modelConfig });
    const modeledDecision = decideForceWin(breakdown.finalDisparity, random, modelConfig, involvement);
    const decision = automaticFcsGame
      ? {
          baseProbability: modeledDecision.baseProbability, probability: FORCE_WIN_CONFIG.involvement.probabilityCap,
          roll: null, forced: true, selected: true, automatic: true, automaticReason: 'FCS opponent option'
        }
      : modeledDecision;
    const level = disparityCategory(breakdown.finalDisparity, modelConfig);
    const explanation = buildFavoriteExplanation(breakdown, modelConfig);
    if (level.label === 'small') summary.smallDisparity += 1;
    if (level.label === 'medium') summary.mediumDisparity += 1;
    if (level.label === 'high') summary.highDisparity += 1;
    if (level.label === 'extreme') summary.extremeDisparity += 1;
    if (!decision.selected) summary.gamesOutsideInvolvement += 1;
    if (decision.selected && decision.automatic) summary.automaticDecisions += 1;
    if (decision.selected && !decision.automatic) summary.gamesRolled += 1;
    if (decision.selected && !decision.automatic && !decision.forced) summary.upsetChancesPreserved += 1;
    const assignment = decision.forced
      ? getForceWinValue({ favoriteTeamId: favoriteResult.favorite.id, homeTeamId: homeTeam.id, awayTeamId: awayTeam.id, schema })
      : null;
    const result = {
      ...baseResult, status: decision.forced ? 'proposed' : 'untouched', homeTeam, awayTeam,
      favorite: favoriteResult.favorite, underdog: favoriteResult.underdog, favoriteSide: favoriteResult.side,
      favoriteLocation, neutral, rivalry, fcsMismatch, fcsGame, automaticFcsGame, favoriteCoaching,
      underdogCoaching, homeContext, bettingLines, explanation, breakdown, level, decision, assignment,
      evaluationSnapshot: Object.fromEntries(SNAPSHOT_FIELDS.map(field => [field, sf(record, field)]))
    };
    results.push(result);
    if (assignment) {
      changes.push(result);
      summary.forceWinsApplied += 1;
      if (fcsGame) summary.fcsForceWinsApplied += 1;
    }
  });

  return { results, changes, summary, actionableWeek };
}

function verifyEvaluationSnapshots(changes) {
  for (const change of changes) {
    for (const field of SNAPSHOT_FIELDS) {
      const expected = change.evaluationSnapshot ? change.evaluationSnapshot[field] : undefined;
      const current = sf(change.record, field);
      if (current !== expected) {
        throw new Error(`Schedule record ${change.index} changed after evaluation (${field}: ${expected != null ? expected : 'missing'} -> ${current != null ? current : 'missing'}). Rerun the tool before saving.`);
      }
    }
  }
}

function validateAssignments(snapshots, schema = FORCE_WIN_SCHEMA) {
  for (const { change, before } of snapshots) {
    if (sf(change.record, schema.game.forceWin) !== change.assignment) {
      throw new Error(`ForceWin validation failed for schedule record ${change.index}.`);
    }
    for (const field of SNAPSHOT_FIELDS) {
      if (field === schema.game.forceWin) continue;
      if (sf(change.record, field) !== before[field]) {
        throw new Error(`Unexpected ${field} change in schedule record ${change.index}.`);
      }
    }
  }
}

function applyAssignments(changes, schema = FORCE_WIN_SCHEMA) {
  verifyEvaluationSnapshots(changes);
  const snapshots = changes.map(change => ({
    change, before: Object.fromEntries(SNAPSHOT_FIELDS.map(field => [field, sf(change.record, field)]))
  }));
  for (const { change } of snapshots) change.record[schema.game.forceWin] = change.assignment;
  validateAssignments(snapshots, schema);
  return snapshots;
}

module.exports = {
  // scheduling / orchestration
  processSchedule, findNextActionableWeek, inSelectedScope, gameEligibilityState,
  applyAssignments, verifyEvaluationSnapshots, validateAssignments,
  // team + depth chart resolution
  resolveTeamReference, buildDepthChartRatings, teamTableId,
  // team name resolution (all-teams vs. select-teams-to-skip)
  availableTeamNames, resolveSkippedTeamNames,
  // model configuration
  createModelConfig, modelProfileRule,
  // randomness
  createRandom, createSeededRandom,
  // pairs / protections
  buildPairSet, pairKey, protectionReason, isPostseasonGame,
  // explanations (the "why" behind a forced win)
  buildFavoriteExplanation, formatExplanationItem, explainContribution, impactBand,
  // lower-level math, exposed for tests/tuning
  calculateDisparity, determineMatchupFavorite, calculateMatchupAdvantage, calculateBaseStrength,
  calculateBettingLines, calculateCoachingScore, resolveCoachingProfile, calculateHomeContext,
  probabilityForDisparity, disparityCategory, decideForceWin, involvementRule, isFcsMismatch,
  SNAPSHOT_FIELDS
};
