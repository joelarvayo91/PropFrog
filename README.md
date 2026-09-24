# PropFrog — Statcast Edition

A launch-ready, mobile-first MLB home-run research dashboard built with Next.js and free public baseball data.

## Included
- Today's MLB schedule, active rosters and probable pitchers
- Current season MLB batting statistics
- Baseball Savant Statcast Exit Velocity & Barrels leaderboard ingestion
- Batter Avg EV, Max EV, Launch Angle, Hard-Hit %, Barrel/BBE and Barrel/PA
- Probable-pitcher contact-quality allowed when available
- Transparent Statcast-enhanced HR research estimate and mathematical fair-odds conversion
- Expandable mobile player research cards
- No database, Docker, Python, or API key required

## Deploy on Vercel
1. Put this folder in a GitHub repository.
2. In Vercel choose **Add New → Project** and import the repository.
3. Vercel detects Next.js automatically. Press **Deploy**.
4. No environment variables are required.

## Local run
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## Important model note
The Statcast Research v2 number is an experimental, transparent pregame research heuristic. It combines season production, batter Statcast contact quality and probable-pitcher contact allowed. It is deliberately capped and is **not yet a historically calibrated predictive model**. Do not treat it as a guaranteed probability or sportsbook recommendation.

## Data sources
- MLB public Stats API endpoints for schedule, roster, probable pitcher and season stats.
- Baseball Savant public Statcast leaderboard CSV for contact-quality metrics.

Baseball Savant may change its public endpoints or access policies. The app fails gracefully: if the Statcast CSV cannot be reached, the MLB slate still loads and Statcast fields display as unavailable.
