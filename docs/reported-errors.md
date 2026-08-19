# Reported errors and fixes

This is the support history for errors reported while Ghost City RLT was being
developed and released. Entries use the release in which the fix first appears
instead of tying a report to a specific player save.

## Current status — 1.1.0 (August 2026)

| Reported issue | Cause | Fix | Verification |
|---|---|---|---|
| Positional Depth showed missing Transfer Wave arrivals or implausibly large counts at another school | CFB 27 can leave `Player.TeamIndex` stale after a roster move. RLT used that field while Transfer Wave correctly used the team roster arrays. | RLT now resolves roster players through the authoritative `Team.Roster` references, matching Transfer Wave’s membership logic. | Refreshed the affected Preseason save: Ball State correctly showed two incoming QBs and stale phantom counts were removed. Local lint and production build pass. |
| Signing Day realignment recommendations disappeared after leaving the Import page | Recommendations existed only in the temporary mod result. | Successful Signing Day imports now save the recommendation list by season; the new Realignment page displays it later. | Local route and production build verification pass. |
| Portable EXE appears to do nothing or takes a very long time to launch | The 300+ MB self-extracting portable app must unpack and can be scanned by Windows before Electron opens a window. | Added clear first-launch guidance. A no-install ZIP/folder build is planned alongside the single EXE for a faster future startup path. | Current portable EXE remains supported; ZIP/folder delivery is planned, not yet shipped. |

| Reported issue | Cause | Fix | Verification |
|---|---|---|---|
| Pipeline updates could reuse a still-owned row after a damaged pipeline slot | The older allocator only knew each team's contiguous pipeline prefix, so valid rows after a hole could appear unclaimed. Stale `Unrecognized` rows could also remain structurally referenced. | Updated the embedded Pipeline Tool to the v1.2.0 integrity logic: stale references are reclaimed, allocation starts from full live ownership, and per-team ownership is rebuilt after repair. | Production build and code checks pass; retain a backup before any first run on an existing dynasty. |
| Realignment lacked the current conference-size and Hawai‘i settings | RLT was still exposing the earlier embedded defaults. | Updated the embedded settings to Dynamic Conference Realignment v0.2.0 values and added the new Toolbox controls. Realignment remains recommendation-only. | Settings are persisted and passed to the Signing Day recommendation stage. |

## 1.0.8 (August 2026)

| Reported symptom | Cause | Fix | Verification |
| --- | --- | --- | --- |
| No integrated Signing Day conference realignment workflow | RLT previously had no way to retain the multi-season history required by the Dynamic Conference Realignment tool. | Added an embedded, read-only Dynamic Conference Realignment workflow after NSD Assign. It stores its history in RLT app data and returns recommendations for manual application in CFB 27's Custom Conferences menu. | Tested on a local Signing Day import: NSD Assign completed, RLT imported the save, and five realignment recommendations were produced. |
| Portable EXE did not include the current Transfer Wave implementation | The packaged app needed to be rebuilt from the locally verified 1.0.8 source. | Rebuilt the portable package after the current application build and Electron-native SQLite rebuild completed. | Build includes the full standalone app, bundled mod resources, and Electron-specific `better-sqlite3`. |

## 1.0.7 (August 2026)

| Reported symptom | Cause | Fix | Verification |
| --- | --- | --- | --- |
| `Bundled Fang resources are missing.` in the portable EXE | Fang's dynamically loaded JSON name and portrait data was not guaranteed to be copied beside the standalone runtime loader. | The standalone-preparation and package steps now explicitly copy Fang's data to its runtime location. The runner also checks the packaged locations safely. | Local and portable tests passed. |
| `NODE_MODULE_VERSION 148` / Electron requires `137` | `better-sqlite3` had been packaged from the regular Node build rather than rebuilt for Electron. | Rebuilt `better-sqlite3` for Electron before packaging and retained the Electron-native binary in the portable build. | Local and portable tests passed. |
| `previousTeam does not exist in the current database` during Signing Day import | Some older portable databases had a partial recruit migration: the tables existed, but the newer columns did not. | Desktop startup now repairs the missing `SignedRecruit.previousTeam`, `SignedRecruit.classYear`, and `UnsignedRecruit.previousTeam` columns safely. | Schema repair tested against a representative older database. |
| Preseason mods ran in an unclear order | Fang, Pipelines, Transfer Wave, and Rebalance had conflicting documented order. | Preseason order is now **Fang → Dynamic Recruiting Pipelines → Transfer Wave → CFB Rebalance → Import**. | Execution chain and documentation updated together. |

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
