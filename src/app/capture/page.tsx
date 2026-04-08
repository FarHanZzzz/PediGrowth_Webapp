"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Video,
  Camera,
  Upload,
  ChevronDown,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { storeVideo } from "@/lib/session/videoStore";
import { getApprovedHeroClip, getHeroClipDefinition } from "@/lib/demo/heroManifest";
import { runCapturePreflight, type CapturePreflightResult } from "@/lib/quality/capturePreflight";

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

const FALLS_FREQUENCY_OPTIONS = [
  "Never or rarely",
  "A few times a month",
  "Weekly",
  "Daily or almost daily",
  "Not sure",
] as const;

type ClinicianContextDraft = {
  caregiverMainConcern: string;
  symptomDuration: string;
  fallsFrequency: string;
  recentTherapyChanges: string;
  recentSurgeryInterventionChanges: string;
  assistiveDeviceSupport: string;
  priorDiagnosisOrSpecialistReview: string;
  correctedAge: string;
};

type ClinicianContextPayload = {
  caregiverMainConcern: string | null;
  symptomDuration: string | null;
  fallsFrequency: string | null;
  recentTherapyChanges: string | null;
  recentSurgeryInterventionChanges: string | null;
  assistiveDeviceSupport: string | null;
  priorDiagnosisOrSpecialistReview: string | null;
  correctedAge: string | null;
};

const EMPTY_CONTEXT_DRAFT: ClinicianContextDraft = {
  caregiverMainConcern: "",
  symptomDuration: "",
  fallsFrequency: "",
  recentTherapyChanges: "",
  recentSurgeryInterventionChanges: "",
  assistiveDeviceSupport: "",
  priorDiagnosisOrSpecialistReview: "",
  correctedAge: "",
};

function toTrimmedOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readSavedContextDraft(): ClinicianContextDraft {
  if (typeof window === "undefined") {
    return EMPTY_CONTEXT_DRAFT;
  }

  try {
    const raw =
      sessionStorage.getItem("gaitbridge_session") ??
      sessionStorage.getItem("pedigrowth_session");
    if (!raw) return EMPTY_CONTEXT_DRAFT;

    const parsed = JSON.parse(raw) as {
      clinicianContext?: Partial<ClinicianContextPayload>;
    };
    const saved = parsed.clinicianContext;
    if (!saved) return EMPTY_CONTEXT_DRAFT;

    return {
      caregiverMainConcern: saved.caregiverMainConcern ?? "",
      symptomDuration: saved.symptomDuration ?? "",
      fallsFrequency: saved.fallsFrequency ?? "",
      recentTherapyChanges: saved.recentTherapyChanges ?? "",
      recentSurgeryInterventionChanges: saved.recentSurgeryInterventionChanges ?? "",
      assistiveDeviceSupport: saved.assistiveDeviceSupport ?? "",
      priorDiagnosisOrSpecialistReview: saved.priorDiagnosisOrSpecialistReview ?? "",
      correctedAge: saved.correctedAge ?? "",
    };
  } catch {
    return EMPTY_CONTEXT_DRAFT;
  }
}

function buildClinicianContextPayload(
  draft: ClinicianContextDraft,
): ClinicianContextPayload | undefined {
  const payload: ClinicianContextPayload = {
    caregiverMainConcern: toTrimmedOrNull(draft.caregiverMainConcern),
    symptomDuration: toTrimmedOrNull(draft.symptomDuration),
    fallsFrequency: toTrimmedOrNull(draft.fallsFrequency),
    recentTherapyChanges: toTrimmedOrNull(draft.recentTherapyChanges),
    recentSurgeryInterventionChanges: toTrimmedOrNull(draft.recentSurgeryInterventionChanges),
    assistiveDeviceSupport: toTrimmedOrNull(draft.assistiveDeviceSupport),
    priorDiagnosisOrSpecialistReview: toTrimmedOrNull(draft.priorDiagnosisOrSpecialistReview),
    correctedAge: toTrimmedOrNull(draft.correctedAge),
  };

  const hasAtLeastOneValue = Object.values(payload).some((value) => value !== null);
  return hasAtLeastOneValue ? payload : undefined;
}

