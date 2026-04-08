# Pedi-Growth — System Architecture

**Version:** 0.1.0-draft | **Date:** 2026-04-06

---

## 1. Architecture Overview

**Competition message lock:** GAITBRIDGE helps caregivers capture a usable walking video, explains what was observed in simple language, and creates a clinician-ready handoff packet for follow-up review.

```
┌─────────────────────────────────────────────────────────────┐
│                    MOBILE BROWSER CLIENT                      │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────┐   │
│  │  UI/UX   │ │ Capture  │ │ Web Worker│ │  Report View │   │
│  │  Layer   │ │  Module  │ │ Pose Eng. │ │  + Export    │   │
│  └────┬─────┘ └────┬─────┘ └─────┬─────┘ └──────┬───────┘   │
│       │            │             │               │            │
│  ┌────┴────────────┴─────────────┴───────────────┴───────┐   │
│  │              CLIENT-SIDE ORCHESTRATOR                  │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │   │
│  │  │ Routing  │ │ Quality  │ │ Feature  │ │ Concern  │ │   │
│  │  │ Policy   │ │ Assess.  │ │ Engine   │ │ Engine   │ │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │   │
│  │  ┌──────────────────────────────────────────────────┐ │   │
│  │  │              POLICY GUARDRAIL LAYER              │ │   │
│  │  └──────────────────────────────────────────────────┘ │   │
│  └───────────────────────┬───────────────────────────────┘   │
└──────────────────────────┼───────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────┼───────────────────────────────────┐
│                    NEXT.JS SERVER (VERCEL)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐│
│  │ API      │ │ Auth     │ │ Report   │ │ AI Navigator     ││
│  │ Routes   │ │ Middleware│ │ Generator│ │ (LLM + Policy)   ││
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────────┬─────────┘│
│       └────────────┬┴───────────┬┘                │           │
│               ┌────┴────────────┴─────────────────┴──┐       │
│               │         POLICY ENGINE (SERVER)        │       │
│               └──────────────────┬────────────────────┘       │
└──────────────────────────────────┼────────────────────────────┘
                                   │
┌──────────────────────────────────┼────────────────────────────┐
│                         SUPABASE                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ Auth     │ │ Postgres │ │ Storage  │ │ Edge Functions   │ │
│  │          │ │ (RLS)    │ │ (Blobs)  │ │ (optional)       │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

---

## 2. Module Breakdown

### 2.1 Client-Side Modules

#### `lib/routing/` — Routing Policy Engine
- **Purpose:** Determine Route A vs Route B from intake data
- **Interface:** `routeChild(intake: IntakeForm): RoutingDecision`
- **Dependencies:** None (pure logic)
- **Tests:** Unit tests for all edge cases

#### `lib/pose/` — Pose Extraction Layer
- **Purpose:** Abstract pose estimation providers
- **Interface:**
  ```typescript
  interface PoseProvider {
    name: string;
    initialize(): Promise<void>;
    extractFrame(frame: VideoFrame): Promise<LandmarkFrame>;
    dispose(): void;
  }
  ```
- **Providers:** MediaPipePoseProvider (default), MoveNetProvider (fallback)
- **Execution:** Web Worker when available, main thread fallback
- **Output:** `LandmarkFrame[]` with per-landmark confidence

#### `lib/quality/` — Video Quality Assessment
- **Purpose:** Compute quality metrics and pass/borderline/fail decision
- **Interface:** `assessQuality(landmarks: LandmarkFrame[], videoMeta: VideoMeta): QualityReport`
- **Dependencies:** `lib/pose/` output
- **Policy:** Quality thresholds defined in `lib/policy/quality-thresholds.ts`

#### `lib/analysis/` — Gait Feature Engine
- **Purpose:** Compute gait features from landmark sequences
- **Interface:** `extractFeatures(landmarks: LandmarkFrame[], view: ViewType): GaitFeatureSet`
- **Sub-modules:**
  - `smoothing.ts` — Temporal smoothing (exponential moving average)
  - `cycle-detection.ts` — Gait cycle segmentation from ankle trajectories
  - `features/cadence.ts` — Cadence proxy
  - `features/symmetry.ts` — Step timing symmetry
  - `features/asymmetry.ts` — Left-right asymmetry
  - `features/stride.ts` — Stride regularity
  - `features/knee-flexion.ts` — Knee flexion concern proxy
  - `features/ankle.ts` — Ankle plantarflexion / toe-walking
  - `features/crouch.ts` — Crouch / flexed-knee proxy
  - `features/trunk.ts` — Trunk lean / stability

#### `lib/scoring/` — Concern Engine
- **Purpose:** Map features to concern domains with follow-up priority
- **Interface:** `scoreConcerns(features: GaitFeatureSet, quality: QualityReport): ConcernProfile`
- **Dependencies:** `lib/analysis/`, `lib/quality/`, `lib/policy/`
- **Policy:** All thresholds in `lib/policy/concern-thresholds.ts`

#### `lib/reports/` — Report Generation
- **Purpose:** Generate caregiver summary and clinician packet data structures
- **Interface:**
  ```typescript
  generateCaregiverReport(profile, intake, concerns, quality): CaregiverReport
  generateClinicianPacket(profile, intake, concerns, quality, features, timeline): ClinicianPacket
  ```
- **PDF:** Server-side generation via API route using `@react-pdf/renderer`

#### `lib/copilot/` — AI Navigator Client
- **Purpose:** Chat interface to bounded AI assistant
- **Interface:** Sends messages to server API route, receives streamed responses
- **Policy enforcement:** Client-side display filtering + server-side policy check

#### `lib/policy/` — Policy Engine
- **Purpose:** Central policy definitions and enforcement
- **Sub-modules:**
  - `routing-rules.ts` — Route A/B decision logic
  - `quality-thresholds.ts` — Video quality pass/fail thresholds
  - `concern-thresholds.ts` — Feature-to-concern mapping thresholds
  - `language-safety.ts` — Prohibited phrases filter
  - `confidence-downgrade.ts` — Confidence adjustment logic
  - `prohibited-claims.ts` — Blocked output patterns
  - `escalation-rules.ts` — Follow-up priority logic
- **All policies are unit-testable pure functions**

#### `lib/security/` — Security Utilities
- **Purpose:** Encryption helpers, share link generation, consent management
- **Sub-modules:** `encryption.ts`, `share-links.ts`, `consent.ts`

#### `lib/db/` — Database Client
- **Purpose:** Supabase client wrapper with typed queries
- **Sub-modules:** One file per entity (e.g., `child-profiles.ts`, `assessments.ts`)

---

### 2.2 Server-Side Modules

#### API Routes (`app/api/`)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/reports/pdf` | POST | Generate clinician packet PDF |
| `/api/navigator/chat` | POST | AI navigator message handling |
| `/api/share/create` | POST | Create secure share link |
| `/api/share/[token]` | GET | Retrieve shared report |
| `/api/audit/log` | POST | Log audit event |
| `/api/video/upload` | POST | Upload video to Supabase Storage |

