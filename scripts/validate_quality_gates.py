from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate judge-facing quality gates")
    parser.add_argument("--features", required=True, help="Path to scalar_features.parquet")
    parser.add_argument("--output", required=True, help="Path to write gate report JSON")
    args = parser.parse_args()

    df = pd.read_parquet(args.features)

    cp_count = int((df["condition"].astype(str).str.upper() == "CP").sum())
    age_ok = bool(pd.to_numeric(df["age_months"], errors="coerce").between(36, 216).all())
    mean_quality = float(pd.to_numeric(df["quality_score"], errors="coerce").mean())

    report = {
        "cp_samples": cp_count,
        "cp_samples_pass": cp_count >= 20,
        "age_range_36_to_216_pass": age_ok,
        "mean_quality_score": mean_quality,
        "mean_quality_pass": mean_quality >= 0.7,
        "all_pass": bool(cp_count >= 20 and age_ok and mean_quality >= 0.7),
    }

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
