// GAITBRIDGE — Analysis Session Orchestrator (Evidence-First)
//
// DESIGN PRINCIPLES:
// 1. NEVER refuse analysis for merely imperfect home videos (graceful degradation)
// 2. ALWAYS build an AnalysisTrace — the evidence chain consumed by all UI
// 3. RETAIN video for annotated preview (auto-cleanup after 24h)
//
// Three modes:
//   full_assessment  → standard analysis, full confidence
//   best_effort      → reduced confidence, fragile metrics suppressed
//   cannot_assess    → no analysis possible, explain why, offer retry

import { createPoseProvider, extractLandmarkSequence } from '@/lib/pose';
import { assessVideoQuality } from '@/lib/quality/assessVideoQuality';
import { smoothLandmarks } from '@/lib/analysis/smoothing';
import { correctLRSwaps } from '@/lib/analysis/swapCorrection';
import { extractGaitFeatures } from '@/lib/analysis/extractGaitFeatures';
import { detectFootStrikes, buildGaitCycles } from '@/lib/analysis/cycleDetection';
import { computeConcernProfile } from '@/lib/scoring/computeConcernProfile';
import { getVideo, deleteVideo } from './videoStore';
import { buildAnalysisTrace } from '@/lib/trace/buildAnalysisTrace';
import type { MetricTraceInput } from '@/lib/trace/buildAnalysisTrace';
import type { AnalysisTrace, SuppressedMetricEntry } from '@/lib/trace/traceTypes';
import type { AssessmentMode } from '@/lib/types';
import {
  buildRunProvenance,
  type PoseModelId,
  type RunProvenance,
  type RunSourceType,
} from './runProvenance';

export type PipelineStage =
  | 'loading_video'
  | 'initializing_pose'
  | 'checking_quality'
  | 'extracting_landmarks'
  | 'computing_features'
  | 'scoring_concerns'
  | 'generating_results'
  | 'complete'
  | 'failed';

export interface PipelineProgress {
  stage: PipelineStage;
  stageIndex: number;
  totalStages: number;
  stageProgress: number;
  message: string;
}

export interface AnalysisSessionResult {
  id: string;
  session: { nickname: string; ageMonths: number };
  run: RunProvenance;
  assessmentMode: AssessmentMode;
  quality: {
    result: string;
    assessmentMode: AssessmentMode;
    bodyVisibility: number;
    cameraAngle: string;
    frameUsability: number;
    durationSeconds: number;
    confidenceMultiplier: number;
    usableMetrics: string[];
    suppressedMetrics: string[];
    failureReasons: string[];
    borderlineReasons: string[];
    retakeInstructions: string | null;
    retakeSuggestions: string[];
    confidenceNotes: string;
  };
  features: {
    cadence: MetricValue;
    stepSymmetry: MetricValue;
    frontalAsymmetry: MetricValue;
    strideRegularity: MetricValue;
    lateralTrunkSway: MetricValue;
    pathDeviation: MetricValue;
    baseOfSupport: MetricValue;
  };
  concerns: {
    asymmetry: string;
    irregularRhythm: string;
    lateralInstability: string;
    pathDeviation: string;
    overallLevel: string;
    followupPriority: string;
    isLimited: boolean;
    contextNotes: string[];
    suppressedDomains: string[];
    assessedDomains: string[];
    qualityWarning: boolean;
    viewLabel: string;
    assessmentModeLabel: string;
    assessmentMode: AssessmentMode;
  };
  viewType: string;
  isDemo: boolean;
  demoScenario?: string;
  policyVersion: string;
  analyzedAt: string;
  // ── NEW: Evidence chain ──
  trace?: AnalysisTrace;
  videoUrl?: string;
}

export interface RunAnalysisOptions {
  validationMode?: boolean;
  sourceType?: RunSourceType;
  sourceClipId?: string | null;
  sourceClipFilename?: string | null;
  approvedForDemo?: boolean | null;
}

interface MetricValue {
  value: number;
  confidence: number;
  unit?: string;
  limitedReason?: string;
  suppressed?: boolean;
}

const STAGES: { stage: PipelineStage; message: string }[] = [
  { stage: 'loading_video', message: 'Loading video...' },
  { stage: 'initializing_pose', message: 'Initializing pose detection...' },
  { stage: 'checking_quality', message: 'Checking video quality...' },
  { stage: 'extracting_landmarks', message: 'Detecting body landmarks...' },
  { stage: 'computing_features', message: 'Extracting gait features...' },
  { stage: 'scoring_concerns', message: 'Computing concern profile...' },
  { stage: 'generating_results', message: 'Building evidence trace...' },
];