#### AI Navigator Server (`app/api/navigator/`)
- System prompt loaded from `lib/copilot/system-prompt.ts`
- Policy filter applied to all responses via `lib/policy/language-safety.ts`
- All interactions logged to `navigator_messages` + `audit_events`
- LLM provider: OpenAI-compatible API (configurable)

---

## 3. Data Flow

### Route B: Gait Analysis Flow
```
Intake Form
    │
    ▼
Routing Engine ──→ Route A (if non-ambulant)
    │
    ▼ (Route B)
Video Capture/Upload
    │
    ▼
Pose Extraction (Web Worker)
    │
    ▼
Video Quality Assessment
    │
    ├── FAIL → Retake Guidance (loop back)
    │
    ▼ (PASS or BORDERLINE)
Gait Feature Engine
    │
    ▼
Concern Engine (with Policy Layer)
    │
    ▼
Report Generation
    ├── Caregiver Summary
    ├── Clinician Packet
    └── Timeline Entry
    │
    ▼
Storage (Supabase)
```

---

## 4. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 14+ (App Router) | SSR, API routes, file-based routing |
| Language | TypeScript (strict) | Type safety across all modules |
| Styling | Tailwind CSS | Rapid mobile-first development |
| Components | shadcn/ui | Accessible, composable, customizable |
| Database | Supabase (PostgreSQL + RLS) | Auth, storage, real-time, edge |
| Hosting | Vercel | Serverless, CDN, preview deploys |
| Pose Engine | MediaPipe Pose Landmarker | Browser-native, WASM, no server GPU |
| PDF | @react-pdf/renderer | Server-side PDF generation |
| AI | OpenAI-compatible API | Navigator chat (bounded) |
| Charts | recharts or Chart.js | Timeline visualization |

