const path = require('path');
const { defaultSettings, computeTeamPipelines, buildAcademyAssignment } = require('./engine/pipelineEngine');
const {
  openSave, readTeamPipelineMapping, readPlayers, readCoaches,
  readPipelineRow, writeUpdatedSave,
} = require('./io/saveFile');

const regionCentroids = require('./data/regionCentroids.json');

/** Run the validated Pipeline Tool engine and apply all teams in one pass. */
async function runPipelineTool(savePath, suppliedSettings = {}) {
  const settings = { ...defaultSettings(), ...suppliedSettings,
    coachInclude: { ...defaultSettings().coachInclude, ...(suppliedSettings.coachInclude || {}) },
    coachWeight: { ...defaultSettings().coachWeight, ...(suppliedSettings.coachWeight || {}) },
  };
  const franchise = await openSave(savePath);
  const { teamsByIndex, pipelineInfluenceTable } = await readTeamPipelineMapping(franchise);
  const playersByTeamIndex = await readPlayers(franchise);
  const coachesByTeamIndex = await readCoaches(franchise);
  const academyTeams = new Set(settings.academyMode ? settings.academyTeams || [] : []);
  const updates = {};
  const summary = { teamsProcessed: 0, teamsUpdated: 0, academyTeams: 0, unchanged: 0, log: [] };

  for (const [teamIndexText, teamInfo] of Object.entries(teamsByIndex)) {
    const teamIndex = Number(teamIndexText);
    const prior = teamInfo.rows4306.map((row) => readPipelineRow(pipelineInfluenceTable, row))
      .filter(Boolean).filter((entry) => !(entry[0] === 'Unrecognized' && entry[2] === 0));
    const isAcademy = academyTeams.has(teamInfo.displayName);
    if (!prior.length && !isAcademy) continue;
    const existingAcademy = teamInfo.rows4306.length >= settings.academyTargetCount;
    if (isAcademy && settings.academyExempt && existingAcademy) {
      summary.unchanged++; continue;
    }
    const players = playersByTeamIndex[teamIndex] || [];
    const coaches = coachesByTeamIndex[teamIndex] || {};
    const target = isAcademy ? settings.academyTargetCount : settings.maxPipelines;
    const after = isAcademy && settings.academyExempt && settings.academyUniform
      ? buildAcademyAssignment(settings.academyUniformTier, target)
      : computeTeamPipelines(teamInfo.displayName, players, coaches, prior, regionCentroids, settings, target);
    updates[teamIndex] = { after };
    summary.teamsProcessed++;
    summary.teamsUpdated++;
    if (isAcademy) summary.academyTeams++;
  }

  const result = await writeUpdatedSave(
    savePath,
    updates,
    path.join(path.dirname(savePath), 'RLT Backups'),
    { maxPipelines: settings.maxPipelines, academyTeamNames: settings.academyMode ? settings.academyTeams || [] : [] },
  );
  summary.backupPath = result.backupPath;
  summary.outputPath = result.outputPath;
  summary.log.push(`${summary.teamsUpdated} teams recomputed`, `${summary.academyTeams} academy team(s) processed`);
  return summary;
}

module.exports = { defaultSettings, runPipelineTool };