// Metric display names for evidence UI
const METRIC_DISPLAY_NAMES: Record<string, string> = {
  cadence: 'Cadence',
  stepSymmetry: 'Step timing symmetry',
  frontalAsymmetry: 'Frontal asymmetry',
  strideRegularity: 'Stride regularity',
  lateralTrunkSway: 'Lateral trunk sway',
  pathDeviation: 'Path deviation',
  baseOfSupport: 'Base of support',
};

const METRIC_INPUT_SIGNALS: Record<string, string> = {
  cadence: 'Ankle-Y oscillation frequency (foot strikes per minute)',
  stepSymmetry: 'Ratio of mean left-step to mean right-step duration',
  frontalAsymmetry: 'Hip height difference and shoulder tilt between L/R sides',
  strideRegularity: 'Coefficient of variation of step intervals',
  lateralTrunkSway: 'Standard deviation of lateral shoulder-hip offset',
  pathDeviation: 'Residual deviation from linear hip-center trajectory',
  baseOfSupport: 'Mean lateral distance between L/R ankles',
};

const METRIC_COMPUTATION_METHODS: Record<string, string> = {
  cadence: 'Count foot strikes ÷ video duration in minutes',
  stepSymmetry: 'min(leftMean, rightMean) / max(leftMean, rightMean)',
  frontalAsymmetry: 'Weighted average of hip height score (60%) and shoulder tilt score (40%)',
  strideRegularity: 'sqrt(variance(intervals)) / mean(intervals)',
  lateralTrunkSway: 'sqrt(variance(lateralOffsets)) normalized to 0-1 scale',
  pathDeviation: 'Linear regression residual SD of hip-center X over time',
  baseOfSupport: 'Mean absolute X-distance between left and right ankles',
};

