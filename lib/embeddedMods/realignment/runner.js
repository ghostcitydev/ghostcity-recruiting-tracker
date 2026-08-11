const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  defaultSettings,
  recalculateMoves,
  moveSummary,
  validateMoves,
  setBaseline,
  setupTeams,
  performanceReview,
  executeMoves,
  sendApplications,
  reviewApplications,
  calculateMoves,
} = require('./engine/realignmentEngine');
const {
  openSave,
  readDynastyCode,
  readCurrentSeason,
  readConferences,
  readTeamPrestige,
} = require('./io/saveFile');
const { loadHistory, deleteSeason } = require('./io/pipelineHistory');

function historyApp() {
  const configured = process.env.GC_RLT_DATA_DIR;
  const fallback = path.join(process.env.LOCALAPPDATA || os.homedir(), 'Ghost City RLT');
  const dataDir = configured || fallback;
  fs.mkdirSync(dataDir, { recursive: true });
  return { getPath: () => dataDir };
}

function applySliders(settings) {
  const next = { ...defaultSettings(), ...settings };
  next.prestigedecay = 1 / Math.max(1, Number(next.prestigeAvgLength) || 1);
  next.confTenureWeight = next.dConfTenureWeight * next.sTenureWeight / 100;
  next.teamTenureWeight = next.dteamTenureWeight * next.sTenureWeight / 100;
  next.confPrestigeWeight = next.dconfPrestigeWeight * next.sPrestigeWeight / 100;
  next.teamPrestigeWeight = next.dteamPrestigeWeight * next.sPrestigeWeight / 100;
  next.confGeoWeight = next.dconfGeoWeight * next.sGeoWeight / 100;
  next.teamGeoWeight = next.dteamGeoWeight * next.sGeoWeight / 100;
  next.confSizeDesire = next.dconfSizeDesire * next.sconfSizeDesire / 100;
  next.evenDesire = next.dEvenDesire * next.sEvenDesire / 100;
  next.confStabilityWeight = next.dconfStabilityWeight * next.sconfStabilityWeight / 100;
  next.expediteFee = next.dexpediteFee * next.sexpediteFee / 100;
  next.inviteThresholdBaseline = next.dinviteThresholdBaseline + next.confStabilityWeight;
  next.expelThresholdBaseline = next.dexpelThresholdBaseline + next.confStabilityWeight;
  return next;
}

function knownSeasons(history, dynastyCode, teamName) {
  return Object.keys(history?.[dynastyCode]?.[teamName] ?? {})
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
}

/**
 * Generates conference-movement recommendations. This intentionally never
 * writes the dynasty save: CFB 27 still requires the player to make the
 * accepted moves through Custom Conferences in-game.
 */
async function runRealignmentTool(savePath, suppliedSettings = {}) {
  const settings = applySliders(suppliedSettings);
  const app = historyApp();
  const franchise = await openSave(savePath);
  const teamsByIndex = await readTeamPrestige(franchise);
  const conferences = await readConferences(franchise);
  const dynastyCode = await readDynastyCode(franchise);
  const season = Number(await readCurrentSeason(franchise));
  const anchorTeam = teamsByIndex.find(Boolean);
  if (!anchorTeam) throw new Error('No teams could be read from this dynasty save.');

  let history = loadHistory(app);
  const prior = knownSeasons(history, dynastyCode, anchorTeam.displayName).filter((year) => year < season);
  if (knownSeasons(history, dynastyCode, anchorTeam.displayName).includes(season)) {
    deleteSeason(app, dynastyCode, season);
    history = loadHistory(app);
  }

  const baselineSeason = prior.length ? prior[0] : season;
  if (!prior.length) {
    await setBaseline(teamsByIndex, conferences, season, settings);
  } else {
    await require('./engine/realignmentEngine').pullHistory(
      teamsByIndex,
      conferences,
      String(prior.at(-1)),
      history,
      dynastyCode,
      settings,
      season,
    );
  }

  await setupTeams(settings, teamsByIndex, conferences);
  await performanceReview(settings, teamsByIndex, conferences);
  await sendApplications(settings, teamsByIndex, conferences);
  await reviewApplications(settings, teamsByIndex, conferences);

  let moves = await calculateMoves(settings, teamsByIndex, conferences, baselineSeason, season);
  let accepted = await executeMoves(teamsByIndex, conferences, moves);
  let valid = await validateMoves(moves, accepted);
  for (let attempt = 0; valid < 10 && attempt < 10; attempt += 1) {
    moves = await recalculateMoves(settings, teamsByIndex, conferences, moves, accepted);
    accepted = await executeMoves(teamsByIndex, conferences, moves);
    valid = await validateMoves(moves, accepted);
  }

  const summary = await moveSummary(moves);
  await require('./engine/realignmentEngine').recordSnapshots(teamsByIndex, conferences, season, dynastyCode, app);
  return { dynastyCode, season, moves, summary, settings, historyMode: prior.length ? 'continued' : 'baseline' };
}

module.exports = { defaultSettings, runRealignmentTool };
