import type { AnalysisSessionResult } from "@/lib/session/analysisSession";
import { buildRunProvenance } from "@/lib/session/runProvenance";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return asString(value);
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function asAssessmentMode(
  value: unknown,
  fallback: AnalysisSessionResult["assessmentMode"]
): AnalysisSessionResult["assessmentMode"] {
  if (
    value === "full_assessment" ||
    value === "best_effort" ||
    value === "cannot_assess"
  ) {
    return value;
  }
  return fallback;
}

function normalizeMetric(
  value: unknown,
  fallbackUnit?: string
): AnalysisSessionResult["features"]["cadence"] {
  const record = asRecord(value);
  const unit = asString(record?.unit) ?? fallbackUnit;

  return {
    value: asNumber(record?.value, 0),
    confidence: asNumber(record?.confidence, 0),
    ...(unit ? { unit } : {}),
    ...(asString(record?.limitedReason)
      ? { limitedReason: asString(record?.limitedReason)! }
      : {}),
    ...(typeof record?.suppressed === "boolean"
      ? { suppressed: record.suppressed }
      : {}),
  };
}

function hasSafeTrace(value: unknown): value is AnalysisSessionResult["trace"] {
  const record = asRecord(value);
  if (!record) {
    return false;
  }

  return (
    Array.isArray(record.frames) &&
    Array.isArray(record.stepEvents) &&
    Array.isArray(record.gaitCycles)
  );
}

function fallbackResult(): AnalysisSessionResult {
  const now = new Date().toISOString();
  return {
    id: "unknown_result",
    session: {
      nickname: "Child",
      ageMonths: 0,
    },
    run: buildRunProvenance({
      classification: "real_analysis",
      sourceType: "unknown",
      sourceClipFilename: null,
      modelId: "unknown",
      modelLabel: "Unknown model",
      analyzedAt: now,
    }),
    assessmentMode: "cannot_assess",
    quality: {
      result: "unknown",
      assessmentMode: "cannot_assess",
      bodyVisibility: 0,
      cameraAngle: "unknown",
      frameUsability: 0,
      durationSeconds: 0,
      confidenceMultiplier: 0,
      usableMetrics: [],
      suppressedMetrics: [],
      failureReasons: [],
      borderlineReasons: [],
      retakeInstructions: null,
      retakeSuggestions: [],
      confidenceNotes: "Confidence notes are unavailable for this run.",
    },
    features: {
      cadence: { value: 0, confidence: 0, unit: "steps/min" },
      stepSymmetry: { value: 0, confidence: 0 },
      frontalAsymmetry: { value: 0, confidence: 0 },
      strideRegularity: { value: 0, confidence: 0 },
      lateralTrunkSway: { value: 0, confidence: 0 },
      pathDeviation: { value: 0, confidence: 0 },
      baseOfSupport: { value: 0, confidence: 0, unit: "normalized" },
    },
    concerns: {
      asymmetry: "none",
      irregularRhythm: "none",
      lateralInstability: "none",
      pathDeviation: "none",
      overallLevel: "none",
      followupPriority: "routine",
      isLimited: true,
      contextNotes: [],
      suppressedDomains: [],
      assessedDomains: [],
      qualityWarning: true,
      viewLabel: "Front-view walking assessment",
      assessmentModeLabel: "Cannot assess",
      assessmentMode: "cannot_assess",
    },
    viewType: "frontal",
    isDemo: false,
    policyVersion: "unknown",
    analyzedAt: now,
  };
}

