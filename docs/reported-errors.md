# Reported errors and fixes

This is the support history for errors reported while Ghost City RLT was being
developed and released. Entries use the release in which the fix first appears
instead of tying a report to a specific player save.

## Current status — 1.0.7 (August 2026)

| Reported symptom | Cause | Fix | Verification |
| --- | --- | --- | --- |
| `Bundled Fang resources are missing.` in the portable EXE | Fang's dynamically loaded JSON name and portrait data was not guaranteed to be copied beside the standalone runtime loader. | The standalone-preparation and package steps now explicitly copy Fang's data to its runtime location. The runner also checks the packaged locations safely. | Local and portable tests passed. |
| `NODE_MODULE_VERSION 148` / Electron requires `137` | `better-sqlite3` had been packaged from the regular Node build rather than rebuilt for Electron. | Rebuilt `better-sqlite3` for Electron before packaging and retained the Electron-native binary in the portable build. | Local and portable tests passed. |
| `previousTeam does not exist in the current database` during Signing Day import | Some older portable databases had a partial recruit migration: the tables existed, but the newer columns did not. | Desktop startup now repairs the missing `SignedRecruit.previousTeam`, `SignedRecruit.classYear`, and `UnsignedRecruit.previousTeam` columns safely. | Schema repair tested against a representative older database. |
| Preseason mods ran in an unclear order | Fang originally ran first, while later tools depended on a more predictable final save state. | Preseason order is now **CFB Rebalance → Dynamic Recruiting Pipelines → Transfer Wave → Fang → Import**. Transfer Wave is second-to-last when Fang is enabled. | Local Preseason workflow passed. |

## 1.0.6 (August 2026)

| Reported symptom | Cause | Fix |
| --- | --- | --- |
| `Cannot find module '@electron/asar'` from Fang | The embedded runner depended on an optional Electron archive helper that was not available in every packaged execution path. | Made the archive helper optional and used bundled JSON data for normal operation. |
| `Cannot find module 'madden-franchise'` from Transfer Wave | The copied Transfer Wave engine tried to resolve dependencies relative to the copied mod folder. | Resolved the module through Ghost City's standalone Node runtime. |
| `slotsLookup.json` missing / PocketScout resources missing in a packaged app | Next standalone tracing omitted package data files loaded at runtime. | Explicitly copied Madden Franchise lookup data and PocketScout schemas into standalone packaging. |
| `Could not find a valid Coach table` after the EA title update | The updated title used a newer CFB 27 schema than the original embedded PocketScout copy. | Added PocketScout Utilities 0.9.10's verified CFB 27 schema to the embedded scanner. |

## 1.0.5 and earlier (August 2026)

| Reported symptom | Cause | Fix |
| --- | --- | --- |
| `UnsignedRecruit` table missing | Existing installations had database files created before the unsigned-recruit migration. | Added migration and startup repair handling for older local databases. |
| Signed players appeared on the Unsigned page | Import logic did not treat `HardCommitted` as a signed state. | `Signed`, `Committed`, and `HardCommitted` are all now imported as signed. |
| Previous team blank for transfers | The import lacked a persisted previous-team field and transfer history handling. | Added previous-team fields for signed and unsigned recruits and populated them during import. |
| Transfer page showed stale or missing Signing Day results | Transfer data was tied too narrowly to a previous snapshot/run. | Updated the import and transfer queries so each relevant snapshot is refreshed correctly. |

## Support checklist

Before reporting a new error, include:

1. Whether the issue is in the portable EXE or local browser workflow.
2. Snapshot type: **Preseason** or **Signing Day**.
3. Enabled mods and their order shown on the Import page.
4. The complete error message or screenshot.
5. Whether the save is a copy and whether the game was at the main menu.

Test saves are retained locally for both Preseason and Signing Day regressions;
they are intentionally excluded from GitHub.
