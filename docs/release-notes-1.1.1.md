# Ghost City RLT 1.1.1

## Force Win (new — Week 0)

- Added **Force Win**, ported from Ace's CFB Toolkit 0.9.3's "Automatic Force Win," as Ghost City's replacement for CFB Rebalance.
- Evaluates every remaining regular-season matchup (weeks 1–15) and forces the modeled favorite to win where the mismatch — starter-weighted talent, unit matchups, coaching, home field, and home environment — is large enough.
- Runs as its own **Week 0** import stage. Force Win needs the save's `CurrentWeekType` to already be `RegularSeason`, which only happens once you've advanced the dynasty past Preseason and Signing Day in-game, so it can't run in the same batch as those two stages.
- Toolbox exposes involvement level (minimum through maximum) and model profile (ratings, balanced, coaching, matchup, chaos) as configurable settings, plus an option to force wins for every team or leave specific teams to the game engine. These settings can be configured at any time regardless of the save's current week; only running the actual import requires the save to be at Week 0.
- Creates an RLT backup before writing anything to the save.
- Forced-game history — matchup, forced winner, and the disparity/probability inputs behind the decision — is saved with the season and reviewable on the new **Toolbox Outputs** page.

## CFB Rebalance removed

- The embedded CFB Rebalance mod has been fully removed (code, API route, and Toolbox UI). Force Win is its replacement.

## Toolbox Outputs (renamed from Realignment)

- Renamed the **Realignment** page to **Toolbox Outputs**, with subtabs for **Conference Realignment** and **Force Win**, each with its own season selector.
- Both tables are sortable by column and show team logos, with smaller, more concise text throughout.
- The Force Win table splits each matchup into separate **Away** and **Home** columns and summarizes the forced-win reason as short, icon-tagged labels (for example "Talent 💪, Matchups ⚔️") instead of a full sentence; hover a reason for the full explanation.

## Import

- Import now offers three snapshot stages — **Preseason**, **Signing Day**, and **Week 0** — instead of two.
- The Imported Seasons list now shows the source save's file name as subtext under each entry.

## Reliability

- Fixed a `RangeError: Map maximum size exceeded` crash on Signing Day imports with a large zero-offer-transfer class. The NSD transfer-placement step was rebuilding — then discarding — a full league-wide recruiting-board scan on every single transfer placement; that dead computation has been removed.

## Portable app delivery

The single-file **Portable EXE** and the no-install **ZIP/folder build** are both still available on the Releases page, unchanged from 1.1.0.

## Reminder: Preseason, Signing Day, and Week 0 workflow

**Preseason:** Fang → Dynamic Recruiting Pipelines → Transfer Wave → Import

**Signing Day:** PocketScout NSD → Dynamic Conference Realignment → Import

**Week 0:** Force Win → Import

CFB Rebalance has been removed. Force Win, its replacement, needs the save's CurrentWeekType to already be RegularSeason — which isn't true yet during Preseason or Signing Day — so it runs as its own dedicated Week 0 import once you've advanced the save that far in-game.

## Upgrade note

Replace your old portable exe with the new one; your existing tracker data, settings, and backups remain intact.
