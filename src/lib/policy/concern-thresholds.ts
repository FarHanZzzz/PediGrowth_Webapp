// GAITBRIDGE — Concern Thresholds Policy (Frontal-First)
// Maps gait features to concern domains with follow-up priority.
// MVP: only frontal-valid concern domains are active.

import type { ConcernLevel, FollowupPriority, ConcernProfile, GaitFeatureSet, QualityResult } from '@/lib/types';

const POLICY_VERSION = '0.4.0-graceful';

// ── Frontal-valid thresholds ──────────────────────────────────
// Each threshold: value boundary for mild/moderate/significant.

export const CONCERN_THRESHOLDS = {
  // Frontal asymmetry (combined hip-height + shoulder tilt score, 0-1)
  asymmetry: { mild: 0.12, moderate: 0.22, significant: 0.35 },

  // Stride regularity (coefficient of variation, 0+)
  irregularRhythm: { mild: 0.15, moderate: 0.25, significant: 0.40 },

  // Lateral trunk sway (normalized SD, 0-1)
  lateralInstability: { mild: 0.08, moderate: 0.15, significant: 0.25 },

  // Path deviation (normalized residual score, 0-1)
  pathDeviation: { mild: 0.10, moderate: 0.20, significant: 0.35 },
} as const;

// Step timing symmetry is an input to asymmetry concern but not its own domain.
// If stepTimingSymmetry < 0.85, it contributes to composite asymmetry concern.
export const STEP_TIMING_CONCERN_THRESHOLD = 0.85;

function classifyConcern(
  value: number,
  thresholds: { mild: number; moderate: number; significant: number },
): ConcernLevel {
  if (value >= thresholds.significant) return 'significant';
  if (value >= thresholds.moderate) return 'moderate';
  if (value >= thresholds.mild) return 'mild';
  return 'none';
}

function countSignificant(levels: ConcernLevel[]): number {
  return levels.filter((l) => l === 'significant').length;
}

function hasAnyAtLevel(levels: ConcernLevel[], target: ConcernLevel): boolean {
  return levels.some((l) => l === target);
}

/**
 * Score frontal-valid concern domains from gait features.
 *
 * Rules:
 * - Map each frontal feature value to none/mild/moderate/significant
 * - Step timing asymmetry can escalate the asymmetry concern
 * - Determine follow-up priority based on concern distribution
 * - Apply confidence downgrade if quality is borderline
 * - Never escalate beyond "specialist assessment recommended"
 */
export function scoreConcerns(
  features: GaitFeatureSet,
  qualityResult: QualityResult,
  isBestEffort: boolean,
  progressionOverride?: 'improving' | 'stable' | 'worsening',
): Omit<ConcernProfile, 'id' | 'assessmentId' | 'createdAt'> {
  // ── Asymmetry concern: composite of frontalAsymmetry + step timing ──
  let asymmetryLevel = classifyConcern(features.frontalAsymmetry.value, CONCERN_THRESHOLDS.asymmetry);

  // Escalate if step timing is also asymmetric
  if (features.stepTimingSymmetry.value > 0 &&
      features.stepTimingSymmetry.value < STEP_TIMING_CONCERN_THRESHOLD &&
      features.stepTimingSymmetry.confidence >= 0.3) {
    if (asymmetryLevel === 'none') asymmetryLevel = 'mild';
    else if (asymmetryLevel === 'mild') asymmetryLevel = 'moderate';
  }

  // ── Other frontal concerns ──
  const irregularRhythmLevel = classifyConcern(
    features.strideRegularity.value,
    CONCERN_THRESHOLDS.irregularRhythm,
  );
  const lateralInstabilityLevel = classifyConcern(
    features.lateralTrunkSway.value,
    CONCERN_THRESHOLDS.lateralInstability,
  );
  const pathDeviationLevel = classifyConcern(
    features.pathDeviation.value,
    CONCERN_THRESHOLDS.pathDeviation,
  );

  const progressionStatus = progressionOverride ?? 'insufficient' as const;

  const qualityWarning = qualityResult === 'borderline' || isBestEffort;
  const confidenceDowngraded = qualityWarning;
  const downgradeReasons: string[] = [];
  if (isBestEffort) {
    downgradeReasons.push('Analysis performed in best-effort mode. Concern levels are preliminary.');
  } else if (qualityResult === 'borderline') {
    downgradeReasons.push('Video quality was borderline. Concern levels may be less reliable.');
  }

  const levels: ConcernLevel[] = [
    asymmetryLevel,
    irregularRhythmLevel,
    lateralInstabilityLevel,
    pathDeviationLevel,
  ];

  // Determine follow-up priority
  let followupPriority: FollowupPriority;
  if (qualityWarning) {
    followupPriority = 'routine';
  } else if (countSignificant(levels) >= 2) {
    followupPriority = 'specialist';
  } else if (progressionStatus === 'worsening') {
    followupPriority = 'specialist';
  } else if (hasAnyAtLevel(levels, 'moderate')) {
    followupPriority = 'earlier_review';
  } else if (hasAnyAtLevel(levels, 'mild')) {
    followupPriority = 'routine';
  } else {
    followupPriority = 'routine';
  }

  return {
    asymmetryLevel,
    irregularRhythmLevel,
    lateralInstabilityLevel,
    pathDeviationLevel,
    progressionStatus,
    qualityWarning,
    followupPriority,
    confidenceDowngraded,
    downgradeReasons,
    policyVersion: POLICY_VERSION,
  };
}

export { POLICY_VERSION };
