# Ghost City RLT v1.0.6 Plan

## Goal

Harden the newly embedded preseason workflow and make its results easier to verify before and after import.

## Priorities

### 1. Fang Recruiting Generator

- Keep the settings picker as a visible **Browse…** button and retain the selected JSON profile for the next preseason import.
- Run the preseason workflow in this order: Fang → Dynamic Recruiting Pipelines → Transfer Wave → CFB Rebalance → Ghost City import.
- Keep the embedded direct read/calculate/write flow; do not require launching an external executable.
- Create a fresh `RLT Backups` copy before modifying the save.
- **Verified:** the Toolbox loads with Fang enabled and the Browse button rendered; a temporary-save smoke test processed 259 candidates, including names, sizes, and portraits.

### 2. Pipeline Tool verification and reporting

- Add a compact Pipeline run log to the Import result: teams updated, settings preset, backup location, and any skipped teams.
- Show a before/after summary of pipeline tier and influence changes in Toolbox or Pipelines.
- Add a safe dry-run/preview option so users can review expected changes before writing a save.
- Validate the embedded Pipeline Tool against a current preseason dynasty file and confirm the subsequent import updates the Pipelines tab correctly.

### 3. Preseason import reliability

- Treat the preseason sequence as one explicit flow: Fang → Dynamic Recruiting Pipelines → Transfer Wave → CFB Rebalance → Import.
- Improve step-specific errors and logs so it is clear which stage completed if a later stage fails.
- Standardize backups under `RLT Backups`, with clear timestamps and tool labels.
- Ensure rerunning a failed later stage does not rerun Transfer Wave unnecessarily.

### 4. Data-display polish

- Add a visible snapshot indicator on Pipelines so Preseason and Signing Day data cannot be confused.
- Keep HS Recruit pipeline views Signing Day-only; keep Pipeline Influence available for both snapshots.
- Add empty-state explanations when a selected snapshot has no pipeline influence yet.
- Review chart layouts at common desktop resolutions, including multiple selected teams.

### 5. Packaging and regression checks

- Confirm standalone packaging includes every embedded Pipeline engine, data, and save adapter file.
- Test the packaged Windows app with a clean database and current save format.
- Verify database migrations apply cleanly for users upgrading from v1.0.4 and v1.0.5.
- Add a release checklist covering import, Signing Day NSD, Transfer Wave, Rebalance, Pipelines, and backup creation.

## Acceptance checklist

- [ ] A preseason import completes all enabled stages in order and displays a result for each stage.
- [x] Fang settings can be selected through the Toolbox Browse button and Fang runs successfully against a temporary save copy.
- [ ] Pipeline Influence displays the updated preseason result by team and by region.
- [ ] A failed Pipeline or Rebalance step leaves a usable backup and a clear recovery path.
- [ ] The packaged app runs each embedded mod without relying on external executables.
- [ ] Standalone packaging includes the Fang resource bundle (`fang-resources`) as well as the embedded runners.
- [ ] Upgrade testing passes from a fresh install and an existing v1.0.5 database.
