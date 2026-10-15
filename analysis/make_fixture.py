"""Writes fixtures/synthetic_ratings.csv: random, made-up data for testing spearman.py. No real people or photos.

App scores are random. Scout ratings (1 to 5) follow the app score plus noise. To show what a group
difference looks like in the report, ratings for one synthetic group follow the app score less closely.
"""

from pathlib import Path

import numpy as np
import pandas as pd

SEED = 2027
N_PHOTOS = 90
SCOUTS = ["scout_a", "scout_b", "scout_c"]
CRITERIA = ["res", "highlights", "shadows", "sharpness", "cast"]
GENDERS = ["Woman", "Man", "Non-binary", ""]
AGE_BANDS = ["18 to 21", "22 to 25", "26 to 30", "31 or older", ""]


def main() -> None:
    rng = np.random.default_rng(SEED)
    rows = []
    for i in range(N_PHOTOS):
        gender = rng.choice(GENDERS, p=[0.45, 0.4, 0.08, 0.07])
        age = rng.choice(AGE_BANDS, p=[0.3, 0.3, 0.2, 0.12, 0.08])
        app = {c: int(rng.integers(0, 101)) for c in CRITERIA}
        noise = 30 if gender == "Man" else 12  # deliberate synthetic group difference
        for scout in SCOUTS:
            row = {"photo_id": f"p{i:03d}", "scout_id": scout, "gender": gender, "age_band": age}
            for c in CRITERIA:
                row[f"app_{c}"] = app[c]
                latent = app[c] + rng.normal(0, noise)
                row[f"scout_{c}"] = int(np.clip(np.round(latent / 25) + 1, 1, 5))
            rows.append(row)
    out = Path(__file__).resolve().parent / "fixtures" / "synthetic_ratings.csv"
    out.parent.mkdir(exist_ok=True)
    pd.DataFrame(rows).to_csv(out, index=False)
    print(f"wrote {out} ({len(rows)} rows)")


if __name__ == "__main__":
    main()
