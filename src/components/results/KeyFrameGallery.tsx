"use client";

// PEDI-GROWTH — Key Frame Gallery
// Thumbnails of important frames extracted from the analysis.

import { Camera, Footprints, AlertTriangle, ArrowLeftRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KeyFrameSet, AnalysisTrace } from "@/lib/trace/traceTypes";
import { TRACE_COLORS } from "@/lib/trace/traceTypes";

interface Props {
  keyFrames: KeyFrameSet;
  trace: AnalysisTrace;
  onFrameClick?: (frameIndex: number) => void;
}

export default function KeyFrameGallery({ keyFrames, trace, onFrameClick }: Props) {
  const allFrames = [
    keyFrames.firstUsable,
    ...keyFrames.leftStepFrames.slice(0, 3),
    ...keyFrames.rightStepFrames.slice(0, 3),
    keyFrames.worstConfidence,
    keyFrames.mostAsymmetric,
  ].filter(Boolean);

  if (allFrames.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Camera className="h-4 w-4" />
          Key Frames ({allFrames.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {allFrames.map((kf) => {
            if (!kf) return null;
            const frame = trace.frames[kf.frameIndex];
            const visPct = frame ? Math.round(frame.bodyVisibility * 100) : 0;

            const isStep = kf.label === "L step" || kf.label === "R step";
            const isLeft = kf.label === "L step";
            const borderColor = isStep
              ? isLeft
                ? TRACE_COLORS.leftSide
                : TRACE_COLORS.rightSide
              : kf.label === "Lowest confidence"
              ? TRACE_COLORS.qualityBad
              : kf.label === "Most asymmetric"
              ? TRACE_COLORS.qualityMedium
              : TRACE_COLORS.qualityGood;

            return (
              <button
                key={`${kf.label}-${kf.frameIndex}`}
                onClick={() => onFrameClick?.(kf.frameIndex)}
                className="relative rounded-lg border-2 p-2 text-left hover:bg-muted/30 transition-colors cursor-pointer"
                style={{ borderColor }}
              >
                {/* Frame indicator (we don't have real thumbnails — show frame data) */}
                <div className="aspect-video bg-muted/20 rounded flex items-center justify-center mb-1.5">
                  {isStep ? (
                    <Footprints className="h-5 w-5 text-muted-foreground/50" />
                  ) : kf.label === "Lowest confidence" ? (
                    <AlertTriangle className="h-5 w-5 text-muted-foreground/50" />
                  ) : kf.label === "Most asymmetric" ? (
                    <ArrowLeftRight className="h-5 w-5 text-muted-foreground/50" />
                  ) : (
                    <Camera className="h-5 w-5 text-muted-foreground/50" />
                  )}
                </div>

                <p className="text-[10px] font-medium truncate">{kf.label}</p>
                <p className="text-[9px] text-muted-foreground">
                  #{kf.frameIndex + 1} · {(kf.timestampMs / 1000).toFixed(1)}s
                </p>
                <p className="text-[9px] text-muted-foreground truncate">
                  {visPct}% vis
                </p>
                <p className="mt-1 text-[9px] text-muted-foreground/80 line-clamp-2">
                  {kf.reason}
                </p>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
