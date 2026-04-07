from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np
import pandas as pd
from scipy.interpolate import CubicSpline
from scipy.signal import find_peaks, savgol_filter

from .config import PipelineConfig


COCO17_INDEX = {
    "left_hip": 11,
    "right_hip": 12,
    "left_knee": 13,
    "right_knee": 14,
    "left_ankle": 15,
    "right_ankle": 16,
    "left_shoulder": 5,
    "right_shoulder": 6,
}


@dataclass
class CleanTrialResult:
    cleaned_coords: Optional[np.ndarray]
    normalized_cycles: Optional[np.ndarray]
    mean_cycle: Optional[np.ndarray]
    heel_strikes: Optional[np.ndarray]
    angle_curves_deg: Optional[Dict[str, np.ndarray]]
    quality_score: float
    quality_components: Dict[str, float]
    is_valid: bool
    discard_reasons: List[str]


@dataclass
class GaitCycleResult:
    cycles: Optional[np.ndarray]
    mean_cycle: Optional[np.ndarray]
    heel_strikes: Optional[np.ndarray]


def _longest_true_run(mask: np.ndarray) -> int:
    if mask.size == 0:
        return 0
    best = 0
    run = 0
    for value in mask:
        if value:
            run += 1
            best = max(best, run)
        else:
            run = 0
    return best


def compute_gap_stats(coords: np.ndarray) -> Tuple[float, int]:
    if coords.ndim != 3:
        raise ValueError(f"Expected [T, J, D], got {coords.shape}")

    flat = coords.reshape(coords.shape[0], -1)
    missing = ~np.isfinite(flat)
    gap_pct = float(missing.mean())

    max_gap = 0
    for c in range(missing.shape[1]):
        max_gap = max(max_gap, _longest_true_run(missing[:, c]))

    return gap_pct, max_gap


def interpolate_short_gaps(coords: np.ndarray, short_gap_max_frames: int) -> np.ndarray:
    out = coords.copy()
    t, j, d = out.shape
    for ji in range(j):
        for di in range(d):
            series = pd.Series(out[:, ji, di])
            out[:, ji, di] = (
                series.interpolate(
                    method="linear",
                    limit=short_gap_max_frames,
                    limit_direction="both",
                )
                .to_numpy()
                .astype(float)
            )
    return out


def _safe_savgol(series: np.ndarray, window: int, poly: int) -> np.ndarray:
    if series.size < 5:
        return series

    win = min(window, series.size if series.size % 2 == 1 else series.size - 1)
    if win < 5:
        return series
    if poly >= win:
        poly = max(1, win - 2)

    return savgol_filter(series, window_length=win, polyorder=poly, mode="interp")


def smooth_trajectories(coords: np.ndarray, window: int, polyorder: int) -> np.ndarray:
    out = coords.copy()
    for ji in range(out.shape[1]):
        for di in range(out.shape[2]):
            col = out[:, ji, di]
            if np.all(np.isfinite(col)):
                out[:, ji, di] = _safe_savgol(col, window, polyorder)
    return out


def _median_abs_deviation(x: np.ndarray) -> float:
    med = np.nanmedian(x)
    return float(np.nanmedian(np.abs(x - med)))


def _remove_spikes_mad(x: np.ndarray, threshold: float) -> np.ndarray:
    y = x.copy()
    med = np.nanmedian(y)
    mad = _median_abs_deviation(y)
    if not np.isfinite(mad) or mad == 0:
        return y

    robust_z = 0.6745 * (y - med) / mad
    spikes = np.abs(robust_z) > threshold
    if not np.any(spikes):
        return y

    y[spikes] = np.nan
    y = pd.Series(y).interpolate(method="linear", limit_direction="both").to_numpy(dtype=float)
    return y


def _get_joint(coords: np.ndarray, name: str) -> Optional[np.ndarray]:
    idx = COCO17_INDEX.get(name)
    if idx is None or idx >= coords.shape[1]:
        return None
    return coords[:, idx, :]


def _angle_between(v1: np.ndarray, v2: np.ndarray) -> np.ndarray:
    num = np.sum(v1 * v2, axis=1)
    den = np.linalg.norm(v1, axis=1) * np.linalg.norm(v2, axis=1)
    den = np.where(den < 1e-8, np.nan, den)
    cosv = np.clip(num / den, -1.0, 1.0)
    return np.degrees(np.arccos(cosv))