export async function runAnalysisPipeline(
  sessionId: string,
  nickname: string,
  ageMonths: number,
  onProgress?: (progress: PipelineProgress) => void,
  options: RunAnalysisOptions = {},
): Promise<AnalysisSessionResult> {
  const validationMode = options.validationMode ?? false;
  const modelId: PoseModelId = 'mediapipe_full';
  const modelLabel = 'MediaPipe Full';

  function report(stageIndex: number, stageProgress: number = 0) {
    const s = STAGES[stageIndex];
    onProgress?.({
      stage: s.stage,
      stageIndex,
      totalStages: STAGES.length,
      stageProgress,
      message: s.message,
    });
  }

  try {
    // Stage 0: Load video from IndexedDB
    report(0);
    const videoData = await getVideo(sessionId);
    if (!videoData) {
      return makeValidationFailureResult(
        nickname,
        ageMonths,
        'loading_video',
        'No video was found for this analysis run.',
        options,
      );
    }
    report(0, 1);

    // Stage 1: Initialize pose provider
    report(1);
    let provider;
    try {
      provider = await createPoseProvider('mediapipe');
      await provider.initialize();
    } catch (err) {
      await deleteVideo(sessionId).catch(() => {});
      return makeValidationFailureResult(
        nickname,
        ageMonths,
        'initializing_pose',
        `Pose model initialization failed: ${errorMessage(err)}`,
        options,
        modelId,
        modelLabel,
      );
    }
    report(1, 1);

    try {
      // Stage 2: Quality assessment
      report(2);
      const videoBlob = videoData.blob;
      const { assessment } = await assessVideoQuality(
        provider,
        videoBlob,
        (pct) => report(2, pct),
      );
      report(2, 1);

      // ─── GRACEFUL DEGRADATION: only refuse for cannot_assess ───
      if (assessment.assessmentMode === 'cannot_assess') {
        await deleteVideo(sessionId).catch(() => {});
        return makeCannotAssessResult(
          nickname,
          ageMonths,
          assessment,
          buildRunProvenance({
            classification: 'real_analysis',
            validationMode,
            sourceType: options.sourceType ?? 'upload',
            sourceClipId: options.sourceClipId ?? null,
            sourceClipFilename: options.sourceClipFilename ?? videoData.name,
            approvedForDemo: options.approvedForDemo ?? null,
            modelId,
            modelLabel,
          }),
        );
      }

      // Stage 3: Extract full landmark sequence
      report(3);

      // CRITICAL: Reset MediaPipe's timestamp sequence.
      // Quality assessment used timestamps 0→N. If we start extraction at 0 again,
      // MediaPipe crashes with "Packet timestamp mismatch". This offset ensures
      // all subsequent timestamps are strictly increasing.
      if ('resetTimestampSequence' in provider) {
        (provider as { resetTimestampSequence: () => void }).resetTimestampSequence();
      }

      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';

      const videoURL = URL.createObjectURL(videoBlob);
      try {
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve();
          video.onerror = () => reject(new Error('Video load failed'));
          video.src = videoURL;
        });
        await new Promise<void>((resolve) => {
          if (video.readyState >= 2) { resolve(); return; }
          video.oncanplay = () => resolve();
        });

        const rawFrames = await extractLandmarkSequence(provider, video, 10);
        report(3, 1);

        if (rawFrames.length === 0) {
          return makeValidationFailureResult(
            nickname,
            ageMonths,
            'extracting_landmarks',
            'Pose extraction returned an empty landmark sequence.',
            options,
            modelId,
            modelLabel,
          );
        }

        // Stage 4: Smooth + swap correct + compute features
        report(4);
        const smoothedFrames = smoothLandmarks(rawFrames, 0.3);
        const { frames: correctedFrames, swapCount } = correctLRSwaps(smoothedFrames);
        if (swapCount > 0) {
          console.log(`[GaitBridge] Corrected ${swapCount} L/R swap(s)`);
        }
        const features = extractGaitFeatures(correctedFrames, assessment.cameraAngle);
        report(4, 1);

        // Stage 5: Score concerns
        report(5);
        const concerns = computeConcernProfile(features, assessment);
        report(5, 1);

        // Stage 6: Package result + build evidence trace
        report(6);
        const resultId = 'r_' + Date.now().toString(36);
        const suppressed = new Set(assessment.suppressedMetrics);
        const confMult = assessment.confidenceMultiplier;

        function applySuppress(
          feat: { value: number; confidence: number; unit?: string; limitedReason?: string },
          metricKey: string,
        ): MetricValue {
          if (suppressed.has(metricKey)) {
            return {
              value: feat.value,
              confidence: 0,
              unit: feat.unit,
              limitedReason: 'Not assessed — video quality insufficient for this metric.',
              suppressed: true,
            };
          }
          return {
            value: feat.value,
            confidence: feat.confidence * confMult,
            unit: feat.unit,
            suppressed: false,
          };
        }

        // ── Build Analysis Trace (NON-FATAL — if this fails, result still works) ──
        let trace: AnalysisTrace | undefined;
        const run = buildRunProvenance({
          classification: 'real_analysis',
          validationMode,
          sourceType: options.sourceType ?? 'upload',
          sourceClipId: options.sourceClipId ?? null,
          sourceClipFilename: options.sourceClipFilename ?? videoData.name,
          approvedForDemo: options.approvedForDemo ?? null,
          modelId,
          modelLabel,
        });
        try {
          const footStrikes = detectFootStrikes(correctedFrames);
          const gaitCycles = buildGaitCycles(footStrikes);

          const metricTraceInputs: MetricTraceInput[] = [];
          const suppressedTraceEntries: SuppressedMetricEntry[] = [];

          const metricKeys = Object.keys(METRIC_DISPLAY_NAMES);
          const featureMap: Record<string, { value: number; confidence: number; unit?: string }> = {
            cadence: features.cadenceProxy,
            stepSymmetry: features.stepTimingSymmetry,
            frontalAsymmetry: features.frontalAsymmetry,
            strideRegularity: features.strideRegularity,
            lateralTrunkSway: features.lateralTrunkSway,
            pathDeviation: features.pathDeviation,
            baseOfSupport: features.baseOfSupport,
          };

          for (const key of metricKeys) {
            const feat = featureMap[key];
            if (!feat) continue;

            if (suppressed.has(key)) {
              suppressedTraceEntries.push({
                metricName: key,
                displayName: METRIC_DISPLAY_NAMES[key],
                reason: 'Video quality insufficient for reliable measurement.',
                availableFrames: correctedFrames.filter(f => f.landmarks.some(l => l.visibility >= 0.5)).length,
                requiredFrames: 10,
              });
            } else {
              const usableIndices = correctedFrames
                .map((_, i) => i)
                .filter(i => correctedFrames[i].landmarks.some(l => l.visibility >= 0.5));

              metricTraceInputs.push({
                metricName: key,
                displayName: METRIC_DISPLAY_NAMES[key],
                inputSignal: METRIC_INPUT_SIGNALS[key] || '',
                computationMethod: METRIC_COMPUTATION_METHODS[key] || '',
                usedFrameIndices: usableIndices,
                rawValues: [],
                finalValue: feat.value,
                confidence: feat.confidence * confMult,
                unit: feat.unit,
              });
            }
          }

          trace = buildAnalysisTrace({
            sessionId,
            frames: correctedFrames,
            footStrikes,
            gaitCycles,
            quality: assessment,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            videoDurationMs: video.duration * 1000,
            fps: 10,
            metricResults: metricTraceInputs,
            suppressedResults: suppressedTraceEntries,
            provenance: run,
          });
        } catch (traceErr) {
          console.warn('Trace building failed (non-fatal):', traceErr);
          // Result will still be returned without trace — tabs will show "evidence not available"
        }

        const result: AnalysisSessionResult = {
          id: resultId,
          session: { nickname, ageMonths },
          run,
          assessmentMode: assessment.assessmentMode,
          quality: {
            result: assessment.result,
            assessmentMode: assessment.assessmentMode,
            bodyVisibility: assessment.bodyVisibility,
            cameraAngle: assessment.cameraAngle,
            frameUsability: assessment.frameUsabilityPct,
            durationSeconds: assessment.durationSeconds,
            confidenceMultiplier: assessment.confidenceMultiplier,
            usableMetrics: assessment.usableMetrics,
            suppressedMetrics: assessment.suppressedMetrics,
            failureReasons: assessment.failureReasons,
            borderlineReasons: assessment.borderlineReasons,
            retakeInstructions: assessment.retakeInstructions,
            retakeSuggestions: assessment.retakeSuggestions,
            confidenceNotes: assessment.confidenceNotes,
          },
          features: {
            cadence: applySuppress(features.cadenceProxy, 'cadence'),
            stepSymmetry: applySuppress(features.stepTimingSymmetry, 'stepSymmetry'),
            frontalAsymmetry: applySuppress(features.frontalAsymmetry, 'frontalAsymmetry'),
            strideRegularity: applySuppress(features.strideRegularity, 'strideRegularity'),
            lateralTrunkSway: applySuppress(features.lateralTrunkSway, 'lateralTrunkSway'),
            pathDeviation: applySuppress(features.pathDeviation, 'pathDeviation'),
            baseOfSupport: applySuppress(features.baseOfSupport, 'baseOfSupport'),
          },
          concerns: {
            asymmetry: concerns.asymmetry,
            irregularRhythm: concerns.irregularRhythm,
            lateralInstability: concerns.lateralInstability,
            pathDeviation: concerns.pathDeviation,
            overallLevel: concerns.overallLevel,
            followupPriority: concerns.followupPriority,
            isLimited: concerns.isLimited,
            contextNotes: concerns.contextNotes,
            suppressedDomains: concerns.suppressedDomains,
            assessedDomains: concerns.assessedDomains,
            qualityWarning: concerns.qualityWarning,
            viewLabel: concerns.viewLabel,
            assessmentModeLabel: concerns.assessmentModeLabel,
            assessmentMode: concerns.assessmentMode,
          },
          viewType: features.viewType,
          isDemo: false,
          policyVersion: concerns.policyVersion,
          analyzedAt: new Date().toISOString(),
          trace,
          // NOTE: No videoUrl here — blob URLs don't survive page navigation.
          // The results page loads video from IndexedDB directly.
        };

        report(6, 1);

        // Cleanup video element (but keep blob in IndexedDB for results page)
        URL.revokeObjectURL(videoURL);
        video.remove();

        return result;
      } catch (err) {
        // Cleanup on inner failure
        URL.revokeObjectURL(videoURL);
        video.remove();
        throw err;
      }
    } finally {
      provider.dispose();
      // NOTE: We intentionally do NOT delete the video here anymore.
      // It stays in IndexedDB for the annotated preview.
      // Auto-cleanup happens via retainVideoForReview() timeout (24h).
    }
  } catch (err) {
    console.error('Analysis pipeline failed:', err);
    return makeValidationFailureResult(
      nickname,
      ageMonths,
      'generating_results',
      `Analysis exception: ${errorMessage(err)}`,
      options,
      modelId,
      modelLabel,
    );
  }
}

