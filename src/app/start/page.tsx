"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  ShieldCheck,
  ChevronRight,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { routeChild } from "@/lib/policy/routing-rules";
import type { AmbulatoryStatus } from "@/lib/types";

type WalkingAnswer = "yes" | "no" | "not_sure" | "";

function mapWalkingToAmbulatory(answer: WalkingAnswer): AmbulatoryStatus {
  switch (answer) {
    case "yes": return "independent";
    case "no": return "non_ambulant";
    case "not_sure": return "unknown";
    default: return "unknown";
  }
}

function readSavedSession(): {
  consent: boolean;
  ageMonths: string;
  walking: WalkingAnswer;
  nickname: string;
} {
  if (typeof window === "undefined") {
    return {
      consent: false,
      ageMonths: "",
      walking: "" as WalkingAnswer,
      nickname: "",
    };
  }

  const raw = sessionStorage.getItem("pedigrowth_session");
  if (!raw) {
    return {
      consent: false,
      ageMonths: "",
      walking: "" as WalkingAnswer,
      nickname: "",
    };
  }

  try {
    const session = JSON.parse(raw);
    return {
      consent: Boolean(session.consentTimestamp),
      ageMonths: session.ageMonths ? session.ageMonths.toString() : "",
      walking: (session.walking as WalkingAnswer) || "",
      nickname:
        session.nickname && session.nickname !== "your child"
          ? session.nickname
          : "",
    };
  } catch {
    return {
      consent: false,
      ageMonths: "",
      walking: "" as WalkingAnswer,
      nickname: "",
    };
  }
}

export default function QuickGatePage() {
  const router = useRouter();
  const saved = readSavedSession();
  const [consent, setConsent] = useState(saved.consent);
  const [ageMonths, setAgeMonths] = useState(saved.ageMonths);
  const [walking, setWalking] = useState<WalkingAnswer>(saved.walking);
  const [nickname, setNickname] = useState(saved.nickname);
  const [error, setError] = useState("");

  const canProceed = consent && ageMonths.trim() !== "" && walking !== "";

  function handleStart() {
    setError("");

    const age = Number(ageMonths);
    if (isNaN(age) || age < 0 || age > 216) {
      setError("Please enter a valid age in months");
      return;
    }

    // Run routing — inline, no dedicated page
    const decision = routeChild({
      ageMonths: age,
      ambulatoryStatus: mapWalkingToAmbulatory(walking),
      caregiverIndicatesCannotWalk: walking === "no",
    });

    // Store minimal session data
    sessionStorage.setItem("pedigrowth_session", JSON.stringify({
      nickname: nickname.trim() || "your child",
      ageMonths: age,
      walking,
      route: decision.route,
      routeReason: decision.reason,
      policyVersion: decision.policyVersion,
      consentTimestamp: new Date().toISOString(),
    }));

    // Route silently — no intermediate routing page
    if (decision.route === "route_a") {
      router.push("/concern");
    } else {
      router.push("/capture");
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="clinical-layer rounded-[1.8rem] p-6 sm:p-7">
          <Badge variant="secondary" className="mb-4 gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Intake Gate
          </Badge>
          <h1 data-display="true" className="text-3xl font-semibold leading-tight sm:text-4xl">
            Start a calm, structured assessment.
          </h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Answer three essentials so we route your child to the right experience: concern navigator or full gait analysis.
          </p>
          <div className="mt-6 space-y-3 text-sm text-foreground/80">
            <p className="rounded-2xl bg-surface-container-lowest p-3">Age and walking status determine a safe route.</p>
            <p className="rounded-2xl bg-surface-container-lowest p-3">No diagnosis language, always clinician-safe framing.</p>
          </div>
        </aside>

        <Card className="rounded-[1.8rem]">
          <CardContent className="space-y-6 p-6 sm:p-7">
            {/* Nickname — optional */}
            <div className="space-y-1.5">
              <Label htmlFor="nickname" className="text-sm">
                Child&apos;s name or nickname <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="nickname"
                placeholder="e.g., Alex"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="touch-target"
                autoComplete="off"
              />
            </div>

            {/* Age — required */}
            <div className="space-y-1.5">
              <Label htmlFor="age" className="text-sm font-medium">
                Age in months *
              </Label>
              <Input
                id="age"
                type="number"
                inputMode="numeric"
                min={0}
                max={216}
                placeholder="e.g., 36"
                value={ageMonths}
                onChange={(e) => { setAgeMonths(e.target.value); setError(""); }}
                className="touch-target"
              />
              <p className="text-[11px] text-muted-foreground">
                3 years = 36 · 4 years = 48 · 5 years = 60
              </p>
            </div>

            {/* Walking — required, big touch targets */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Does your child walk independently? *
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "yes" as const, label: "Yes", color: "bg-secondary-container text-secondary-foreground" },
                  { value: "no" as const, label: "No", color: "bg-error-container text-on-error-container" },
                  { value: "not_sure" as const, label: "Not sure", color: "bg-surface-container-low text-foreground" },
                ]).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setWalking(option.value)}
                    className={`touch-target flex items-center justify-center rounded-2xl border border-transparent p-3 text-sm font-medium transition-all ${
                      walking === option.value
                        ? `${option.color} shadow-[0_12px_32px_rgba(21,29,28,0.06)]`
                        : "bg-surface-container-low hover:bg-surface-variant"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Consent — compact */}
            <div className="flex items-start gap-3 rounded-2xl bg-surface-container-low p-4">
              <Checkbox
                id="consent"
                checked={consent}
                onCheckedChange={(v) => setConsent(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="consent" className="text-xs leading-relaxed cursor-pointer text-muted-foreground">
                I understand Pedi-Growth is a support tool that does not diagnose conditions.
                Video is processed on my device and not stored unless I choose to save.
              </Label>
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}

            {/* Start button */}
            <Button
              onClick={handleStart}
              disabled={!canProceed}
              size="lg"
              className="touch-target w-full gap-2 text-base font-semibold"
              id="quickgate-start"
            >
              <Play className="h-4 w-4" />
              {walking === "no" || walking === "not_sure"
                ? "Continue"
                : "Start Recording Guide"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <div className="flex items-center justify-center gap-4 rounded-2xl bg-surface-container-low px-4 py-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Not diagnostic
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" /> Privacy-first
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
