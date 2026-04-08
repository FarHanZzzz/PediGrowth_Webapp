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

The frontend proxies `/api/pipeline/*` to `http://localhost:8000` automatically via `next.config.ts`.

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

## ML Pipeline

The XGBoost models provide screening-level risk predictions for:

- **Gait Asymmetry** — Left/right movement pattern differences
- **Trendelenburg Risk** — Hip drop indicators
- **Trunk Instability** — Upper body stability during walking
- **Spinal Misalignment** — Shoulder-pelvic divergence patterns
- **Composite Risk** — Overall screening score

> See `data/training_reports/model_evaluation.md` for an honest assessment of model limitations.

## Clinical Safety

- All outputs use "observed/may/noticed" language — never diagnostic terms
- Language safety filter blocks prohibited medical terminology
- Strict routing rules based on age and ambulatory status
- Global disclaimer footer on every page
- Non-diagnostic screening levels: none → mild → moderate → significant

## License

Private — Hackathon submission
