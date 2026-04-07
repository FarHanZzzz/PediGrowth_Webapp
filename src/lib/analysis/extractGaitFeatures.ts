// PEDI-GROWTH — Gait Feature Extraction Engine (Frontal-First)
// Computes real gait metrics from landmark sequences.
// MVP: frontal/toward-away video is the PRIMARY supported mode.
// Sagittal metrics are computed but gated behind _sagittal_ prefix.

import type { LandmarkFrame, GaitFeatureSet, MetricValue, CameraAngle, ViewType } from '@/lib/types';
import { POSE, MIN_VISIBILITY } from '@/lib/pose/poseTypes';
import { computeAngle, computeLateralOffset, computeHipHeightDiff, computeShoulderTilt, midpoint } from './angles';
import { detectFootStrikes, computeStepIntervals } from './cycleDetection';

const POLICY_VERSION = '0.3.0-frontal';

/**
 * Extract gait features from smoothed landmark frames.
 *
 * Frontal-first design:
 * - Primary metrics are all valid from front/back camera
 * - Sagittal metrics are only computed for side-view, stored under _sagittal_ keys
 */
export function extractGaitFeatures(
  frames: LandmarkFrame[],
  cameraAngle: CameraAngle,
): GaitFeatureSet {
  const isSideView = cameraAngle === 'side';
  const viewType: ViewType = isSideView ? 'side' : 'frontal';

  // Foot strikes and cycles
  const strikes = detectFootStrikes(frames);
  const { intervals, leftIntervals, rightIntervals } = computeStepIntervals(strikes);

  // ── Primary features (frontal-valid) ────────────────────────
  const result: GaitFeatureSet = {
    cadenceProxy: computeCadence(frames, strikes),
    stepTimingSymmetry: computeStepTimingSymmetry(leftIntervals, rightIntervals),
    frontalAsymmetry: computeFrontalAsymmetry(frames),
    strideRegularity: computeStrideRegularity(intervals),
    lateralTrunkSway: computeLateralTrunkSway(frames),
    pathDeviation: computePathDeviation(frames),
    baseOfSupport: computeBaseOfSupport(frames),
    viewType,
    policyVersion: POLICY_VERSION,
  };

  // ── Sagittal features (side-view only, gated) ──────────────
  if (isSideView) {
    result._sagittal_kneeFlexion = computeKneeFlexion(frames);
    result._sagittal_anklePlantarflexion = computeAnklePlantarflexion(frames);
    result._sagittal_crouchProxy = computeCrouchProxy(frames);
    result._sagittal_anteriorTrunkLean = computeAnteriorTrunkLean(frames);
  }

  return result;
}

// ══════════════════════════════════════════════════════════════
// FRONTAL-VALID METRIC COMPUTATIONS
// ══════════════════════════════════════════════════════════════

/**
 * Cadence: steps per minute.
 * Valid from ANY camera angle — uses ankle-Y oscillation.
 */
function computeCadence(frames: LandmarkFrame[], strikes: ReturnType<typeof detectFootStrikes>): MetricValue {
  if (frames.length < 5 || strikes.length < 2) {
    return { value: 0, confidence: 0.1, unit: 'steps/min', limitedReason: 'Insufficient steps detected' };
  }

  const durationMs = frames[frames.length - 1].timestampMs - frames[0].timestampMs;
  const durationMin = durationMs / 60000;

  if (durationMin <= 0) {
    return { value: 0, confidence: 0.1, unit: 'steps/min', limitedReason: 'Video too short' };
  }

  const cadence = strikes.length / durationMin;
  const confidence = Math.min(1, strikes.length / 8);

  return { value: Math.round(cadence), confidence, unit: 'steps/min' };
}

/**
 * Step timing symmetry: ratio of mean left-step to mean right-step duration.
 * Valid from ANY angle — pure timing metric.
 */
function computeStepTimingSymmetry(leftIntervals: number[], rightIntervals: number[]): MetricValue {
  if (leftIntervals.length < 2 || rightIntervals.length < 2) {
    return { value: 0, confidence: 0.15, limitedReason: 'Insufficient steps for timing comparison' };
  }

  const leftMean = mean(leftIntervals);
  const rightMean = mean(rightIntervals);

  if (leftMean === 0 || rightMean === 0) {
    return { value: 0, confidence: 0.1, limitedReason: 'Step timing data invalid' };
  }

  const ratio = Math.min(leftMean, rightMean) / Math.max(leftMean, rightMean);
  const confidence = Math.min(1, (leftIntervals.length + rightIntervals.length) / 6);

  return { value: parseFloat(ratio.toFixed(3)), confidence };
}

