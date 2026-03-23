# NWL Scoreboard — New World League

A static web application that displays match history, group breakdowns, and player statistics for the **New World League (NWL)** — a recurring *New World: Aeternum* PvP league featuring **Beaverknights** vs **Capyknights**.

## Features

- Full match history with per-group breakdowns
- Detailed player stats: kills, deaths, assists, healing, damage
- Team totals and winner detection per match
- Player name mapping (handles frequent in-game name changes)
- Random New World wallpaper backgrounds
- Responsive, medieval-themed UI with custom fonts

## Tech Stack

- **Frontend:** Vanilla HTML / CSS / JS (no framework, no build step)
- **Data Pipeline:** Python script that fetches data from a published Google Spreadsheet
- **Deployment:** Vercel (static site)

## Project Structure

```
nwl-scoreboard/
├── public/              # Static site root (served by Vercel)
│   ├── index.html       # Single-page entry point
│   ├── app.js           # Client-side application logic
│   ├── styles.css        # Styling
│   ├── data/            # Generated JSON match data
│   │   ├── matches.json # Match index
│   │   └── nwl-{n}.json # Per-match data (NWL #1–#25)
│   ├── fonts/           # Custom fonts
│   └── wallpapers/      # New World loading screen wallpapers
├── scripts/
│   ├── extract-data.py  # Fetches & parses Google Sheet → JSON
│   ├── modify-zero.py
│   └── test-discovery.js
└── vercel.json          # Vercel deployment config
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

This fetches the latest data from the published Google Sheet and writes JSON files to `nwl-scoreboard/public/data/`.

## Data Source

Match data is sourced from a published Google Spreadsheet. The extraction script:

1. Fetches CSV data for each sheet (one per match)
2. Downloads the XLSX to read tab colors for winner detection
3. Parses player stats per group (kills, deaths, assists, healing, damage)
4. Outputs structured JSON per match

Sheet naming convention: `{MapName} {DD.MM.YYYY} (NWL#{number})`

### Winner Detection Priority

1. Tab color from XLSX (green = Beaverknights, purple = Capyknights)
2. VICTORY/DEFEAT cell in CSV
3. Kill total comparison (fallback)

## Name Mapping

Players might have different names in the raidplan and on the ingame scoreboard. The file `name_mapping.json` maps scoreboard names to canonical display names. When adding new aliases, the embedded `NAME_MAPPING_JSON` object in `app.js` must be kept in sync.
