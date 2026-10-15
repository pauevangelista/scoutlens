"""Spearman correlation between app scores and scout ratings, per rubric criterion, split by disclosed groups.

Input: a CSV with one row per photo per scout (see README.md). Criterion ids come from rubric.json.
Group columns are used only to split the report, never as inputs to any score.

Usage:
    python spearman.py fixtures/synthetic_ratings.csv
    python spearman.py ratings.csv --group-cols gender age_band --out results.csv
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import pandas as pd
from scipy.stats import spearmanr

HERE = Path(__file__).resolve().parent
DEFAULT_RUBRIC = HERE.parent / "rubric.json"
NOT_DISCLOSED = "not disclosed"


def load_criteria(rubric_path: Path) -> dict[str, str]:
    """Returns {criterion id: name} in rubric order."""
    rubric = json.loads(rubric_path.read_text())
    return {c["id"]: c["name"] for c in rubric["criteria"]}


def warn(msg: str) -> None:
    print(f"warning: {msg}", file=sys.stderr)


def per_photo(df: pd.DataFrame, criteria: list[str], group_cols: list[str]) -> pd.DataFrame:
    """One row per photo: the app score, the mean scout rating, the number of scouts and the group columns."""
    for col in [f"app_{c}" for c in criteria] + group_cols:
        varying = df.groupby("photo_id")[col].nunique(dropna=False) > 1
        if varying.any():
            warn(f"{col} differs between rows of the same photo ({varying.sum()} photos); using the first value.")
    agg: dict[str, tuple[str, str]] = {"n_scouts": ("scout_id", "nunique")}
    for c in criteria:
        agg[f"app_{c}"] = (f"app_{c}", "first")
        agg[f"scout_{c}"] = (f"scout_{c}", "mean")
    for g in group_cols:
        agg[g] = (g, "first")
    photos = df.groupby("photo_id").agg(**agg).reset_index()
    for g in group_cols:
        photos[g] = photos[g].fillna(NOT_DISCLOSED).astype(str).str.strip().replace("", NOT_DISCLOSED)
    return photos


def correlate(sub: pd.DataFrame, criterion: str, min_n: int) -> dict:
    pair = sub[[f"app_{criterion}", f"scout_{criterion}"]].dropna()
    n = len(pair)
    rho = p = float("nan")
    note = ""
    if n < 3 or pair.nunique().min() < 2:
        note = "cannot compute (fewer than 3 photos or no variation)"
    else:
        result = spearmanr(pair.iloc[:, 0], pair.iloc[:, 1])
        rho, p = float(result.correlation), float(result.pvalue)
        if n < min_n:
            note = f"too few to interpret (n < {min_n})"
    return {"n_photos": n, "rho": rho, "p": p, "note": note}


def report(photos: pd.DataFrame, criteria: dict[str, str], group_cols: list[str], min_n: int) -> pd.DataFrame:
    rows = []
    for cid, name in criteria.items():
        rows.append({"criterion": cid, "name": name, "group": "all", "level": "all", **correlate(photos, cid, min_n)})
        for g in group_cols:
            for level, sub in photos.groupby(g, sort=True):
                rows.append({"criterion": cid, "name": name, "group": g, "level": level, **correlate(sub, cid, min_n)})
    return pd.DataFrame(rows)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("csv", type=Path, help="ratings CSV, one row per photo per scout")
    ap.add_argument("--rubric", type=Path, default=DEFAULT_RUBRIC, help="path to rubric.json")
    ap.add_argument("--group-cols", nargs="*", default=["gender", "age_band"], help="disclosed group columns to split by")
    ap.add_argument("--min-n", type=int, default=10, help="smallest number of photos to interpret a correlation")
    ap.add_argument("--out", type=Path, help="also write the table to this CSV")
    args = ap.parse_args(argv)

    all_criteria = load_criteria(args.rubric)
    df = pd.read_csv(args.csv)

    missing = [c for c in ["photo_id", "scout_id", *args.group_cols] if c not in df.columns]
    if missing:
        ap.error(f"{args.csv} is missing column(s): {', '.join(missing)}")

    score_cols = [c for c in df.columns if c.startswith(("app_", "scout_")) and c != "scout_id"]
    unknown = sorted({c.split("_", 1)[1] for c in score_cols} - set(all_criteria))
    if unknown:
        warn(f"columns for criteria not in {args.rubric.name} are ignored: {', '.join(unknown)}")
    criteria = {cid: name for cid, name in all_criteria.items() if f"app_{cid}" in df and f"scout_{cid}" in df}
    if not criteria:
        ap.error("no criterion has both an app_<id> and a scout_<id> column")
    half = sorted(cid for cid in all_criteria if (f"app_{cid}" in df) != (f"scout_{cid}" in df))
    if half:
        warn(f"criteria with only one of app_/scout_ columns are skipped: {', '.join(half)}")

    photos = per_photo(df, list(criteria), args.group_cols)
    table = report(photos, criteria, args.group_cols, args.min_n)

    print(f"{len(photos)} photos, {df['scout_id'].nunique()} scouts, rubric {json.loads(args.rubric.read_text())['version']}")
    print("Spearman rho between the app score and the mean scout rating per photo.\n")
    shown = table.assign(rho=table["rho"].round(3), p=table["p"].map(lambda v: f"{v:.3g}"))
    print(shown.drop(columns="name").to_string(index=False))
    if args.out:
        table.to_csv(args.out, index=False)
        print(f"\nwrote {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
