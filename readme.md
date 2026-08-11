# Ghost City RLT

Ghost City's Recruiting Landscape Tracker is a local companion for EA Sports College Football 27 dynasties. It tracks recruiting, transfers, rosters, pipelines, team ratings, and program history across seasons—and includes optional tools that can update a local dynasty save.

Everything runs on your PC. Your dynasty save, tracker database, and mod settings are not uploaded to a server.

## Run Ghost City RLT

### Portable app — recommended

Download **Ghost City RLT Portable.exe** from the [Releases page](https://github.com/ghostcitydev/ghostcity-recruiting-tracker/releases), place it anywhere, and double-click it.

There is no installer, setup wizard, Node.js requirement, or separate mod download. Your tracker data is stored in `%AppData%\ghost-city-rlt\cfb27.db`, so replacing the exe during an update does not erase your history.

### Optional local browser mode

If you prefer a browser window instead of the portable app, download the project folder and install Node.js LTS.

1. Double-click `setup-ghost-city-rlt.bat` once.
2. After setup, double-click `run-ghost-city-rlt.bat` whenever you want to use the tracker.
3. Keep the command window open while using `http://localhost:3000`.

This is still completely local and supports the same save-file and mod workflow.

## What it tracks

- **Dashboard:** FBS team ratings, prestige, recruiting, records, transfers, grades, and champion badges.
- **Players:** recruiting classes, transfers, roster ratings, positional depth, and Access to Recruits views with combined filters.
- **Unsigned:** remaining high-school/JUCO and transfer-portal prospects, including star/source breakdowns and previous teams for transfers.
- **Pipelines:** team and region pipeline influence, recruiting reach, and preseason pipeline changes.
- **Charts:** multi-season team trends, national distributions, recruit composition, and sortable/exportable data views.
- **History:** one Preseason and one Signing Day snapshot per season, with CSV export, season deletion, and full import-history backup/restore packages from Import.

## Import a save

1. Save your dynasty in-game.
2. On **Import**, choose the dynasty save from the automatically detected EA saves folder. Use **Change** if your saves are elsewhere.
3. Select **Preseason** or **Signing Day** and import.
4. Open Dashboard, Players, Pipelines, Charts, or Unsigned to explore the snapshot.

Normal imports read the save and create a local tracker snapshot. They do not change the save file.

### Preserve or switch tracking histories

Use **Export Imports** under **Imported Seasons** to save your tracker history as a JSON package before starting a new dynasty, clearing data, or moving to another PC. Use **Restore Imports** to bring it back later. Restoring replaces only matching year/snapshot records and leaves all other tracked seasons intact.

## Embedded dynasty mods

Mods are configured in **Toolbox** and run automatically as part of the appropriate Import workflow. They modify the selected local save, then Ghost City RLT reimports it.

### Preseason order

1. **Fang's Recruiting Generator** — optional; select a Fang settings JSON in Toolbox. Fang runs first and creates an RLT backup.
2. **Dynamic Recruiting Pipelines** — optional; runs after Fang and refreshes pipeline influence data.
3. **Preseason Transfer Wave** — optional; recommended for Year 2–3 and beyond. It redistributes transfer-portal players using roster need and prestige rules.
4. **CFB Rebalance** — optional; runs after Transfer Wave and refreshes its backup in `RLT Backups`.
5. **Ghost City import** — records the final preseason snapshot.

### Signing Day

1. **NSD: Assign Unsigned Players** — optional; places unsigned recruits on teams with roster need, then reimports the save. Run it once per National Signing Day only.
2. **Dynamic Conference Realignment** — optional; runs after NSD and generates conference-movement recommendations from geography, prestige, tenure, and multi-season history. It never edits the dynasty save. Review the results after import, then apply any moves you accept through CFB 27's **Custom Conferences** menu during the offseason.

### Important timing rules

- Before running any save-writing mod, exit the dynasty to the game's **main menu**. The game can remain open.
- Back up a save before trying a new mod or setting for the first time.
- Do not run NSD Assign twice on the same Signing Day.
- Keep Dynamic Conference Realignment enabled for each Signing Day if you want it to build its history. Early seasons may produce no recommendations while its history and moratorium settings are still in effect.
- Keep Transfer Wave disabled until your dynasty has developed for a few seasons unless you intentionally want an early redistribution.

## Toolbox utilities

Toolbox also includes direct local save utilities for school grades, prestige, NIL, roster rebalance, recruiting dealbreakers, history resets, and related dynasty maintenance. These tools write to the save file; review each confirmation and back up first.

## Troubleshooting

**No save appears on Import**

Use **Change** beside the save-folder path and select the folder containing your EA dynasty saves.

**A mod reports that the save is in use**

Exit the dynasty to the main menu, save first, then retry.

**Toolbox cannot find a save file**

Import that dynasty first. Toolbox works with the save tied to the most recently imported season.

**Local browser mode will not start**

Run `setup-ghost-city-rlt.bat` again, ensure Node.js LTS is installed, and keep the command window open after launching.

## Updating

For the portable app, download the newest exe and replace the old one. Your tracker data remains in place.

## Credits

- Save parsing: [madden-franchise](https://github.com/WiiExpertise/madden-franchise) by WiiExpertise
- Fang's Recruiting Generator by Fang / RO27
- NSD Assign by PocketScout Utilities
- Dynamic Conference Realignment by Slappey47
- Preseason Transfer Wave by Balla / Aball1495
- Dynamic Recruiting Pipelines by Balla / Aball1495
- CFB Rebalance by Dogsh*t
- Ghost City RLT is built with Next.js, Prisma, Chart.js, and Tailwind CSS
