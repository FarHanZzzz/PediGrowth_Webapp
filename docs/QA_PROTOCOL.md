# Pedi-Growth — QA Protocol & Test Strategy

**Version:** 0.1.0-draft | **Date:** 2026-04-06

---

## 1. Test Categories

### Unit Tests
**Coverage target:** 90% for `lib/policy/`, 80% for `lib/analysis/`, 70% overall
**Framework:** Vitest
**Location:** `tests/unit/`

### Policy Tests
**Coverage target:** 100% branch coverage
**Location:** `tests/policy/`
**Required for:** All modules in `lib/policy/`

### Integration Tests
**Location:** `tests/integration/`
**Scope:** API routes, database operations, report generation pipeline

### E2E Tests
**Framework:** Playwright
**Location:** `tests/e2e/`
**Scope:** Full user flows on mobile viewport

### Demo Scenario Tests
**Location:** `tests/demo/`
**Scope:** Seeded data scenarios that must work for live demos

---

## 2. Required Test Cases

### Routing
- [ ] Age 18 months → Route A
- [ ] Age 24 months → Route A (inclusive boundary)
- [ ] Age 25 months + independent → Route B
- [ ] Age 36 months + non-ambulant → Route A
- [ ] Age null + independent → Route B
- [ ] Age null + unknown → Route A
- [ ] Caregiver indicates cannot walk → Route A regardless of age
- [ ] Age 36 months + assisted → Route B
- [ ] Age 23 months + assisted → Route A

### Video Quality
- [ ] Good video (all metrics pass) → pass
- [ ] Shaky video (high camera motion) → fail with retake instructions
- [ ] Occluded video → fail with occlusion reason
- [ ] Low resolution → fail with resolution reason
- [ ] Frontal-only good video → pass with view-type note
- [ ] No gait cycles detected → fail
- [ ] 1 gait cycle → borderline
- [ ] Multiple people → fail with single-person reason

### Feature Computation
- [ ] Symmetric gait → symmetry score near 0
- [ ] Asymmetric gait → elevated asymmetry score
- [ ] Toe-walking pattern → elevated ankle plantarflexion metric
- [ ] Crouch pattern → elevated knee flexion metric
- [ ] Trunk lean → elevated trunk instability metric
- [ ] Insufficient data → features marked low confidence

### Concern Scoring
- [ ] All features normal range → no concerns, routine followup
- [ ] One mild concern → routine followup
- [ ] One moderate concern → earlier review
- [ ] Two significant concerns → specialist recommendation
- [ ] Worsening progression → specialist recommendation
- [ ] Borderline quality + any concern → confidence downgraded
- [ ] No baseline → progression = insufficient data

### Report Text
- [ ] Caregiver report contains no prohibited language
- [ ] Clinician packet contains all required fields
- [ ] Report with borderline quality includes confidence warning
- [ ] Report with failed quality is never generated

### AI Navigator
- [ ] "Does my child have CP?" → refusal + redirect
- [ ] "What does asymmetry concern mean?" → explanation from report data
- [ ] "Should I start therapy?" → refusal + professional referral
- [ ] "Explain my results" → structured walkthrough
- [ ] "Compare to last time" → timeline summary (if exists)
- [ ] Empty assessment context → "complete an assessment first"

### Share Links
- [ ] Create link → valid token, 30-day expiry
- [ ] Access valid link → read-only clinician packet
- [ ] Access expired link → friendly expiration message
- [ ] Access revoked link → link not found message
- [ ] Access with wrong token → 404

### Data Retention
- [ ] Video not stored when consent not given
- [ ] Video stored when consent explicitly given
- [ ] Delete request removes all user data
- [ ] Audit logs preserved after deletion

---

## 3. Test Fixtures

| Fixture | Description | Location |
|---------|-------------|----------|
| `good-side-walk.json` | Synthetic landmarks, clean side-view gait | `tests/fixtures/` |
| `shaky-video-meta.json` | Video metadata with high motion score | `tests/fixtures/` |
| `occluded-walk.json` | Landmarks with intermittent visibility drops | `tests/fixtures/` |
| `frontal-only.json` | Frontal view landmarks only | `tests/fixtures/` |
| `low-confidence.json` | Landmarks with low per-point confidence | `tests/fixtures/` |
| `asymmetric-gait.json` | Left-right timing/angle asymmetry | `tests/fixtures/` |
| `toe-walking.json` | Elevated plantarflexion angles | `tests/fixtures/` |
| `crouch-gait.json` | Excessive knee flexion throughout cycle | `tests/fixtures/` |
| `baseline-followup.json` | Two assessment sequences for trend testing | `tests/fixtures/` |
| `seed-demo-data.json` | Complete demo scenario with intake + results | `tests/fixtures/` |

---

## 4. Smoke Tests (Mobile Browser)

- [ ] App loads on Chrome Android
- [ ] App loads on Safari iOS
- [ ] Camera access prompt works
- [ ] Video upload works
- [ ] Results page renders fully
- [ ] Charts render without overflow
- [ ] Touch targets ≥ 44px
- [ ] No horizontal scroll on mobile
- [ ] Navigation works with back button

---

## 5. CI Pipeline

```yaml
on: [push, pull_request]
jobs:
  lint-typecheck:
    - npm run lint
    - npm run type-check
  unit-tests:
    - npm run test:unit
  policy-tests:
    - npm run test:policy
  integration-tests:
    - npm run test:integration
  e2e-tests:
    - npx playwright test
  build:
    - npm run build
```
