import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FollowupPriority = "routine" | "earlier_review" | "specialist";

interface PatientSimpleCardsProps {
  summaryText: string;
  confidenceText: string;
  observations: string[];
  nextWeekActions: string[];
  followupLabel: string;
  followupSummary: string;
  followupPriority: FollowupPriority;
  clinicianQuestions: string[];
}

function statusFromPriority(priority: FollowupPriority): string {
  if (priority === "specialist") return "Needs Follow-up";
  if (priority === "earlier_review") return "Watch";
  return "On Track";
}

function timeframeFromPriority(priority: FollowupPriority): string {
  if (priority === "specialist") return "Suggested timeframe: as soon as possible";
  if (priority === "earlier_review") return "Suggested timeframe: within 2-4 weeks";
  return "Suggested timeframe: routine follow-up";
}

function statusBadgeClass(priority: FollowupPriority): string {
  if (priority === "specialist") return "border-red-300 bg-red-50 text-red-700";
  if (priority === "earlier_review") return "border-amber-300 bg-amber-50 text-amber-700";
  return "border-emerald-300 bg-emerald-50 text-emerald-700";
}

export default function PatientSimpleCards({
  summaryText,
  confidenceText,
  observations,
  nextWeekActions,
  followupLabel,
  followupSummary,
  followupPriority,
  clinicianQuestions,
}: PatientSimpleCardsProps) {
  const statusLabel = statusFromPriority(followupPriority);

  return (
    <section className="space-y-3">
      <Card className="bg-surface-container-lowest">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base font-bold">Overall Summary</CardTitle>
            <Badge variant="outline" className={`text-[10px] ${statusBadgeClass(followupPriority)}`}>
              {statusLabel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-foreground/90">
          <p>{summaryText}</p>
          <p className="text-xs text-muted-foreground">{followupSummary}</p>
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="bg-surface-container-lowest">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Confidence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-foreground/90">
            <p>{confidenceText}</p>
          </CardContent>
        </Card>

        <Card className="bg-surface-container-lowest">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Follow-Up Priority</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-foreground/90">
            <p className="font-semibold">{followupLabel}</p>
            <p>{timeframeFromPriority(followupPriority)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-surface-container-lowest">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold">Key Observations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-foreground/90">
          {observations.map((item) => (
            <p key={item} className="flex items-start gap-2">
              <span className="mt-px">-</span>
              <span>{item}</span>
            </p>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-surface-container-lowest">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold">What To Do This Week</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-foreground/90">
          {nextWeekActions.map((item) => (
            <p key={item} className="flex items-start gap-2">
              <span className="mt-px">-</span>
              <span>{item}</span>
            </p>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-surface-container-lowest">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold">Questions For Your Clinician</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-foreground/90">
          {clinicianQuestions.map((question) => (
            <p key={question} className="flex items-start gap-2">
              <span className="mt-px">-</span>
              <span>{question}</span>
            </p>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
