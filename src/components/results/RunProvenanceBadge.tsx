"use client";

import { AlertTriangle, CheckCircle2, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  classifyRunTone,
  getRunLabel,
  type RunProvenance,
} from "@/lib/session/runProvenance";

interface Props {
  run: RunProvenance;
}

export default function RunProvenanceBadge({ run }: Props) {
  const tone = classifyRunTone(run.classification);
  const styles =
    tone === "success"
      ? "border-green-200 bg-green-50 text-green-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-red-200 bg-red-50 text-red-700";

  const Icon =
    run.classification === "real_analysis"
      ? CheckCircle2
      : run.classification === "demo_fixture"
        ? FlaskConical
        : AlertTriangle;

  return (
    <Badge variant="outline" className={`gap-1.5 px-2.5 py-1 text-[10px] font-semibold ${styles}`}>
      <Icon className="h-3.5 w-3.5" />
      {getRunLabel(run.classification)}
    </Badge>
  );
}