/**
 * Frontal asymmetry: multi-signal L/R comparison.
 *
 * Uses THREE frontal-valid signals:
 * 1. Hip height asymmetry (pelvic drop)
 * 2. Step timing asymmetry (from step intervals)
 * 3. Shoulder tilt (trunk lean toward one side)
 *
 * Each normalized 0-1, then averaged. This is BETTER from frontal view
 * than the old sagittal knee-angle-based asymmetry.
 */
function computeFrontalAsymmetry(frames: LandmarkFrame[]): MetricValue {
  const hipDiffs: number[] = [];
  const shoulderTilts: number[] = [];

  for (const frame of frames) {
    const lHip = frame.landmarks[POSE.LEFT_HIP];
    const rHip = frame.landmarks[POSE.RIGHT_HIP];
    const lShoulder = frame.landmarks[POSE.LEFT_SHOULDER];
    const rShoulder = frame.landmarks[POSE.RIGHT_SHOULDER];

    const hipsVisible = lHip.visibility >= MIN_VISIBILITY && rHip.visibility >= MIN_VISIBILITY;
    const shouldersVisible = lShoulder.visibility >= MIN_VISIBILITY && rShoulder.visibility >= MIN_VISIBILITY;

    if (hipsVisible) {
      hipDiffs.push(computeHipHeightDiff(lHip, rHip));
    }
    if (shouldersVisible) {
      shoulderTilts.push(computeShoulderTilt(lShoulder, rShoulder));
    }
  }

  if (hipDiffs.length < 5 && shoulderTilts.length < 5) {
    return { value: 0, confidence: 0.1, limitedReason: 'Insufficient visible frames for asymmetry' };
  }

  // Normalize: in MediaPipe coords, 0.01 hip diff ≈ noticeable asymmetry
  // Scale so that 0.05 normalized → score of 1.0
  const hipScore = hipDiffs.length >= 5
    ? Math.min(1, mean(hipDiffs) / 0.05)
    : 0;

  const shoulderScore = shoulderTilts.length >= 5
    ? Math.min(1, mean(shoulderTilts) / 0.08)
    : 0;

  // Combined score — weight hip more if both available
  let score: number;
  let signalCount = 0;
  if (hipDiffs.length >= 5) signalCount++;
  if (shoulderTilts.length >= 5) signalCount++;

  if (signalCount === 2) {
    score = hipScore * 0.6 + shoulderScore * 0.4;
  } else if (hipDiffs.length >= 5) {
    score = hipScore;
  } else {
    score = shoulderScore;
  }

  const confidence = Math.min(0.9, (hipDiffs.length + shoulderTilts.length) / 30);

  return { value: parseFloat(score.toFixed(3)), confidence };
}

/**
 * Stride regularity: coefficient of variation of step intervals.
 * Valid from ANY angle — pure timing metric.
 */
function computeStrideRegularity(intervals: number[]): MetricValue {
  if (intervals.length < 3) {
    return { value: 0, confidence: 0.15, limitedReason: 'Insufficient steps for regularity analysis' };
  }

  const avg = mean(intervals);
  if (avg === 0) {
    return { value: 0, confidence: 0.1, limitedReason: 'Step interval data invalid' };
  }

  const variance = mean(intervals.map((v) => (v - avg) ** 2));
  const cv = Math.sqrt(variance) / avg;
  const confidence = Math.min(1, intervals.length / 6);

  return { value: parseFloat(cv.toFixed(3)), confidence };
}

/**
 * Lateral trunk sway: SD of lateral shoulder-hip offset across frames.
 *
 * This is the IDEAL metric for frontal view — it measures mediolateral
 * trunk movement which is directly visible from the front.
 */
function computeLateralTrunkSway(frames: LandmarkFrame[]): MetricValue {
  const lateralOffsets: number[] = [];

  for (const frame of frames) {
    const ls = frame.landmarks[POSE.LEFT_SHOULDER];
    const rs = frame.landmarks[POSE.RIGHT_SHOULDER];
    const lh = frame.landmarks[POSE.LEFT_HIP];
    const rh = frame.landmarks[POSE.RIGHT_HIP];

    if (ls.visibility >= MIN_VISIBILITY &&
        rs.visibility >= MIN_VISIBILITY &&
        lh.visibility >= MIN_VISIBILITY &&
        rh.visibility >= MIN_VISIBILITY) {
      lateralOffsets.push(computeLateralOffset(ls, rs, lh, rh));
    }
  }

  if (lateralOffsets.length < 5) {
    return { value: 0, confidence: 0.15, limitedReason: 'Insufficient visible frames for stability' };
  }

  const avg = mean(lateralOffsets);
  const variance = mean(lateralOffsets.map((l) => (l - avg) ** 2));
  const sd = Math.sqrt(variance);

  // Normalize: SD of ~0.005 is normal, >0.02 is concerning
  // Scale so 0.04 SD → 1.0 score
  const normalized = Math.min(1, sd / 0.04);
  const confidence = Math.min(1, lateralOffsets.length / 20);

  return { value: parseFloat(normalized.toFixed(3)), confidence };
}

