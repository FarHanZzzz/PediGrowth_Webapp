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

### Strict Readiness Audit

Run a hard go/no-go audit over the latest pipeline outputs:

```bash
PYTHONPATH=. python scripts/validate_quality_gates.py \
  --features outputs/hsil_demo/scalar_features.parquet \
  --manifest data/manifest.csv \
  --output outputs/hsil_demo/quality_gates_report.json
```

Notes:

- The script exits with code `0` only when all readiness gates pass.
- It exits with non-zero when any critical gate fails (sample counts, synthetic ratio, split leakage, model signal, etc.).
- Detailed failed checks and recommendations are written to `quality_gates_report.json`.

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

### Hackathon Demo Runbook

Use this sequence for a transparent, robust demo:

```bash
# 1) Generate synthetic demo trials and artifacts
python scripts/verify_pipeline_synthetic.py

# 2) Show API preflight rejection + analysis in one command
PYTHONPATH=. python scripts/demo_api_smoke.py \
  --trial-path outputs/synthetic_demo/trials/S001_T1.csv \
  --trial-format csv \
  --source-joint-set coco17 \
  --output outputs/hsil_demo/demo_api_smoke.json

# 3) Show discard transparency when real trials fail quality gates
cat outputs/hsil_demo_real/discarded_trials.csv
```

Judge-facing disclaimer to display in UI/slides:

- `This is a screening support tool, not a diagnostic device.`

### Debug Trial Quality Failures

When a trial is discarded, run a single-trial quality debug report:

```bash
PYTHONPATH=. python scripts/debug_quality_thresholds.py \
  --trial-path dataset/mobile-gaitlab/demo/out/video.mp4 \
  --trial-format video \
  --source-joint-set coco17 \
  --sampling-rate 30 \
  --thresholds 0.50,0.60,0.70,0.80 \
  --output outputs/hsil_demo_real/quality_debug_video.json
```

The report includes:

- Pre-clean confidence and gap stats
- Quality components and threshold sensitivity
- Dominant failure stage and explicit discard reasons
- Scalar metrics and tags when the trial is valid