def compute_joint_angles_deg(coords: np.ndarray) -> Dict[str, np.ndarray]:
    lhip = _get_joint(coords, "left_hip")
    rhip = _get_joint(coords, "right_hip")
    lknee = _get_joint(coords, "left_knee")
    rknee = _get_joint(coords, "right_knee")
    lank = _get_joint(coords, "left_ankle")
    rank = _get_joint(coords, "right_ankle")
    lsho = _get_joint(coords, "left_shoulder")
    rsho = _get_joint(coords, "right_shoulder")

    out: Dict[str, np.ndarray] = {}

    if lhip is not None and lknee is not None and lank is not None:
        out["knee_left"] = _angle_between(lhip - lknee, lank - lknee)
    if rhip is not None and rknee is not None and rank is not None:
        out["knee_right"] = _angle_between(rhip - rknee, rank - rknee)

    if lsho is not None and lhip is not None and lknee is not None:
        out["hip_left"] = _angle_between(lsho - lhip, lknee - lhip)
    if rsho is not None and rhip is not None and rknee is not None:
        out["hip_right"] = _angle_between(rsho - rhip, rknee - rhip)

    # Ankle angle is approximated with leg orientation against horizontal plane in 2D.
    if lknee is not None and lank is not None:
        left_leg = lknee - lank
        out["ankle_left"] = np.degrees(np.arctan2(left_leg[:, 1], left_leg[:, 0]))
    if rknee is not None and rank is not None:
        right_leg = rknee - rank
        out["ankle_right"] = np.degrees(np.arctan2(right_leg[:, 1], right_leg[:, 0]))

    return out


def clip_to_physiological_bounds(
    angles_deg: Dict[str, np.ndarray],
    bounds: Dict[str, Tuple[float, float]],
) -> Dict[str, np.ndarray]:
    clipped: Dict[str, np.ndarray] = {}
    for key, values in angles_deg.items():
        if "knee" in key:
            lo, hi = bounds["knee_flexion_deg"]
        elif "hip" in key:
            lo, hi = bounds["hip_flexion_deg"]
        elif "ankle" in key:
            lo, hi = bounds["ankle_dorsi_deg"]
        else:
            clipped[key] = values
            continue
        clipped[key] = np.clip(values, lo, hi)
    return clipped


def remove_angle_spikes(angles_deg: Dict[str, np.ndarray], mad_threshold: float) -> Dict[str, np.ndarray]:
    return {name: _remove_spikes_mad(values, mad_threshold) for name, values in angles_deg.items()}


def _estimate_scale(coords: np.ndarray, metadata: Dict[str, Any]) -> float:
    height_cm = metadata.get("height_cm")
    if height_cm is not None and np.isfinite(height_cm) and float(height_cm) > 0:
        return float(height_cm)

    lhip = _get_joint(coords, "left_hip")
    lknee = _get_joint(coords, "left_knee")
    rhip = _get_joint(coords, "right_hip")
    rknee = _get_joint(coords, "right_knee")
    femur_lengths: List[float] = []

    if lhip is not None and lknee is not None:
        femur_lengths.append(float(np.nanmedian(np.linalg.norm(lhip - lknee, axis=1))))
    if rhip is not None and rknee is not None:
        femur_lengths.append(float(np.nanmedian(np.linalg.norm(rhip - rknee, axis=1))))

    femur = np.nanmedian(femur_lengths) if femur_lengths else np.nan
    if np.isfinite(femur) and femur > 1e-6:
        return float(femur)

    return 1.0


def _rotation_matrix_2d(theta: float) -> np.ndarray:
    return np.array(
        [
            [np.cos(theta), -np.sin(theta)],
            [np.sin(theta), np.cos(theta)],
        ],
        dtype=float,
    )


