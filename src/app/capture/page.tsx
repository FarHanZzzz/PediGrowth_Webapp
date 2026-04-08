"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Video,
  Camera,
  Upload,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Smartphone,
  RefreshCw,
  Loader2,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { storeVideo } from "@/lib/session/videoStore";
import { getApprovedHeroClip, getHeroClipDefinition } from "@/lib/demo/heroManifest";

const TIPS = [
  { text: "Record from the front — have your child walk toward or away from the camera", do: true },
  { text: "Phone at waist height on a stable surface", do: true },
  { text: "Only your child in the frame, full body visible", do: true },
  { text: "Well-lit area, minimal shadows", do: true },
  { text: "At least 4–6 walking steps", do: true },
  { text: "Don't follow your child — keep the camera still", do: false },
  { text: "Don't record from above or below", do: false },
  { text: "Don't record less than 3 seconds", do: false },
];

const QUICK_CHECKLIST = [
  "Front view: child walks toward or away from camera",
  "Full body visible from head to feet",
  "At least 4-6 clear steps",
  "Camera held still at about waist height",
];

export default function CapturePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("guide");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoURL, setVideoURL] = useState<string | null>(null);
  const [childName] = useState(() => {
    if (typeof window === "undefined") return "your child";
    try {
      const raw = sessionStorage.getItem("gaitbridge_session");
      if (!raw) return "your child";
      const session = JSON.parse(raw);
      return session.nickname || "your child";
    } catch {
      return "your child";
    }
  });
  const [isStoring, setIsStoring] = useState(false);
  const [isLoadingHeroClip, setIsLoadingHeroClip] = useState(false);
  const [heroClipError, setHeroClipError] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<"upload" | "manifest_hero">("upload");
  const [sourceClipId, setSourceClipId] = useState<string | null>(null);
  const [approvedForDemo, setApprovedForDemo] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const heroClip = getHeroClipDefinition();
  const approvedHeroClip = getApprovedHeroClip();
  const validationMode = process.env.NEXT_PUBLIC_VALIDATION_MODE === "true";

  useEffect(() => {
    const raw = sessionStorage.getItem("gaitbridge_session");
    if (!raw) {
      router.replace("/start");
    }
  }, [router]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      alert("Please select a video file.");
      return;
    }
    setVideoFile(file);
    setVideoURL(URL.createObjectURL(file));
    setSourceType("upload");
    setSourceClipId(null);
    setApprovedForDemo(null);
    setHeroClipError(null);
    setActiveTab("review");
  }

  async function handleUseHeroClip() {
    if (!approvedHeroClip) return;

    setIsLoadingHeroClip(true);
    setHeroClipError(null);
    try {
      const assetPath = approvedHeroClip.sourcePath ?? `/demo/videos/${approvedHeroClip.filename}`;
      const response = await fetch(assetPath);
      if (!response.ok) {
        throw new Error(`Failed to load approved hero clip (${response.status})`);
      }

      const blob = await response.blob();
      const file = new File([blob], approvedHeroClip.filename, {
        type: blob.type || "video/mp4",
      });

      if (videoURL) URL.revokeObjectURL(videoURL);

      setVideoFile(file);
      setVideoURL(URL.createObjectURL(file));
      setSourceType("manifest_hero");
      setSourceClipId(approvedHeroClip.clipId);
      setApprovedForDemo(true);
      setActiveTab("review");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load the approved hero clip.";
      setHeroClipError(message);
    } finally {
      setIsLoadingHeroClip(false);
    }
  }

  async function handleAnalyze() {
    if (!videoFile) return;
    setIsStoring(true);

    try {
      // Generate a session ID for this analysis run
      const sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

      // Store actual video in IndexedDB (not sessionStorage — too large)
      await storeVideo(sessionId, videoFile);

      // Update session with video metadata + sessionId
      const existing = JSON.parse(sessionStorage.getItem("gaitbridge_session") || "{}");
      sessionStorage.setItem("gaitbridge_session", JSON.stringify({
        ...existing,
        sessionId,
        sourceType,
        sourceClipId,
        sourceClipFilename: sourceClipId ? videoFile.name : null,
        approvedForDemo,
        validationMode,
        videoMeta: {
          name: videoFile.name,
          type: videoFile.type,
          size: videoFile.size,
          capturedAt: new Date().toISOString(),
        },
      }));

      router.push("/analyzing");
    } catch (err) {
      console.error("Failed to store video:", err);
      alert("Failed to prepare video for analysis. Please try again.");
      setIsStoring(false);
    }
  }

  function handleRetake() {
    if (videoURL) URL.revokeObjectURL(videoURL);
    setVideoFile(null);
    setVideoURL(null);
    setActiveTab("guide");
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-background to-muted/30 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-4 text-center">
          <h1 className="text-xl font-bold text-foreground">
            Record {childName}&apos;s walking
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Follow this quick guide for a clearer, more reliable result
          </p>
          {validationMode && (
            <p className="mt-2 text-xs font-medium text-amber-700">
              Validation mode is on. This run will fail loudly if analysis is not real.
            </p>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="guide" className="text-xs gap-1">
              <Video className="h-3 w-3" />
              Tips
            </TabsTrigger>
            <TabsTrigger
              value="review"
              disabled={!videoFile}
              className="text-xs gap-1"
            >
              <CheckCircle2 className="h-3 w-3" />
              Review
            </TabsTrigger>
          </TabsList>

          {/* Guide Tab */}
          <TabsContent value="guide" className="space-y-4">
            <Card
              className={
                approvedHeroClip
                  ? "border-green-200 bg-green-50/70"
                  : "border-amber-200 bg-amber-50/70"
              }
            >
              <CardContent className="p-4">
                <div className="flex gap-3">
                  {approvedHeroClip ? (
                    <Sparkles className="h-5 w-5 flex-shrink-0 text-green-700 mt-0.5" />
                  ) : (
                    <ShieldAlert className="h-5 w-5 flex-shrink-0 text-amber-700 mt-0.5" />
                  )}
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Hero demo clip
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {approvedHeroClip
                          ? "Load the approved toward-camera clip for the judge-safe hero run."
                          : heroClip?.notes ?? "No approved hero clip is configured yet."}
                      </p>
                    </div>
                    {approvedHeroClip ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2"
                        onClick={handleUseHeroClip}
                        disabled={isLoadingHeroClip}
                      >
                        {isLoadingHeroClip ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading hero clip...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Use Approved Hero Clip
                          </>
                        )}
                      </Button>
                    ) : (
                      <p className="text-[11px] text-amber-700">
                        Demo lock is still blocked until `{heroClip?.filename ?? "toward_good.mp4"}` is added and approved.
                      </p>
                    )}
                    {heroClipError && (
                      <p className="text-[11px] text-destructive">{heroClipError}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Side view callout */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex gap-3 p-4">
                <Smartphone className="h-5 w-5 flex-shrink-0 text-primary mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <p className="font-semibold text-foreground mb-1">
                    Front-view works best for this analysis
                  </p>
                  <p className="text-muted-foreground">
                    Stand facing the walking path. Your child walks toward
                    or away from the camera. Phone at waist height, held still.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick checklist */}
            <Card>
              <CardContent className="space-y-2 p-4">
                <p className="text-sm font-semibold text-foreground">Quick recording checklist</p>
                {QUICK_CHECKLIST.map((item) => (
                  <div key={item} className="flex items-start gap-2.5 rounded-lg bg-muted/20 p-2.5 text-xs">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-concern-none" />
                    <span className="text-foreground/85">{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <details className="rounded-lg border border-border/60 bg-card px-3 py-2">
              <summary className="cursor-pointer text-xs font-semibold text-foreground">
                Show full recording tips
              </summary>
              <div className="mt-3 space-y-2">
                {TIPS.map((tip) => (
                  <div key={tip.text} className="flex gap-2.5 rounded-lg bg-muted/20 p-2.5 text-xs">
                    {tip.do ? (
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-concern-none" />
                    ) : (
                      <XCircle className="h-4 w-4 flex-shrink-0 text-concern-significant/70" />
                    )}
                    <span className="text-foreground/85">{tip.text}</span>
                  </div>
                ))}
              </div>
            </details>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <Button
                size="lg"
                className="touch-target w-full gap-2 text-base font-semibold"
                id="capture-record"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.setAttribute("capture", "environment");
                    fileInputRef.current.click();
                  }
                }}
              >
                <Camera className="h-4 w-4" />
                Record Video
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="touch-target w-full gap-2 text-base"
                id="capture-upload"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute("capture");
                    fileInputRef.current.click();
                  }
                }}
              >
                <Upload className="h-4 w-4" />
                Upload Existing Video
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </TabsContent>

          {/* Review Tab */}
          <TabsContent value="review" className="space-y-4">
            {videoURL && (
              <Card className="overflow-hidden">
                <video
                  src={videoURL}
                  controls
                  playsInline
                  className="w-full rounded-t-lg bg-black"
                  style={{ maxHeight: "300px" }}
                />
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{videoFile?.name}</span>
                    <span>
                      {videoFile ? (videoFile.size / (1024 * 1024)).toFixed(1) : 0} MB
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {sourceType === "manifest_hero" ? "Approved hero clip" : "Uploaded clip"}
                    </span>
                    {approvedForDemo && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                        Approved for demo
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-muted/30">
              <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
                {validationMode && (
                  <p>✓ Validation mode: no fallback, no fixture substitution, explicit run badge</p>
                )}
                <p>✓ Does the video show your child walking toward or away from the camera?</p>
                <p>✓ Is the full body visible (head to feet)?</p>
                <p>✓ Are there at least 4-6 steps?</p>
                <p>✓ Is the lighting adequate?</p>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Button
                onClick={handleAnalyze}
                disabled={isStoring}
                size="lg"
                className="touch-target w-full gap-2 text-base font-semibold"
                id="capture-analyze"
              >
                {isStoring ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Preparing...
                  </>
                ) : (
                  <>
                    Analyze This Video
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
              <Button
                onClick={handleRetake}
                variant="outline"
                size="lg"
                className="touch-target w-full gap-2 text-base"
                disabled={isStoring}
              >
                <RefreshCw className="h-4 w-4" />
                Try a Different Video
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
