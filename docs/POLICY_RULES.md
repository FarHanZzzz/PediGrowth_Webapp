# Pedi-Growth — Policy Engine Specification

**Version:** 0.2.0 | **Date:** 2026-04-07 | **ADR:** ADR-001, ADR-006

---

## 1. Overview

The Policy Engine is a collection of **pure, unit-testable TypeScript functions** that enforce all clinical safety, routing, scoring, and language rules. No policy logic lives in UI components or API handlers — they call through the policy layer.

---

## 2. Policy Modules

### 2.1 Routing Rules (`routing-rules.ts`)

> **ADR-001:** Routing is AMBULATORY STATUS FIRST, AGE SECOND.
> Source: AACPDM Care Pathways, EVGS scope (ambulant children with CP only)

**Inputs:**
```typescript
interface RoutingInput {
  ageMonths: number | null;
  ambulatoryStatus: 'independent' | 'assisted' | 'non_ambulant' | 'unknown';
  caregiverIndicatesCannotWalk: boolean;
}
```

**Output:**
```typescript
interface RoutingDecision {
  route: 'route_a' | 'route_b';
  reason: string;
  policyVersion: string;
}
```

**Rules (priority order — ambulatory status first):**
1. `ambulatoryStatus === 'non_ambulant'` → Route A ("Gait analysis requires independent walking")
2. `ambulatoryStatus === 'unknown'` → Route A ("Defaulting to concern navigation for safety")
3. `caregiverIndicatesCannotWalk` → Route A ("Caregiver indicates child cannot reliably walk")
4. `ageMonths !== null && ageMonths <= AGE_THRESHOLD` → Route A ("Below walking-age analysis threshold; GMA/HINE recommended")
5. Default (ambulant + above threshold) → Route B

**Constants:**
- `AGE_THRESHOLD_MONTHS = 24`
- Product-policy constant, NOT a configurable admin setting for MVP (ADR-001)

**Edge cases:**
- `ageMonths === null` + `ambulatoryStatus === 'independent'` → Route B (age unknown but walking)
- `ageMonths === AGE_THRESHOLD_MONTHS` → Route A (inclusive boundary, conservative)
- Non-ambulant + age 36 months → Route A (ambulatory status wins over age)
- Ambulant + age 20 months → Route A (age guard catches young ambulant children)

**Test cases:** 12 minimum covering all branches and boundary conditions.

---

### 2.2 Quality Thresholds (`quality-thresholds.ts`)

**Thresholds:**
```typescript
const QUALITY_THRESHOLDS = {
  bodyVisibility: { pass: 0.7, borderline: 0.5 },
  singlePerson: { pass: 0.8, borderline: 0.6 },
  cameraMotion: { pass: 0.3, borderline: 0.5 },  // inverted: lower is better
  occlusion: { pass: 0.3, borderline: 0.5 },      // inverted
  frameUsability: { pass: 0.6, borderline: 0.4 },
  minGaitCycles: { pass: 2, borderline: 1 },
  minResolution: { width: 640, height: 480 },
} as const;
```

**Decision logic:**
```
IF any metric FAILS → overall FAIL
ELSE IF any metric BORDERLINE → overall BORDERLINE
ELSE → overall PASS
```

**Outputs:**
- `result: 'pass' | 'borderline' | 'fail'`
- `failureReasons: string[]`
- `retakeInstructions: string | null`
- `confidenceNotes: string`

---

### 2.3 Concern Thresholds (`concern-thresholds.ts`)

**Feature-to-concern mapping:**
```typescript
interface ConcernThresholds {
  asymmetry: { mild: 0.15, moderate: 0.25, significant: 0.40 };
  toeWalking: { mild: 10, moderate: 20, significant: 30 };  // degrees from neutral
  crouch: { mild: 15, moderate: 25, significant: 35 };       // excess flexion degrees
  trunkInstability: { mild: 0.10, moderate: 0.20, significant: 0.35 };
}
```

