// PEDI-GROWTH — Concern Navigator (Route A)
// ====================================================================
// This page is shown to caregivers when route_child() sends them to
// Route A (non-ambulant or unknown walking status).
//
// ENHANCED: Now includes:
//   1. Original red-flag checklist (preserved)
//   2. Age-normed motor milestone assessment (Bayley/DAYC-inspired)
//   3. AIMS observational checklist (for infants ≤18 months)
//   4. Computed motor delay flag summary
//   5. Data persistence to sessionStorage for clinician handoff
//
// IMPORTANT: This page does NOT diagnose. It structures observations
// for clinical review. All language is non-diagnostic.
// ====================================================================

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  AlertTriangle,
  ArrowLeft,
  Printer,
  Baby,
  ClipboardList,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FOLLOWUP_BADGE_STYLES, FOLLOWUP_CALLOUT_STYLES } from "@/lib/presentation/severity";
import {
  readSession,
  readSessionRaw,
  writeSession,
} from "@/lib/session/sessionStorage";
import {
  getMilestoneBandsForAge,
  shouldShowAIMS,
  AIMS_CATEGORIES,
  computeMotorDelayAssessment,
  type MilestoneBand,
} from "@/lib/clinical/frameworks";

// ── Original Red Flags (preserved exactly) ─────────────────────────
const RED_FLAGS = [
  { id: "rf-1", label: "Loss of previously acquired motor skills", urgent: true },
  { id: "rf-2", label: "Significant asymmetry in posture or movement", urgent: true },
  { id: "rf-3", label: "Strong preference for one side of the body", urgent: true },
  { id: "rf-4", label: "Unusual stiffness or floppiness in limbs", urgent: false },
  { id: "rf-5", label: "Not weight-bearing on legs by 12 months", urgent: false },
  { id: "rf-6", label: "Not sitting independently by 9 months", urgent: false },
  { id: "rf-7", label: "Seizures or unusual movements", urgent: true },
];

// ── Session shape for reading intake data ──────────────────────────
interface IntakeSession {
  nickname?: string;
  ageMonths?: number;
  walking?: string;
  route?: string;
  routeReason?: string;
  policyVersion?: string;
  consentTimestamp?: string;
}

