# GAITBRIDGE (Pedi-Growth)

Pediatric gait concern analysis platform with a Next.js application layer and
a deterministic Python gait-processing pipeline for reproducible experiments.

## Web Application (Next.js)

### What GAITBRIDGE is

- A structured gait concern documentation workflow
- A triage/monitoring support layer
- A caregiver education and navigation layer
- A clinician handoff/reporting workflow

### What GAITBRIDGE is not

- A diagnostic tool
- A disease-probability engine
- A substitute for clinical evaluation

### Web app quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

### Web app verification

```bash
npm run lint
npm run type-check
npm run test
npm run build
```

## Deterministic Gait Pipeline (Python)

The repository also includes a deterministic preprocessing and baseline
modeling stack under `gait_pipeline/` with:

- Unified trial schema across CSV/NPY/JSON inputs
- Cleaning + quality gates with explicit discard logging
- Core scalar feature extraction and curve artifacts
- Subject-level stratified train/validation/test splitting
- Baseline RandomForest training and feature importance export
- FastAPI endpoint for deterministic trial-level inference

### Pipeline install

```bash
pip install -r requirements-pipeline.txt
```

### Run end-to-end pipeline

```bash
PYTHONPATH=. python scripts/run_pipeline.py --config gait_pipeline/pipeline_config.yaml
```

### Synthetic verification run

```bash
python scripts/verify_pipeline_synthetic.py
```

### Strict readiness audit

```bash
PYTHONPATH=. python scripts/validate_quality_gates.py \
  --features outputs/hsil_demo/scalar_features.parquet \
  --manifest data/manifest.csv \
  --output outputs/hsil_demo/quality_gates_report.json
```

### Serve API locally

```bash
PYTHONPATH=. python scripts/run_api.py \
  --config gait_pipeline/pipeline_config.yaml \
  --host 0.0.0.0 \
  --port 8000
```

## Project docs

- [Product requirements](docs/PRD.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data model](docs/DATA_MODEL.md)
- [Policy rules](docs/POLICY_RULES.md)
- [AI navigator spec](docs/AI_NAVIGATOR_SPEC.md)
- [Safety limitations](docs/SAFETY_AND_LIMITATIONS.md)
- [QA protocol](docs/QA_PROTOCOL.md)

## Safety commitment

All outputs are for screening support and care navigation, not diagnosis.
