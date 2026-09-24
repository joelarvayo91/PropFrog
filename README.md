# PropFrog — Improved Dashboard

Drop-in replacement for the current PropFrog Next.js project.

## Improvements
- Faster API assembly by fetching team rosters and hitter season stats concurrently.
- Search plus sorting by model estimate, Barrel/PA, Hard Hit %, Avg EV, or season HR.
- Minimum-estimate filters.
- Better mobile controls and player cards.
- Accessible expandable cards and focus states.
- Game-time and data-refresh context.
- Improved loading, empty, and error states.
- Existing Statcast Research v2 heuristic preserved.

## Important: logo
The original repository's `public/logo.png` is binary and is not included in this handoff package. Copy your existing `public/logo.png` into this folder before uploading. The UI still works if it is temporarily missing.

## Upload
Replace the matching files in your GitHub repository with the files in this package, and keep/copy your existing `public/logo.png`.

## Run
```bash
npm install
npm run dev
```

## Model note
The displayed HR estimate is an experimental research heuristic, not a historically calibrated probability or sportsbook recommendation.