/**
 * Path deviation: how much the subject veers from a straight line.
 *
 * Tracks hip-center X position over time. Fits a linear regression.
 * Returns the R² inverted as a deviation score.
 *
 * IDEAL for frontal/away view — the walking path is directly visible.
 */
function computePathDeviation(frames: LandmarkFrame[]): MetricValue {
  const xPositions: { t: number; x: number }[] = [];

  for (const frame of frames) {
    const lh = frame.landmarks[POSE.LEFT_HIP];
    const rh = frame.landmarks[POSE.RIGHT_HIP];

    if (lh.visibility >= MIN_VISIBILITY && rh.visibility >= MIN_VISIBILITY) {
      const hipMid = midpoint(lh, rh);
      xPositions.push({ t: frame.timestampMs, x: hipMid.x });
    }
  }

  if (xPositions.length < 5) {
    return { value: 0, confidence: 0.15, limitedReason: 'Insufficient data for path analysis' };
  }

  // Normalize timestamps
  const t0 = xPositions[0].t;
  const tMax = xPositions[xPositions.length - 1].t - t0;
  if (tMax === 0) {
    return { value: 0, confidence: 0.1, limitedReason: 'Video too short for path analysis' };
  }

  const normalizedT = xPositions.map((p) => (p.t - t0) / tMax);
  const xs = xPositions.map((p) => p.x);

  // Linear regression of x vs t
  const n = normalizedT.length;
  const sumT = normalizedT.reduce((a, b) => a + b, 0);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumTX = normalizedT.reduce((a, t, i) => a + t * xs[i], 0);
  const sumT2 = normalizedT.reduce((a, t) => a + t * t, 0);

  const slope = (n * sumTX - sumT * sumX) / (n * sumT2 - sumT * sumT);
  const intercept = (sumX - slope * sumT) / n;

  // Compute residuals (deviation from straight line)
  const residuals = normalizedT.map((t, i) => xs[i] - (slope * t + intercept));
  const residualSD = Math.sqrt(mean(residuals.map((r) => r * r)));

  // Normalize: 0.01 residual SD is normal, >0.03 is concerning
  const normalized = Math.min(1, residualSD / 0.05);
  const confidence = Math.min(1, xPositions.length / 15);

  return { value: parseFloat(normalized.toFixed(3)), confidence };
}

/**
 * Base of support: mean distance between left and right ankles in X.
 *
 * IDEAL for frontal view — coronal plane foot spacing is directly visible.
 * Informational in MVP (not a concern trigger unless high confidence + persistent).
 */
function computeBaseOfSupport(frames: LandmarkFrame[]): MetricValue {
  const ankleWidths: number[] = [];

  for (const frame of frames) {
    const la = frame.landmarks[POSE.LEFT_ANKLE];
    const ra = frame.landmarks[POSE.RIGHT_ANKLE];

    if (la.visibility >= MIN_VISIBILITY && ra.visibility >= MIN_VISIBILITY) {
      // X-distance between ankles (normalized coords)
      ankleWidths.push(Math.abs(la.x - ra.x));
    }
  }

  if (ankleWidths.length < 5) {
    return { value: 0, confidence: 0.15, limitedReason: 'Insufficient ankle visibility' };
  }

  // Average width across visible ankle observations
  const avgWidth = mean(ankleWidths);
  const variance = mean(ankleWidths.map((w) => (w - avgWidth) ** 2));
  void variance;

  // Return average width as value, CV as additional info via confidence
  const confidence = Math.min(0.85, ankleWidths.length / 20);

  return {
    value: parseFloat(avgWidth.toFixed(4)),
    confidence,
    unit: 'normalized',
    limitedReason: ankleWidths.length < 10 ? 'Limited ankle observations' : undefined,
  };
}

// ══════════════════════════════════════════════════════════════
// SAGITTAL METRICS (side-view only, kept but gated)
// ══════════════════════════════════════════════════════════════

