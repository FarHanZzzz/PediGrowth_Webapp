# Comparative Analysis Report

Date: 2026-04-08
Scope: Tracking system quality, model accuracy claims, and end-to-end product comparison between this repository (Pedi-Growth) and D:/Hisl_Hackathon.

## 1) Tracking System Analysis (Primary Focus)

### A. Pedi-Growth (this repo)

Tracking architecture:
- Browser-side pose extraction with MediaPipe task API.
- Quality check samples at low FPS, then full landmark extraction runs at 10 FPS with a 15-second cap.
- Frame-level quality gating drives three modes: full_assessment, best_effort, cannot_assess.
- Metric suppression is explicit when confidence is low (graceful degradation).
- Left/right swap correction and temporal smoothing exist before feature extraction.

Strengths:
- Strong safety design: quality-aware suppression instead of overconfident output.
- Better user guidance loop (retake logic and quality reasons).
- Evidence trace generation and provenance are integrated into result packaging.

Weaknesses likely causing poor perceived tracking:
- Fully client-device dependent. Low-end phones, browser throttling, and decode jitter directly reduce landmark stability.
- No explicit motion tracking layer (no Kalman/optical-flow/ID-based tracker), so temporal stability relies mainly on smoothing after detection.
- Camera-angle classification and visibility thresholds can aggressively suppress metrics, which can feel like bad tracking to users.
- XGBoost backend prediction client exists, but appears disconnected from the main frontend analysis flow, so robust backend scoring is not consistently contributing to user-visible output.

### B. D:/Hisl_Hackathon

Tracking architecture:
- Server-side frame-by-frame OpenCV processing with MediaPipe Pose Landmarker.
- Single-pose extraction, then metric arrays are smoothed (interpolation + outlier filtering + Savitzky-Golay/Butterworth).
- Detection quality represented mostly as detection_rate (detected frames / processed frames).
- Includes IC-normalization logic for knee valgus correction.

Strengths:
- Centralized compute (less device variability than browser-only).
- Good post-processing stack for noisy series.
- Broader orthopedic and neuromuscular metric breadth in one server pipeline.

Weaknesses:
- Landmarker runs in image mode, not true video mode with temporal tracking context.
- Quality governance is simpler: fewer fine-grained metric suppression pathways than Pedi-Growth.
- If backend is slow/unavailable, whole analysis experience degrades.

## 2) Accuracy Comparison

### Quick Numeric Snapshot (requested)

#### 1) Model accuracy percentage (directly reported)

- Pedi-Growth (from training_summary.csv, 5 targets):
	- Accuracy values: 100.00%, 99.84%, 100.00%, 100.00%, 99.68%
	- Mean reported accuracy = 99.90%

- D:/Hisl_Hackathon:
	- No single end-to-end classifier accuracy % is reported in the same format as Pedi-Growth.
	- What is reported instead:
		- Validation tests pass rate: 51/51 = 100.00%
		- Scoliosis threshold sensitivity claim: 94%
		- Scoliosis specificity claim: 97%
		- IC-normalized valgus error claim: <5 degrees

Interpretation:
- If you compare only reported classifier accuracy %, Pedi-Growth is higher (99.90% mean), but this is internal and single-split.
- Hisl has stronger calculation-validation reporting, but not a directly comparable single model accuracy benchmark.

#### 2) Practical winning percentage (system-level)

To give a clear winner signal, I scored both repos on 6 practical categories (1 win each):

1. Tracking consistency across devices: Hisl
2. Safety-aware quality gating: Pedi-Growth
3. Frontend visual explanation richness: Hisl
4. Backend job orchestration robustness: Hisl
5. Privacy-by-design and policy safety posture: Pedi-Growth
6. AI summary coverage and fallback behavior: Hisl

Scoreboard:
- Hisl wins: 4/6 = 66.7%
- Pedi-Growth wins: 2/6 = 33.3%

Overall practical winner (current state): D:/Hisl_Hackathon at 66.7%.
Accuracy-only winner (reported classifier metric only): Pedi-Growth at 99.90% mean reported accuracy.

### A. Pedi-Growth model metrics

Observed metrics are near-perfect in training reports (many values near 0.997-1.000 for accuracy/F1/AUC). The repo itself also documents major caveats:
- Labels are derived from engineered features similar to training inputs.
- Reported metrics come from a single split.
- High score is explicitly described as not equal to clinical validity.

Interpretation:
- Numerically higher metrics do not prove better real-world tracking or clinical generalization.
- Current reported accuracy should be treated as internal consistency, not external validity.

### B. Hisl accuracy claims

