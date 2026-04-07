from __future__ import annotations

from dataclasses import dataclass
import importlib
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report


BASELINE_FEATURE_COLUMNS = [
    "step_length_mean",
    "stride_length_mean",
    "stride_time_mean",
    "cadence_spm",
    "step_width_mean",
    "gait_speed_mps",
    "hip_rom_deg",
    "knee_rom_deg",
    "ankle_rom_deg",
    "lr_knee_rmsd",
    "temporal_asymmetry_index",
]


@dataclass
class TrainArtifacts:
    model: RandomForestClassifier
    report_val: Dict[str, Dict[str, float]]
    report_test: Dict[str, Dict[str, float]]
    feature_importance: pd.DataFrame


def build_labels(df: pd.DataFrame, task: str = "binary") -> pd.Series:
    task_norm = task.lower()
    if task_norm == "binary":
        return df["condition"].map(lambda c: 1 if str(c).upper() == "CP" else 0).astype(int)

    if task_norm == "severity":
        return df["severity"].astype(int)

    raise ValueError("task must be 'binary' or 'severity'")


def _prepare_matrix(df: pd.DataFrame, feature_columns: List[str]) -> np.ndarray:
    x = df[feature_columns].copy()
    x = x.replace([np.inf, -np.inf], np.nan)
    x = x.fillna(x.median(numeric_only=True))
    return x.to_numpy(dtype=float)


def train_baseline_random_forest(
    split_df: pd.DataFrame,
    task: str = "binary",
    use_smote: bool = False,
    class_weight: str | dict[str, float] | None = "balanced",
    random_state: int = 42,
) -> TrainArtifacts:
    train_df = split_df[split_df["split"] == "train"].reset_index(drop=True)
    val_df = split_df[split_df["split"] == "val"].reset_index(drop=True)
    test_df = split_df[split_df["split"] == "test"].reset_index(drop=True)

    x_train = _prepare_matrix(train_df, BASELINE_FEATURE_COLUMNS)
    x_val = _prepare_matrix(val_df, BASELINE_FEATURE_COLUMNS)
    x_test = _prepare_matrix(test_df, BASELINE_FEATURE_COLUMNS)

    y_train = build_labels(train_df, task=task).to_numpy()
    y_val = build_labels(val_df, task=task).to_numpy()
    y_test = build_labels(test_df, task=task).to_numpy()

    if use_smote:
        try:
            smote_module = importlib.import_module("imblearn.over_sampling")
            smote_cls = getattr(smote_module, "SMOTE")
            x_train, y_train = smote_cls(random_state=random_state).fit_resample(x_train, y_train)
        except Exception:
            # Fall back to deterministic class-weighting when SMOTE is unavailable.
            pass

    clf = RandomForestClassifier(
        n_estimators=300,
        max_depth=None,
        min_samples_leaf=2,
        random_state=random_state,
        n_jobs=1,
        class_weight=class_weight,
    )
    clf.fit(x_train, y_train)

    y_val_pred = clf.predict(x_val)
    y_test_pred = clf.predict(x_test)

    report_val = classification_report(y_val, y_val_pred, output_dict=True, zero_division=0)
    report_test = classification_report(y_test, y_test_pred, output_dict=True, zero_division=0)

    importance = pd.DataFrame(
        {
            "feature": BASELINE_FEATURE_COLUMNS,
            "importance": clf.feature_importances_,
        }
    ).sort_values("importance", ascending=False)

    return TrainArtifacts(
        model=clf,
        report_val=report_val,
        report_test=report_test,
        feature_importance=importance,
    )