// ── Helpers ──────────────────────────────────────────────────────

const ZERO_METRIC: MetricValue = { value: 0, confidence: 0, limitedReason: 'Assessment not possible', suppressed: true };

function makeCannotAssessResult(
  nickname: string,
  ageMonths: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assessment: any,
  run: RunProvenance,
): AnalysisSessionResult {
  return {
    id: 'r_' + Date.now().toString(36),
    session: { nickname, ageMonths },
    run,
    assessmentMode: 'cannot_assess',
    quality: {
      result: 'fail',
      assessmentMode: 'cannot_assess',
      bodyVisibility: assessment.bodyVisibility,
      cameraAngle: assessment.cameraAngle,
      frameUsability: assessment.frameUsabilityPct,
      durationSeconds: assessment.durationSeconds,
      confidenceMultiplier: 0,
      usableMetrics: [],
      suppressedMetrics: assessment.suppressedMetrics ?? [],
      failureReasons: assessment.failureReasons,
      borderlineReasons: assessment.borderlineReasons,
      retakeInstructions: assessment.retakeInstructions,
      retakeSuggestions: assessment.retakeSuggestions ?? [],
      confidenceNotes: assessment.confidenceNotes,
    },
    features: {
      cadence: { ...ZERO_METRIC, unit: 'steps/min' },
      stepSymmetry: ZERO_METRIC,
      frontalAsymmetry: ZERO_METRIC,
      strideRegularity: ZERO_METRIC,
      lateralTrunkSway: ZERO_METRIC,
      pathDeviation: ZERO_METRIC,
      baseOfSupport: ZERO_METRIC,
    },
    concerns: {
      asymmetry: 'none',
      irregularRhythm: 'none',
      lateralInstability: 'none',
      pathDeviation: 'none',
      overallLevel: 'none',
      followupPriority: 'routine',
      isLimited: true,
      contextNotes: assessment.failureReasons,
      suppressedDomains: ['asymmetry', 'irregularRhythm', 'lateralInstability', 'pathDeviation'],
      assessedDomains: [],
      qualityWarning: true,
      viewLabel: 'Assessment unavailable',
      assessmentModeLabel: 'Assessment unavailable',
      assessmentMode: 'cannot_assess',
    },
    viewType: 'unknown',
    isDemo: false,
    policyVersion: '0.4.0-graceful',
    analyzedAt: new Date().toISOString(),
  };
}

