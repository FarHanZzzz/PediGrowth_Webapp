// PEDI-GROWTH — Motor Delay Assessment Summary
// ====================================================================
// Displays the structured motor delay assessment results in the
// clinician handoff packet. Shows missed milestones, delayed milestones,
// AIMS observations, and the computed delay flag.
//
// This component reads from session storage and renders a read-only
// summary. It is used in the clinician page for Route A children.
// ====================================================================

"use client";

import { AlertTriangle, CheckCircle2, Clock, Baby } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MotorDelayAssessment } from "@/lib/clinical/frameworks";

interface MotorDelayAssessmentSummaryProps {
  /** The computed motor delay assessment data */
  assessment: MotorDelayAssessment;
  /** Child's age in months for context */
  ageMonths: number;
  /** Child's name/nickname for display */
  childName: string;
}

const DELAY_FLAG_CONFIG = {
  none: {
    label: "No Delay Indicators",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
    bgClass: "bg-emerald-50/50 border-emerald-200",
  },
  watch: {
    label: "Monitor Closely",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Clock,
    bgClass: "bg-amber-50/50 border-amber-200",
  },
  concern: {
    label: "Evaluation Recommended",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
    icon: AlertTriangle,
    bgClass: "bg-red-50/50 border-red-200",
  },
} as const;

/**
 * MotorDelayAssessmentSummary — Renders the structured motor delay
 * assessment results for the clinician's review.
 */
export default function MotorDelayAssessmentSummary({
  assessment,
  ageMonths,
  childName,
}: MotorDelayAssessmentSummaryProps) {
  const config = DELAY_FLAG_CONFIG[assessment.delayFlag];
  const FlagIcon = config.icon;

  return (
    <Card className="print-section">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Baby className="h-4 w-4" />
          Motor Milestone Assessment (Route A)
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Age-normed developmental milestone screening for {childName} ({ageMonths} months).
          Based on caregiver-reported observations using Bayley/DAYC-inspired checklists.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Overall delay flag */}
        <div className={`rounded-lg border p-3 ${config.bgClass}`}>
          <div className="flex items-center gap-2">
            <FlagIcon className="h-4 w-4 shrink-0" />
            <Badge variant="outline" className={`text-[10px] ${config.badgeClass}`}>
              {config.label}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{assessment.summaryNote}</p>
        </div>

        {/* Delayed milestones (from earlier bands — critical) */}
        {assessment.delayedMilestones.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50/30 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-red-700">
              Milestones not achieved from earlier stages ({assessment.delayedMilestones.length})
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-red-900/80">
              {assessment.delayedMilestones.map((milestone, index) => (
                <li key={index}>{milestone}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Missing current-band milestones (informational) */}
        {assessment.missingMilestones.length > 0 && (
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Current-stage milestones not yet observed ({assessment.missingMilestones.length})
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              {assessment.missingMilestones.map((milestone, index) => (
                <li key={index}>{milestone}</li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-muted-foreground/70">
              These are within the expected developmental window and may be emerging.
            </p>
          </div>
        )}

        {/* AIMS observations (for ≤18mo only) */}
        {assessment.unobservedAIMSItems.length > 0 && (
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              AIMS-inspired observations not confirmed ({assessment.unobservedAIMSItems.length})
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              {assessment.unobservedAIMSItems.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Screening note */}
        <div className="rounded-lg bg-surface-container-low p-2.5 text-[11px] text-muted-foreground text-center">
          This assessment is a structured screening checklist based on caregiver observations. It
          does not replace formal clinical evaluation with validated instruments (AIMS, Bayley-4, DAYC-2).
        </div>
      </CardContent>
    </Card>
  );
}
