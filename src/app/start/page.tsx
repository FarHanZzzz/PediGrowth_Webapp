"use client";

import { useEffect, useState } from "react";
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

  const raw = sessionStorage.getItem("gaitbridge_session");
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
  // Keep SSR and first client render deterministic to avoid hydration mismatches.
  // Persisted session values are restored only after mount.
  const [consent, setConsent] = useState(false);
  const [ageMonths, setAgeMonths] = useState("");
  const [walking, setWalking] = useState<WalkingAnswer>("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = readSavedSession();
    setConsent(saved.consent);
    setAgeMonths(saved.ageMonths);
    setWalking(saved.walking);
    setNickname(saved.nickname);
  }, []);

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
    sessionStorage.setItem("gaitbridge_session", JSON.stringify({
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
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        {/* Header — minimal */}
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">
            Before You Record
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Share a few details so we can route to the right guidance path.
          </p>
        </div>

        <Card>
          <CardContent className="space-y-5 p-5">
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
                Which option best matches your child today? *
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  {
                    value: "yes" as const,
                    label: "Walks on own",
                    detail: "No routine support needed",
                    color: "border-concern-none/50 bg-concern-none/5",
                  },
                  {
                    value: "no" as const,
                    label: "Not walking yet",
                    detail: "Cannot take independent steps",
                    color: "border-concern-moderate/50 bg-concern-moderate/5",
                  },
                  {
                    value: "not_sure" as const,
                    label: "Not sure",
                    detail: "Mixed or changing pattern",
                    color: "border-border bg-muted/30",
                  },
                ]).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setWalking(option.value)}
                    className={`touch-target flex min-h-[72px] flex-col items-center justify-center rounded-lg border-2 p-2 text-center transition-all ${
                      walking === option.value
                        ? `${option.color} ring-2 ring-primary/30`
                        : "border-border bg-card hover:bg-muted/50"
                    }`}
                  >
                    <span className="text-xs font-semibold text-foreground">{option.label}</span>
                    <span className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{option.detail}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Consent — compact */}
            <div className="flex items-start gap-3 rounded-lg bg-muted/40 p-3">
              <Checkbox
                id="consent"
                checked={consent}
                onCheckedChange={(v) => setConsent(v === true)}
                className="mt-0.5 size-5"
              />
              <Label htmlFor="consent" className="text-xs leading-relaxed cursor-pointer text-muted-foreground">
                I understand GAITBRIDGE is a support tool that does not diagnose conditions.
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

        {/* How-it-works micro-summary */}
        <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
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
  );
}