**Follow-up priority logic:**
```
IF count(significant concerns) >= 2 → 'specialist'
ELSE IF any concern >= moderate → 'earlier_review'
ELSE IF any concern >= mild → 'routine'
ELSE → 'routine'
```

**Confidence downgrade rules:**
- If quality = borderline → add `confidence_downgraded: true` with reason
- If < 3 gait cycles detected → add confidence downgrade
- If view type = frontal only → downgrade knee/ankle metrics

---

### 2.4 Language Safety (`language-safety.ts`)

**Prohibited patterns (regex + exact match):**
```typescript
const PROHIBITED_PATTERNS = [
  /\bdiagnos(e|is|ed|ing)\b/i,
  /\bconfirm(s|ed)?\s+(that|disease|condition)\b/i,
  /\blikely\s+has\b/i,
  /\bprobability\s+of\b/i,
  /\bcertainty\b/i,
  /\bguarantee[ds]?\b/i,
  /\bdefinitiv(e|ely)\b/i,
  /\byour\s+child\s+has\b/i,
  /\brisk\s+score\b/i,
  /\bprescri(be|ption)\b/i,
  /\bshould\s+(take|start|stop)\s+\w+\s*(medication|therapy|treatment)\b/i,
];
```

**Interface:**
```typescript
function checkLanguageSafety(text: string): {
  safe: boolean;
  violations: string[];
  sanitizedText: string | null;
}
```

**Behavior:**
- If violations found in AI output → block response, log policy violation, regenerate
- If violations found in report text → block report generation, log, alert
- Never silently pass through prohibited content

---

### 2.5 Confidence Downgrade (`confidence-downgrade.ts`)

**Triggers:**
| Trigger | Downgrade Action |
|---------|-----------------|
| Quality = borderline | Prepend confidence warning to all outputs |
| < 3 gait cycles | Reduce feature confidence scores by 30% |
| Frontal-only view | **SUPPRESS** side-dependent features entirely (ADR-006) |
| Low landmark confidence (< 0.5 avg) | Recommend retake, suppress concern levels |
| First assessment (no baseline) | Mark progression as "insufficient data" |

---

### 2.6 Prohibited Claims Filter (`prohibited-claims.ts`)

**Claims that must NEVER appear in any output:**
1. Disease probability statements
2. GMFCS level predictions
3. Treatment recommendations
4. Medication suggestions
5. Prognosis statements
6. Comparative statements to named conditions
7. Disorder ranking or differential diagnosis

**Interface:**
```typescript
function filterProhibitedClaims(text: string): {
  passed: boolean;
  blockedClaims: string[];
  cleanText: string;
}
```

---

### 2.7 Escalation Rules (`escalation-rules.ts`)

**Decision matrix:**
```typescript
function determineFollowupPriority(
  concerns: ConcernProfile,
  quality: QualityReport,
  hasBaseline: boolean
): FollowupPriority {
  if (concerns.qualityWarning) return 'routine'; // don't escalate on bad data
  if (countSignificant(concerns) >= 2) return 'specialist';
  if (concerns.progressionStatus === 'worsening') return 'specialist';
  if (hasAnyModerate(concerns)) return 'earlier_review';
  if (hasAnyMild(concerns)) return 'routine';
  return 'routine';
}
```

**Safety rule:** Never escalate beyond "specialist assessment recommended." Never produce urgency language like "emergency" or "immediately."

---

## 3. Testing Requirements

Every policy module requires:
- **Unit tests:** 100% branch coverage
- **Boundary tests:** All threshold boundaries tested on both sides
- **Regression tests:** Snapshot tests for known input/output pairs
- **Mutation testing:** Verify tests catch threshold value changes

**Test naming convention:** `[module].[rule].[condition].test.ts`

Example: `routing-rules.age-below-threshold.exact-boundary.test.ts`
