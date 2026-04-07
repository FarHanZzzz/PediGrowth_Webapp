"use client";

// PEDI-GROWTH — Annotated Video Player (v2 — Annotation Quality Recovery)
//
// Video + Canvas overlay, synchronized via requestAnimationFrame.
//
// CHANGES FROM v1:
// 1. Canvas backing size uses devicePixelRatio for crisp rendering
// 2. Passes video native dimensions to renderer for proper transform
// 3. Clean/Debug mode toggle
// 4. Default layers are clean-mode only (no skeleton)
// 5. Better step timeline with tick marks

import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, SkipBack, SkipForward, Rewind, Eye, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { renderOverlay, type RenderMode } from "./OverlayRenderer";
import type { AnalysisTrace, OverlayLayer } from "@/lib/trace/traceTypes";
import { OVERLAY_LAYER_LABELS, TRACE_COLORS } from "@/lib/trace/traceTypes";

interface Props {
  trace: AnalysisTrace;
  videoUrl: string;
  jumpToFrameIndex?: number | null;
}

const SPEED_OPTIONS = [0.25, 0.5, 1];

// Clean mode: minimal, professional overlays only
const CLEAN_LAYERS: OverlayLayer[] = [
  'shoulderLine',
  'hipLine',
  'bodyMidline',
  'stepMarkers',
  'ankleTrails',
  'pathCorridor',
];

// Debug mode: everything
const DEBUG_LAYERS: OverlayLayer[] = [
  'skeleton',
  'stepMarkers',
  'hipLine',
  'shoulderLine',
  'bodyMidline',
  'ankleTrails',
  'pathCorridor',
];

