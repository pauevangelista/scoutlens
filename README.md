# ScoutLens

Feedback and agency matching for aspiring models. A model submits a standard photo set and a few details, and gets clear notes on what to fix, how to take digitals, and which agencies to look at and why. There is no score: every note is a status (Good, Improve, Missing, Not measured), a plain-language reason and one specific tip.

ScoutLens is a capstone project (joint thesis, IE University) and a product in progress.

## Status

Working prototype for the web (Expo). Not yet tested on an iPhone. Agency data is a seed and is not yet verified on the agencies' own sites. Nothing is uploaded: in this version photos stay on the device and are not stored.

## How it works

1. Three screens explain the idea, then the person confirms they are 18 or older and agrees to the terms.
2. One question per screen: aim, experience, details (height, age, city, optional measurements).
3. Three photos: face close-up, full length, side profile.
4. The app reads the photos on the device: highlights, shadows, sharpness, colour of the light.
5. Notes: grouped feedback, no numbers.
6. Agencies: every agency is listed, each with "Matches because..." or "Not a match because...", its source and when it was last verified.

## Run it

You need Node.js. The tests need Node 22.18 or newer.

```
cd app
npm install
npm run web        # opens the app in a browser
npm start          # to try it on a phone with Expo Go
npm test           # unit tests
npx tsc --noEmit   # type check
npm run lint
```

## Analysis (research)

Compares the app's measurements with scouts' ratings (Spearman), by disclosed group, with scout-to-scout agreement as the ceiling.

```
cd analysis
pip install -r requirements.txt
python spearman.py fixtures/synthetic_ratings.csv --out results.csv
```

The input format is in `analysis/README.md`. Real ratings go in `analysis/data/`, which is not tracked.

## Layout

| Path | What it holds |
|---|---|
| `app/` | The Expo app (TypeScript) and its tests |
| `rubric.json` | Checks, thresholds and wording rules. Nothing is hard-coded in the UI |
| `data/agencies.seed.json` | Agencies, their published requirements and sources |
| `analysis/` | Python scripts for the scout comparison |
| `docs/design/` | Design system, onboarding flow, photo shot list, design source |
| `docs/standards-research.md` | What agencies publish, with sources |
| `prototype/` | The first single-file prototype, kept as a reference |
| `CLAUDE.md` | Working rules for the coding assistant |

## Rules the project follows

- No score, points or ranking is ever shown to users.
- No weight and no BMI. Bust, waist and hips are never compared with a range unless an agency publishes it and the user opts in.
- Photo feedback is identical regardless of gender, age, experience or skin tone. Tests check this.
- Facial symmetry is never part of user-facing feedback.
- Agency matching only uses an agency's own published criteria and always explains the result. No agency is hidden.
- No real photos or personal data in this repository. Synthetic fixtures only.
- Using real participants' photos needs ethics approval and university-approved, EU-hosted storage.
