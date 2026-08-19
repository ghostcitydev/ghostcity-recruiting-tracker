# Ghost City RLT 1.1.0

## Tracker accuracy

- Fixed **Positional Depth** and **Roster Ratings** after Preseason Transfer Wave.
  Ghost City now reads each team’s authoritative in-save roster array—the same
  roster source used by Transfer Wave—instead of relying on `Player.TeamIndex`,
  which the game can leave stale after a transfer.
- Incoming Transfer Wave players now appear on their destination roster after
  the automatic reimport. This corrects missing-position cases such as a team
  receiving quarterbacks but displaying zero QBs in Positional Depth.
- Removed phantom roster counts caused by players whose stale team field still
  pointed at a former school. Existing Preseason snapshots can be corrected by
  reimporting the already-modified save with Transfer Wave disabled.

## Conference realignment history

- Signing Day realignment recommendations are now retained with the imported
  season instead of existing only in the temporary import result.
- Added a **Realignment** page for reviewing a saved Signing Day recommendation
  list: team, current conference, and recommended destination conference.
- The Realignment season selector now matches the regular control styling.
- Realignment remains recommendation-only. Ghost City does not change a
  dynasty’s conference membership; apply any accepted moves in CFB 27’s
  **Custom Conferences** menu during the offseason.

## Reliability checks

- Verified the local app build and production build after the roster-import
  correction.
- Confirmed that the corrected import refreshes tracker data only; it does not
  rerun Transfer Wave or modify the selected dynasty save.

## Portable app delivery

The single-file **Portable EXE** remains available. Its large self-extracting
format can take several minutes to open on a first launch while Windows scans
and unpacks it.

For a future release, Ghost City will also offer a **no-install ZIP/folder
build** alongside the single EXE. Players will unzip it once and run `Ghost
City RLT.exe` directly—still no installer or setup required, with a faster and
more dependable startup path.

## Reminder: Preseason workflow

**Fang → Dynamic Recruiting Pipelines → Transfer Wave → CFB Rebalance → Import**

After a Transfer Wave run, Ghost City automatically imports the final modified
save, so Positional Depth reflects the completed roster movement.
