# Pedi-Growth

## Deterministic Gait Pipeline

This repository now includes a deterministic preprocessing and baseline modeling stack under `gait_pipeline/` with:

- Unified tabular trial schema across CSV, NPY, and COCO/OpenPose JSON inputs.
- Cleaning and normalization pipeline with strict quality gating and explicit discard logging.
- Core feature extraction (11 flat metrics) plus separate time-series curve artifacts.
- Subject-level train/validation/test split (70/15/15) with stratification.
- Baseline `RandomForestClassifier` training and feature importance export.
- FastAPI endpoint for trial-level deterministic metric inference.

### Install

```bash
pip install -r requirements-pipeline.txt
```

### Input Manifest Format

The pipeline runner consumes a CSV/Parquet manifest with one row per trial. Required or strongly recommended columns:

- `trial_path`
- `subject_id`
- `age_months`
- `condition` (`CP` or `TD`)
- `severity` (`0-3`, with `0` for `TD`)
- `sampling_rate`
- `trial_format` (`csv`, `npy`, `json`, `video`)
- `source_joint_set` (`coco17`, `openpose25`, `mediapipe33`, `marker33`)
- `height_cm`, `weight_kg`, `walking_speed_mps`, `device`

A starter template is provided at `data/manifest.csv`.

For `trial_format=video`, the pipeline expects pre-extracted keypoint sidecars (same stem as the video):

- `.json`, `.npy`, or `.csv`
- or `<stem>_keypoints(.json|.npy|.csv)`
- or `<stem>_keypoints/` containing OpenPose frame JSON files

### Run End-to-End Pipeline

```bash
PYTHONPATH=. python scripts/run_pipeline.py --config gait_pipeline/pipeline_config.yaml
```

Optional overrides:

```bash
PYTHONPATH=. python scripts/run_pipeline.py \
  --config gait_pipeline/pipeline_config.yaml \
  --manifest data/manifest.csv \
  --output-dir outputs/hsil_demo \
  --task binary
```

### Synthetic Verification Run

```bash
python scripts/verify_pipeline_synthetic.py
```

This creates a synthetic dataset, runs the complete pipeline, prints shape checks, and writes a normalized gait cycle plot.

### Serve FastAPI Endpoint

```bash
PYTHONPATH=. python scripts/run_api.py \
  --config gait_pipeline/pipeline_config.yaml \
  --host 0.0.0.0 \
  --port 8000
```

Endpoint:

- `POST /analyze-trial`
- `GET /health`

The trial endpoint returns deterministic scalar gait metrics and a confidence score derived from the quality components, plus:

- `risk_category`
- `explanation` (deterministic template)
- `disclaimer` (screening-only warning)
