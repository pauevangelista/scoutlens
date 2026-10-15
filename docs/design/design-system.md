# ScoutLens design system (v1, sleek)

Direction: modern and sleek. Cool ice-grey ground, carbon for type, one cobalt accent, tight grotesk type, pill buttons, rounded cards. One dark screen (welcome and the "reading your photos" moment), light everywhere else.

## Colors
| Token | Hex | Use |
|---|---|---|
| carbon | #0F1115 | Text, primary buttons, dark screens |
| carbon-surface | #1A1D24 | Photo frames on dark screens |
| ice | #F3F4F7 | Screen background |
| white | #FFFFFF | Cards, inputs |
| line | #DADDE5 | Card borders |
| soft | #E7EAF3 | Tip panels, dividers, tags |
| muted | #5A6070 | Secondary text on light |
| muted-on-dark | #A9AFBF | Secondary text on dark |
| cobalt | #2B50FF | The one accent: key action, progress, Improve and Missing |
| photo-placeholder | #D5D9E3 | Empty photo slots |
| neutral-pill | #E4E6EC on text #3A3F4B | "Not measured" and "Not a match" |
| focus-on-dark | #8FA4FF | Focus ring on carbon |

## Type
Hanken Grotesk, weights 400, 500, 600, 800. Fallback: Helvetica Neue, system-ui.
- Display (h1): 36 to 44 px, 800, tracking -0.035em, line 1.02 to 1.04
- Section title: 22 px, 800, tracking -0.025em
- Body: 16 to 17 px, 400, line 1.5
- Small: 13 to 15 px, muted

## Shape
- Cards 24 px radius (hero frames 28), option rows 20, photo slots 18, inputs 16
- Buttons and pills: fully round, primary button 56 px high
- Photo slots carry corner crop marks (the one decorative device)

## Status pills (always a word and an icon, never color alone)
| Status | Look |
|---|---|
| Good | carbon fill, white text, check |
| Improve | cobalt fill, white text, circled exclamation |
| Missing | white fill, dashed cobalt border, cobalt text, dashed circle |
| Not measured | neutral-pill fill, minus |
| Matches (agency) | same as Good |
| Not a match (agency) | same as Not measured |
| No rules published | same as Missing |

## Components
- Primary button: carbon fill, white text, 17 px 600. Accent button (welcome, last explainer, photos): cobalt.
- Option row: white, 1 px line border, 20 px radius. Selected: 2 px cobalt border and a filled cobalt check.
- Top bar on question screens: round back button (44 px), 4 px progress track filled cobalt, "n of 5".
- Explainer screens: Skip link top right, three dots (active dot is a wider cobalt pill), Next button.
- Tip panel: soft background, bold "Try this." then one specific action.

## Copy rules
- Sentence case. Plain verbs. Active voice.
- No score, points, ranking or percentages anywhere.
- Every note: what we saw, one thing to try, optional link to the guide.
- Agencies: always "Matches because..." or "Not a match because...". Never hide an agency.
- Never ask for or mention weight or BMI.

## Motion and accessibility
- The only ambient motion is the scan line on "reading your photos". Wrap it in `prefers-reduced-motion: no-preference`.
- Touch targets at least 44 px. Real buttons, links, labels. Visible focus ring.
- Text contrast at least 4.5 to 1. Color never carries meaning alone.
