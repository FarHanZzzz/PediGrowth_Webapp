"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronDown,
  Download,
  RefreshCw,
  Stethoscope,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ResultGuardState from "@/components/results/ResultGuardState";
import AnnotatedVideoPlayer from "@/components/results/AnnotatedVideoPlayer";
import EventTimeline from "@/components/results/EventTimeline";
import KeyFrameGallery from "@/components/results/KeyFrameGallery";
import HowAnalysisWorksPanel from "@/components/results/HowAnalysisWorksPanel";
import {
  formatDomainLabel,
  useResultViewModel,
} from "@/lib/results/resultViewModel";

const CONCERN_BADGE_STYLES: Record<string, string> = {
  none: "bg-green-50 text-green-700 border-green-200",
  mild: "bg-amber-50 text-amber-700 border-amber-200",
  moderate: "bg-orange-50 text-orange-700 border-orange-200",
  significant: "bg-red-50 text-red-700 border-red-200",
};

const CONCERN_LABELS: Record<string, string> = {
  none: "None observed",
  mild: "Mild observation",
  moderate: "Moderate observation",
  significant: "Significant observation",
};

const CONCERN_DOMAINS = [
  { key: "asymmetry", label: "Left/right movement balance", desc: "How evenly both sides moved" },
  { key: "irregularRhythm", label: "Step rhythm", desc: "How steady and repeatable the step timing looked" },
  { key: "lateralInstability", label: "Side-to-side steadiness", desc: "How stable the trunk looked while walking" },
  { key: "pathDeviation", label: "Walking path", desc: "How straight the walking line appeared" },
] as const;

const OBSERVATION_COPY: Record<
  (typeof CONCERN_DOMAINS)[number]["key"],
  Record<string, string>
