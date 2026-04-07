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
            Support Tool — Not a Diagnostic Device
          </Badge>

          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              GAITBRIDGE
            </span>
          </h1>

          <p className="mt-4 text-lg font-medium text-foreground/80 sm:text-xl">
            Start with a simple front-view walking video.
          </p>

          <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
            GaitBridge analyzes visible movement patterns such as symmetry,
            stability, and regularity, then explains what was observed and what
            follow-up may be helpful.
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
            No account needed · Analysis in under a minute · Privacy-first
          </p>
        </div>

        {/* Decorative */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
      </section>

      {/* How it works — 3 steps, not 4 */}
      <section className="border-t bg-card px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-xl font-bold text-foreground sm:text-2xl">
            Three Steps to Results
          </h2>

          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: Play,
                step: "1",
                title: "Record",
                desc: "A short walking video — we'll guide you on how.",
                color: "text-primary",
                bg: "bg-primary/10",
              },
              {
                icon: Zap,
                step: "2",
                title: "Analyze",
                desc: "Automatic quality check and gait pattern extraction.",
                color: "text-concern-moderate",
                bg: "bg-concern-moderate/10",
              },
              {
                icon: BarChart3,
                step: "3",
                title: "Results",
                desc: "Plain-language summary of what we found.",
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
                desc: "Documents concerns — never claims to diagnose.",
              },
              {
                icon: Eye,
                title: "Explainable",
                desc: "Every observation shows what was measured and limitations.",
              },
              {
                icon: Heart,
                title: "Privacy-First",
                desc: "Video processed on your device. Nothing stored without your choice.",
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
