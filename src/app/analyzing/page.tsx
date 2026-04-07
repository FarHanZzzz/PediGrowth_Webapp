"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Activity, CheckCircle2, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { runAnalysisPipeline } from "@/lib/session/analysisSession";
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
  const pipelineRan = useRef(false);

  useEffect(() => {
    if (pipelineRan.current) return;
    pipelineRan.current = true;

    const raw = sessionStorage.getItem("gaitbridge_session");
    if (!raw) {
      router.replace("/start");
      return;
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
        // Store result in sessionStorage
        const resultId = result.id;
        sessionStorage.setItem(`gaitbridge_result_${resultId}`, JSON.stringify(result));

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
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4">
        <div className="mx-auto w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Analysis Error</h1>
          <p className="mt-2 mb-6 text-sm text-muted-foreground">{error}</p>
          <div className="space-y-3">
            <Button
              onClick={() => {
                setError(null);
                pipelineRan.current = false;
                setCurrentStage(0);
                setProgress(0);
              }}
              size="lg"
              className="w-full gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Button
              variant="outline"
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
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4">
      <div className="mx-auto w-full max-w-sm text-center">
        {/* Animated icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Activity className="h-8 w-8 text-primary animate-pulse" />
        </div>

        <h1 className="text-xl font-bold text-foreground">Analyzing</h1>
        <p className="mt-2 mb-6 text-sm text-muted-foreground">
          Processing your video with AI pose detection
        </p>

        {/* Progress */}
        <Progress value={progress} className="mb-4" />

        {/* Stages */}
        <div className="space-y-2">
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
                <div className="h-3.5 w-3.5 rounded-full border border-border" />
              )}
              {label}
            </div>
          ))}
        </div>

        <p className="mt-6 text-[10px] text-muted-foreground/50">
          Video is processed locally on your device
        </p>
      </div>
    </div>
  );
}
