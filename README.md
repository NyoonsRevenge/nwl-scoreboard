# NWL Scoreboard — New World League

A static web application that displays match history, group breakdowns, and player statistics for the **New World League (NWL)** — a recurring *New World: Aeternum* PvP league featuring **Beaverknights** vs **Capyknights**.

## Features

- Full match history with per-group breakdowns
- Detailed player stats: kills, deaths, assists, healing, damage
- Team totals and winner detection per match
- Hybrid data loading: recent matches sync live from Google Sheets, older matches load from static JSON
- Player name mapping (handles frequent in-game name changes)
- Per-player role filtering (AoE, HL, IV, BR, PT)
- VOD system: players can submit POV recordings via Google Form; ▶ buttons appear next to names on the scoreboard
- Changelog page accessible via the burger menu
- Random New World wallpaper backgrounds
- Responsive, medieval-themed UI with custom fonts

## Tech Stack

- **Frontend:** Vanilla HTML / CSS / JS (no framework, no build step)
- **Data pipeline:** Python script fetching from a published Google Spreadsheet
- **Deployment:** Vercel (static site), auto-redeployed on data changes
- **Auto-sync:** GitHub Actions runs `extract-data.py` every 30 minutes and commits any data changes to master

## Project Structure

```
nwl-scoreboard/
├── public/                        # Static site root (served by Vercel)
│   ├── index.html                 # Single-page entry point
│   ├── app.js                     # Client-side application logic
│   ├── styles.css                 # Styling
│   ├── data/
│   │   ├── matches.json           # Match index
│   │   ├── nwl-{n}.json           # Per-match data
│   │   └── vods.json              # VOD links keyed by match slug
│   ├── fonts/                     # Custom fonts (incl. patched ShareTechMono)
│   └── wallpapers/                # New World loading screen wallpapers
├── scripts/
│   ├── extract-data.py            # Fetches Google Sheet → JSON, merges VODs
│   ├── create-vod-form.gs         # Apps Script: creates VOD submission form (run once)
│   ├── create-ticket-form.gs      # Apps Script: creates ticket submission form (run once)
│   ├── modify-zero.py             # Font utility: replaces slashed zero in ShareTechMono
│   └── test-discovery.js          # Tests sheet discovery from the published spreadsheet
├── .github/workflows/
│   └── sync-data.yml              # Cron: runs extract-data.py every 30 min, auto-commits
└── vercel.json                    # Vercel deployment config (SPA rewrites)
```

## Getting Started

### Prerequisites

- Python 3.x

### Local Development

```bash
cd nwl-scoreboard/public
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

### Refreshing Match Data

```bash
python nwl-scoreboard/scripts/extract-data.py
```

Fetches the latest data from the published Google Sheet and writes JSON files to `nwl-scoreboard/public/data/`. In production this runs automatically every 30 minutes via GitHub Actions.

## Data Pipeline

The extraction script (`extract-data.py`):

1. Fetches CSV data for each sheet tab (one tab per match)
2. Downloads the XLSX to read tab colors for winner detection
3. Reads the "VODs" tab and merges responses into `vods.json`
4. Parses player stats per group and outputs structured JSON per match

Sheet naming convention: `{MapName} {DD.MM.YYYY} (NWL#{number})`

### Winner Detection Priority

1. Tab color from XLSX (green = Beaverknights, purple = Capyknights)
2. VICTORY/DEFEAT cell in CSV
3. Kill total comparison (fallback)

## Hybrid Data Loading

`LIVE_SYNC_RECENT_COUNT` (default `5`) in `app.js` controls how many recent matches are fetched live directly from Google Sheets on page load. Older matches load from the static per-match JSON files. Falls back to pure static mode if the sheet list fetch fails.

## VOD System

Players submit POV recordings via a Google Form (URL configured in `VOD_SUBMIT_FORM_URL` in `app.js`). The form writes to a "VODs" tab in the NWL spreadsheet. On each auto-sync, `extract-data.py` reads that tab and merges responses into `vods.json`. ▶ buttons appear next to player names on the scoreboard within ~30 minutes of submission.

The form is created once by running `create-vod-form.gs` in Google Apps Script.

## Name Mapping

Players frequently change their in-game names. `name_mapping.json` maps scoreboard names to canonical display names via bidirectional alias chains. When adding new aliases, the embedded `NAME_MAPPING_JSON` object in `app.js` must be kept in sync manually.