def normalize_coordinates(coords: np.ndarray, metadata: Dict[str, Any]) -> np.ndarray:
    out = coords.copy()
    lhip = _get_joint(out, "left_hip")
    rhip = _get_joint(out, "right_hip")

    if lhip is None or rhip is None:
        pelvis = np.nanmean(out[:, :, :2], axis=1)
    else:
        pelvis = (lhip[:, :2] + rhip[:, :2]) / 2.0

    out[:, :, 0] -= pelvis[:, None, 0]
    out[:, :, 1] -= pelvis[:, None, 1]

    scale = _estimate_scale(out, metadata)
    if not np.isfinite(scale) or scale <= 1e-8:
        scale = 1.0
    out = out / scale

    # Rotate so walking direction aligns with +X.
    pelvis_valid = pelvis[np.all(np.isfinite(pelvis), axis=1)]
    if len(pelvis_valid) >= 2:
        forward = pelvis_valid[-1] - pelvis_valid[0]
        theta = -np.arctan2(forward[1], forward[0])
        rot = _rotation_matrix_2d(theta)
        xy = out[:, :, :2].reshape(-1, 2)
        out[:, :, :2] = (xy @ rot.T).reshape(out.shape[0], out.shape[1], 2)

    return out


def _foot_vertical_signal(coords: np.ndarray) -> np.ndarray:
    lank = _get_joint(coords, "left_ankle")
    rank = _get_joint(coords, "right_ankle")

    signals = []
    if lank is not None:
        signals.append(lank[:, 1])
    if rank is not None:
        signals.append(rank[:, 1])

    if not signals:
        return np.nanmean(coords[:, :, 1], axis=1)

    return np.nanmean(np.stack(signals), axis=0)


def detect_heel_strikes(
    coords: np.ndarray,
    sampling_rate: int,
    min_distance_seconds: float,
) -> np.ndarray:
    foot_y = _foot_vertical_signal(coords)
    foot_y = pd.Series(foot_y).interpolate(method="linear", limit_direction="both").to_numpy()

    vy = np.gradient(foot_y) * sampling_rate
    min_distance = max(1, int(round(min_distance_seconds * sampling_rate)))

    peaks, _ = find_peaks(-vy, distance=min_distance)
    if len(peaks) < 2:
        peaks, _ = find_peaks(-foot_y, distance=min_distance)
    return peaks.astype(int)


def normalize_cycles(
    coords: np.ndarray,
    heel_strikes: np.ndarray,
    n_points: int,
) -> GaitCycleResult:
    if heel_strikes is None or len(heel_strikes) < 2:
        return GaitCycleResult(cycles=None, mean_cycle=None, heel_strikes=heel_strikes)

    flat_dim = coords.shape[1] * coords.shape[2]
    flat = coords.reshape(coords.shape[0], flat_dim)

    cycles: List[np.ndarray] = []
    for i in range(len(heel_strikes) - 1):
        start = int(heel_strikes[i])
        end = int(heel_strikes[i + 1])
        if end - start < 5:
            continue

        segment = flat[start:end]
        x_old = np.linspace(0.0, 1.0, len(segment))
        x_new = np.linspace(0.0, 1.0, n_points)
        norm_seg = np.zeros((n_points, flat_dim), dtype=float)
        for c in range(flat_dim):
            y = pd.Series(segment[:, c]).interpolate(method="linear", limit_direction="both").to_numpy()
            spline = CubicSpline(x_old, y)
            norm_seg[:, c] = spline(x_new)
        cycles.append(norm_seg.reshape(n_points, coords.shape[1], coords.shape[2]))

    if not cycles:
        return GaitCycleResult(cycles=None, mean_cycle=None, heel_strikes=heel_strikes)

    stacked = np.stack(cycles)
    return GaitCycleResult(cycles=stacked, mean_cycle=np.mean(stacked, axis=0), heel_strikes=heel_strikes)


def _smoothness_score(coords: np.ndarray) -> float:
    if len(coords) < 6:
        return 0.5
    jerk = np.diff(coords, n=3, axis=0)
    if jerk.size == 0:
        return 0.5
    jerk_norm = float(np.nanmean(np.linalg.norm(jerk.reshape(jerk.shape[0], -1), axis=1)))
    if not np.isfinite(jerk_norm):
        return 0.0
    return float(1.0 / (1.0 + jerk_norm))