> = {
  asymmetry: {
    none: "Both sides looked balanced in this clip.",
    mild: "A small left-right difference was visible.",
    moderate: "A noticeable left-right difference was visible.",
    significant: "A strong left-right difference was visible.",
  },
  irregularRhythm: {
    none: "Step timing looked steady.",
    mild: "Step timing looked mostly steady with slight variation.",
    moderate: "Step timing showed repeated variation.",
    significant: "Step timing looked clearly uneven through the clip.",
  },
  lateralInstability: {
    none: "Side-to-side control looked steady.",
    mild: "Mild side-to-side sway was visible.",
    moderate: "Noticeable side-to-side sway was visible.",
    significant: "Marked side-to-side sway was visible.",
  },
  pathDeviation: {
    none: "Walking path looked mostly straight.",
    mild: "A small drift from a straight path was visible.",
    moderate: "A repeated drift from a straight path was visible.",
    significant: "A strong drift from a straight path was visible.",
  },
};

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const resultId = params.id as string;

  const [jumpToFrameIndex, setJumpToFrameIndex] = useState<number | null>(null);
  const [showSupportingEvidence, setShowSupportingEvidence] = useState(false);
  const {
    result,
    videoUrl,
    exportAvailable,
    keyFrames,
    hasTrace,
    hasVideo,
    isBestEffort,
    isValidationFailure,
    isCannotAssessRealRun,
  } = useResultViewModel(resultId);

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

  const nickname = result.session.nickname;
  const overallConcernLabel = CONCERN_LABELS[result.concerns.overallLevel] ?? formatDomainLabel(result.concerns.overallLevel);
  const assessedDomains = result.concerns.assessedDomains.map(formatDomainLabel);
  const suppressedDomains = result.concerns.suppressedDomains.map(formatDomainLabel);
  const nonNoneConcerns = CONCERN_DOMAINS.filter(
    (domain) => result.concerns[domain.key] !== "none" && !result.concerns.suppressedDomains.includes(domain.key)
  ).length;

  const plainObservations = CONCERN_DOMAINS
    .filter((domain) => !result.concerns.suppressedDomains.includes(domain.key))
    .map((domain) => {
      const level = result.concerns[domain.key];
      return {
        key: domain.key,
        label: domain.label,
        detail: OBSERVATION_COPY[domain.key][level] ?? "This movement area was reviewed.",
        level,
      };
    })
    .slice(0, 4);

  const meaningSummary =
    result.concerns.overallLevel === "none"
      ? "No clear concern pattern was seen in this clip."
      : result.concerns.overallLevel === "mild"
      ? "A mild movement pattern was seen and is reasonable to discuss at routine follow-up."
      : result.concerns.overallLevel === "moderate"
      ? "A moderate movement pattern was seen and deserves timely clinical review."
      : "A strong movement pattern was seen and should be reviewed promptly with a clinician.";

  return (
    <div className="min-h-dvh bg-gradient-to-b from-background to-muted/30">
      {isBestEffort && (
        <div className="border-b border-blue-200 bg-blue-50 px-4 py-2">
          <p className="text-xs text-blue-700">
            Preliminary analysis: this clip was usable, but some measurements were suppressed because confidence was limited.
          </p>
        </div>
      )}

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Walking Summary for {nickname}</h1>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
            This page gives a simple 5-step overview you can review before talking with your care team.
          </p>
          <p className="mx-auto max-w-2xl text-xs text-muted-foreground">{result.quality.confidenceNotes}</p>
          <p className="mx-auto max-w-2xl text-xs text-muted-foreground">
            If you need the full clinical packet, use Step 5 to open the clinician view.
          </p>
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm">Step 1 · What we noticed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-1">
            <p className="text-sm font-medium">
              {nonNoneConcerns === 0
                ? "No clear concern pattern was observed in this clip."
                : `${nonNoneConcerns} movement area${nonNoneConcerns > 1 ? "s" : ""} showed patterns worth discussing with your care team.`}
            </p>

            {plainObservations.length > 0 ? (
              <div className="space-y-2">
                {plainObservations.map((observation) => (
                  <div key={observation.key} className="rounded-lg border bg-background/80 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-foreground">{observation.label}</p>
                      <Badge variant="outline" className={`text-[10px] ${CONCERN_BADGE_STYLES[observation.level] ?? ""}`}>
                        {CONCERN_LABELS[observation.level] ?? observation.level}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{observation.detail}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                We could not confidently review specific movement areas from this clip.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Step 2 · How sure we are</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">Overall summary: <span className="font-medium">{overallConcernLabel}</span></p>
            <p className="text-xs text-muted-foreground">{result.quality.confidenceNotes}</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-green-200 bg-green-50/60 p-3">
                <p className="text-xs font-semibold text-green-800">We could clearly review</p>
                <p className="mt-1 text-xs text-green-900/80">
                  {assessedDomains.length > 0 ? assessedDomains.join(", ") : "No domains were confidently assessed."}
                </p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                <p className="text-xs font-semibold text-amber-800">Still uncertain in this clip</p>
                <p className="mt-1 text-xs text-amber-900/80">
                  {suppressedDomains.length > 0 ? suppressedDomains.join(", ") : "No domains were suppressed."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Step 3 · Watch the video</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Use this guided replay to review key movement moments.
            </p>

            {hasTrace && hasVideo && videoUrl ? (
              <AnnotatedVideoPlayer
                trace={result.trace!}
                videoUrl={videoUrl}
                jumpToFrameIndex={jumpToFrameIndex}
                audience="caregiver"
              />
            ) : hasTrace ? (
              <p className="text-xs text-muted-foreground">
                Evidence is available, but the original clip is no longer available in local storage.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Annotated playback appears only when a detection trace is available.
              </p>
            )}

            {hasTrace && (
              <Button
                variant="ghost"
                className="gap-2 px-0 text-xs"
                onClick={() => setShowSupportingEvidence((value) => !value)}
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${showSupportingEvidence ? "rotate-180" : ""}`}
                />
                {showSupportingEvidence ? "Hide" : "Show"} key moments and frame gallery (optional)
              </Button>
            )}

            {showSupportingEvidence && hasTrace && (
              <div className="space-y-4">
                <EventTimeline
                  trace={result.trace!}
                  onJumpToFrame={(frameIndex) => setJumpToFrameIndex(frameIndex)}
                />
                {keyFrames && (
                  <KeyFrameGallery
                    keyFrames={keyFrames}
                    trace={result.trace!}
                    videoUrl={videoUrl}
                    renderMode="timestamps-only"
                    onFrameClick={(frameIndex) => setJumpToFrameIndex(frameIndex)}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Step 4 · What this means</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">{meaningSummary}</p>
            <p className="text-xs text-muted-foreground">
              Follow-up priority: <span className="font-medium text-foreground">{formatDomainLabel(result.concerns.followupPriority)}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              This summary supports your conversation with a clinician and does not replace clinical judgment.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Step 5 · Open clinician handoff</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              When deeper review is needed, open the clinician packet below for evidence detail, limits, and handoff actions.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button className="gap-2" onClick={() => router.push(`/results/${resultId}/clinician`)}>
                <Stethoscope className="h-4 w-4" />
                Open Clinician Packet
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => router.push(`/results/${resultId}/refine`)}>
                Add Follow-up Context (optional)
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => router.push("/capture")}>
                <RefreshCw className="h-4 w-4" />
                Analyze Another Clip
              </Button>
              {exportAvailable && result.run.exportArtifactPath && (
                <a href={result.run.exportArtifactPath} download className="inline-flex">
                  <Button variant="outline" className="w-full gap-2 text-xs">
                    <Download className="h-3.5 w-3.5" />
                    Download clip for care team
                  </Button>
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        <details className="rounded-lg border bg-background p-3">
          <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
            Learn more about how this summary was prepared
          </summary>
          <div className="mt-3">
            <HowAnalysisWorksPanel result={result} />
          </div>
        </details>
      </div>
    </div>
  );
}