export default function AnnotatedVideoPlayer({ trace, videoUrl, jumpToFrameIndex = null }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [renderMode, setRenderMode] = useState<RenderMode>('clean');
  const [activeLayers, setActiveLayers] = useState<Set<OverlayLayer>>(
    new Set(CLEAN_LAYERS)
  );
  const [videoReady, setVideoReady] = useState(false);

  // Track video native dimensions
  const [videoDims, setVideoDims] = useState({ width: 0, height: 0 });
  const [canvasMetrics, setCanvasMetrics] = useState({
    cssWidth: 0,
    cssHeight: 0,
    backingWidth: 0,
    backingHeight: 0,
    devicePixelRatio: 1,
  });

  // ── Video sync ────────────────────────────────────────────────

  const getFrameForTime = useCallback(
    (timeMs: number): number => {
      if (trace.frames.length === 0) return 0;
      // Find closest frame by timestamp
      let closest = 0;
      let closestDist = Infinity;
      for (let i = 0; i < trace.frames.length; i++) {
        const dist = Math.abs(trace.frames[i].timestampMs - timeMs);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      }
      return closest;
    },
    [trace.frames]
  );


  // Canvas sizing — use devicePixelRatio for crisp rendering
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const cssW = video.clientWidth;
      const cssH = video.clientHeight;
      const backingW = cssW * dpr;
      const backingH = cssH * dpr;

      // Set backing resolution to CSS size × DPR for crisp rendering
      canvas.width = backingW;
      canvas.height = backingH;

      // Scale context so drawing uses CSS-pixel coordinates
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      // Store actual CSS dimensions for the renderer
      // (the renderer will use canvas.width/height but we've scaled by DPR,
      //  so we pass the CSS dimensions as the logical canvas size)
      canvas.dataset.cssWidth = String(cssW);
      canvas.dataset.cssHeight = String(cssH);
      setCanvasMetrics({
        cssWidth: cssW,
        cssHeight: cssH,
        backingWidth: backingW,
        backingHeight: backingH,
        devicePixelRatio: dpr,
      });
    };

    const onMetadata = () => {
      setVideoDims({ width: video.videoWidth, height: video.videoHeight });
      resize();
      setVideoReady(true);
    };

    video.addEventListener("loadedmetadata", onMetadata);

    const ro = new ResizeObserver(resize);
    ro.observe(video);

    // If metadata already loaded
    if (video.readyState >= 1) {
      onMetadata();
    }

    return () => {
      ro.disconnect();
      video.removeEventListener("loadedmetadata", onMetadata);
    };
  }, []);

  // Override renderCurrentFrame to use CSS dimensions instead of canvas backing
  const renderCurrentFrameFixed = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || trace.frames.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Use CSS dimensions (not backing × DPR)
    const cssW = parseInt(canvas.dataset.cssWidth || String(canvas.width));
    const cssH = parseInt(canvas.dataset.cssHeight || String(canvas.height));

    const timeMs = video.currentTime * 1000;
    const frameIdx = getFrameForTime(timeMs);
    setCurrentFrameIndex((prev) => (prev === frameIdx ? prev : frameIdx));

    const frame = trace.frames[frameIdx];
    if (!frame) {
      ctx.clearRect(0, 0, cssW, cssH);
      return;
    }

    // Fix: If video plays past the available tracking data, clear overlay instead of freezing
    if (Math.abs(frame.timestampMs - timeMs) > 250) {
      ctx.clearRect(0, 0, cssW, cssH);
      return;
    }

    const trailStart = Math.max(0, frameIdx - 8);
    const ankleTrailHistory = trace.frames.slice(trailStart, frameIdx + 1);

    const hipTrailHistory = trace.frames
      .slice(0, frameIdx + 1)
      .filter((f) => f.hipMidpoint)
      .map((f) => f.hipMidpoint!);

    renderOverlay(ctx, frame, activeLayers, cssW, cssH, {
      stepEvents: trace.stepEvents,
      currentFrameIndex: frameIdx,
      ankleTrailHistory,
      hipTrailHistory,
      videoNativeWidth: videoDims.width || trace.videoMeta.width,
      videoNativeHeight: videoDims.height || trace.videoMeta.height,
      mode: renderMode,
    });
  }, [trace, activeLayers, getFrameForTime, videoDims, renderMode]);

  useEffect(() => {
    if (jumpToFrameIndex === null || jumpToFrameIndex === undefined) return;
    const video = videoRef.current;
    const frame = trace.frames[jumpToFrameIndex];
    if (!video || !frame) return;
    video.pause();
    video.currentTime = frame.timestampMs / 1000;
  }, [jumpToFrameIndex, trace.frames]);

  // Use the fixed version in the animation loop
  useEffect(() => {
    const tick = () => {
      renderCurrentFrameFixed();
      animRef.current = requestAnimationFrame(tick);
    };

    if (videoReady) {
      animRef.current = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [videoReady, renderCurrentFrameFixed]);

  // ── Controls ──────────────────────────────────────────────────

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.playbackRate = speed;
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const stepFrame = (direction: -1 | 1) => {
    const video = videoRef.current;
    if (!video || trace.frames.length === 0) return;
    video.pause();
    setIsPlaying(false);

    const newIdx = Math.max(0, Math.min(trace.frames.length - 1, currentFrameIndex + direction));
    video.currentTime = trace.frames[newIdx].timestampMs / 1000;
    setCurrentFrameIndex(newIdx);
  };

  const cycleSpeed = () => {
    const idx = SPEED_OPTIONS.indexOf(speed);
    const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    setSpeed(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
  };

  const toggleMode = () => {
    const newMode = renderMode === 'clean' ? 'debug' : 'clean';
    setRenderMode(newMode);
    setActiveLayers(new Set(newMode === 'clean' ? CLEAN_LAYERS : DEBUG_LAYERS));
  };

  const toggleLayer = (layer: OverlayLayer) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  };

  const currentFrame = trace.frames[currentFrameIndex];
  const currentEvent = trace.stepEvents.find((event) => event.frameIndex === currentFrameIndex);
  const bodyVisPct = currentFrame ? Math.round(currentFrame.bodyVisibility * 100) : 0;
  const timeStr = currentFrame
    ? `${(currentFrame.timestampMs / 1000).toFixed(2)}s`
    : "0.00s";

  return (
    <div className="space-y-3">
      {/* Video + Canvas */}
      <div className="relative rounded-lg overflow-hidden bg-black">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full"
          style={{ objectFit: 'contain' }}
          muted
          playsInline
          preload="auto"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ objectFit: 'contain' }}
        />

        <div className="absolute left-2 top-2 flex flex-wrap gap-2">
          <span className="rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-semibold text-white">
            {trace.run.classification === "real_analysis" ? "REAL ANALYSIS" : trace.run.classification.toUpperCase()}
          </span>
          <span className="rounded-full bg-black/55 px-2 py-0.5 text-[10px] text-white/90">
            {trace.pipeline.direction === "toward" ? "Toward camera" : trace.pipeline.direction}
          </span>
          <span className="rounded-full bg-black/55 px-2 py-0.5 text-[10px] text-white/90">
            Tracking {bodyVisPct >= 70 ? "High" : bodyVisPct >= 40 ? "Medium" : "Low"}
          </span>
          <span className="rounded-full bg-black/55 px-2 py-0.5 text-[10px] text-white/90">
            {currentEvent ? `${currentEvent.side === "left" ? "L-step" : "R-step"} ${Math.round(currentEvent.confidence * 100)}%` : "Tracking"}
          </span>
        </div>

        {/* Frame info overlay */}
        <div className="absolute bottom-2 left-2 flex gap-2">
          <span className="bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full font-mono">
            #{currentFrameIndex + 1}/{trace.frames.length}
          </span>
          <span className="bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full font-mono">
            {timeStr}
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
              bodyVisPct >= 70
                ? "bg-green-900/60 text-green-300"
                : bodyVisPct >= 40
                ? "bg-yellow-900/60 text-yellow-300"
                : "bg-red-900/60 text-red-300"
            }`}
          >
            {bodyVisPct}% visible
          </span>
        </div>

        {/* Mode badge */}
        <div className="absolute top-2 right-2">
          <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider ${
            renderMode === 'clean' 
              ? "bg-green-900/50 text-green-300"
              : "bg-orange-900/50 text-orange-300"
          }`}>
            {renderMode}
          </span>
        </div>
      </div>

      {/* Confidence strip */}
      <div className="h-3 rounded-full overflow-hidden flex bg-muted/30">
        {trace.frames.map((f, i) => (
          <div
            key={i}
            className="flex-1 cursor-pointer hover:opacity-80 transition-opacity"
            style={{
              backgroundColor: f.bodyVisibility >= 0.7
                ? TRACE_COLORS.qualityGood
                : f.bodyVisibility >= 0.4
                ? TRACE_COLORS.qualityMedium
                : TRACE_COLORS.qualityBad,
              opacity: i === currentFrameIndex ? 1 : 0.5,
            }}
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.pause();
                setIsPlaying(false);
                videoRef.current.currentTime = f.timestampMs / 1000;
                setCurrentFrameIndex(i);
              }
            }}
            title={`Frame ${i + 1}: ${Math.round(f.bodyVisibility * 100)}% visibility`}
          />
        ))}
      </div>

      {/* Step event timeline */}
      {trace.stepEvents.length > 0 && (
        <div className="relative h-5 rounded-full bg-muted/20">
          {trace.stepEvents.map((step, i) => {
            const pct =
              trace.videoMeta.durationMs > 0
                ? (step.timestampMs / trace.videoMeta.durationMs) * 100
                : 0;
            return (
              <div
                key={i}
                className="absolute top-0 w-3 h-5 rounded-sm cursor-pointer hover:scale-125 transition-transform"
                style={{
                  left: `${pct}%`,
                  backgroundColor: step.side === "left" ? TRACE_COLORS.leftSide : TRACE_COLORS.rightSide,
                  transform: "translateX(-50%)",
                }}
                title={`${step.side === "left" ? "L" : "R"} step at ${(step.timestampMs / 1000).toFixed(2)}s`}
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.pause();
                    setIsPlaying(false);
                    videoRef.current.currentTime = step.timestampMs / 1000;
                    setCurrentFrameIndex(step.frameIndex);
                  }
                }}
              />
            );
          })}
          <div className="absolute -bottom-4 left-0 flex gap-3 text-[9px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: TRACE_COLORS.leftSide }} />
              L steps ({trace.pipeline.leftSteps})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: TRACE_COLORS.rightSide }} />
              R steps ({trace.pipeline.rightSteps})
            </span>
          </div>
        </div>
      )}

      {/* Playback controls */}
      <div className="flex items-center justify-center gap-2 pt-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => stepFrame(-1)}>
          <SkipBack className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-10 w-10" onClick={togglePlay}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => stepFrame(1)}>
          <SkipForward className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-[10px] font-mono ml-2" onClick={cycleSpeed}>
          <Rewind className="h-3 w-3 mr-1" />
          {speed}x
        </Button>

        {/* Clean / Debug toggle */}
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 text-[10px] font-mono ml-4 ${
            renderMode === 'debug' ? "text-orange-400" : "text-muted-foreground"
          }`}
          onClick={toggleMode}
        >
          {renderMode === 'clean' ? (
            <><Eye className="h-3 w-3 mr-1" /> Clean</>
          ) : (
            <><Bug className="h-3 w-3 mr-1" /> Debug</>
          )}
        </Button>
      </div>

      {renderMode === "debug" && (
        <>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {(Object.keys(OVERLAY_LAYER_LABELS) as OverlayLayer[]).map((layer) => (
              <button
                key={layer}
                onClick={() => toggleLayer(layer)}
                className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                  activeLayers.has(layer)
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-muted/20 text-muted-foreground border-border/30 hover:bg-muted/40"
                }`}
              >
                {OVERLAY_LAYER_LABELS[layer]}
              </button>
            ))}
          </div>

          <div className="grid gap-2 rounded-xl border border-border/60 bg-muted/20 p-3 text-[11px] text-muted-foreground sm:grid-cols-2">
            <p>videoWidth: {videoDims.width || trace.videoMeta.width}</p>
            <p>videoHeight: {videoDims.height || trace.videoMeta.height}</p>
            <p>canvasBacking: {canvasMetrics.backingWidth} x {canvasMetrics.backingHeight}</p>
            <p>canvasCss: {canvasMetrics.cssWidth} x {canvasMetrics.cssHeight}</p>
            <p>devicePixelRatio: {canvasMetrics.devicePixelRatio}</p>
            <p>objectFit: contain</p>
            <p>frameIndex: {currentFrameIndex}</p>
            <p>timestamp: {currentFrame?.timestampMs ?? 0} ms</p>
            <p>overlayTimestampSource: nearest_trace_frame</p>
            <p>currentEvent: {currentEvent ? `${currentEvent.side}-${currentEvent.frameIndex}` : "none"}</p>
          </div>
        </>
      )}
    </div>
  );
}
