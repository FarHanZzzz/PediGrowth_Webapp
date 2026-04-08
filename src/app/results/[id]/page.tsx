"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Check,
  Clipboard,
  Copy,
  Camera,
  Download,
  Link2,
  FileText,
  Info,
  MessageCircle,
  Microscope,
  PlayCircle,
  Printer,
  RefreshCw,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AnnotatedVideoPlayer from "@/components/results/AnnotatedVideoPlayer";
import { getResult } from "@/lib/session/videoStore";
import AnalysisTracePanel from "@/components/results/AnalysisTracePanel";
import KeyFrameGallery from "@/components/results/KeyFrameGallery";
import EventTimeline from "@/components/results/EventTimeline";
import HowAnalysisWorksPanel from "@/components/results/HowAnalysisWorksPanel";
import ClinicalReferencesPanel from "@/components/results/ClinicalReferencesPanel";
import RunProvenanceBadge from "@/components/results/RunProvenanceBadge";
import { exportReportAsPDF } from "@/lib/export/generatePDF";
import { buildKeyFrames } from "@/lib/trace/buildKeyFrames";
import { summarizeDetectionPath } from "@/lib/trace/summarizeDetectionPath";
import { buildRunProvenance } from "@/lib/session/runProvenance";
import type { AnalysisSessionResult } from "@/lib/session/analysisSession";
import { buildReportBundle } from "@/lib/reports";

type ResultTab = "summary" | "clinician" | "video" | "evidence";

const TABS: { key: ResultTab; label: string; icon: typeof BarChart3 }[] = [
  { key: "summary", label: "Summary", icon: BarChart3 },
  { key: "clinician", label: "Clinician Packet", icon: FileText },
  { key: "video", label: "Hero Video", icon: PlayCircle },
  { key: "evidence", label: "Evidence", icon: Microscope },
];

const CONCERN_BADGE_STYLES: Record<string, string> = {
  none: "bg-secondary-container text-secondary-foreground",
  mild: "bg-tertiary-fixed/45 text-foreground",
  moderate: "bg-orange-100 text-orange-900",
  significant: "bg-error-container text-on-error-container",
};

const CONCERN_LABELS: Record<string, string> = {
  none: "None observed",
  mild: "Mild observation",
  moderate: "Moderate observation",
  significant: "Significant observation",
};

const CONCERN_DOMAINS = [
  { key: "asymmetry", label: "Asymmetry", desc: "Left-right differences in walking pattern" },
  { key: "irregularRhythm", label: "Rhythm regularity", desc: "Consistency of step timing and cadence" },
  { key: "lateralInstability", label: "Lateral stability", desc: "Side-to-side steadiness during walking" },
  { key: "pathDeviation", label: "Path deviation", desc: "Walking in a straight line vs. veering" },
];

function normalizeResult(raw: string): AnalysisSessionResult {
  const parsed = JSON.parse(raw) as AnalysisSessionResult & {
    isDemo?: boolean;
    demoScenario?: string;
    run?: AnalysisSessionResult["run"];
  };

  if (!parsed.run) {
    parsed.run = buildRunProvenance({
      classification: parsed.isDemo ? "demo_fixture" : "real_analysis",
      sourceType: parsed.isDemo ? "demo_fixture" : "unknown",
      sourceClipFilename: parsed.trace?.run.sourceClipFilename ?? null,
      modelId: parsed.trace?.run.modelId ?? "unknown",
      modelLabel: parsed.trace?.run.modelLabel ?? "Unknown model",
    });
  }

  return parsed;
}

