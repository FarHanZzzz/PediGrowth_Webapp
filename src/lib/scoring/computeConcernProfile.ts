// PEDI-GROWTH — Concern Profile Computation (Frontal-First + Graceful Degradation)
//
// GRACEFUL DEGRADATION PRINCIPLE:
// In best-effort mode, concerns are CAPPED at 'mild' and follow-up
// priority is capped at 'routine'. This prevents overconfident escalation
// from noisy, low-quality input while still providing useful partial results.

import type { GaitFeatureSet, ConcernLevel, AssessmentMode } from '@/lib/types';
import { scoreConcerns } from '@/lib/policy/concern-thresholds';
import type { VideoQualityAssessment } from '@/lib/quality/qualityTypes';
import {
  MIN_CONCERN_CONFIDENCE,
  BEST_EFFORT_CONCERN_CAP,
  BEST_EFFORT_PRIORITY_CAP,
  isLimitedAssessment,
  generateContextNotes,
  getAssessmentModeLabel,
  VIEW_SUPPORT,
} from './scoringPolicy';

export interface ComputedConcernResult {
  asymmetry: ConcernLevel;
  irregularRhythm: ConcernLevel;
  lateralInstability: ConcernLevel;
  pathDeviation: ConcernLevel;
  overallLevel: ConcernLevel;
  followupPriority: string;
  qualityWarning: boolean;
  confidenceDowngraded: boolean;
  downgradeReasons: string[];
  isLimited: boolean;
  contextNotes: string[];
  suppressedDomains: string[];
  assessedDomains: string[];
  viewLabel: string;
  assessmentModeLabel: string;
  assessmentMode: AssessmentMode;
  policyVersion: string;
}

const CONCERN_ORDER: ConcernLevel[] = ['none', 'mild', 'moderate', 'significant'];

function capConcern(level: ConcernLevel, cap: ConcernLevel): ConcernLevel {
  const levelIdx = CONCERN_ORDER.indexOf(level);
  const capIdx = CONCERN_ORDER.indexOf(cap);
  return levelIdx <= capIdx ? level : cap;
}

/**
 * Compute the full concern profile from real features and quality data.
 *
 * Best-effort rules:
 * 1. Apply confidence multiplier from quality to all features
 * 2. Cap all concerns at BEST_EFFORT_CONCERN_CAP ('mild')
 * 3. Cap follow-up priority at BEST_EFFORT_PRIORITY_CAP ('routine')
 * 4. Suppress metrics not in quality.usableMetrics
 * 5. Add "preliminary" framing to all notes
 */
export function computeConcernProfile(
  features: GaitFeatureSet,
  quality: VideoQualityAssessment,
): ComputedConcernResult {
  const suppressedDomains: string[] = [];
  const assessedDomains: string[] = [];
  const viewPolicy = VIEW_SUPPORT[quality.cameraAngle];
  const mode = quality.assessmentMode;
  const isBestEffort = mode === 'best_effort';
  const confMultiplier = quality.confidenceMultiplier;

  // Score through the policy engine
  const profile = scoreConcerns(features, quality.result, isBestEffort);

  // Apply confidence suppression + best-effort capping
  let asymmetry = profile.asymmetryLevel;
  let irregularRhythm = profile.irregularRhythmLevel;
  let lateralInstability = profile.lateralInstabilityLevel;
  let pathDeviation = profile.pathDeviationLevel;

  // Check per-metric confidence (with multiplier applied)
  const effectiveAsymConf = features.frontalAsymmetry.confidence * confMultiplier;
  const effectiveRhythmConf = features.strideRegularity.confidence * confMultiplier;
  const effectiveSwayConf = features.lateralTrunkSway.confidence * confMultiplier;
  const effectivePathConf = features.pathDeviation.confidence * confMultiplier;

  // Also suppress if metric is in quality.suppressedMetrics
  const suppressed = new Set(quality.suppressedMetrics);

  if (effectiveAsymConf < MIN_CONCERN_CONFIDENCE || suppressed.has('frontalAsymmetry')) {
    if (asymmetry !== 'none') suppressedDomains.push('asymmetry');
    asymmetry = 'none';
  } else {
    assessedDomains.push('asymmetry');
  }

  if (effectiveRhythmConf < MIN_CONCERN_CONFIDENCE || suppressed.has('strideRegularity')) {
    if (irregularRhythm !== 'none') suppressedDomains.push('irregularRhythm');
    irregularRhythm = 'none';
  } else {
    assessedDomains.push('irregularRhythm');
  }

  if (effectiveSwayConf < MIN_CONCERN_CONFIDENCE || suppressed.has('lateralTrunkSway')) {
    if (lateralInstability !== 'none') suppressedDomains.push('lateralInstability');
    lateralInstability = 'none';
  } else {
    assessedDomains.push('lateralInstability');
  }

  if (effectivePathConf < MIN_CONCERN_CONFIDENCE || suppressed.has('pathDeviation')) {
    if (pathDeviation !== 'none') suppressedDomains.push('pathDeviation');
    pathDeviation = 'none';
  } else {
    assessedDomains.push('pathDeviation');
  }

  // Best-effort cap: never escalate above mild from low-quality data
  if (isBestEffort) {
    asymmetry = capConcern(asymmetry, BEST_EFFORT_CONCERN_CAP);
    irregularRhythm = capConcern(irregularRhythm, BEST_EFFORT_CONCERN_CAP);
    lateralInstability = capConcern(lateralInstability, BEST_EFFORT_CONCERN_CAP);
    pathDeviation = capConcern(pathDeviation, BEST_EFFORT_CONCERN_CAP);
  }

  // Overall concern level
  const levels: ConcernLevel[] = [asymmetry, irregularRhythm, lateralInstability, pathDeviation];
  const overallLevel: ConcernLevel =
    levels.includes('significant') ? 'significant' :
    levels.includes('moderate') ? 'moderate' :
    levels.includes('mild') ? 'mild' :
    'none';

  // Follow-up priority (capped in best-effort)
  let followupPriority = profile.followupPriority;
  if (isBestEffort && followupPriority !== 'routine') {
    followupPriority = BEST_EFFORT_PRIORITY_CAP;
  }

  // Context notes
  const isLimited = isLimitedAssessment(quality.cameraAngle, quality.frameUsabilityPct, mode);
  const contextNotes = generateContextNotes(
    quality.cameraAngle,
    quality.frameUsabilityPct,
    quality.durationSeconds,
    mode,
  );

  if (suppressedDomains.length > 0) {
    contextNotes.push(
      `Could not reliably assess: ${suppressedDomains.join(', ')}. A higher quality recording may help.`
    );
  }

  if (isBestEffort && assessedDomains.length > 0) {
    contextNotes.push(
      `Assessed with reduced confidence: ${assessedDomains.join(', ')}.`
    );
  }

  return {
    asymmetry,
    irregularRhythm,
    lateralInstability,
    pathDeviation,
    overallLevel,
    followupPriority,
    qualityWarning: profile.qualityWarning || isBestEffort,
    confidenceDowngraded: profile.confidenceDowngraded || isBestEffort,
    downgradeReasons: isBestEffort
      ? [...profile.downgradeReasons, 'Video quality required best-effort analysis. Concerns are capped at preliminary level.']
      : profile.downgradeReasons,
    isLimited,
    contextNotes,
    suppressedDomains,
    assessedDomains,
    viewLabel: viewPolicy.label,
    assessmentModeLabel: getAssessmentModeLabel(mode),
    assessmentMode: mode,
    policyVersion: profile.policyVersion,
  };
}
