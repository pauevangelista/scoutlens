# ScoutLens app

Expo (TypeScript, Expo Router) version of `../prototype/index.html`: consent, profile, score.

## Run in the browser

```bash
cd app
npm install
npm run web
```

Then open http://localhost:8081.

## Where things live

- `src/app/` screens: `consent.tsx`, `profile.tsx`, `score.tsx`.
- `src/scoring/rubric.ts` loads `../rubric.json` (criteria, weights, thresholds, measurement fields, required photos). `metro.config.js` lets the bundler see the repo root for this.
- `src/scoring/score.ts` one scoring function per rubric criterion id. Every result has a reason and a tip.
- `src/state/submission.tsx` in-memory state. Gender and age band are kept apart and never passed to scoring.
- `src/photo/luminance.web.ts` measures brightness in the browser. On iOS it is not measured yet, and the Exposure criterion says so.
