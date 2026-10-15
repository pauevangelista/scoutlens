# ScoutLens

Explainable scoring tool for model scouting. It is both a joint thesis capstone (IE University) and a personal product that I want to publish on the App Store.

## What it does
- Aspiring models (18+) submit a standard photo set and basic measurements, and get a score per criterion with a plain-language reason and a tip.
- Scouts review and can override every score.
- Research question: can an explainable scoring rubric, derived from scout interviews rather than historical signings, match independent scouts' rankings of unseen profiles without scoring applicant groups differently?

## Stack (target)
- TypeScript everywhere in the app.
- Expo (React Native, Expo Router): one codebase for web and iOS.
- Supabase in an EU region for database, login and storage (study data must end up in university-approved systems; keep storage behind a thin interface so it can be swapped).
- Python (pandas, scipy) in /analysis for Spearman correlation and group comparisons.
- Phase 1: web study tool, Feb-Apr 2027. Phase 2: iOS App Store build after April.

## Hard rules
- UI language is English.
- Never commit real photos, measurements, names or any personal data. Use synthetic fixtures only.
- Criteria and weights live in rubric.json. Never hard-code them in UI code; scoring reads the rubric.
- Every score ships with a reason and a tip. No unexplained score, ever.
- Gender, age band and other disclosed group attributes are never used in scoring. Store them separately, only for bias testing.
- Scout override: keep both the original score and the override.
- Informed consent and 18+ confirmation come before anything else. If accounts exist, the app must offer in-app account deletion (App Store requirement).
- In the prototype, photos stay on the device. Any upload needs ethics approval and EU-hosted, university-approved storage. Do not send photos to third-party AI APIs.
- Rubric v0 is provisional and measures submission quality (photo set, resolution, exposure, measurements), not how a person looks. Scout-derived criteria replace it after the January interviews.

## Working style
- Explain what you are about to change before changing it. Work in small steps.
- Run the app after each change and commit with a clear message.
- Ask before adding a dependency. Prefer the simplest option.

## Folders
- prototype/  single-file HTML reference version (v0). Match its behaviour.
- rubric.json  the provisional rubric.
- app/  to be created (Expo project).
- analysis/  to be created (Python).

## Deadlines
Methodology 20 Feb 2027, Full Draft 20 Mar 2027, Final Thesis 10 Apr 2027.
