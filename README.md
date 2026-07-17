# CFB Recruiting Evolution Tracker

A local web app for tracking recruiting classes, transfer portal activity, program grades, and team ratings across every season of your **EA Sports College Football 27** dynasty.

Built for dynasty nerds who want more than what the game shows you.

---

## Features

- **Dashboard** — sortable table of all 134 teams with OVR, prestige, recruiting rank, star breakdowns, transfer in/out/net, and program grades
- **Star filter** — toggle between All / High School+JUCO / Transfer Portal; star columns update accordingly
- **Facilities grade** — pulls `AthleticFacilitiesGrade` and score (0–100) directly from your save file
- **Grades panel** — toggle to show Atmosphere, Brand, Budget, Traditions, Conference Prestige, and Facilities grades per team
- **Power 4 / Group of 5 filters** — quick conference group filtering above individual conferences
- **Charts** — trend lines per team, recruit composition stacked bars, plus three national charts:
  - OVR band distribution (how many teams sit in each tier nationally)
  - Unsigned recruits 5★/4★/3★ split by HS vs Transfer Portal
  - Transfer portal volume nationally (in vs out per season)
- **Unsigned recruits page** — tracks unsigned prospects at snapshot time, split by HS/JUCO and Transfer Portal with per-star breakdowns
- **CSV export** — export all team stats or unsigned data to CSV from any page
- **Season delete** — remove any imported season from the Import page
- **JUCO fix** — junior college recruits counted in the HS bucket, matching the game's own grouping

---

## Prerequisites

- **Node.js 18+** — download from [nodejs.org](https://nodejs.org) (choose the LTS version)
- **EA Sports College Football 27** on PC with an active dynasty save

That's it. No database server, no cloud account.

---

## Setup

### First time

1. **Download or clone this repo**

   Click the green **Code** button → **Download ZIP**, then extract it anywhere you like (e.g. `C:\CFB27Tracker`).

   Or if you have Git:
   ```
   git clone https://github.com/tikitiger/cfb-recruiting-evolution-tracker.git
   cd cfb-recruiting-evolution-tracker
   ```

2. **Run the setup script**

   Double-click **`setup.bat`** in the folder.

   This will:
   - Install all dependencies
   - Create the local database
   - Open the app in your browser at `http://localhost:3000`

   The first run takes a minute or two while packages download. After that it's fast.

3. **Import your save**

   - In the app, click **Import** in the nav bar
   - Paste the full path to your dynasty save file, e.g.:
     ```
     C:\Users\YourName\Documents\EA SPORTS College Football 27\saves\DYNASTY-YOURTEAM-AUTOSAVE
     ```
   - Click **Import Save** — takes about 10–20 seconds
   - Navigate to **Dashboard** to see your data

### Starting the app after first-time setup

Double-click **`start.bat`** (or run `npm run dev` in the folder).

The app runs at `http://localhost:3000`. Keep the terminal window open while you're using it — closing it stops the server.

---

## Finding your save file

Your saves are here by default:

```
C:\Users\<YourName>\Documents\EA SPORTS College Football 27\saves\
```

Look for a file named something like `DYNASTY-SJSU-AUTOSAVE` (no extension). That's the one to import. You can import multiple seasons from the same dynasty — just advance a season in-game, then import again.

---

## Updating

When a new version is released:

1. Download the new ZIP (or `git pull` if you cloned)
2. Double-click **`setup.bat`** again — it handles database migrations automatically
3. Re-import your saves if prompted

---

## Troubleshooting

**The app won't start / blank page**
- Make sure Node.js is installed: open a terminal and run `node --version`
- Try running `setup.bat` again

**Import fails with an error**
- Double-check the save file path — it should point to the file itself, not the folder
- Make sure the dynasty is saved in-game before importing

**Data looks wrong / facilities score is blank**
- Re-import the save — some fields were added in later versions and require a fresh import
- Delete the old season from the Import page first, then re-import

**Port 3000 is already in use**
- Something else is running on port 3000. Close other terminals/apps and try again, or edit `package.json` to change the dev port

---

## How it works

The app reads your save file using the [`madden-franchise`](https://github.com/WiiExpertise/madden-franchise) library, which understands the binary Frostbite format EA uses. It extracts per-team stats, recruiting data, grades, and transfer portal information and stores them in a local SQLite database. Nothing leaves your machine.

Each import is a snapshot — import after each season to build up a history over time.

---

## Contributing

Pull requests welcome. If you find a bug or want a feature, open an issue at [github.com/tikitiger/cfb-recruiting-evolution-tracker](https://github.com/tikitiger/cfb-recruiting-evolution-tracker/issues).

---

## Credits

- Save file parsing: [`madden-franchise`](https://github.com/WiiExpertise/madden-franchise) by WiiExpertise
- Built with Next.js, Prisma, Chart.js, and Tailwind CSS
