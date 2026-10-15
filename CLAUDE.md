# ScoutLens

Feedback and agency-matching tool for aspiring models. It is both a joint thesis capstone (IE University) and a personal product I want to publish on the App Store.

## What it does
- Aspiring models (18+) submit a standard photo set and details, and get FEEDBACK, not a score: what to fix in their photos, how to take digitals, and which agencies to look at and why.
- Scouts review and can override feedback.
- Research question (can evolve): can an explainable rubric derived from scout interviews match independent scouts' judgments without treating applicant groups differently?

## Stack (target)
- TypeScript, Expo (React Native + Expo Router) for web and iOS.
- Supabase in an EU region (swap-able storage; study data must live in university-approved systems).
- Python in /analysis for Spearman, group comparisons and research-only tests.

## Hard rules
- UI language is English. Never commit real photos, measurements, names or any personal data; synthetic fixtures only.
- No score is shown to users. Each check shows a status (Good / Improve / Missing / Not measured), a plain-language reason and a specific tip. Keep per-check measurements and an internal composite for analysis only.
- Criteria and thresholds live in rubric.json. Every check has a reason and a tip.
- Photo feedback must give the same result regardless of gender, age, experience or skin tone. Test this.
- Agency matching may use the user's declared division, age, height and experience, but only against the agency's own published criteria, and must explain every match and every non-match ("matches because...", "not a match because..."). Never hide agencies silently.
- Division is chosen by the applicant, using the agency's own categories (including non-binary choices where offered). It is separate from the optional fairness questions.
- Measurements: collect height, bust/chest, waist, hips, shoe size as a "model card" for applications. Never collect weight, never compute BMI. Height and age may be compared with an agency's published requirement. Bust/waist/hips ranges are shown only if the agency publishes them or a scout confirms them in writing, only when the user opts in (default off), in neutral wording, never as "too big/small".
- Facial symmetry is NEVER part of user-facing feedback. It may only be measured in an offline research script on photos whose owners gave explicit research consent, under ethics approval, to test scout bias.
- Agency data: record source URL, source kind and last-verified date. Anything older than 6 months is stale. Flag upfront fees.
- Consent and 18+ confirmation come first. Offer in-app account deletion if accounts exist. In the prototype, photos stay on the device; any upload needs ethics approval and EU-hosted, university-approved storage. No third-party AI APIs for photos.

## Working style
- Explain the plan before changing anything. Small steps, run the app after each, clear commits.
- Ask before adding a dependency. Prefer the simplest option.

## Folders
- prototype/ (v0 HTML reference), rubric.json, app/ (Expo), analysis/ (Python), data/ (agencies), docs/.

## Deadlines
Methodology 20 Feb 2027, Full Draft 20 Mar 2027, Final Thesis 10 Apr 2027.
