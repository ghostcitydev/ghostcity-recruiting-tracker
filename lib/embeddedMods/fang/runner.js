/* Headless Fang Recruiting Generator: direct save read/calculate/write. */
const fs = require('node:fs');
const path = require('node:path');
const Franchise = require('madden-franchise');
// The packaged app ships the portrait and name indexes as plain JSON. Keep
// the optional ASAR fallback for development copies of Fang, but do not make
// the portable EXE depend on Electron's archive helper at runtime.
let ASAR = null;
try { ASAR = require('@electron/asar'); } catch { /* embedded JSON is used */ }
const DATA_ROOT = path.join(__dirname, 'data');
const NAME_POOLS_PATH = path.join(DATA_ROOT, 'weightedNamePools.json');
const PORTRAIT_PATHS_PATH = path.join(DATA_ROOT, 'portraitPaths.json');
const SIGNED = new Set(['Signed', 'Committed', 'HardCommitted', 'Invalid']);
const POOL = { Light: 'White', Medium: 'Multiracial', Dark: 'Black' };
const roll = (min, max) => Math.min(min, max) + Math.floor(Math.random() * (Math.abs(max - min) + 1));
function weighted(values) { const rows = Array.isArray(values) ? values.map((entry) => [String(entry?.name || ''), Number(entry?.weight || 0)]) : Object.entries(values || {}); const usable = rows.filter(([name, value]) => name && Number(value) > 0); const total = usable.reduce((sum, [, value]) => sum + Number(value), 0); let cursor = Math.random() * total; for (const [name, value] of usable) { cursor -= Number(value); if (cursor <= 0) return name; } return usable.at(-1)?.[0] || ''; }
function enabled(settings, key) { return settings.settingModules?.[key] === true; }
function tone(settings, player) { const mix = settings.skinToneSettings?.archetypes?.[player.Position]?.[player.PlayerType] || settings.skinToneSettings?.positions?.[player.Position] || { light: 34, medium: 33 }; const value = Math.random() * 100; return value < Number(mix.light || 0) ? 'Light' : value < Number(mix.light || 0) + Number(mix.medium || 0) ? 'Medium' : 'Dark'; }
function size(player, settings) { const star = ({ ONE_STAR: '1', TWO_STAR: '2', THREE_STAR: '3', FOUR_STAR: '4', FIVE_STAR: '5' })[player.ProspectStarRating] || '3'; const set = settings.playerSizeSettings?.positions?.[player.Position] || {}; const range = set[player.PlayerType]?.[star] || Object.values(set)[0]?.[star]; if (!range) return false; player.Height = roll(Number(range.minHeight), Number(range.maxHeight)); player.Weight = Math.max(0, roll(Number(range.minWeight), Number(range.maxWeight)) - 160); return true; }
function jucoRatings(player, settings) { let changed = 0; for (const [field, range] of Object.entries(settings.globalRatingVariance?.juco?.positions?.[player.Position] || {})) { if (!(field in player) || !Number.isFinite(Number(player[field]))) continue; const delta = roll(-(Number(range.min) || 0), Number(range.max) || 0); if (!delta) continue; player[field] = Math.max(10, Math.min(99, Number(player[field]) + delta)); changed++; } return changed; }
let embeddedPortraitPaths;
function portraitNames(archive, skin, body) {
  const prefix = `\\assets\\Player_Portraits\\${skin}Generic\\${body}\\nilpp_Generic_`;
  if (!embeddedPortraitPaths && fs.existsSync(PORTRAIT_PATHS_PATH)) embeddedPortraitPaths = JSON.parse(fs.readFileSync(PORTRAIT_PATHS_PATH, 'utf8'));
  const entries = embeddedPortraitPaths || (ASAR ? ASAR.listPackage(archive) : []);
  return entries.filter((item) => item.startsWith(prefix) && /\.webp$/i.test(item)).map((item) => path.basename(item).replace(/^nilpp_/i, '').replace(/\.webp$/i, ''));
}
async function run({ savePath, settings: payload, log = () => {} }) {
  const settings = payload?.settings || payload;
  if (!settings || typeof settings !== 'object' || (payload?.schema && payload.schema !== 'recruit-overhaul-27-settings-config')) throw new Error('Select a valid RO27/Fang settings JSON file.');
  const root = path.resolve(__dirname, '..', '..', '..', 'public', 'other mods', 'RO27-Official-V3.4-win-x64-portable');
  const archive = path.join(root, 'resources', 'app.asar');
  if (!fs.existsSync(archive) && (!fs.existsSync(NAME_POOLS_PATH) || !fs.existsSync(PORTRAIT_PATHS_PATH))) throw new Error('Bundled Fang resources are missing.');
  const names = enabled(settings, 'nameWeights') ? JSON.parse(fs.existsSync(NAME_POOLS_PATH) ? fs.readFileSync(NAME_POOLS_PATH, 'utf8') : ASAR?.extractFile(archive, 'weightedNamePools.json').toString()) : null;
  const backupDir = path.join(path.dirname(savePath), 'RLT Backups'); fs.mkdirSync(backupDir, { recursive: true }); const backupPath = path.join(backupDir, `${path.basename(savePath)}.gc-rlt-pre-fang-backup`); fs.copyFileSync(savePath, backupPath);
  const franchise = await Franchise.create(savePath); if (franchise.gameType !== 'college') throw new Error(`This does not look like a College Football dynasty save (detected ${franchise.gameType}).`);
  const recruits = franchise.getTableByName('Recruit'); const players = franchise.getTableByName('Player'); await recruits.readRecords(); await players.readRecords();
  const counts = { candidates: 0, named: 0, sized: 0, portraits: 0, ratingFields: 0 }; const portraitCache = new Map();
  for (const recruit of recruits.records) { if (recruit.isEmpty || SIGNED.has(String(recruit.RecruitStage || ''))) continue; const ref = recruit.fields?.Player?.referenceData; const player = ref && players.records[ref.rowNumber]; if (!player || player.isEmpty) continue; counts.candidates++; if (String(recruit.Class || '').startsWith('JuniorCollege') && enabled(settings, 'globalRating')) counts.ratingFields += jucoRatings(player, settings); if (enabled(settings, 'playerSize') && size(player, settings)) counts.sized++; const skin = tone(settings, player); if (enabled(settings, 'skinTone')) { const key = `${skin}|${player.CharacterBodyType || 'Standard'}`; if (!portraitCache.has(key)) portraitCache.set(key, portraitNames(archive, skin, player.CharacterBodyType || 'Standard')); const faces = portraitCache.get(key); if (faces.length) { player.GenericHeadAssetName = faces[Math.floor(Math.random() * faces.length)]; counts.portraits++; } } if (names && enabled(settings, 'nameWeights')) { const group = POOL[skin]; const first = weighted(names[`${group}FirstNames`]); const last = weighted(names[`${group}LastNames`]); if (first && last) { player.FirstName = first; player.LastName = last; counts.named++; } } }
  await franchise.save(savePath, {}); Object.entries(counts).forEach(([key, value]) => log(`${key}: ${value}`)); return { ...counts, backupPath, enabledModules: Object.keys(settings.settingModules || {}).filter((key) => enabled(settings, key)) };
}
module.exports = { run };
