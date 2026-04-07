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
  Stethoscope,
  Sparkles,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function LandingPage() {
  return (
    <div className="flex flex-col pb-12">
      <section className="relative px-4 pb-10 pt-7 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="clinical-layer relative overflow-hidden rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10">
            <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-primary/15 blur-3xl" />
            <div className="absolute -bottom-20 left-10 h-44 w-44 rounded-full bg-tertiary-fixed/35 blur-3xl" />

            <Badge variant="secondary" className="mb-5 gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Support Tool - Not a Diagnostic Device
            </Badge>

            <h1 data-display="true" className="max-w-xl text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              The Clinical Atelier for pediatric gait insights.
            </h1>

            <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Capture one front-view walking clip and receive a premium, clinician-ready report
              with confidence context, visual evidence, and practical follow-up guidance.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/start" className="w-full sm:w-auto">
                <Button size="lg" className="touch-target w-full gap-2 px-6" id="cta-start">
                  <Play className="h-4 w-4" />
                  Start Analysis
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/capture" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="touch-target w-full gap-2 px-6">
                  <Video className="h-4 w-4" />
                  Open Capture
                </Button>
              </Link>
            </div>

            <p className="mt-5 text-xs text-muted-foreground">
              No account needed - results in under 60 seconds - privacy-first
            </p>
          </div>

          <aside className="clinical-card relative rounded-[2rem] p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Live Summary</p>
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl bg-surface-container-low p-4">
                <p className="text-xs text-muted-foreground">Risk Frame</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">Calibrated</p>
                <div className="mt-3 h-1.5 rounded-full bg-outline-variant/30">
                  <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-primary to-tertiary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-surface-container-low p-4">
                  <p className="text-xs text-muted-foreground">Domains</p>
                  <p className="mt-1 text-lg font-semibold">4</p>
                </div>
                <div className="rounded-2xl bg-surface-container-low p-4">
                  <p className="text-xs text-muted-foreground">Trace Frames</p>
                  <p className="mt-1 text-lg font-semibold">120+</p>
                </div>
              </div>
              <div className="rounded-2xl bg-primary/8 p-4 text-xs text-foreground/75">
                Reports include context cards, confidence notes, and clinician-safe language.
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-end justify-between gap-3">
            <h2 data-display="true" className="text-2xl font-semibold sm:text-3xl">Three Steps to Results</h2>
            <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
              <Clock className="h-4 w-4" />
              Under one minute
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: Play, title: "Record", desc: "Front-view clip with guided capture." },
              { icon: Zap, title: "Analyze", desc: "Pose, quality, and concern extraction." },
              { icon: BarChart3, title: "Review", desc: "Clear findings, evidence, and export." },
            ].map((item) => (
              <div key={item.title} className="clinical-card rounded-[1.6rem] p-6">
                <div className="mb-4 inline-flex rounded-2xl bg-surface-container-low p-3">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pt-2 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "Never Diagnoses", desc: "Concern documentation only." },
            { icon: Eye, title: "Explainable", desc: "Visible metrics and trace-based evidence." },
            { icon: Heart, title: "Privacy-First", desc: "On-device processing by default." },
          ].map((item) => (
            <div key={item.title} className="clinical-layer rounded-[1.4rem] p-5">
              <div className="mb-2 inline-flex rounded-xl bg-surface-container-lowest p-2.5">
                <item.icon className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-5 flex max-w-6xl items-center gap-2 text-sm text-muted-foreground">
          <Stethoscope className="h-4 w-4" />
          Built for safer family-clinician conversations, not diagnosis.
        </div>
      </section>
    </div>
  );
}