export function normalizeResult(raw: string): AnalysisSessionResult {
  let parsedUnknown: unknown;

  try {
    parsedUnknown = JSON.parse(raw);
  } catch {
    return fallbackResult();
  }

  const parsed = asRecord(parsedUnknown);
  if (!parsed) {
    return fallbackResult();
  }

  const session = asRecord(parsed.session);
  const quality = asRecord(parsed.quality);
  const concerns = asRecord(parsed.concerns);
  const features = asRecord(parsed.features);

  const resolvedAssessmentMode = asAssessmentMode(
    parsed.assessmentMode,
    asAssessmentMode(quality?.assessmentMode, "cannot_assess")
  );

  const normalized: AnalysisSessionResult = {
    ...(parsed as Partial<AnalysisSessionResult>),
    id: asString(parsed.id) ?? "unknown_result",
    session: {
      nickname: asString(session?.nickname) ?? "Child",
      ageMonths: asNumber(session?.ageMonths, 0),
      ...(session?.intakeContext
        ? { intakeContext: session.intakeContext as AnalysisSessionResult["session"]["intakeContext"] }
        : {}),
    },
    run: buildRunProvenance({
      classification:
        (asString(asRecord(parsed.run)?.classification) as
          | "real_analysis"
          | "demo_fixture"
          | "validation_failure") ??
        (parsed.isDemo === true ? "demo_fixture" : "real_analysis"),
      validationMode: Boolean(asRecord(parsed.run)?.validationMode),
      sourceType:
        (asString(asRecord(parsed.run)?.sourceType) as
          | "upload"
          | "manifest_hero"
          | "demo_fixture"
          | "unknown") ??
        (parsed.isDemo === true ? "demo_fixture" : "unknown"),
      sourceClipId: asNullableString(asRecord(parsed.run)?.sourceClipId),
      sourceClipFilename:
        asNullableString(asRecord(parsed.run)?.sourceClipFilename) ??
        asNullableString(asRecord(asRecord(parsed.trace)?.run)?.sourceClipFilename),
      approvedForDemo:
        typeof asRecord(parsed.run)?.approvedForDemo === "boolean"
          ? (asRecord(parsed.run)?.approvedForDemo as boolean)
          : null,
      modelId:
        (asString(asRecord(parsed.run)?.modelId) as
          | "mediapipe_full"
          | "mediapipe_heavy"
          | "movenet_thunder"
          | "rtmpose_m"
          | "unknown") ??
        (asString(asRecord(asRecord(parsed.trace)?.run)?.modelId) as
          | "mediapipe_full"
          | "mediapipe_heavy"
          | "movenet_thunder"
          | "rtmpose_m"
          | "unknown") ??
        "unknown",
      modelLabel:
        asString(asRecord(parsed.run)?.modelLabel) ??
        asString(asRecord(asRecord(parsed.trace)?.run)?.modelLabel) ??
        "Unknown model",
      bakeoffReportPath: asNullableString(asRecord(parsed.run)?.bakeoffReportPath),
      exportArtifactPath: asNullableString(asRecord(parsed.run)?.exportArtifactPath),
      failureStage: asNullableString(asRecord(parsed.run)?.failureStage),
      failureReason: asNullableString(asRecord(parsed.run)?.failureReason),
      analyzedAt: asString(asRecord(parsed.run)?.analyzedAt) ?? asString(parsed.analyzedAt) ?? new Date().toISOString(),
    }),
    assessmentMode: resolvedAssessmentMode,
    quality: {
      result: asString(quality?.result) ?? "unknown",
      assessmentMode: asAssessmentMode(quality?.assessmentMode, resolvedAssessmentMode),
      bodyVisibility: asNumber(quality?.bodyVisibility, 0),
      cameraAngle: asString(quality?.cameraAngle) ?? "unknown",
      frameUsability: asNumber(quality?.frameUsability, 0),
      durationSeconds: asNumber(quality?.durationSeconds, 0),
      confidenceMultiplier: asNumber(quality?.confidenceMultiplier, 0),
      usableMetrics: asStringArray(quality?.usableMetrics),
      suppressedMetrics: asStringArray(quality?.suppressedMetrics),
      failureReasons: asStringArray(quality?.failureReasons),
      borderlineReasons: asStringArray(quality?.borderlineReasons),
      retakeInstructions: asNullableString(quality?.retakeInstructions),
      retakeSuggestions: asStringArray(quality?.retakeSuggestions),
      confidenceNotes:
        asString(quality?.confidenceNotes) ??
        "Confidence notes are unavailable for this run.",
    },
    features: {
      cadence: normalizeMetric(features?.cadence, "steps/min"),
      stepSymmetry: normalizeMetric(features?.stepSymmetry),
      frontalAsymmetry: normalizeMetric(features?.frontalAsymmetry),
      strideRegularity: normalizeMetric(features?.strideRegularity),
      lateralTrunkSway: normalizeMetric(features?.lateralTrunkSway),
      pathDeviation: normalizeMetric(features?.pathDeviation),
      baseOfSupport: normalizeMetric(features?.baseOfSupport, "normalized"),
    },
    concerns: {
      asymmetry: asString(concerns?.asymmetry) ?? "none",
      irregularRhythm: asString(concerns?.irregularRhythm) ?? "none",
      lateralInstability: asString(concerns?.lateralInstability) ?? "none",
      pathDeviation: asString(concerns?.pathDeviation) ?? "none",
      overallLevel: asString(concerns?.overallLevel) ?? "none",
      followupPriority: asString(concerns?.followupPriority) ?? "routine",
      isLimited: Boolean(concerns?.isLimited),
      contextNotes: asStringArray(concerns?.contextNotes),
      suppressedDomains: asStringArray(concerns?.suppressedDomains),
      assessedDomains: asStringArray(concerns?.assessedDomains),
      qualityWarning: Boolean(concerns?.qualityWarning),
      viewLabel: asString(concerns?.viewLabel) ?? "Front-view walking assessment",
      assessmentModeLabel: asString(concerns?.assessmentModeLabel) ?? "Assessment",
      assessmentMode: asAssessmentMode(concerns?.assessmentMode, resolvedAssessmentMode),
    },
    viewType: asString(parsed.viewType) ?? "frontal",
    isDemo: parsed.isDemo === true,
    ...(asString(parsed.demoScenario) ? { demoScenario: asString(parsed.demoScenario)! } : {}),
    policyVersion: asString(parsed.policyVersion) ?? "unknown",
    analyzedAt: asString(parsed.analyzedAt) ?? new Date().toISOString(),
    ...(hasSafeTrace(parsed.trace) ? { trace: parsed.trace } : {}),
    ...(asRecord(parsed.reports)
      ? { reports: parsed.reports as AnalysisSessionResult["reports"] }
      : {}),
    ...(asString(parsed.videoUrl) ? { videoUrl: asString(parsed.videoUrl)! } : {}),
    ...(asRecord(parsed.clinicianFeedback)
      ? { clinicianFeedback: parsed.clinicianFeedback as AnalysisSessionResult["clinicianFeedback"] }
      : {}),
    ...(asRecord(parsed.backendInference)
      ? { backendInference: parsed.backendInference as AnalysisSessionResult["backendInference"] }
      : {}),
    ...(asRecord(parsed.inferenceDecision)
      ? { inferenceDecision: parsed.inferenceDecision as AnalysisSessionResult["inferenceDecision"] }
      : {}),
    ...(asRecord(parsed.trackingTelemetry)
      ? { trackingTelemetry: parsed.trackingTelemetry as AnalysisSessionResult["trackingTelemetry"] }
      : {}),
  };

  return normalized;
}