function hasAnyContextValue(draft: ClinicianContextDraft): boolean {
  return Object.values(draft).some((value) => value.trim().length > 0);
}

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
  const [isRunningPreflight, setIsRunningPreflight] = useState(false);
  const [preflightResult, setPreflightResult] = useState<CapturePreflightResult | null>(null);
  const [preflightError, setPreflightError] = useState<string | null>(null);
  const [clinicianContext, setClinicianContext] = useState<ClinicianContextDraft>(() =>
    readSavedContextDraft(),
  );
  const [isClinicianContextOpen, setIsClinicianContextOpen] = useState(() =>
    hasAnyContextValue(readSavedContextDraft()),
  );
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

  useEffect(() => {
    let cancelled = false;

    if (!videoFile) {
      setIsRunningPreflight(false);
      setPreflightResult(null);
      setPreflightError(null);
      return;
    }

    setIsRunningPreflight(true);
    setPreflightResult(null);
    setPreflightError(null);

    runCapturePreflight(videoFile)
      .then((result) => {
        if (!cancelled) {
          setPreflightResult(result);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setPreflightError(error instanceof Error ? error.message : "Unable to run preflight quality checks.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsRunningPreflight(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [videoFile]);

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
    setPreflightResult(null);
    setPreflightError(null);
    setActiveTab("review");
  }

  function updateContextField<K extends keyof ClinicianContextDraft>(
    key: K,
    value: ClinicianContextDraft[K],
  ) {
    setClinicianContext((previous) => ({
      ...previous,
      [key]: value,
    }));
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
      setPreflightResult(null);
      setPreflightError(null);
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
      const persistedContext = buildClinicianContextPayload(clinicianContext);

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
        clinicianContext: persistedContext,
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
    setPreflightResult(null);
    setPreflightError(null);
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

            <Card className="bg-surface-container-lowest/80">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Preflight Quality Check
                  </p>
                  {isRunningPreflight ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-semibold text-foreground/80">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Checking...
                    </span>
                  ) : (
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        preflightResult?.overall === "pass"
                          ? "bg-green-100 text-green-700"
                          : preflightResult?.overall === "fail"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {preflightResult?.overall === "pass"
                        ? "Ready"
                        : preflightResult?.overall === "fail"
                          ? "Retake recommended"
                          : "Usable with caution"}
                    </span>
                  )}
                </div>

                {preflightResult && (
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-foreground/80 sm:grid-cols-4">
                    <p className="rounded-xl bg-muted/50 px-2 py-1.5">{preflightResult.durationSeconds.toFixed(1)}s</p>
                    <p className="rounded-xl bg-muted/50 px-2 py-1.5">{preflightResult.resolution.width}x{preflightResult.resolution.height}</p>
                    <p className="rounded-xl bg-muted/50 px-2 py-1.5">Light {Math.round(preflightResult.brightnessScore * 100)}%</p>
                    <p className="rounded-xl bg-muted/50 px-2 py-1.5">Motion {Math.round(preflightResult.motionScore * 100)}%</p>
                  </div>
                )}

                {preflightError && (
                  <p className="text-[11px] text-destructive">{preflightError}</p>
                )}

                {preflightResult?.recommendations.length ? (
                  <div className="space-y-1 text-[11px] text-muted-foreground">
                    {preflightResult.recommendations.slice(0, 2).map((note) => (
                      <p key={note}>- {note}</p>
                    ))}
                  </div>
                ) : (
                  preflightResult && (
                    <p className="text-[11px] text-muted-foreground">Preflight passed. Continue to analysis when ready.</p>
                  )
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-4 text-left"
                  onClick={() => setIsClinicianContextOpen((value) => !value)}
                  aria-expanded={isClinicianContextOpen}
                  aria-controls="clinician-context-dropdown"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Optional clinician context
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Add extra intake details for clinician packet section 2.
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      isClinicianContextOpen ? "rotate-180" : "rotate-0"
                    }`}
                  />
                </button>

                {isClinicianContextOpen && (
                  <div id="clinician-context-dropdown" className="space-y-3 border-t border-border/60 p-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="caregiver-main-concern" className="text-xs font-medium">
                        Caregiver main concern
                      </Label>
                      <Textarea
                        id="caregiver-main-concern"
                        value={clinicianContext.caregiverMainConcern}
                        onChange={(event) => updateContextField("caregiverMainConcern", event.target.value)}
                        placeholder="What is worrying you most about your child's walking?"
                        rows={2}
                        maxLength={300}
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="symptom-duration" className="text-xs font-medium">
                          When first noticed / symptom duration
                        </Label>
                        <Input
                          id="symptom-duration"
                          value={clinicianContext.symptomDuration}
                          onChange={(event) => updateContextField("symptomDuration", event.target.value)}
                          placeholder="e.g., noticed 3 months ago"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Falls frequency</Label>
                        <Select
                          value={clinicianContext.fallsFrequency || undefined}
                          onValueChange={(value) =>
                            updateContextField("fallsFrequency", value ?? "")
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select if known" />
                          </SelectTrigger>
                          <SelectContent>
                            {FALLS_FREQUENCY_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="therapy-changes" className="text-xs font-medium">
                          Recent therapy changes
                        </Label>
                        <Textarea
                          id="therapy-changes"
                          value={clinicianContext.recentTherapyChanges}
                          onChange={(event) => updateContextField("recentTherapyChanges", event.target.value)}
                          placeholder="e.g., started weekly PT in January"
                          rows={2}
                          maxLength={240}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="surgery-changes" className="text-xs font-medium">
                          Recent surgery/intervention changes
                        </Label>
                        <Textarea
                          id="surgery-changes"
                          value={clinicianContext.recentSurgeryInterventionChanges}
                          onChange={(event) =>
                            updateContextField("recentSurgeryInterventionChanges", event.target.value)
                          }
                          placeholder="e.g., botulinum injection 2 months ago"
                          rows={2}
                          maxLength={240}
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="assistive-support" className="text-xs font-medium">
                          Assistive device / walking support
                        </Label>
                        <Input
                          id="assistive-support"
                          value={clinicianContext.assistiveDeviceSupport}
                          onChange={(event) => updateContextField("assistiveDeviceSupport", event.target.value)}
                          placeholder="e.g., ankle-foot orthosis, walker"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="corrected-age" className="text-xs font-medium">
                          Corrected age (if relevant)
                        </Label>
                        <Input
                          id="corrected-age"
                          value={clinicianContext.correctedAge}
                          onChange={(event) => updateContextField("correctedAge", event.target.value)}
                          placeholder="e.g., 22 months corrected"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="prior-diagnosis" className="text-xs font-medium">
                        Prior diagnosis / prior specialist review
                      </Label>
                      <Textarea
                        id="prior-diagnosis"
                        value={clinicianContext.priorDiagnosisOrSpecialistReview}
                        onChange={(event) =>
                          updateContextField("priorDiagnosisOrSpecialistReview", event.target.value)
                        }
                        placeholder="Optional diagnosis or specialist context"
                        rows={2}
                        maxLength={300}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Button
                onClick={handleAnalyze}
                disabled={isStoring || isRunningPreflight}
                size="lg"
                className="touch-target w-full gap-2 text-base font-semibold"
                id="capture-analyze"
              >
                {isStoring ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Preparing...
                  </>
                ) : isRunningPreflight ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running preflight checks...
                  </>
                ) : (
                  <>
                    {preflightResult?.overall === "fail" ? "Analyze Anyway" : "Analyze This Video"}
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