---

## 5. Key Architecture Decisions

### ADR-001: Client-Side Pose Extraction
**Decision:** Run pose extraction in the browser via Web Workers using MediaPipe WASM.
**Rationale:** Eliminates server GPU cost, reduces privacy risk (video never leaves device by default), enables offline-capable analysis.
**Trade-off:** Limited by device hardware; may be slow on budget phones.
**Mitigation:** Quality-gated — if extraction confidence is too low, recommend retake rather than producing unreliable results.

### ADR-002: Policy Engine as Pure Functions
**Decision:** All policy logic (routing, thresholds, language safety) implemented as pure TypeScript functions with no side effects.
**Rationale:** Enables comprehensive unit testing, prevents policy drift, makes audit straightforward.

### ADR-003: Provider Abstraction for Pose Engine
**Decision:** Define a `PoseProvider` interface; implementations are swappable.
**Rationale:** MediaPipe may deprecate; MoveNet or other providers may be better for specific use cases. Abstraction prevents vendor lock-in.

### ADR-004: No Raw Video Storage by Default
**Decision:** Raw video is processed client-side and discarded. Only derived landmarks and metrics are stored.
**Rationale:** Privacy by design. Reduces storage cost. Meets data minimization principle.
**Override:** Explicit opt-in with consent record and retention duration.

### ADR-005: Bounded AI Navigator
**Decision:** AI navigator is a constrained assistant, not a general chatbot. All responses filtered through policy layer.
**Rationale:** Clinical safety. Prevents diagnosis, speculation, and unsupported claims.

---

## 6. Security Architecture

### Authentication
- Supabase Auth (email/password, optionally social)
- Role-based: `caregiver`, `clinician`, `admin`
- Row Level Security (RLS) on all tables

### Data Protection
- PII encrypted at rest (Supabase encryption + application-level for sensitive fields)
- HTTPS only
- Share links: cryptographic tokens, time-limited, single-use optional
- Video data: ephemeral by default, never sent to server unless explicitly opted-in

### Audit Trail
- All critical actions logged to `audit_events` table
- Immutable audit log (append-only, no user delete)
- See `AUDIT_FRAMEWORK.md` for full specification

---

## 7. Deployment Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Developer      │     │   Vercel         │     │   Supabase      │
│   Workstation    │────▶│   (Preview +     │────▶│   (Prod DB +    │
│                  │     │    Production)   │     │    Storage)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │ git push              │ Auto-deploy
        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│   GitHub         │────▶│   CI/CD          │
│   (main + PRs)   │     │   (GitHub Actions)│
└─────────────────┘     └─────────────────┘
```

### Environments
| Environment | Purpose | Database |
|------------|---------|----------|
| `local` | Development | Supabase local (Docker) |
| `preview` | PR previews | Supabase staging project |
| `production` | Live demo/app | Supabase production project |
