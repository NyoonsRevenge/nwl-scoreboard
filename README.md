# NWL Scoreboard — New World League

A static web application that displays match history, group breakdowns, player statistics and per-role rankings for the **New World League (NWL)** — a recurring *New World: Aeternum* PvP league featuring **Beaverknights** vs **Capyknights**.

75 wars, around 375 players behind 687 recorded in-game names, and roughly 500 POV recordings are archived here. *New World* shuts down in February 2027; this site is built to outlive it.

## Features

### Match data
- Full match history with per-group breakdowns, in three view modes (paired Excel layout, list, side-by-side comparison)
- Detailed player stats: kills, deaths, assists, healing, damage
- Team totals, attacker/defender and winner detection per match
- Player profiles with full match history, role filter and career aggregates
- Player search across every recorded name and alias

### Rankings and analysis
- **Role MVPs** per match — the top three players per role, scored by a role-aware formula, with the winner marked by a gold ★ next to their name in every group view
- **Tier-List** — percentile-based S–D ranking per role bucket, adjusted for sample size
- **League Records** — single-war bests and career totals, each player listed once
- **MVP Leaderboard** — every player ranked by role MVP titles
- **Map Statistics** — win rates and average scores per territory, plus attacker win share
- **Compare Players** — two players head to head, optionally narrowed to one role

### Other
- VOD system: ▶ buttons next to player names on the scoreboard and in a player's match history
- Name mapping — handles the frequent in-game name changes
- Changelog page, support ticket and VOD submission links in the burger menu
- Maintenance mode with a countdown and a preview bypass for pre-release review
- Random *New World* wallpaper backgrounds, medieval-themed responsive UI

## Tech Stack

- **Frontend:** Vanilla HTML / CSS / JS — no framework, no build step, no dependencies
- **Serverless:** two Vercel Edge Functions (`api/xlsx.js` proxies the spreadsheet export, `api/thanks.js` backs a shared counter with Upstash Redis)
- **Data pipeline:** Python script fetching from a published Google Spreadsheet
- **Deployment:** Vercel, auto-redeployed on every push to `master`
- **Auto-sync:** GitHub Actions runs `extract-data.py` every 30 minutes and commits data changes to `master`

## Project Structure

```
nwl-scoreboard/
├── public/                        # Static site root (served by Vercel)
│   ├── index.html                 # Single-page entry point
│   ├── app.js                     # The entire client application
│   ├── styles.css                 # Styling
│   ├── data/
│   │   ├── matches.json           # Match index
│   │   ├── nwl-{n}.json           # Per-match data
│   │   └── vods.json              # VOD links keyed by match slug
│   ├── fonts/                     # Custom fonts (incl. patched ShareTechMono)
│   └── wallpapers/                # New World loading screen wallpapers
├── api/
│   ├── xlsx.js                    # Edge Function: proxies the XLSX export
│   └── thanks.js                  # Edge Function: shared counter (Upstash Redis)
├── scripts/
│   ├── extract-data.py            # Fetches Google Sheet → JSON, merges VODs
│   ├── create-vod-form.gs         # Apps Script: VOD submission form (run once)
│   ├── create-ticket-form.gs      # Apps Script: ticket submission form (run once)
│   ├── modify-zero.py             # Font utility: replaces slashed zero in ShareTechMono
│   └── test-discovery.js          # Tests sheet discovery from the published spreadsheet
├── .github/workflows/
│   └── sync-data.yml              # Cron: runs extract-data.py every 30 min, auto-commits
└── vercel.json                    # Deployment config: SPA rewrites, cache headers
```

`name_mapping.json` lives **outside** this repository, one directory up.

## Getting Started

### Prerequisites

- Python 3.x

### Local Development

```bash
cd nwl-scoreboard/public
python -m http.server 8000
```

Then open `http://localhost:8000`.

The two Edge Functions do not run under the plain Python server. `api/thanks.js` is written so the page falls back silently to a local counter when it is unreachable, so nothing breaks — you simply do not see the shared count locally.

### Refreshing Match Data

```bash
python nwl-scoreboard/scripts/extract-data.py
```

Fetches the latest data from the published Google Sheet and writes JSON files to `nwl-scoreboard/public/data/`. In production this runs automatically every 30 minutes via GitHub Actions.

## Data Pipeline

`extract-data.py`:

1. Fetches CSV data for each sheet tab (one tab per match)
2. Downloads the XLSX to read tab colours for winner detection and logo placement for attacker detection
3. Reads the "VODs" tab and merges responses into `vods.json`
4. Parses player stats per group and writes structured JSON per match
5. Preserves hand-added matches that have no sheet tab (e.g. a war where no stats were captured)

Sheet naming convention: `{MapName} {DD.MM.YYYY} (NWL#{number})`

### Winner detection priority

1. Tab colour from XLSX (green = Beaverknights, purple = Capyknights)
2. VICTORY/DEFEAT cell in CSV
3. Kill total comparison (fallback)

### Attacker detection

Read from the position of the team logos in the spreadsheet — the upper logo is the attacker. `ATTACKER_OVERRIDES` in `extract-data.py` corrects matches where the placement is wrong.

## Data Loading

`LIVE_SYNC_RECENT_COUNT` in `app.js` controls how many recent matches are fetched live from Google Sheets on page load. **It is set to `0`:** every match loads from the static JSON files, and the spreadsheet is not contacted at all. That keeps pages fast and, more importantly, means the site keeps working once the spreadsheet is no longer reachable.

Setting it to a positive number restores the old hybrid behaviour, where the last N matches sync live and in-progress edits show up immediately.

## VOD System

VODs are stored in `public/data/vods.json`, keyed by match slug:

```json
{ "nwl-74": [{ "discord": "Zarkoï", "url": "https://youtu.be/..." }] }
```

The `discord` field is never displayed — it exists solely to attach a recording to a player. It is matched against the players of that war by canonical alias, exact name, then substring, so either a Discord display name or the exact in-game name works. The in-game name is preferred for entries added by hand, because it matches regardless of how the alias chains change later.

Two sources feed the file:

- **Google Form** — players submit POV recordings (URL in `VOD_SUBMIT_FORM_URL` in `app.js`). The form writes to a "VODs" tab in the spreadsheet; `extract-data.py` merges responses on every auto-sync, so a submission appears within ~30 minutes. The form is created once by running `create-vod-form.gs` in Google Apps Script.
- **Manual entries** — added directly to `vods.json`. `merge_vods()` preserves them: form data only overwrites an entry when the same `(slug, discord)` pair is submitted, and slugs with no form data are left untouched.

A player who recorded more than one POV in a single war gets one button per video.

## Name Mapping

Players change their in-game names frequently. `name_mapping.json` maps scoreboard names to canonical names through bidirectional alias chains, which `buildNameLookup()` merges into groups — so `Zar_ki`, `Zarkoï` and `Zarki` all resolve to one player.

The file lives outside this repository. `app.js` carries an embedded copy as `NAME_MAPPING_JSON`, and **both must be kept in sync manually** when aliases are added. `extract-data.py` also syncs entries from the spreadsheet's Character-Names-DB tab into the block marked by `BEGIN/END: Auto-synced from Character-Names-DB` in `app.js`.

## Rankings

### MVP scoring

Players are bucketed by role (healers split into zerg groups G1–6 and KS groups G7–10) and scored per match. A bucket only crowns an MVP when at least `MVP_MIN_CONTENDERS` players contested it — otherwise the sole player of a rare role would win every war they show up in.

### Tier-List

Per role bucket, players with at least `TIER_MIN_GAMES` (10) games are ranked and split into S–D by percentile (S = top 15%, A = 15–35%, B = 35–65%, C = 65–85%, D = bottom 15%).

Scores are adjusted for sample size: an average is weighted against the role average by how many wars it rests on, with the minimum game count as the weight. Ten games count half your own average and half the role average; seventy games count almost entirely your own. Thin samples therefore sit closer to the middle **in both directions** — a handful of lucky or unlucky wars cannot decide the top. Each chip's tooltip shows the raw average alongside the rated value.

A checkbox under the table lifts the minimum for anyone who wants to see everybody. The D-Tier column is deliberately sealed: the column and its headcount stay visible, but the names never reach the markup.

## Maintenance Mode

`MAINTENANCE_MODE` in `app.js` puts a message over the blurred site with a countdown to `MAINTENANCE_TARGET`. While it is active, appending the preview parameter defined next to it (`PREVIEW_PARAM` / `PREVIEW_TOKEN`) opens the finished site and is remembered for the rest of the browser session — enough to let reviewers click around before a release. It is not access control: the value sits in `app.js` and anyone reading the source will find it.