The comparison repo includes detailed clinical-validation narratives and reports 51/51 calculation tests passing. However:
- Most validation is threshold/math/unit validation, not an external benchmark dataset with held-out patient outcomes.
- Many accuracy values are literature-referenced and method-level, not necessarily measured end-to-end for this exact deployed code/data distribution.

Interpretation:
- Better documentation/testing of formulas, but not definitive evidence of better deployed predictive validity.

## 3) Full-Stack Comparison (Frontend, Backend, AI)

### Frontend

Pedi-Growth:
- Mobile-first capture flow, structured analysis stages, and evidence-oriented results panels.
- Better quality communication and confidence framing.
- Safer language posture in product docs/policy architecture.

Hisl:
- Strong dashboard presentation and richer visual storytelling on results.
- Parent-friendly narrative sections are extensive.
- More marketing-style clinical certainty language appears in UI copy.

Verdict:
- UX safety and policy framing: Pedi-Growth better.
- Immediate visual richness and explanatory breadth: Hisl better.

### Backend

Pedi-Growth:
- Hybrid architecture (client analysis + optional Python API + secure share APIs).
- Privacy-first design direction and policy-oriented modularity.
- The backend ML path is not fully unified with frontend runtime flow.

Hisl:
- Clear job-based backend orchestration with persistent progress and result storage.
- End-to-end analysis is consistently server-driven.
- Static serving of uploads/results and broader CORS posture create higher operational risk if promoted to production as-is.

Verdict:
- Operational simplicity and central processing: Hisl better.
- Privacy/safety architecture intent and policy modularity: Pedi-Growth better.

### AI/Model Layer

Pedi-Growth:
- Rule/policy-driven concern engine with quality-aware suppression and bounded language policy concepts.
- XGBoost stack present with strong internal metrics but questionable generalization confidence.

Hisl:
- Heuristic + threshold-driven clinical categorization, expanded orthopedic/neuromuscular heuristics.
- LLM summary endpoint with fallback model chain for robustness.
- Less strict language guardrails than Pedi-Growth policy posture.

Verdict:
- Safety controls and bounded output strategy: Pedi-Growth better.
- Breadth of heuristic clinical overlays and AI summary availability: Hisl better.

## 4) Why tracking feels worse in your current repo

Most probable causes (ranked):
1. Browser/device variability is dominating landmark quality.
2. No dedicated temporal tracker beyond smoothing/swap correction.
3. Quality gates suppress metrics on many real-world clips (correctly for safety, but perceived as failure).
4. Feature extraction at fixed 10 FPS and seek-based frame stepping can miss difficult motion dynamics.
5. Backend ML path is not fully integrated into visible result scoring pipeline.

## 5) Test and Validation Snapshot

Executed during this analysis:
- Pedi-Growth tests: 28 passed, 0 failed.
- Hisl validation tests: 51 passed, 0 failed.

Important caveat:
- Pedi-Growth tests are mostly policy/unit style and some are inline logic replicas, not comprehensive tracker robustness tests.
- Hisl tests strongly validate calculations and thresholds, but do not replace external clinical performance validation.

## 6) Practical Recommendations for Pedi-Growth (Priority Order)

P0 (immediate, highest impact):
1. Add runtime tracking quality telemetry per session: detection_rate, visible-joint ratio, dropped-frame ratio, and camera-motion score in final report payload.
2. Integrate backend prediction path cleanly into the same result object when available, with explicit fallback labels.
3. Add a short pre-analysis stabilization step (camera shake and framing checks) before full extraction.

P1 (next sprint):
1. Introduce temporal filtering with adaptive confidence weighting (visibility-weighted smoothing, not fixed alpha only).
2. Add optional server-side analysis mode for low-end devices, keeping client-first default for privacy.
3. Build benchmark clips set and regression suite: stable frontal, low light, occlusion, motion blur, side-view mismatch.

P2 (quality hardening):
1. Run patient-level cross-validation and external holdout reporting (AUC/F1 calibration + confidence intervals).
2. Align test thresholds with current policy constants automatically (avoid stale inline thresholds in tests).
3. Add failure taxonomy dashboard from real runs to prioritize tracking improvements by root cause.

## 7) Bottom Line

- If your target is safer caregiver-facing screening behavior and policy compliance, your current architecture is stronger in principle.
- If your target is immediate perceived tracking consistency across diverse hardware, the Hisl server-first processing style currently has practical advantages.
- The best path is hybrid: keep Pedi-Growth safety/policy framework, but add stronger temporal tracking and optional server fallback to reduce low-quality client-run failures.
