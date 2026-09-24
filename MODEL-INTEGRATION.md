# Model integration

## MLB
In `app/dashboard/route.js`, import:

```js
import {mlbHitterModel, fairAmerican} from '../lib/prediction-model';
```

Inside `hitterCard`, after `s`, `bs`, and `ps` are available:

```js
const prediction = mlbHitterModel({ season: s, batterSC: bs, pitcherSC: ps });
const prob = Number(prediction.hrProb.toFixed(1));
const props = {
  hit: Number(prediction.hitProb.toFixed(1)),
  rbi: Number(prediction.rbiProb.toFixed(1)),
  walk: Number(prediction.walkProb.toFixed(1)),
  strikeout: Number(prediction.strikeoutProb.toFixed(1))
};
```

Add `confidence: prediction.confidence` to the returned player object and use
`fairAmerican(prob)` for the fair-odds conversion.

## NFL
Feed `nflPropModel()` actual chronological player game logs. Do not generate a
sportsbook line. If you have a real line, pass it as `line`; otherwise leave it
null and display the projection without an over probability.

```js
const prediction = nflPropModel({
  values: actualGameLogValues,
  opportunities: actualTargetsCarriesOrAttempts,
  line: realLineOrNull,
  opponentFactor: actualOpponentRate / leagueAverageRate,
  roleFactor: currentRoleFactor
});
```
