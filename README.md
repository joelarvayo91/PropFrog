# PropFrog v5 — Real-Data Prediction Model

This package adds `app/lib/prediction-model.js`, a shared MLB/NFL prediction engine.

The design rule is strict: **no invented player stats, injuries, weather, lines, or outcomes.** Missing data lowers model confidence instead of being silently fabricated.

MLB uses empirical-Bayes season rates plus Statcast batter/pitcher contact quality. NFL uses actual chronological game logs, opportunity trends, opponent context, and role context. A probability against a prop line is only produced when a line is actually supplied.

For a serious production model, backtest by historical date with time-based holdouts, then calibrate probabilities. Brier score/log loss should be tracked for binary props; MAE/RMSE for continuous projections.

See `MODEL-INTEGRATION.md` for the exact route wiring.
