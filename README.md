# Pedi-Growth

A mobile-first platform that helps families and clinicians capture, understand,
and communicate pediatric gait-related concerns more consistently and earlier.

> **⚠️ Clinical Disclaimer:** Pedi-Growth is a screening support tool — it does NOT diagnose medical conditions. Always consult qualified healthcare professionals for clinical decisions.

## Architecture

```
┌─────────────────────────┐     ┌─────────────────────────┐
│   Next.js Frontend      │────▶│   FastAPI Backend        │
│   (React 19 + TS)       │     │   (Python + XGBoost)     │
│                         │     │                         │
│   • Video capture       │     │   • Deterministic gait   │
│   • MediaPipe pose      │     │     pipeline             │
│   • Concern scoring     │     │   • XGBoost inference    │
│   • Results + PDF       │     │   • Trial analysis       │
└─────────────────────────┘     └─────────────────────────┘
```

## Cloud Deployment

- Vercel + AWS deployment guide: `docs/DEPLOY_VERCEL_AWS.md`
- DigitalOcean App Platform guide: `docs/DEPLOY_DIGITALOCEAN_APP_PLATFORM.md`
- Vercel env template: `.env.vercel.example`
- AWS backend env template: `.env.aws-backend.example`
- DigitalOcean frontend env template: `.env.digitalocean.frontend.example`
- DigitalOcean backend env template: `.env.digitalocean.backend.example`

## Quick Start

### Frontend (Next.js)

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Backend (Python Pipeline)

### Secure share-link setup

Secure clinician handoff links use server-side Supabase storage.

1. Ensure `.env.local` includes:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

2. Apply Supabase migrations, including `002_shared_packets.sql`.
3. Start the app and create links from the Results -> Clinician Packet tab.

```bash
# Create virtual environment (Python 3.10+)
python -m venv .venv
.venv/Scripts/activate   # Windows
# source .venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements-pipeline.txt

# Start API server
uvicorn gait_pipeline.api:app --reload --port 8000
```

The frontend uses Next.js server API routes under `/api/pipeline/*` to call the Python backend with input validation, timeout protection, and graceful fallback errors.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Supabase project URL (future DB) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | Supabase anonymous key |
| `GAIT_PIPELINE_API_URL` | Optional | Python backend URL (default: `localhost:8000`) |
| `OPENAI_API_KEY` | Optional | For AI Navigator feature |

## Project Structure

```
pedi-growth/
├── src/
│   ├── app/              # Next.js pages (landing, start, capture, analyzing, results, concern)
│   ├── components/       # UI components (shadcn/ui + custom)
│   ├── lib/
│   │   ├── analysis/     # Client-side gait analysis (angles, cycles, features)
│   │   ├── api/          # Backend API client
│   │   ├── copilot/      # AI navigator system prompt
│   │   ├── db/           # Supabase client (future)
│   │   ├── export/       # PDF report export
│   │   ├── policy/       # Clinical policy (routing, thresholds, language safety)
│   │   ├── pose/         # MediaPipe pose integration
│   │   ├── quality/      # Video quality assessment
│   │   ├── scoring/      # Concern level computation
│   │   ├── session/      # Analysis pipeline orchestrator + video/result storage
│   │   ├── trace/        # Analysis audit trail
│   │   └── types/        # TypeScript type definitions
├── gait_pipeline/        # Python backend
│   ├── api.py            # FastAPI endpoints
│   ├── gait_inference.py # XGBoost inference engine
│   ├── pipeline.py       # Batch processing pipeline
│   ├── config.py         # Pipeline configuration
│   ├── model.py          # Legacy RandomForest baseline
│   └── models/           # Trained XGBoost model files
├── scripts/
│   ├── data_prep/        # Data preparation scripts
│   └── train_xgboost.py  # Model training pipeline
├── data/
│   ├── training_reports/ # Model performance reports
│   └── manifest.csv      # Dataset manifest
├── tests/                # Test suite (node:test)
├── docs/                 # Documentation (PRD, clinical context)
└── supabase/             # Database migrations (future)
```

## Test Suite

```bash
# Run all tests
node --test tests/

# Run specific test
node --test tests/routing-rules.test.mjs
```

## Robustness Benchmark and Release Gate

Use the robustness suite to stress adverse capture conditions and block releases when quality degrades beyond configured tolerances.

```bash
# Quick local smoke benchmark (reduced scenarios)
npm run benchmark:robustness:quick

# Promote latest quick summary as benchmark baseline (PowerShell)
Copy-Item outputs/robustness_benchmark_quick/benchmark_summary.json data/robustness/benchmark_baseline.json -Force

# Full benchmark suite
npm run benchmark:robustness

# Gate against baseline summary (fails with non-zero exit on regression)
npm run gate:robustness

# Gate against baseline using quick benchmark artifacts
npm run gate:robustness:quick
```

Gate policy notes:
- The gate now validates both metric degradation and scenario execution status.
- A scenario with `status != ok` fails the gate unless explicitly allow-listed in `data/robustness/robustness_gate_thresholds.json`.
- The gate also enforces baseline coverage so missing current scenarios in baseline are treated as a release-blocking failure.
- Baseline summaries should be generated from calibrated runs where all required scenarios complete successfully.

Artifacts:
- Current benchmark summary: `outputs/robustness_benchmark/benchmark_summary.json`
- Current gate report: `outputs/robustness_benchmark/gate_report.json`
- Gate thresholds: `data/robustness/robustness_gate_thresholds.json`
- Baseline benchmark summary (to provide): `data/robustness/benchmark_baseline.json`

## ML Pipeline

The XGBoost models provide screening-level risk predictions for:

- **Gait Asymmetry** — Left/right movement pattern differences
- **Trendelenburg Risk** — Hip drop indicators
- **Trunk Instability** — Upper body stability during walking
- **Spinal Misalignment** — Shoulder-pelvic divergence patterns
- **Composite Risk** — Overall screening score

> See `data/training_reports/model_evaluation.md` for an honest assessment of model limitations.

### Training Evaluation Artifacts

The training pipeline now emits grouped patient-level cross-validation and leakage audit artifacts:

- `data/training_reports/*_grouped_cv_folds.csv`
- `data/training_reports/*_grouped_cv_summary.json`
- `data/training_reports/*_leakage_audit.csv`
- `data/training_reports/grouped_cv_summary.csv`
- `data/training_reports/leakage_audit_summary.csv`

## Clinical Safety

- All outputs use "observed/may/noticed" language — never diagnostic terms
- Language safety filter blocks prohibited medical terminology
- Strict routing rules based on age and ambulatory status
- Global disclaimer footer on every page
- Non-diagnostic screening levels: none → mild → moderate → significant

## License

Private — Hackathon submission
