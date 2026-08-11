# Ghost City RLT 1.0.8

## What's new

- Added **Dynamic Conference Realignment** by Slappey47 to the Signing Day workflow.
- Realignment runs after NSD Assign and generates recommended conference moves using geography, prestige, tenure, and multi-season history.
- Realignment is recommendation-only: RLT never changes conference membership in the save. Apply accepted moves manually through CFB 27's Custom Conferences menu during the offseason.
- Updated the embedded **Preseason Transfer Wave** engine to v2.0.1.
- Added an informational upstream-version checker for Transfer Wave, Dynamic Recruiting Pipelines, and Dynamic Conference Realignment. Updates are still reviewed and tested before being bundled.

## Packaging and reliability

- Rebuilt the portable app directly from the locally verified 1.0.8 source.
- Kept the Electron-native SQLite module and all required embedded Fang, PocketScout, Transfer Wave, Pipeline, Rebalance, and Realignment runtime resources.
- Removed duplicate upstream desktop applications and source archives from the portable package; embedded tools continue to run inside RLT.
- Prevented prior build output, the local development database, and `.env` files from entering portable builds.
- Added a clean standalone-build step so stale generated files cannot inflate future releases.
- Corrected Signing Day destination reconciliation for signed transfers. RLT now uses the recruit's signed top school instead of a stale team committed-player reference when those records disagree.
- Added **Export Imports** and **Restore Imports** on the Import page. A package preserves imported seasons, recruiting classes, unsigned players, pipelines, roster data, and charts history. Restoring replaces only matching season/snapshot pairs and keeps every other imported season.

## Important notes

- The preseason order remains **Fang → Dynamic Recruiting Pipelines → Transfer Wave → CFB Rebalance → Import**.
- Keep Dynamic Conference Realignment enabled at each Signing Day to build its history. Early seasons may return no moves while history and moratorium requirements are still being established.
- Exit the dynasty to the main menu before running any save-writing mod. The game can remain open.
- To correct a prior Signing Day snapshot, re-import just that season's Signing Day save; other tracked seasons are preserved.
