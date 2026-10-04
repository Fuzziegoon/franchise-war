# The League Leak (Madden 27 league tracker)

Web app for the Franchise War series (coaches Wes and Christian, room for 16 coaches and 100 seasons).
The league Google Sheet **Madden27_Baseline_Database** is the database; this app reads it and lets
anyone with the league password write to it. Everyone else gets a read-only site.

```
Browser (GitHub Pages, free)  ──GET──▶  Apps Script web app  ──▶  League Google Sheet
             └──POST + password──▶  (runs as the Sheet owner)
```

## Phase 0 — what's here

| Area | What it does |
|---|---|
| `apps-script/Code.gs` | The API. Reads tabs as JSON (skips EXAMPLE rows, helper and notes columns, caches 2 min). Password-checked writes that fill the first blank row and never overwrite formula cells. |
| Pages | News + "The War" coach scoreboard, Standings (computed from Games), Teams, Team roster + schedule, Player profile + season stats, Leaders (5 stat tabs) |
| Admin (password) | Log a game, log a transaction (and move the player), publish a story, set head coaches |
| Sample mode | With no `VITE_API_URL`, the app runs on built-in sample data so it can be previewed anywhere |

## One-time setup

### 1. Install the API in the Sheet
1. Open the league Sheet → **Extensions → Apps Script**.
2. Add a file named `Api` and paste in `apps-script/Code.gs`. (Already done for the league Sheet: project "Franchise War API".)
3. **Project Settings → Script properties → Add**: `ADMIN_PASSWORD` = the league password.
4. Run `selfTest` once from the editor and approve the permissions prompt. The log lists row counts for every tab.
5. **Deploy → New deployment → Web app**: *Execute as* **Me**, *Who has access* **Anyone**. Copy the URL ending in `/exec`.

After changing `Code.gs` later, use **Deploy → Manage deployments → Edit → New version** so the URL stays the same.

### 2. Put the code on GitHub and turn on Pages
1. Create a repo (e.g. `franchise-war`) and push this folder to `main`.
2. Repo **Settings → Secrets and variables → Actions → Variables**: add `VITE_API_URL` = the `/exec` URL.
3. Repo **Settings → Pages → Source: GitHub Actions**. Every push to `main` tests, builds and deploys.

### Local development
```
npm install
cp .env.example .env.local   # paste the /exec URL, or leave blank for sample data
npm run dev
npm test
```

## How the password works
The password lives only in the Apps Script's Script properties. The site sends it with each write; the
script checks it before touching the Sheet, slows down wrong guesses, and only allows whitelisted tabs
and columns. In the browser it's kept for the current tab only (sessionStorage) until you press **Lock**.

## Data rules the app follows
- `Players` is the master list; trades/signings change `TeamIndex` and `Status` (TeamIndex 32 = free agent/draft).
- Standings and coach records are computed from `Games` (Regular stage only for standings), not the `Record` column.
- Formula columns (Winner, Margin, 1v1?, derived stats) are never written; they're copied down to new rows.
- Closing a season stays in the Sheet's **League tools → Close season** menu.

## Next phases (not built yet)
Screenshot intake (AI reads box scores, you confirm), stat-line entry, fan social feed + beat writers,
AI story drafts, history/records pages, draft class import, cutscene creator.

## Weekly workflow

1. Enter the week's games and stats in the Sheet (Games, player stat tabs, injuries, moves).
2. Ask Claude to write the week. Claude reads the Sheet and adds rows to the **Articles** tab: written stories, `Tweet` rows, and `Video: ...` rows.
3. The new week appears in the site's week picker as soon as it has one Published row. Week 1 is always there and gets generic preview coverage; later weeks only show what was written for them plus factual game recaps and scoreboards.

Tweet rows: Type `Tweet`, Headline = tweet text, Subjects = team abbrs and/or a PlayerID (`;` separated), Key facts used = `handle|Display Name|Y or N verified|badge|reply-to name` (last two optional).

## Backup and factory reset

- **Admin > Backup & reset > Download backup (.xlsx)** saves every tab the site reads (teams, players, games, stories, moments, season totals, history and per-game logs) as one Excel workbook, one sheet per tab. **Back up in the Sheet** also keeps copies as "BK ..." tabs.
- **Back up in the Sheet** copies the app-editable tabs into `BK <time> <Tab>` tabs inside the Sheet (newest 3 sets kept).
- **Factory reset** (type RESET) backs up first, clears every row the league added (games, stories, tweets, videos, moves, stat rows), restores Teams and Players to `public/factory-snapshot.json`, and sets all head coaches back to CPU. It never touches formulas, headers, or EXAMPLE rows.
- To change what "factory" means (for example after a new roster import): run `node scripts/make-snapshot.mjs`, then upload the new `public/factory-snapshot.json`.
- The Apps Script (`apps-script/Code.gs`) must be updated and redeployed for the two new buttons to work.

## Milestones

The Apps Script scans the Sheet for streaks, career marks and big games and logs each new one on the **Moments** tab (never twice). Run it from the Sheet (**League tools > Scan for milestones**) or the site (**Admin > Milestones**).

**Automatic scan.** In the Sheet choose **League tools > Turn on automatic scan** once (Google asks you to authorize it a single time). After that, any edit to the Sheet (or a stat logged from the Admin page) flags it, and a timer checks every 5 minutes: if stats changed it scans once. Typing a whole week of stats causes one scan a few minutes later, not one per cell. **Turn off automatic scan** removes it. The manual menu item and Admin button still work any time.

**Coverage.** QB, RB, WR and TE (yards, TDs, receptions, 100/300-yard streaks, big days); defense (sacks, INTs, tackles, TFL, forced fumbles, fumble recoveries, passes defended, INT TDs; sack/INT/TFL/forced-fumble streaks; 12-tackle days, pick-sixes); kickers (FGM, 50+ yard FGs, XPM, FG streaks, perfect-game streaks, 55+ yard FGs, 5-FG days); punters (punt yards, punts inside the 20, 65+ yard punts, 5-inside-20 days). Streaks need per-game rows on OffenseGames / DefenseGames / KickingGames. OL and returners have no stat columns, so they are not covered.

- **Streaks** need game-by-game rows on OffenseGames / DefenseGames: 3 straight games of 100+ receiving or rushing yards, 300+ passing yards, a receiving/rushing TD, 2+ passing TDs, a sack; 2 straight games with an interception.
- **Career marks** add up the History tabs plus this season's totals (or this season's game rows if a player has no season-total row): for example 25 career TDs, 1,000 receiving yards, 10 sacks. Only marks crossed this season are logged.
- **Big games:** 150+ receiving or rushing yards, 400+ passing yards, 3+ sacks, 2+ interceptions, 4+ touchdowns.
- The thresholds are lists at the top of `apps-script/Code.gs` (`CAREER_RULES`, `STREAK_RULES`, `SINGLE_RULES`); change a number and re-deploy.
- This adds a "League tools" menu to the Sheet. If you later install CloseSeason.gs, merge its menu into the `onOpen` function.
