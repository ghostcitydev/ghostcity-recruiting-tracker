import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const registry = JSON.parse(await fs.readFile(path.join(root, 'upstream-mods.json'), 'utf8'));

for (const mod of registry.mods) {
  const response = await fetch(`https://api.github.com/repos/${mod.repository}/releases/latest`, {
    headers: { 'User-Agent': 'ghost-city-rlt-upstream-check' },
  });
  if (!response.ok) throw new Error(`${mod.name}: GitHub returned ${response.status}`);
  const release = await response.json();
  const embedded = mod.embeddedVersion;
  const current = release.tag_name;
  const state = current === embedded ? 'current' : 'update available';
  console.log(`${mod.name}: ${state}\n  embedded: ${embedded}\n  latest:   ${current}\n  release:  ${release.html_url}`);
}
