# Embedded mod sources

RLT checks public upstream releases with `npm run mods:check`.

The command is informational only: it never downloads or replaces code in a user installation. Each upstream change must be reviewed against RLT's wrappers, tested locally with the matching Preseason or Signing Day fixture, then bundled in a new RLT release.

The authoritative pinned versions, source commits, release assets, and integration notes live in `upstream-mods.json`. Version 1.0.9 bundles Dynamic Recruiting Pipelines v1.2.0's save-integrity repairs and Dynamic Conference Realignment v0.2.0's current defaults and sizing controls.

Dynamic Conference Realignment is intentionally recommendation-only. It keeps its multi-season history in Ghost City RLT's local app-data folder and never changes a dynasty save. Users apply any accepted recommendation in CFB 27's Custom Conferences menu during the offseason.