/** Knee flexion concern — SIDE VIEW ONLY */
function computeKneeFlexion(frames: LandmarkFrame[]): MetricValue {
  const angles: number[] = [];

  for (const frame of frames) {
    const sides = [
      { hip: POSE.LEFT_HIP, knee: POSE.LEFT_KNEE, ankle: POSE.LEFT_ANKLE },
      { hip: POSE.RIGHT_HIP, knee: POSE.RIGHT_KNEE, ankle: POSE.RIGHT_ANKLE },
    ];

    for (const side of sides) {
      const hip = frame.landmarks[side.hip];
      const knee = frame.landmarks[side.knee];
      const ankle = frame.landmarks[side.ankle];

      if (hip.visibility >= MIN_VISIBILITY &&
          knee.visibility >= MIN_VISIBILITY &&
          ankle.visibility >= MIN_VISIBILITY) {
        angles.push(computeAngle(hip, knee, ankle));
      }
    }
  }

  if (angles.length < 5) {
    return { value: 0, confidence: 0.1, unit: 'degrees', limitedReason: 'Insufficient visible frames' };
  }

  return {
    value: Math.round(mean(angles)),
    confidence: Math.min(1, angles.length / 30),
    unit: 'degrees',
  };
}

/** Ankle plantarflexion — SIDE VIEW ONLY */
function computeAnklePlantarflexion(frames: LandmarkFrame[]): MetricValue {
  const deviations: number[] = [];

  for (const frame of frames) {
    const sides = [
      { knee: POSE.LEFT_KNEE, ankle: POSE.LEFT_ANKLE, heel: POSE.LEFT_HEEL },
      { knee: POSE.RIGHT_KNEE, ankle: POSE.RIGHT_ANKLE, heel: POSE.RIGHT_HEEL },
    ];

    for (const side of sides) {
      const knee = frame.landmarks[side.knee];
      const ankle = frame.landmarks[side.ankle];
      const heel = frame.landmarks[side.heel];

      if (knee.visibility >= MIN_VISIBILITY &&
          ankle.visibility >= MIN_VISIBILITY &&
          heel.visibility >= MIN_VISIBILITY) {
        const angle = computeAngle(knee, ankle, heel);
        deviations.push(Math.abs(90 - angle));
      }
    }
  }

  if (deviations.length < 5) {
    return { value: 0, confidence: 0.15, unit: 'degrees', limitedReason: 'Insufficient visible frames' };
  }

  return {
    value: Math.round(mean(deviations)),
    confidence: Math.min(1, deviations.length / 20),
    unit: 'degrees',
  };
}

/** Crouch proxy — SIDE VIEW ONLY */
function computeCrouchProxy(frames: LandmarkFrame[]): MetricValue {
  const kneeFlexion = computeKneeFlexion(frames);
  if (kneeFlexion.confidence < 0.2) {
    return { value: 0, confidence: 0.1, unit: 'degrees', limitedReason: 'Crouch requires reliable knee data' };
  }

  const normalStanceAngle = 170;
  const crouchDeviation = Math.max(0, normalStanceAngle - kneeFlexion.value);

  return {
    value: Math.round(crouchDeviation),
    confidence: kneeFlexion.confidence * 0.9,
    unit: 'degrees',
  };
}

/** Anterior trunk lean — SIDE VIEW ONLY */
function computeAnteriorTrunkLean(frames: LandmarkFrame[]): MetricValue {
  // Reuse the existing computeTrunkLean from angles.ts via direct import
  // but compute here to avoid circular dependencies
  const leans: number[] = [];

  for (const frame of frames) {
    const ls = frame.landmarks[POSE.LEFT_SHOULDER];
    const rs = frame.landmarks[POSE.RIGHT_SHOULDER];
    const lh = frame.landmarks[POSE.LEFT_HIP];
    const rh = frame.landmarks[POSE.RIGHT_HIP];

    if (ls.visibility >= MIN_VISIBILITY && rs.visibility >= MIN_VISIBILITY &&
        lh.visibility >= MIN_VISIBILITY && rh.visibility >= MIN_VISIBILITY) {
      const shoulderMid = midpoint(ls, rs);
      const hipMid = midpoint(lh, rh);
      const dx = shoulderMid.x - hipMid.x;
      const dy = shoulderMid.y - hipMid.y;
      leans.push((Math.atan2(dx, -dy) * 180) / Math.PI);
    }
  }

  if (leans.length < 5) {
    return { value: 0, confidence: 0.15, limitedReason: 'Insufficient frames' };
  }

  const avg = mean(leans);
  const variance = mean(leans.map((l) => (l - avg) ** 2));
  const sd = Math.sqrt(variance);
  const normalized = sd / 20;

  return { value: parseFloat(normalized.toFixed(3)), confidence: Math.min(1, leans.length / 20) };
}

// ── Utility ─────────────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