export default function ConcernPage() {
  const router = useRouter();

  // ── Session hydration ──────────────────────────────────────────────
  const [childName, setChildName] = useState("your child");
  const [childAge, setChildAge] = useState<number | null>(null);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [milestoneChecks, setMilestoneChecks] = useState<Record<string, boolean>>({});
  const [aimsChecks, setAimsChecks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const raw = readSessionRaw();
    if (!raw) {
      router.replace("/start");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as IntakeSession;
      writeSession(parsed);
      setChildName(parsed.nickname || "your child");
      if (typeof parsed.ageMonths === "number") {
        setChildAge(parsed.ageMonths);
      }
    } catch {
      // Ignore malformed legacy payloads and let downstream guards handle them.
    }
  }, [router]);

  // ── Derived milestone data ─────────────────────────────────────────
  const milestoneBands: MilestoneBand[] = useMemo(() => {
    if (childAge === null) return [];
    return getMilestoneBandsForAge(childAge);
  }, [childAge]);

  const showAIMS = childAge !== null && shouldShowAIMS(childAge);

  // ── Compute motor delay assessment ─────────────────────────────────
  const motorAssessment = useMemo(() => {
    if (childAge === null) return null;
    return computeMotorDelayAssessment(
      childAge,
      new Set(Object.entries(milestoneChecks).filter(([, v]) => v).map(([k]) => k)),
      new Set(Object.entries(aimsChecks).filter(([, v]) => v).map(([k]) => k)),
    );
  }, [childAge, milestoneChecks, aimsChecks]);

  // ── Red flag counts (preserved logic) ──────────────────────────────
  const flaggedCount = Object.values(flags).filter(Boolean).length;
  const urgentCount = RED_FLAGS.filter((rf) => rf.urgent && flags[rf.id]).length;

  // ── Milestone counts ───────────────────────────────────────────────
  const totalMilestones = milestoneBands.flatMap((b) => b.milestones).length;
  const achievedMilestones = Object.values(milestoneChecks).filter(Boolean).length;

  // ── AIMS counts ────────────────────────────────────────────────────
  const totalAIMS = AIMS_CATEGORIES.flatMap((c) => c.items).length;
  const observedAIMS = Object.values(aimsChecks).filter(Boolean).length;

  // ── Persist clinical data to session for clinician handoff ─────────
  function handleSaveAndPrint() {
    // Save the motor delay assessment data to session for the clinician page
    const existing = readSession<IntakeSession>() ?? {};
    writeSession({
      ...existing,
      clinicalAssessment: {
        redFlags: Object.entries(flags)
          .filter(([, v]) => v)
          .map(([k]) => RED_FLAGS.find((rf) => rf.id === k)?.label ?? k),
        urgentRedFlagCount: urgentCount,
        motorDelayAssessment: motorAssessment,
        aimsCompleted: showAIMS,
        assessedAt: new Date().toISOString(),
      },
    });
    window.print();
  }

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-3xl">
        {/* ── Header (preserved) ──────────────────────────────────── */}
        <div className="clinical-layer mb-5 rounded-[1.8rem] px-6 py-7 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container-lowest">
            <Heart className="h-6 w-6 text-route-a" />
          </div>
          <h1 data-display="true" className="text-3xl font-semibold text-foreground">
            Concern Navigator
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Since {childName} isn&apos;t walking independently yet, we&apos;ll
            help you organize your observations for a professional conversation.
          </p>
          {childAge !== null && (
            <Badge variant="outline" className="mt-2 text-[11px]">
              {childAge} months old
            </Badge>
          )}
        </div>

        {/* ── Why no gait analysis (preserved) ────────────────────── */}
        <Card className="mb-4 bg-surface-container-low">
          <CardContent className="p-4 text-xs text-muted-foreground">
            <p>
              Gait analysis requires independent walking. When {childName}{" "}
              starts walking, you can come back for a full gait assessment.
            </p>
          </CardContent>
        </Card>

        {/* ────────────────────────────────────────────────────────── */}
        {/* NEW: Age-Normed Motor Milestone Assessment                */}
        {/* ────────────────────────────────────────────────────────── */}
        {milestoneBands.length > 0 && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Baby className="h-4 w-4 text-primary" />
                Motor Milestone Check
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Check the milestones {childName} has <strong>already achieved</strong>.
                Unchecked items from earlier age bands may indicate developmental delay.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {milestoneBands.map((band) => {
                // Determine if this is a prior band (child should have these) or current band
                const isPriorBand = childAge !== null && band.maxAge < childAge;

                return (
                  <div key={band.label} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        {band.label}
                      </span>
                      {isPriorBand && (
                        <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">
                          Should be achieved
                        </Badge>
                      )}
                    </div>
                    {band.milestones.map((milestone) => {
                      const isChecked = milestoneChecks[milestone.id] || false;
                      const isDelayed = isPriorBand && !isChecked;

                      return (
                        <div
                          key={milestone.id}
                          className={`flex items-start gap-3 rounded-2xl p-3 transition-colors ${
                            isDelayed
                              ? "bg-red-50/50 border border-red-200"
                              : isChecked
                                ? "bg-emerald-50/50 border border-emerald-200"
                                : "bg-surface-container-low"
                          }`}
                        >
                          <Checkbox
                            id={milestone.id}
                            checked={isChecked}
                            onCheckedChange={(v) =>
                              setMilestoneChecks((p) => ({ ...p, [milestone.id]: v === true }))
                            }
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <Label htmlFor={milestone.id} className="text-sm cursor-pointer leading-snug">
                              {milestone.label}
                            </Label>
                            {isChecked && (
                              <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] text-emerald-600">
                                <CheckCircle2 className="h-3 w-3" /> Achieved
                              </span>
                            )}
                            {isDelayed && (
                              <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] text-red-600">
                                <AlertTriangle className="h-3 w-3" /> Not yet achieved
                              </span>
                            )}
                            <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                              {milestone.clinicalNote}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* Milestone progress summary */}
              <div className="rounded-xl bg-surface-container-low p-3 text-center text-xs text-muted-foreground">
                {achievedMilestones} of {totalMilestones} milestones confirmed
              </div>
            </CardContent>
          </Card>
        )}

        {/* ────────────────────────────────────────────────────────── */}
        {/* NEW: AIMS Observational Checks (for infants ≤18 months)   */}
        {/* ────────────────────────────────────────────────────────── */}
        {showAIMS && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="h-4 w-4 text-primary" />
                Posture & Movement Observations (AIMS-Inspired)
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Check each movement you have <strong>observed {childName} do</strong>.
                These are based on the Alberta Infant Motor Scale observational categories.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {AIMS_CATEGORIES.map((category) => (
                <div key={category.id} className="space-y-2">
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                    {category.position} Position
                  </span>
                  {category.items.map((item) => {
                    const isChecked = aimsChecks[item.id] || false;

                    return (
                      <div
                        key={item.id}
                        className={`flex items-start gap-3 rounded-2xl p-3 transition-colors ${
                          isChecked
                            ? "bg-emerald-50/50 border border-emerald-200"
                            : "bg-surface-container-low"
                        }`}
                      >
                        <Checkbox
                          id={item.id}
                          checked={isChecked}
                          onCheckedChange={(v) =>
                            setAimsChecks((p) => ({ ...p, [item.id]: v === true }))
                          }
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <Label htmlFor={item.id} className="text-sm cursor-pointer leading-snug">
                            {item.label}
                          </Label>
                          {isChecked && (
                            <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] text-emerald-600">
                              <CheckCircle2 className="h-3 w-3" /> Observed
                            </span>
                          )}
                          <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                            💡 {item.observationTip}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* AIMS progress summary */}
              <div className="rounded-xl bg-surface-container-low p-3 text-center text-xs text-muted-foreground">
                {observedAIMS} of {totalAIMS} movements observed
              </div>
            </CardContent>
          </Card>
        )}

        {/* ────────────────────────────────────────────────────────── */}
        {/* NEW: Motor Delay Assessment Summary                       */}
        {/* ────────────────────────────────────────────────────────── */}
        {motorAssessment && (
          <Card
            className={`mb-4 ${
              motorAssessment.delayFlag === "concern"
                ? "border-red-200 bg-red-50/30"
                : motorAssessment.delayFlag === "watch"
                  ? "border-amber-200 bg-amber-50/30"
                  : "bg-emerald-50/30 border-emerald-200"
            }`}
          >
            <CardContent className="p-4 text-xs">
              <div className="flex items-center gap-2 mb-2">
                {motorAssessment.delayFlag === "concern" ? (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                ) : motorAssessment.delayFlag === "watch" ? (
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                )}
                <span className="font-semibold text-foreground">
                  Motor Milestone Screening Result
                </span>
              </div>
              <p className="text-muted-foreground">{motorAssessment.summaryNote}</p>
              {motorAssessment.delayedMilestones.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium text-foreground/80">Earlier milestones not achieved:</p>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5 text-muted-foreground">
                    {motorAssessment.delayedMilestones.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Red flags — quick checklist (PRESERVED — original) ─── */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-concern-significant" />
              Quick observation check
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {RED_FLAGS.map((rf) => (
              <div key={rf.id} className="flex items-start gap-3 rounded-2xl bg-surface-container-low p-3">
                <Checkbox
                  id={rf.id}
                  checked={flags[rf.id] || false}
                  onCheckedChange={(v) => setFlags((p) => ({ ...p, [rf.id]: v === true }))}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label htmlFor={rf.id} className="text-sm cursor-pointer leading-snug">
                    {rf.label}
                  </Label>
                  {rf.urgent && (
                    <Badge variant="outline" className={`ml-1.5 text-[9px] ${FOLLOWUP_BADGE_STYLES.specialist}`}>
                      Urgent
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── Red flag results (PRESERVED — original) ─────────────── */}
        {flaggedCount > 0 && (
          <Card className={`mb-4 ${urgentCount > 0 ? FOLLOWUP_CALLOUT_STYLES.specialist : "bg-tertiary-fixed/30"}`}>
            <CardContent className="p-4 text-xs">
              <p className="font-medium text-foreground mb-1">
                {flaggedCount} observation(s) noted{urgentCount > 0 ? `, including ${urgentCount} priority item(s)` : ""}
              </p>
              <p className="text-muted-foreground">
                We recommend discussing these with your child&apos;s healthcare team.
                {urgentCount > 0 && " Urgent items should be escalated during the next clinical contact."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Guidance (PRESERVED — original) ─────────────────────── */}
        <Card className="mb-4 bg-surface-container-low">
          <CardContent className="p-4 space-y-2 text-xs text-foreground/80">
            <p className="font-semibold text-foreground">Suggested next steps:</p>
            <p>• Share your observations with your child&apos;s pediatrician</p>
            <p>• Request a developmental evaluation if you have ongoing concerns</p>
            <p>• When {childName} begins walking independently, come back for gait analysis</p>
            <p>• Take a screenshot of this page to share with your healthcare team</p>
          </CardContent>
        </Card>

        {/* ── Non-diagnostic reminder (PRESERVED — original) ──────── */}
        <div className="mb-4 rounded-2xl bg-surface-container-low p-3 text-xs text-muted-foreground text-center">
          Pedi-Growth supports concern documentation — it does not diagnose conditions.
        </div>

        {/* ── Actions (ENHANCED — now saves clinical data) ─────────── */}
        <div className="space-y-3 pt-2">
          {(flaggedCount > 0 || achievedMilestones > 0) && (
            <Button
              className="w-full gap-2 text-base font-semibold"
              size="lg"
              onClick={handleSaveAndPrint}
            >
              <Printer className="h-4 w-4" />
              Save & Print Summary (PDF)
            </Button>
          )}
          <Button
            variant="secondary"
            className="w-full text-sm font-medium"
            onClick={() => router.push("/start")}
          >
            Wait, my child is walking (Edit answers)
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            Finish & return home
          </Button>
        </div>
      </div>
    </div>
  );
}
