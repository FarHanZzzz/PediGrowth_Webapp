"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Activity, CheckCircle2, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { runAnalysisPipeline } from "@/lib/session/analysisSession";
import { saveResult } from "@/lib/session/videoStore";
import type { PipelineProgress } from "@/lib/session/analysisSession";

const STAGE_LABELS = [
  "Loading video",
  "Initializing pose detection",
  "Checking video quality",
  "Detecting body landmarks",
  "Extracting gait features",
  "Computing concern profile",
  "Generating results",
];

export default function AnalyzingPage() {
  const router = useRouter();
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analysisAttempt, setAnalysisAttempt] = useState(0);
  const pipelineRan = useRef(false);

  useEffect(() => {
    if (pipelineRan.current) return;
    pipelineRan.current = true;

    const raw =
      sessionStorage.getItem("gaitbridge_session") ??
      sessionStorage.getItem("pedigrowth_session");
    if (!raw) {
      router.replace("/start");
      return;
    }

    if (!sessionStorage.getItem("gaitbridge_session")) {
      sessionStorage.setItem("gaitbridge_session", raw);
    }

    const session = JSON.parse(raw);
    const sessionId = session.sessionId;
    const nickname = session.nickname || "your child";
    const ageMonths = session.ageMonths || 36;
    const validationMode = Boolean(session.validationMode ?? (process.env.NEXT_PUBLIC_VALIDATION_MODE === "true"));

    if (!sessionId) {
      // No video stored — can't analyze. Redirect back.
      router.replace("/capture");
      return;
    }

    // Run the real analysis pipeline
    runAnalysisPipeline(
      sessionId,
      nickname,
      ageMonths,
      (p: PipelineProgress) => {
        setCurrentStage(p.stageIndex);
        const overallProgress = ((p.stageIndex + p.stageProgress) / p.totalStages) * 100;
        setProgress(Math.min(overallProgress, 99));
      },
      {
        validationMode,
        sourceType: session.sourceType ?? "unknown",
        sourceClipId: session.sourceClipId ?? null,
        sourceClipFilename: session.sourceClipFilename ?? session.videoMeta?.name ?? null,
        approvedForDemo: session.approvedForDemo ?? null,
      },
    )
      .then((result) => {
        // Store result in sessionStorage + IndexedDB for persistence
        const resultId = result.id;
        const serialized = JSON.stringify(result);
        sessionStorage.setItem(`gaitbridge_result_${resultId}`, serialized);
        // Backward compatibility for previously released readers.
        sessionStorage.setItem(`pedigrowth_result_${resultId}`, serialized);
        saveResult(resultId, result).catch(() => {}); // fire-and-forget

        // Complete progress
        setCurrentStage(STAGE_LABELS.length);
        setProgress(100);

        // Navigate to results after a brief "complete" animation
        setTimeout(() => {
          router.push(`/results/${resultId}`);
        }, 500);
      })
      .catch((err) => {
        console.error("Pipeline error:", err);
        setError(
          "Something went wrong during analysis. This may be a browser compatibility issue. " +
          "You can try again or use a different browser."
        );
      });

    // P1-07: Timeout after 120 seconds
    const timeout = setTimeout(() => {
      setError((existing) =>
        existing ??
        "Analysis is taking longer than expected. This may be due to video length or device performance. " +
          "Please try with a shorter video or on a different device."
      );
    }, 120_000);

    return () => clearTimeout(timeout);
  }, [router, analysisAttempt]);

  if (error) {
    return (
      <div className="px-4 py-10 sm:px-6">
        <div className="mx-auto w-full max-w-md rounded-[1.8rem] bg-error-container/65 p-7 text-center shadow-[0_12px_32px_rgba(21,29,28,0.06)]">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-error-container">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h1 data-display="true" className="text-2xl font-semibold text-foreground">Analysis Error</h1>
          <p className="mt-2 mb-6 text-sm text-muted-foreground">{error}</p>
          <div className="space-y-3">
            <Button
              onClick={() => {
                setError(null);
                pipelineRan.current = false;
                setCurrentStage(0);
                setProgress(0);
                setAnalysisAttempt((value) => value + 1);
              }}
              size="lg"
              className="w-full gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push("/capture")}
              size="lg"
              className="w-full"
            >
              Record a New Video
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-lg rounded-[2rem] bg-surface-container-low p-7 text-center">
        {/* Animated icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-container-lowest shadow-[0_12px_32px_rgba(21,29,28,0.06)]">
          <Activity className="h-8 w-8 text-primary animate-pulse" />
        </div>

        <h1 data-display="true" className="text-3xl font-semibold text-foreground">Analyzing</h1>
        <p className="mt-2 mb-6 text-sm text-muted-foreground">
          Processing your video with AI pose detection
        </p>

        {/* Progress */}
        <Progress value={progress} className="mb-4" />

        {/* Stages */}
        <div className="clinical-card mt-4 space-y-2 rounded-[1.4rem] p-4 text-left">
          {STAGE_LABELS.map((label, i) => (
            <div
              key={label}
              className={`flex items-center gap-2 text-xs transition-opacity ${
                i < currentStage
                  ? "text-concern-none"
                  : i === currentStage
                  ? "text-foreground font-medium"
                  : "text-muted-foreground/40"
              }`}
            >
              {i < currentStage ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : i === currentStage ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <div className="h-3.5 w-3.5 rounded-full bg-outline-variant/35" />
              )}
              {label}
            </div>
          ))}
        </div>

        <p className="mt-6 text-[10px] text-muted-foreground/50">
          Video is processed locally on your device
        </p>

        {/* P1-07: Cancel button */}
        <Button variant="ghost" size="sm" className="mt-4 text-xs" onClick={() => router.push("/capture")}>Cancel</Button>
      </div>
    </div>
  );
}
