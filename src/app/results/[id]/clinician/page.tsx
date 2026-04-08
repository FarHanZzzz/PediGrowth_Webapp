"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Download,
  FileText,
  Printer,
  RefreshCw,
  Stethoscope,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import RunProvenanceBadge from "@/components/results/RunProvenanceBadge";
import ResultGuardState from "@/components/results/ResultGuardState";
import AnnotatedVideoPlayer from "@/components/results/AnnotatedVideoPlayer";
import EventTimeline from "@/components/results/EventTimeline";
import KeyFrameGallery from "../../../../components/results/KeyFrameGallery";
import AnalysisTracePanel from "@/components/results/AnalysisTracePanel";
import HowAnalysisWorksPanel from "@/components/results/HowAnalysisWorksPanel";
import {
  formatDomainLabel,
  useResultViewModel,
} from "@/lib/results/resultViewModel";

const CONCERN_LABELS: Record<string, string> = {
  none: "None observed",
  mild: "Mild observation",
  moderate: "Moderate observation",
  significant: "Significant observation",
};

const CONCERN_BADGE_STYLES: Record<string, string> = {
  none: "bg-green-50 text-green-700 border-green-200",
  mild: "bg-amber-50 text-amber-700 border-amber-200",
  moderate: "bg-orange-50 text-orange-700 border-orange-200",
  significant: "bg-red-50 text-red-700 border-red-200",
};

const CONCERN_DOMAINS = [
  { key: "asymmetry", label: "Asymmetry" },
  { key: "irregularRhythm", label: "Rhythm regularity" },
  { key: "lateralInstability", label: "Lateral stability" },
  { key: "pathDeviation", label: "Path deviation" },
] as const;