def compute_quality_score(
    avg_confidence: float,
    gap_pct: float,
    smoothness: float,
) -> Tuple[float, Dict[str, float]]:
    confidence_component = float(np.clip(avg_confidence, 0.0, 1.0))
    gap_component = float(np.clip(1.0 - gap_pct, 0.0, 1.0))
    smoothness_component = float(np.clip(smoothness, 0.0, 1.0))

    score = 0.45 * confidence_component + 0.30 * gap_component + 0.25 * smoothness_component
    return float(np.clip(score, 0.0, 1.0)), {
        "confidence": confidence_component,
        "gap": gap_component,
        "smoothness": smoothness_component,
    }


def clean_and_normalize_trial(
    coords: np.ndarray,
    confidence: Optional[np.ndarray],
    sampling_rate: int,
    metadata: Dict[str, Any],
    config: PipelineConfig,
) -> CleanTrialResult:
    reasons: List[str] = []
    avg_conf = float(np.nanmean(confidence)) if confidence is not None else 1.0

    gap_pct_raw, max_gap = compute_gap_stats(coords)
    if max_gap >= config.long_gap_min_frames:
        reasons.append(f"long_gap_detected(max_gap={max_gap})")
    if avg_conf < config.confidence_threshold:
        reasons.append(
            f"low_confidence(avg={avg_conf:.3f}<threshold={config.confidence_threshold:.3f})"
        )

    interpolated = interpolate_short_gaps(coords, config.short_gap_max_frames)
    gap_pct_after, max_gap_after = compute_gap_stats(interpolated)
    if max_gap_after >= config.long_gap_min_frames:
        reasons.append("unresolved_missing_values_after_interpolation")

    if reasons:
        smoothness = _smoothness_score(interpolated)
        quality, components = compute_quality_score(avg_conf, gap_pct_raw, smoothness)
        return CleanTrialResult(
            cleaned_coords=None,
            normalized_cycles=None,
            mean_cycle=None,
            heel_strikes=None,
            angle_curves_deg=None,
            quality_score=quality,
            quality_components=components,
            is_valid=False,
            discard_reasons=reasons,
        )

    smoothed = smooth_trajectories(interpolated, config.savgol_window, config.savgol_polyorder)
    normalized_coords = normalize_coordinates(smoothed, metadata)

    angles = compute_joint_angles_deg(normalized_coords)
    angles = remove_angle_spikes(angles, config.mad_threshold)
    angles = clip_to_physiological_bounds(angles, config.physiological_bounds)

    heel_strikes = detect_heel_strikes(
        normalized_coords,
        sampling_rate=sampling_rate,
        min_distance_seconds=config.heel_strike_min_distance_seconds,
    )

    if heel_strikes is None or len(heel_strikes) < 2:
        reasons.append("no_detectable_gait_cycle")

    cycle_result = normalize_cycles(
        normalized_coords,
        heel_strikes=heel_strikes,
        n_points=config.normalized_cycle_points,
    )

    if cycle_result.mean_cycle is None:
        reasons.append("insufficient_gait_cycles")

    smoothness = _smoothness_score(normalized_coords)
    quality, components = compute_quality_score(avg_conf, gap_pct_after, smoothness)

    if quality < config.quality_threshold:
        reasons.append(
            f"quality_below_threshold(score={quality:.3f}<threshold={config.quality_threshold:.3f})"
        )

    is_valid = len(reasons) == 0

    return CleanTrialResult(
        cleaned_coords=normalized_coords if is_valid else None,
        normalized_cycles=cycle_result.cycles if is_valid else None,
        mean_cycle=cycle_result.mean_cycle if is_valid else None,
        heel_strikes=cycle_result.heel_strikes if is_valid else None,
        angle_curves_deg=angles if is_valid else None,
        quality_score=quality,
        quality_components=components,
        is_valid=is_valid,
        discard_reasons=reasons,
    )


def fill_missing_metadata_with_population_medians(
    metadata: Dict[str, Any],
    population_medians: Dict[str, float],
) -> Tuple[Dict[str, Any], List[str]]:
    updated = dict(metadata)
    warnings: List[str] = []

    for key in ("height_cm", "weight_kg"):
        value = updated.get(key)
        if value is None or not np.isfinite(value):
            median_value = population_medians.get(key)
            if median_value is not None and np.isfinite(median_value):
                updated[key] = float(median_value)
                warnings.append(f"missing_{key}_filled_with_population_median")

    return updated, warnings