function makeValidationFailureResult(
  nickname: string,
  ageMonths: number,
  stage: PipelineStage,
  reason: string,
  options: RunAnalysisOptions,
  modelId: PoseModelId = 'unknown',
  modelLabel: string = 'Unknown model',
): AnalysisSessionResult {
  const run = buildRunProvenance({
    classification: 'validation_failure',
    validationMode: options.validationMode ?? false,
    sourceType: options.sourceType ?? 'upload',
    sourceClipId: options.sourceClipId ?? null,
    sourceClipFilename: options.sourceClipFilename ?? null,
    approvedForDemo: options.approvedForDemo ?? null,
    modelId,
    modelLabel,
    failureStage: stage,
    failureReason: reason,
  });

  return {
    id: 'r_' + Date.now().toString(36),
    session: { nickname, ageMonths },
    run,
    assessmentMode: 'cannot_assess',
    quality: {
      result: 'fail',
      assessmentMode: 'cannot_assess',
      bodyVisibility: 0,
      cameraAngle: 'unknown',
      frameUsability: 0,
      durationSeconds: 0,
      confidenceMultiplier: 0,
      usableMetrics: [],
      suppressedMetrics: Object.keys(METRIC_DISPLAY_NAMES),
      failureReasons: [reason],
      borderlineReasons: [],
      retakeInstructions: 'This run failed before gait analysis could complete. Fix the blocking issue and try again.',
      retakeSuggestions: ['Retry with the approved hero clip after the blocking issue is resolved.'],
      confidenceNotes: 'Validation mode failed loudly. No fallback result was substituted.',
    },
    features: {
      cadence: { ...ZERO_METRIC, unit: 'steps/min' },
      stepSymmetry: ZERO_METRIC,
      frontalAsymmetry: ZERO_METRIC,
      strideRegularity: ZERO_METRIC,
      lateralTrunkSway: ZERO_METRIC,
      pathDeviation: ZERO_METRIC,
      baseOfSupport: ZERO_METRIC,
    },
    concerns: {
      asymmetry: 'none',
      irregularRhythm: 'none',
      lateralInstability: 'none',
      pathDeviation: 'none',
      overallLevel: 'none',
      followupPriority: 'routine',
      isLimited: true,
      contextNotes: [reason],
      suppressedDomains: ['asymmetry', 'irregularRhythm', 'lateralInstability', 'pathDeviation'],
      assessedDomains: [],
      qualityWarning: true,
      viewLabel: 'Validation failure',
      assessmentModeLabel: 'Validation failure',
      assessmentMode: 'cannot_assess',
    },
    viewType: 'unknown',
    isDemo: false,
    policyVersion: '0.4.0-graceful',
    analyzedAt: run.analyzedAt,
  };
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unknown error';
}