export default function ClinicianResultPage() {
  const params = useParams();
  const router = useRouter();
  const resultId = params.id as string;
  const noteStorageKey = `gaitbridge_clinician_note_${resultId}`;

  const [jumpToFrameIndex, setJumpToFrameIndex] = useState<number | null>(null);
  const [clinicianNote, setClinicianNote] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    try {
      return window.localStorage.getItem(noteStorageKey) ?? "";
    } catch {
      return "";
    }
  });
  const [shareLinkStatus, setShareLinkStatus] = useState<string | null>(null);

  const {
    result,
    videoUrl,
    exportAvailable,
    keyFrames,
    concernEvidence,
    hasTrace,
    hasVideo,
    direction,
    isBestEffort,
    isValidationFailure,
    isCannotAssessRealRun,
  } = useResultViewModel(resultId);

  const evidenceByDomain = useMemo(
    () => new Map(concernEvidence.map((entry) => [entry.domain, entry])),
    [concernEvidence]
  );

  useEffect(() => {
    try {
      if (clinicianNote.trim().length === 0) {
        window.localStorage.removeItem(noteStorageKey);
        return;
      }

      window.localStorage.setItem(noteStorageKey, clinicianNote);
    } catch {
      // Ignore local storage access errors in restricted browsing contexts.
    }
  }, [clinicianNote, noteStorageKey]);

  useEffect(() => {
    if (!shareLinkStatus) {
      return;
    }

    const timer = window.setTimeout(() => setShareLinkStatus(null), 4000);
    return () => window.clearTimeout(timer);
  }, [shareLinkStatus]);

  if (!result) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">Result not found. It may have expired.</p>
          <Button onClick={() => router.push("/start")} variant="outline">
            Start Over
          </Button>
        </div>
      </div>
    );
  }

  if (isValidationFailure || isCannotAssessRealRun) {
    return <ResultGuardState result={result} />;
  }

  const overallConcernLabel =
    CONCERN_LABELS[result.concerns.overallLevel] ?? formatDomainLabel(result.concerns.overallLevel);
  const assessedDomains = result.concerns.assessedDomains.map(formatDomainLabel);
  const suppressedDomains = result.concerns.suppressedDomains.map(formatDomainLabel);
  const assessedDomainsSummary = assessedDomains.length > 0 ? assessedDomains.join(", ") : "None";
  const notAssessedDomainsSummary = suppressedDomains.length > 0 ? suppressedDomains.join(", ") : "None";
  const notCapturedInWorkflow = "Not captured in current workflow";
  const reportIntakeContext = (result.reports?.clinician?.intakeContext ?? {}) as Record<string, unknown>;
  const sessionIntakeContext = (result.session.intakeContext ?? {}) as Record<string, unknown>;

  const normalizeContextValue = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const contextValue = (primary: unknown, secondary: unknown): string => {
    return normalizeContextValue(primary) ?? normalizeContextValue(secondary) ?? notCapturedInWorkflow;
  };

  const caregiverMainConcern = contextValue(
    reportIntakeContext.caregiverMainConcern,
    sessionIntakeContext.caregiverMainConcern,
  );
  const symptomDuration = contextValue(
    reportIntakeContext.symptomDuration,
    sessionIntakeContext.symptomDuration,
  );
  const fallsFrequency = contextValue(
    reportIntakeContext.fallsFrequency,
    sessionIntakeContext.fallsFrequency,
  );
  const recentTherapyChanges = contextValue(
    reportIntakeContext.recentTherapyChanges,
    sessionIntakeContext.recentTherapyChanges,
  );
  const recentSurgeryInterventionChanges = contextValue(
    reportIntakeContext.recentSurgeryInterventionChanges,
    sessionIntakeContext.recentSurgeryInterventionChanges,
  );
  const assistiveDeviceSupport = contextValue(
    reportIntakeContext.assistiveDeviceSupport,
    sessionIntakeContext.assistiveDeviceSupport,
  );
  const priorDiagnosisOrSpecialistReview = contextValue(
    reportIntakeContext.priorDiagnosisOrSpecialistReview,
    sessionIntakeContext.priorDiagnosisOrSpecialistReview,
  );
  const correctedAge = contextValue(
    reportIntakeContext.correctedAge,
    sessionIntakeContext.correctedAge,
  );

  const packetTimestamp = result.analyzedAt ?? result.run.analyzedAt;
  const clipUsabilityLabel =
    result.quality.result === "pass"
      ? "Usable for interpretation"
      : result.quality.result === "borderline"
        ? "Use with caution"
        : "Low usability - interpret carefully";
  const observedSummary =
    result.concerns.overallLevel === "none"
      ? "No clear concern pattern was detected in this recording."
      : `${formatDomainLabel(result.concerns.overallLevel)} concern pattern observed in this recording.`;
  const followUpRecommendation = formatDomainLabel(result.concerns.followupPriority);
  const evidenceHighlights = concernEvidence
    .filter((entry) => !result.concerns.suppressedDomains.includes(entry.domain))
    .slice(0, 4);
  const assessabilityRows = CONCERN_DOMAINS.map((domain) => {
    const evidence = evidenceByDomain.get(domain.key);
    const isSuppressed = result.concerns.suppressedDomains.includes(domain.key);
    const isAssessed = result.concerns.assessedDomains.includes(domain.key);
    const hasLimitedFrames = Boolean(evidence && evidence.frameCount > 0 && evidence.frameCount < 10);
    const hasLowerConfidence = Boolean(evidence && evidence.confidence > 0 && evidence.confidence < 0.75);

    if (isSuppressed || !isAssessed) {
      return {
        domainLabel: domain.label,
        statusLabel: "Not assessed",
        statusClass: "bg-slate-100 text-slate-700 border-slate-300",
        reason: "Insufficient signal in this recording for a dependable interpretation.",
      };
    }

    if (isBestEffort || hasLimitedFrames || hasLowerConfidence || Boolean(evidence?.missingInfo)) {
      let reason = "Assessment is available, with limited confidence in this recording.";

      if (isBestEffort) {
        reason = "Preliminary best-effort run; confidence is intentionally conservative.";
      } else if (hasLimitedFrames) {
        reason = "Based on a limited number of usable moments in this clip.";
      } else if (hasLowerConfidence) {
        reason = "Signal clarity was moderate, so interpretation is reported with caution.";
      }

      return {
        domainLabel: domain.label,
        statusLabel: "Assessed with caution",
        statusClass: "bg-amber-50 text-amber-700 border-amber-200",
        reason,
      };
    }

    return {
      domainLabel: domain.label,
      statusLabel: "Assessed",
      statusClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      reason: "Clear and consistent signal was available for this domain.",
    };
  });

  const handlePrintPacket = () => {
    window.print();
  };

  const handleCopyShareLink = async () => {
    const shareUrl = window.location.href;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setShareLinkStatus("Session link copied to clipboard.");
        return;
      }
    } catch {
      // Fall through to manual copy prompt.
    }

    window.prompt("Copy this local session link:", shareUrl);
    setShareLinkStatus("Clipboard access was unavailable, so the link was shown for manual copy.");
  };

  return (
    <div className="clinician-packet min-h-dvh bg-gradient-to-b from-background to-muted/30">
      {isBestEffort && (
        <div className="print-hidden border-b border-amber-200 bg-amber-50 px-4 py-2">
          <p className="text-xs text-amber-700">
            Preliminary packet: some domains are marked as not assessed due to limited confidence.
          </p>
        </div>
      )}

      <div className="clinician-packet__content mx-auto max-w-5xl space-y-4 px-4 py-6">
        <div className="space-y-2">
          <div className="print-hidden inline-flex items-center rounded-xl border border-border/60 bg-surface-container-low p-1">
            <button
              type="button"
              onClick={() => router.push(`/results/${resultId}`)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Parent View
            </button>
            <button
              type="button"
              className="rounded-lg bg-surface-container-lowest px-3 py-1.5 text-xs font-medium text-foreground shadow-sm"
              aria-current="page"
            >
              Clinician View
            </button>
          </div>

          <h1 className="text-2xl font-bold">Clinical Handoff Packet</h1>
          <p className="text-sm text-muted-foreground">
            Decision-first summary for clinical review. Advanced evidence is collapsed in section 7.
          </p>
        </div>

        <Card className="print-section">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">1. Clinical Decision Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Overall signal</p>
                <Badge variant="outline" className={`mt-2 text-[10px] ${CONCERN_BADGE_STYLES[result.concerns.overallLevel] ?? ""}`}>
                  {overallConcernLabel}
                </Badge>
              </div>

              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Follow-up priority</p>
                <p className="mt-1 text-sm font-medium">{followUpRecommendation}</p>
              </div>

              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Coverage</p>
                <p className="mt-1 text-sm font-medium">
                  {result.concerns.assessedDomains.length} assessed / {CONCERN_DOMAINS.length} domains
                </p>
                <p className="text-xs text-muted-foreground">
                  Not assessed in this recording: {result.concerns.suppressedDomains.length}
                </p>
              </div>

              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recording usability</p>
                <p className="mt-1 text-sm font-medium">{clipUsabilityLabel}</p>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Interpretation at a glance</p>
              <p className="mt-1 text-sm">{observedSummary}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="print-section">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">2. Context for This Recording</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Case details</p>
                <p className="mt-1 text-xs text-muted-foreground">Case: {result.session.nickname}</p>
                <p className="text-xs text-muted-foreground">Result ID: {resultId}</p>
                <p className="text-xs text-muted-foreground">
                  Packet time: {packetTimestamp ? new Date(packetTimestamp).toLocaleString() : "Unknown"}
                </p>
              </div>

              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recording details</p>
                <p className="mt-1 text-xs text-muted-foreground">Source: {result.run.sourceClipFilename ?? "Uploaded clip"}</p>
                <p className="text-xs text-muted-foreground">Direction: {direction}</p>
                <p className="text-xs text-muted-foreground">View: {result.concerns.viewLabel}</p>
                <p className="text-xs text-muted-foreground">Assessment mode: {formatDomainLabel(result.assessmentMode)}</p>
              </div>

              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Clinical context from intake
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Caregiver main concern: {caregiverMainConcern}
                </p>
                <p className="text-xs text-muted-foreground">
                  First noticed / duration: {symptomDuration}
                </p>
                <p className="text-xs text-muted-foreground">
                  Falls frequency: {fallsFrequency}
                </p>
                <p className="text-xs text-muted-foreground">
                  Recent therapy changes: {recentTherapyChanges}
                </p>
                <p className="text-xs text-muted-foreground">
                  Recent surgery/intervention changes: {recentSurgeryInterventionChanges}
                </p>
                <p className="text-xs text-muted-foreground">
                  Assistive device / walking support: {assistiveDeviceSupport}
                </p>
                <p className="text-xs text-muted-foreground">
                  Prior diagnosis / specialist review: {priorDiagnosisOrSpecialistReview}
                </p>
                <p className="text-xs text-muted-foreground">
                  Corrected age (if provided): {correctedAge}
                </p>
              </div>
            </div>

            <details className="print-hidden rounded-lg border bg-muted/20 p-3">
              <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Technical provenance (optional details)
              </summary>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <RunProvenanceBadge run={result.run} />
                <Badge variant="outline" className="text-[10px]">
                  {result.run.modelLabel}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  Overall signal: {overallConcernLabel}
                </Badge>
              </div>
            </details>
          </CardContent>
        </Card>

        <Card className="print-section">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Stethoscope className="h-4 w-4" />
              3. Domain Findings Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {CONCERN_DOMAINS.map((domain) => {
                const level = result.concerns[domain.key];
                const evidence = evidenceByDomain.get(domain.key);
                const isSuppressed = result.concerns.suppressedDomains.includes(domain.key);

                return (
                  <div key={domain.key} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">{domain.label}</p>
                      <Badge variant="outline" className={`text-[10px] ${CONCERN_BADGE_STYLES[level] ?? ""}`}>
                        {isSuppressed ? "Not assessed" : CONCERN_LABELS[level] ?? level}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {evidence?.explanation ?? "No detailed evidence narrative is available for this domain."}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="print-section">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">4. Assessability and Confidence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Assessability matrix</p>
              <div className="mt-2 overflow-x-auto rounded-md border bg-background">
                <table className="w-full min-w-[520px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-3 py-2 font-semibold text-foreground">Domain</th>
                      <th className="px-3 py-2 font-semibold text-foreground">Status</th>
                      <th className="px-3 py-2 font-semibold text-foreground">Interpretive note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessabilityRows.map((row) => (
                      <tr key={row.domainLabel} className="border-b last:border-b-0">
                        <td className="px-3 py-2 font-medium text-foreground">{row.domainLabel}</td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className={`text-[10px] ${row.statusClass}`}>
                            {row.statusLabel}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{row.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Confidence note</p>
                <p className="mt-2 text-xs text-muted-foreground">{result.quality.confidenceNotes}</p>
              </div>

              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Coverage summary</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Assessed domains: {assessedDomainsSummary}
                </p>
                <p className="text-xs text-muted-foreground">
                  Not assessed in this recording: {notAssessedDomainsSummary}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="print-section">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">5. Recommended Follow-up Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Primary recommendation</p>
              <p className="mt-2 text-sm font-medium text-foreground">{followUpRecommendation}</p>
              <p className="mt-1">
                Use as structured support for clinical judgment, not as a standalone diagnosis.
              </p>
            </div>

            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Action checklist</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>Review observed domains in clinical context: {assessedDomainsSummary}.</li>
                <li>Document uncertainty for domains not assessed in this recording: {notAssessedDomainsSummary}.</li>
                <li>If confidence is limited, request additional angle capture or repeat recording.</li>
              </ul>
            </div>

            <p>
              Operational sharing controls remain in section 8 to keep interpretation and logistics separate.
            </p>
          </CardContent>
        </Card>

        <Card className="print-section">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">6. Quality Limits and Caveats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">{result.quality.confidenceNotes}</p>

            {result.quality.failureReasons.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50/70 p-3">
                <p className="font-semibold text-red-800">Quality limits requiring caution</p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-red-900/80">
                  {result.quality.failureReasons.map((reason, index) => (
                    <li key={index}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.quality.borderlineReasons.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3">
                <p className="font-semibold text-amber-800">Factors lowering confidence</p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-amber-900/80">
                  {result.quality.borderlineReasons.map((reason, index) => (
                    <li key={index}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {suppressedDomains.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Not assessed in this recording: {notAssessedDomainsSummary}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="print-section print-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Video className="h-4 w-4" />
              7. Appendix / Advanced Evidence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <details className="rounded-lg border bg-muted/20 p-3">
              <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Open advanced evidence panels
              </summary>

              <div className="mt-3 space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border bg-background p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Why this result appears</p>
                    {evidenceHighlights.length > 0 ? (
                      <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                        {evidenceHighlights.map((entry) => (
                          <li key={entry.domain}>
                            <span className="font-medium text-foreground">{formatDomainLabel(entry.domain)}:</span> {entry.explanation}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">No domain-level evidence narrative was generated.</p>
                    )}
                  </div>

                  <div className="rounded-lg border bg-background p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Measured movement signals</p>
                    <div className="mt-2 space-y-2">
                      {Object.entries(result.features).map(([key, metric]) => (
                        <div
                          key={key}
                          className={`grid grid-cols-[1fr_auto] items-center gap-2 text-xs ${metric.suppressed ? "opacity-45" : ""}`}
                        >
                          <div>
                            <p className="font-medium">{formatDomainLabel(key)}</p>
                            {metric.limitedReason && (
                              <p className="text-[11px] text-muted-foreground">{metric.limitedReason}</p>
                            )}
                          </div>
                          <p className="font-mono tabular-nums">
                            {metric.suppressed ? "-" : `${metric.value}${metric.unit ? ` ${metric.unit}` : ""}`}
                            {!metric.suppressed && (
                              <span className="ml-1 text-muted-foreground">({Math.round(metric.confidence * 100)}%)</span>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {hasTrace && hasVideo && videoUrl ? (
                  <AnnotatedVideoPlayer
                    trace={result.trace!}
                    videoUrl={videoUrl}
                    jumpToFrameIndex={jumpToFrameIndex}
                    audience="clinician"
                    showAdvancedControls={false}
                  />
                ) : hasTrace ? (
                  <p className="text-xs text-muted-foreground">
                    Trace is present, but source video is unavailable in local storage.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Full video evidence requires an analysis trace.
                  </p>
                )}

                {hasTrace && (
                  <>
                    <EventTimeline
                      trace={result.trace!}
                      onJumpToFrame={(frameIndex: number) => setJumpToFrameIndex(frameIndex)}
                    />
                    {keyFrames && (
                      <KeyFrameGallery
                        keyFrames={keyFrames}
                        trace={result.trace!}
                        videoUrl={videoUrl}
                        renderMode="timestamps-only"
                        onFrameClick={(frameIndex: number) => setJumpToFrameIndex(frameIndex)}
                      />
                    )}
                  </>
                )}

                {hasTrace && <AnalysisTracePanel trace={result.trace!} concernEvidence={concernEvidence} />}
                <HowAnalysisWorksPanel result={result} />
              </div>
            </details>

            <div className="print-only rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
              <p className="font-semibold uppercase tracking-wide">Appendix note</p>
              <p className="mt-2">
                Advanced evidence panels are interactive in digital view and collapsed by default.
                Use digital view for frame-level review.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="print-section print-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">8. Handoff Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Use these controls to complete sharing and documentation.
            </p>

            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Primary packet actions
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <Button className="gap-2 text-xs" onClick={handlePrintPacket}>
                  <Printer className="h-3.5 w-3.5" />
                  Print packet
                </Button>
                <Button variant="outline" className="gap-2 text-xs" onClick={handleCopyShareLink}>
                  <Copy className="h-3.5 w-3.5" />
                  Copy session link (local)
                </Button>
                <Button variant="outline" className="gap-2 text-xs" disabled>
                  <FileText className="h-3.5 w-3.5" />
                  Direct PDF export unavailable
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Direct PDF export is unavailable in this local session. Use Print packet, then choose
                Save as PDF in your browser print dialog.
              </p>
              <p className="text-xs text-muted-foreground">
                Links and notes remain in this browser session until server-backed packet storage is added.
              </p>
              {shareLinkStatus && <p className="mt-1 text-xs text-primary">{shareLinkStatus}</p>}
            </div>

            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Optional media attachment
              </p>
              {exportAvailable && result.run.exportArtifactPath ? (
                <a href={result.run.exportArtifactPath} download className="mt-2 inline-flex w-full sm:w-auto">
                  <Button variant="outline" className="w-full gap-2 text-xs sm:w-auto">
                    <Download className="h-3.5 w-3.5" />
                    Download annotated MP4 (secondary)
                  </Button>
                </a>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Annotated MP4 export is unavailable for this run.
                </p>
              )}
            </div>

            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Secondary navigation
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <Button
                  variant="outline"
                  className="gap-2 text-xs"
                  onClick={() => router.push(`/results/${resultId}/refine`)}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Add follow-up context
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 text-xs"
                  onClick={() => router.push(`/results/${resultId}`)}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to parent summary
                </Button>
                <Button
                  className="gap-2 text-xs"
                  onClick={() => router.push("/capture")}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Analyze another clip
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="print-section">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">9. Clinician Note (local)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground print-hidden">
              This note is saved in this browser only and is included in the printed packet.
            </p>
            <Textarea
              className="print-hidden min-h-28"
              placeholder="Add appointment note, follow-up intent, or context for the care team..."
              value={clinicianNote}
              onChange={(event) => setClinicianNote(event.target.value)}
            />
            <div className="print-only rounded-lg border bg-muted/20 p-3 text-xs leading-relaxed">
              <p className="font-semibold uppercase tracking-wide">Clinician note</p>
              <p className="mt-2 whitespace-pre-wrap text-foreground">
                {clinicianNote.trim().length > 0 ? clinicianNote : "No clinician note entered."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
