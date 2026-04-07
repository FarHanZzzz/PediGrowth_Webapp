# GAITBRIDGE

**Pediatric Gait Concern Analysis, Monitoring, and Care Navigation Platform**

> Turn ordinary smartphone videos into structured, explainable gait concern summaries and clinician-ready packets.

---

## What GAITBRIDGE Is

- A structured gait concern documentation tool
- A triage and monitoring support system
- A caregiver education and navigation layer
- A longitudinal change-tracking platform
- A clinician handoff/reporting workflow

## What GAITBRIDGE Is NOT

- ❌ A diagnostic tool
- ❌ A disease-probability engine
- ❌ A neurological disorder classifier
- ❌ A substitute for professional evaluation

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| Components | shadcn/ui |
| Database | Supabase (PostgreSQL + RLS) |
| Hosting | Vercel |
| Pose Engine | MediaPipe Pose Landmarker (WASM) |
| PDF | @react-pdf/renderer |
| AI Navigator | OpenAI-compatible API (bounded) |

---

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run development server
npm run dev

# Run tests
npm run test

# Run policy tests
npm run test:policy
```

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes (PDF, navigator, share, audit)
│   ├── (auth)/            # Auth pages
│   ├── consent/           # Consent flow
│   ├── intake/            # Child intake
│   ├── capture/           # Video capture/upload
│   ├── results/           # Caregiver + clinician results
│   ├── timeline/          # Longitudinal view
│   ├── navigator/         # AI navigator
│   └── share/             # Share/export
├── components/            # UI components
│   ├── ui/               # shadcn/ui base components
│   ├── intake/           # Intake form components
│   ├── capture/          # Capture UI components
│   ├── results/          # Results display components
│   ├── timeline/         # Timeline components
│   └── navigator/        # Chat components
├── lib/
│   ├── types/            # Domain types (single source of truth)
│   ├── policy/           # Policy engine (pure functions)
│   ├── pose/             # Pose extraction abstraction
│   ├── analysis/         # Gait feature engine
│   ├── quality/          # Video quality assessment
│   ├── scoring/          # Concern engine
│   ├── reports/          # Report generation
│   ├── copilot/          # AI navigator logic
│   ├── db/               # Database client
│   ├── security/         # Encryption, share links
│   └── utils/            # Shared utilities
docs/                      # Documentation
├── PRD.md
├── ARCHITECTURE.md
├── DATA_MODEL.md
├── POLICY_RULES.md
├── AI_NAVIGATOR_SPEC.md
├── SAFETY_AND_LIMITATIONS.md
├── QA_PROTOCOL.md
├── TEAM_COLLABORATION.md
├── AUDIT_FRAMEWORK.md
├── DELIVERY_PHASES.md
├── DEMO_RUNBOOK.md
└── OPEN_QUESTIONS.md
tests/
├── unit/
├── policy/
├── integration/
├── e2e/
├── demo/
└── fixtures/
```

---

## Documentation

| Document | Purpose |
|----------|---------|
| [PRD](docs/PRD.md) | Product requirements, features, scope |
| [Architecture](docs/ARCHITECTURE.md) | System design, modules, data flow |
| [Data Model](docs/DATA_MODEL.md) | Database schema, entities, relationships |
| [Policy Rules](docs/POLICY_RULES.md) | Policy engine specification |
| [AI Navigator](docs/AI_NAVIGATOR_SPEC.md) | AI copilot specification |
| [Safety](docs/SAFETY_AND_LIMITATIONS.md) | Privacy, consent, disclaimers |
| [QA Protocol](docs/QA_PROTOCOL.md) | Test strategy and requirements |
| [Team Collaboration](docs/TEAM_COLLABORATION.md) | Roles, workflows, governance |
| [Audit Framework](docs/AUDIT_FRAMEWORK.md) | Logging and audit specification |
| [Delivery Phases](docs/DELIVERY_PHASES.md) | Phased implementation plan |
| [Demo Runbook](docs/DEMO_RUNBOOK.md) | Demo scripts and fallback plans |
| [Open Questions](docs/OPEN_QUESTIONS.md) | Unresolved decisions |

---

## Safety Commitment

Every output of GAITBRIDGE reinforces **support, not diagnosis**. The platform:
- Never claims to diagnose conditions
- Never provides disease probabilities
- Never recommends treatments
- Always defers to professional clinical evaluation
- Always displays confidence scores and limitations
- Rejects low-quality video rather than producing unreliable analysis

---

## License

Proprietary — All rights reserved.
