"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  AlertTriangle,
  ArrowLeft,
  Printer,
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

const RED_FLAGS = [
  { id: "rf-1", label: "Loss of previously acquired motor skills", urgent: true },
  { id: "rf-2", label: "Significant asymmetry in posture or movement", urgent: true },
  { id: "rf-3", label: "Strong preference for one side of the body", urgent: true },
  { id: "rf-4", label: "Unusual stiffness or floppiness in limbs", urgent: false },
  { id: "rf-5", label: "Not weight-bearing on legs by 12 months", urgent: false },
  { id: "rf-6", label: "Not sitting independently by 9 months", urgent: false },
  { id: "rf-7", label: "Seizures or unusual movements", urgent: true },
];

export default function ConcernPage() {
  const router = useRouter();
  const [childName] = useState(() => {
    if (typeof window === "undefined") return "your child";
    try {
      const raw =
        sessionStorage.getItem("gaitbridge_session") ??
        sessionStorage.getItem("pedigrowth_session");
      if (!raw) return "your child";
      const session = JSON.parse(raw);
      return session.nickname || "your child";
    } catch {
      return "your child";
    }
  });
  const [flags, setFlags] = useState<Record<string, boolean>>({});

  useEffect(() => {
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
  }, [router]);

  const flaggedCount = Object.values(flags).filter(Boolean).length;
  const urgentCount = RED_FLAGS.filter((rf) => rf.urgent && flags[rf.id]).length;

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
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
        </div>

        {/* Why no gait analysis */}
        <Card className="mb-4 bg-surface-container-low">
          <CardContent className="p-4 text-xs text-muted-foreground">
            <p>
              Gait analysis requires independent walking. When {childName}{" "}
              starts walking, you can come back for a full gait assessment.
            </p>
          </CardContent>
        </Card>

        {/* Red flags — quick checklist */}
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

        {/* Results */}
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

        {/* Guidance */}
        <Card className="mb-4 bg-surface-container-low">
          <CardContent className="p-4 space-y-2 text-xs text-foreground/80">
            <p className="font-semibold text-foreground">Suggested next steps:</p>
            <p>• Share your observations with your child&apos;s pediatrician</p>
            <p>• Request a developmental evaluation if you have ongoing concerns</p>
            <p>• When {childName} begins walking independently, come back for gait analysis</p>
            <p>• Take a screenshot of this page to share with your healthcare team</p>
          </CardContent>
        </Card>

        {/* Non-diagnostic reminder */}
        <div className="mb-4 rounded-2xl bg-surface-container-low p-3 text-xs text-muted-foreground text-center">
          Pedi-Growth supports concern documentation — it does not diagnose conditions.
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          {flaggedCount > 0 && (
            <Button
              className="w-full gap-2 text-base font-semibold"
              size="lg"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
              Print / Save Summary (PDF)
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
