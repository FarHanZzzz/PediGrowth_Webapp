import Link from "next/link";
import {
  Play,
  ShieldCheck,
  Zap,
  BarChart3,
  ArrowRight,
  Eye,
  Heart,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero — video-first messaging */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 pb-16 pt-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Badge
            variant="secondary"
            className="mb-6 gap-1.5 px-3 py-1 text-xs font-medium"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Caregiver Support Tool - Not a Diagnostic Device
          </Badge>

          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Understand your child&apos;s walking video with clear, caregiver-friendly guidance.
          </h1>

          <p className="mt-4 text-base font-medium text-foreground/80 sm:text-lg">
            Record one short front-view clip. We help you see what looked steady, what looked less clear, and what to discuss next.
          </p>

          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            GAITBRIDGE reviews visible movement patterns like left-right balance, step rhythm, and steadiness, then explains findings in plain language with evidence.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/start" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="touch-target w-full gap-2 text-base font-semibold sm:w-auto"
                id="cta-start"
              >
                <Play className="h-4 w-4" />
                Start Analysis
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            No account needed · Most analyses in under a minute · Privacy-first
          </p>

          <div className="mx-auto mt-6 grid max-w-2xl gap-3 text-left sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-card/70 p-3">
              <p className="text-xs font-semibold text-foreground">What you get right away</p>
              <p className="mt-1 text-xs text-muted-foreground">
                A plain-language summary, confidence guidance, and clear notes on what could not be evaluated safely.
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/70 p-3">
              <p className="text-xs font-semibold text-foreground">Why families trust it</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Every result includes visual evidence and never claims to diagnose a medical condition.
              </p>
            </div>
          </div>
        </div>

        {/* Decorative */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
      </section>

      {/* How it works — 3 steps, not 4 */}
      <section className="border-t bg-card px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-xl font-bold text-foreground sm:text-2xl">
            Three Simple Steps
          </h2>

          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: Play,
                step: "1",
                title: "Record",
                desc: "Capture a short front-view walking clip with in-app guidance.",
                color: "text-primary",
                bg: "bg-primary/10",
              },
              {
                icon: Zap,
                step: "2",
                title: "Analyze",
                desc: "We check video quality and measure visible movement patterns.",
                color: "text-concern-moderate",
                bg: "bg-concern-moderate/10",
              },
              {
                icon: BarChart3,
                step: "3",
                title: "Results",
                desc: "See a clear summary, annotated hero video, and evidence.",
                color: "text-concern-none",
                bg: "bg-concern-none/10",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex flex-col items-center rounded-2xl border border-border/50 bg-card p-6 text-center transition-shadow hover:shadow-md"
              >
                <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${item.bg}`}>
                  <item.icon className={`h-6 w-6 ${item.color}`} />
                </div>
                <div className="mb-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Step {item.step}
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust signals — compact */}
      <section className="border-t px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                title: "Never Diagnoses",
                desc: "Documents movement concerns and supports follow-up conversations.",
              },
              {
                icon: Eye,
                title: "Explainable",
                desc: "Each result shows what was measured and what remained unclear.",
              },
              {
                icon: Heart,
                title: "Privacy-First",
                desc: "Video is processed locally. Nothing is kept unless you choose to save.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <div className="flex-shrink-0 rounded-lg bg-primary/10 p-2.5">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Speed callout */}
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Most analyses complete in under 60 seconds</span>
          </div>
        </div>
      </section>
    </div>
  );
}
