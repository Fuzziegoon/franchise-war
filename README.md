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