function formatDomainLabel(domain: string): string {
  return domain.charAt(0).toUpperCase() + domain.slice(1).replace(/([A-Z])/g, " $1");
}

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const resultId = params.id as string;

  const [result, setResult] = useState<AnalysisSessionResult | null>(null);
  const [activeTab, setActiveTab] = useState<ResultTab>("summary");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [jumpToFrameIndex, setJumpToFrameIndex] = useState<number | null>(null);
  const [exportAvailable, setExportAvailable] = useState(false);
  const [copiedHandoff, setCopiedHandoff] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareExpiresAt, setShareExpiresAt] = useState<string | null>(null);
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    // Try sessionStorage first (fast, same-session), then IndexedDB (persistent)
    const raw = sessionStorage.getItem(`pedigrowth_result_${resultId}`);
    if (raw) {
      setResult(normalizeResult(raw));
    } else {
      // Fallback to IndexedDB for persistence across page refreshes
      getResult(resultId).then((stored) => {
        if (stored) {
          setResult(normalizeResult(JSON.stringify(stored)));
          // Re-populate sessionStorage for fast subsequent access
          sessionStorage.setItem(`pedigrowth_result_${resultId}`, JSON.stringify(stored));
        }
      }).catch(() => {});
    }
  }, [resultId]);

  useEffect(() => {
    if (!result || result.run.classification !== "real_analysis") return;

    const sessionId =
      result.trace?.sessionId ??
      (() => {
        try {
          const sessionData = sessionStorage.getItem("pedigrowth_session");
          if (!sessionData) return null;
          return JSON.parse(sessionData).sessionId ?? null;
        } catch {
          return null;
        }
      })();

    if (!sessionId) return;

    let objectUrl: string | null = null;
    import("@/lib/session/videoStore")
      .then(({ getVideo }) => getVideo(sessionId))
      .then((videoData) => {
        if (!videoData?.blob) return;
        objectUrl = URL.createObjectURL(videoData.blob);
        setVideoUrl(objectUrl);
      })
      .catch(() => {
        setVideoUrl(null);
      });

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [result]);

  useEffect(() => {
    if (!result?.run.exportArtifactPath) {
      setExportAvailable(false);
      return;
    }

    let active = true;
    fetch(result.run.exportArtifactPath, { method: "HEAD" })
      .then((response) => {
        if (active) setExportAvailable(response.ok);
      })
      .catch(() => {
        if (active) setExportAvailable(false);
      });

    return () => {
      active = false;
    };
  }, [result?.run.exportArtifactPath]);

  const keyFrames = useMemo(
    () => (result?.trace ? buildKeyFrames(result.trace) : null),
    [result?.trace]
  );

  const concernEvidence = useMemo(
    () =>
      result?.trace
        ? summarizeDetectionPath(result.trace, {
            asymmetry: result.concerns.asymmetry,
            irregularRhythm: result.concerns.irregularRhythm,
            lateralInstability: result.concerns.lateralInstability,
            pathDeviation: result.concerns.pathDeviation,
          })
        : [],
    [result?.trace, result?.concerns]
  );

  const reportBundle = useMemo(() => {
    if (!result) return null;

    if (result.reports?.caregiver && result.reports?.clinician && result.reports?.handoffText) {
      return result.reports;
    }

    const bundle = buildReportBundle({
      assessmentId: result.id,
      nickname: result.session.nickname,
      ageMonths: result.session.ageMonths,
      analyzedAt: result.analyzedAt,
      concerns: {
        asymmetry: result.concerns.asymmetry,
        irregularRhythm: result.concerns.irregularRhythm,
        lateralInstability: result.concerns.lateralInstability,
        pathDeviation: result.concerns.pathDeviation,
        overallLevel: result.concerns.overallLevel,
        followupPriority: result.concerns.followupPriority,
        contextNotes: result.concerns.contextNotes,
        suppressedDomains: result.concerns.suppressedDomains,
        assessedDomains: result.concerns.assessedDomains,
        qualityWarning: result.concerns.qualityWarning,
        viewLabel: result.concerns.viewLabel,
        assessmentModeLabel: result.concerns.assessmentModeLabel,
        assessmentMode: result.concerns.assessmentMode,
      },
      quality: {
        result: result.quality.result,
        cameraAngle: result.quality.cameraAngle,
        confidenceMultiplier: result.quality.confidenceMultiplier,
        confidenceNotes: result.quality.confidenceNotes,
        failureReasons: result.quality.failureReasons,
        borderlineReasons: result.quality.borderlineReasons,
        suppressedMetrics: result.quality.suppressedMetrics,
      },
      features: result.features,
      trace: result.trace,
    });

    return {
      caregiver: bundle.caregiverReport,
      clinician: bundle.clinicianPacket,
      handoffText: bundle.handoffText,
    };
  }, [result]);

  function downloadClinicianPacket() {
    if (!reportBundle) return;

    const blob = new Blob([JSON.stringify(reportBundle.clinician, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gaitbridge-clinician-packet-${resultId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copyHandoffText() {
    if (!reportBundle) return;
    try {
      await navigator.clipboard.writeText(reportBundle.handoffText);
      setCopiedHandoff(true);
      window.setTimeout(() => setCopiedHandoff(false), 1800);
    } catch {
      setCopiedHandoff(false);
    }
  }

  async function createShareLink() {
    if (!reportBundle) return;
    setIsCreatingShare(true);
    setShareError(null);

    try {
      const response = await fetch("/api/share/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId: resultId,
          payload: {
            caregiver: reportBundle.caregiver,
            clinician: reportBundle.clinician,
            handoffText: reportBundle.handoffText,
          },
          policy: {
            expiresHours: 72,
            maxAccesses: 25,
          },
        }),
      });

      const body = (await response.json()) as {
        shareUrl?: string;
        expiresAt?: string;
        error?: string;
      };

      if (!response.ok || !body.shareUrl) {
        throw new Error(body.error ?? "Failed to create share link.");
      }

      setShareUrl(body.shareUrl);
      setShareExpiresAt(body.expiresAt ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create share link.";
      setShareError(message);
    } finally {
      setIsCreatingShare(false);
    }
  }

  async function copyShareUrl() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Clipboard permissions vary across browsers; keep the URL visible for manual copy.
    }
  }

  if (!result) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">
            Result not found. It may have expired.
          </p>
          <Button onClick={() => router.push("/start")} variant="outline">
            Start Over
          </Button>
        </div>
      </div>
    );
  }

  const run = result.run;
  const isBestEffort = result.assessmentMode === "best_effort";
  const isValidationFailure = run.classification === "validation_failure";
  const isCannotAssessRealRun =
    run.classification === "real_analysis" && result.assessmentMode === "cannot_assess";
  const hasTrace = Boolean(result.trace);
  const hasVideo = Boolean(videoUrl);
  const nickname = result.session.nickname;
  const direction = result.trace?.pipeline.direction ?? "unknown";

  if (isValidationFailure) {
    return (
      <div className="px-4 py-8">
        <div className="mx-auto max-w-lg space-y-5">
          <div className="flex justify-center">
            <RunProvenanceBadge run={run} />
          </div>

          <Card className="bg-error-container/65">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-red-900">
                Validation failed before real analysis could complete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-red-900/85">
              <p>{run.failureReason ?? "The pipeline stopped before producing a trustworthy result."}</p>
              <div className="rounded-xl bg-surface-container-lowest/80 p-3 text-xs">
                <p><strong>Stage:</strong> {run.failureStage ?? "unknown"}</p>
                <p><strong>Source:</strong> {run.sourceClipFilename ?? "unknown clip"}</p>
                <p><strong>Model:</strong> {run.modelLabel}</p>
                <p><strong>Validation mode:</strong> {run.validationMode ? "on" : "off"}</p>
              </div>
              <p className="text-xs text-red-800/80">
                No fallback result was substituted. This failure is intentional so the demo never pretends a broken run was real.
              </p>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={() => router.push("/capture")} className="flex-1 gap-2">
              <Camera className="h-4 w-4" />
              Try Another Clip
            </Button>
            <Button onClick={() => router.push("/start")} variant="secondary" className="flex-1">
              Start Over
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isCannotAssessRealRun) {
    return (
      <div className="px-4 py-8">
        <div className="mx-auto max-w-lg space-y-6">
          <div className="flex justify-center">
            <RunProvenanceBadge run={run} />
          </div>

          <div className="rounded-[1.2rem] bg-error-container p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">
                  We ran a real analysis, but this clip could not be assessed safely
                </p>
                <p className="mt-1 text-xs text-red-700">
                  {result.quality.confidenceNotes}
                </p>
                {result.quality.failureReasons.map((reason, index) => (
                  <p key={index} className="mt-1 text-xs text-red-600">
                    • {reason}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {result.quality.retakeInstructions && (
            <Card className="bg-surface-container-low">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">How to get a better recording</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground whitespace-pre-line">
                {result.quality.retakeInstructions}
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <Button onClick={() => router.push("/capture")} className="flex-1 gap-2">
              <Camera className="h-4 w-4" />
              Record Again
            </Button>
            <Button onClick={() => router.push("/start")} variant="secondary" className="flex-1">
              Start Over
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      {isBestEffort && (
        <div className="bg-secondary-container/70 px-4 py-2">
          <p className="text-xs text-blue-700 flex items-center gap-2">
            <Info className="h-3.5 w-3.5" />
            <span>
              <strong>Preliminary real analysis.</strong> The clip was usable, but some metrics were suppressed because confidence was limited.
            </span>
          </p>
        </div>
      )}

      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6">
        <div className="text-center space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <RunProvenanceBadge run={run} />
            <Badge variant="secondary" className="text-[10px]">
              {result.concerns.viewLabel}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {run.modelLabel}
            </Badge>
          </div>

          <h1 data-display="true" className="text-3xl font-semibold">Results for {nickname}</h1>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            GAITBRIDGE helps caregivers capture a usable walking video, explains what was observed in simple language, and creates a clinician-ready handoff packet for follow-up review.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground">
            <span>Source: {run.sourceClipFilename ?? "Uploaded clip"}</span>
            <span>·</span>
            <span>Direction: {direction}</span>
            <span>·</span>
            <span>Quality: {Math.round(result.quality.confidenceMultiplier * 100)}% confidence multiplier</span>
          </div>
        </div>

        <Card className="bg-surface-container-low">
          <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Summary</p>
              <p className="mt-1 text-sm font-medium">
                {reportBundle?.caregiver.observationsText ??
                  (result.concerns.overallLevel === "none"
                    ? "No notable gait concern signals were detected in this clip."
                    : "This clip shows movement patterns worth reviewing more closely.")}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Confidence</p>
              <p className="mt-1 text-sm">{reportBundle?.caregiver.confidenceText ?? result.quality.confidenceNotes}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">What was assessed</p>
              <p className="mt-1 text-sm">
                {result.concerns.assessedDomains.length > 0
                  ? result.concerns.assessedDomains.map(formatDomainLabel).join(", ")
                  : "No domains were confidently assessed."}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex rounded-[1rem] bg-surface-container-low p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === tab.key
                    ? "bg-surface-container-lowest shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "summary" && (
          <div className="space-y-4">
            <Card className="bg-surface-container-lowest">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Movement Observations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {CONCERN_DOMAINS.map((domain) => {
                  const level = result.concerns[domain.key as keyof typeof result.concerns] as string;
                  const isSuppressed = result.concerns.suppressedDomains.includes(domain.key);

                  if (isSuppressed) {
                    return (
                      <div key={domain.key} className="flex items-center justify-between rounded-2xl bg-surface-container-low p-3 opacity-50">
                        <div>
                          <p className="text-sm font-medium">{domain.label}</p>
                          <p className="text-xs text-muted-foreground">{domain.desc}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] border-muted">
                          Not assessed
                        </Badge>
                      </div>
                    );
                  }

                  return (
                    <div key={domain.key} className="flex items-center justify-between rounded-2xl bg-surface-container-low p-3">
                      <div>
                        <p className="text-sm font-medium">{domain.label}</p>
                        <p className="text-xs text-muted-foreground">{domain.desc}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${CONCERN_BADGE_STYLES[level] ?? ""}`}
                      >
                        {CONCERN_LABELS[level] ?? level}
                      </Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="bg-surface-container-lowest">
              <CardHeader
                className="pb-0 cursor-pointer"
                onClick={() => setDetailsOpen((value) => !value)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Detailed Metrics</CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {detailsOpen ? "Hide" : "Show"}
                  </span>
                </div>
              </CardHeader>
              {detailsOpen && (
                <CardContent className="pt-3 space-y-2">
                  {Object.entries(result.features).map(([key, metric]) => (
                    <div
                      key={key}
                      className={`flex items-center justify-between rounded-xl bg-surface-container-low px-3 py-2 text-xs ${
                        metric.suppressed ? "opacity-40" : ""
                      }`}
                    >
                      <span className="font-medium capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                      <span className="tabular-nums font-mono">
                        {metric.suppressed
                          ? "—"
                          : `${metric.value}${metric.unit ? ` ${metric.unit}` : ""}`}
                        {!metric.suppressed && (
                          <span className="text-muted-foreground ml-1.5">
                            ({Math.round(metric.confidence * 100)}%)
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>

            <HowAnalysisWorksPanel result={result} />

            {reportBundle && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Caregiver Guidance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p><strong>Limitations:</strong> {reportBundle.caregiver.limitationsText}</p>
                  <p><strong>Monitoring:</strong> {reportBundle.caregiver.monitoringGuidance}</p>
                  <p><strong>Professional follow-up:</strong> {reportBundle.caregiver.professionalEvalGuidance}</p>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                className="flex-1 gap-2 text-xs"
                onClick={() => router.push(`/results/${resultId}/refine`)}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Add follow-up details
              </Button>
              {hasTrace && (
                <Button
                  variant="secondary"
                  className="flex-1 gap-2 text-xs"
                  onClick={() => setActiveTab("video")}
                >
                  <Video className="h-3.5 w-3.5" />
                  View annotated video
                </Button>
              )}
              <Button
                variant="secondary"
                className="flex-1 gap-2 text-xs"
                onClick={() => {
                  const sessionRaw = sessionStorage.getItem("pedigrowth_session");
                  const session = sessionRaw ? JSON.parse(sessionRaw) : {};
                  // Build flat metrics map from feature values
                  const metricsMap: Record<string, number | string> = {};
                  if (result.features) {
                    for (const [key, val] of Object.entries(result.features)) {
                      if (val && typeof val === 'object' && 'value' in val) {
                        metricsMap[key] = (val as { value: number }).value;
                      }
                    }
                  }
                  exportReportAsPDF({
                    childNickname: session.nickname || "Unknown",
                    ageMonths: session.ageMonths || 0,
                    assessmentDate: new Date().toLocaleDateString(),
                    assessmentId: resultId,
                    concerns: result.concerns as unknown as Record<string, string>,
                    metrics: metricsMap,
                    qualityTier: result.quality?.result || "unknown",
                    assessmentMode: result.quality?.assessmentMode || "unknown",
                    confidenceNotes: result.quality?.confidenceNotes
                      ? [result.quality.confidenceNotes].flat()
                      : [],
                  });
                }}
                id="btn-export-pdf"
              >
                <Download className="h-3.5 w-3.5" />
                Export Report
              </Button>
              <Button
                variant="secondary"
                className="flex-1 gap-2 text-xs"
                onClick={() => router.push("/capture")}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Analyze another clip
              </Button>
            </div>
          </div>
        )}

        {activeTab === "video" && (
          <div className="space-y-4">
            <Card className="bg-surface-container-low">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-semibold">Hero artifact status</p>
                  <p className="text-xs text-muted-foreground">
                    {exportAvailable
                      ? "An exported annotated hero clip is available."
                      : "No exported hero clip is present yet. The live player below is the current browser preview."}
                  </p>
                </div>
                {exportAvailable && result.run.exportArtifactPath && (
                  <a href={result.run.exportArtifactPath} download className="inline-flex">
                    <Button variant="secondary" className="gap-2 text-xs">
                      <Download className="h-3.5 w-3.5" />
                      Download Hero MP4
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>

            {hasTrace && hasVideo ? (
              <AnnotatedVideoPlayer
                trace={result.trace!}
                videoUrl={videoUrl!}
                jumpToFrameIndex={jumpToFrameIndex}
              />
            ) : hasTrace && !hasVideo ? (
              <div className="text-center py-12 space-y-3">
                <Video className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  The original video is no longer available in local storage.
                </p>
                <p className="text-xs text-muted-foreground/60">
                  Evidence data is still available in the Evidence tab.
                </p>
              </div>
            ) : (
              <div className="text-center py-12 space-y-3">
                <PlayCircle className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Hero video playback needs a real analysis trace and a retained clip.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "clinician" && reportBundle && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Clinician Packet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <p><strong>Structured notes:</strong> {reportBundle.clinician.structuredNotes ?? "No additional notes"}</p>
                <p><strong>Assessment mode:</strong> {String(reportBundle.clinician.profileSummary.assessmentMode ?? "unknown")}</p>
                <p><strong>View:</strong> {String(reportBundle.clinician.profileSummary.viewLabel ?? "unknown")}</p>
                <p><strong>Created:</strong> {new Date(reportBundle.clinician.createdAt).toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Evidence and Limits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <p>
                  <strong>Suppressed metrics:</strong>{" "}
                  {Array.isArray(reportBundle.clinician.qualitySummary?.suppressedMetrics)
                    ? (reportBundle.clinician.qualitySummary?.suppressedMetrics as string[]).join(", ") || "none"
                    : "none"}
                </p>
                <p>
                  <strong>Quality context:</strong>{" "}
                  {String(reportBundle.clinician.qualitySummary?.confidenceNotes ?? result.quality.confidenceNotes)}
                </p>
                <p>
                  <strong>Follow-up priority:</strong>{" "}
                  {String((reportBundle.clinician.concernDomains as Record<string, unknown>).followupPriority ?? "routine")}
                </p>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="flex-1 gap-2 text-xs" onClick={downloadClinicianPacket}>
                <Download className="h-3.5 w-3.5" />
                Download Packet JSON
              </Button>
              <Button variant="outline" className="flex-1 gap-2 text-xs" onClick={copyHandoffText}>
                {copiedHandoff ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
                {copiedHandoff ? "Handoff copied" : "Copy Handoff Text"}
              </Button>
              <Button variant="outline" className="flex-1 gap-2 text-xs" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5" />
                Print Packet
              </Button>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Secure Share Link</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-muted-foreground">
                <p>
                  Create a time-limited link for clinician review. Links expire in 72 hours and are capped at 25 opens.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="gap-2 text-xs"
                    onClick={createShareLink}
                    disabled={isCreatingShare}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    {isCreatingShare ? "Creating link..." : "Create Share Link"}
                  </Button>
                  {shareUrl && (
                    <Button variant="outline" className="gap-2 text-xs" onClick={copyShareUrl}>
                      <Copy className="h-3.5 w-3.5" />
                      Copy Share URL
                    </Button>
                  )}
                </div>

                {shareError && (
                  <p className="text-red-600">{shareError}</p>
                )}

                {shareUrl && (
                  <div className="rounded-md border bg-muted/40 p-3">
                    <p className="break-all">{shareUrl}</p>
                    {shareExpiresAt && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Expires: {new Date(shareExpiresAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "evidence" && (
          <div className="space-y-4">
            {hasTrace ? (
              <>
                <EventTimeline
                  trace={result.trace!}
                  onJumpToFrame={(frameIndex) => {
                    setJumpToFrameIndex(frameIndex);
                    setActiveTab("video");
                  }}
                />
                {keyFrames && (
                  <KeyFrameGallery
                    keyFrames={keyFrames}
                    trace={result.trace!}
                    onFrameClick={(frameIndex) => {
                      setJumpToFrameIndex(frameIndex);
                      setActiveTab("video");
                    }}
                  />
                )}
                <HowAnalysisWorksPanel result={result} />
                <AnalysisTracePanel trace={result.trace!} concernEvidence={concernEvidence} />
              </>
            ) : (
              <div className="text-center py-12 space-y-3">
                <Microscope className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Detection evidence is only available for runs with a real trace.
                </p>
              </div>
            )}
          </div>
        )}

        <Button
          variant="ghost"
          className="w-full text-xs text-muted-foreground gap-2"
          onClick={() => router.push("/start")}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to start
        </Button>

        {/* P1-09: Clinical References */}
        <div className="mt-4">
          <ClinicalReferencesPanel />
        </div>
      </div>
    </div>
  );
}
