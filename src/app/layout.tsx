import type { Metadata, Viewport } from "next";
import { Epilogue, Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const epilogue = Epilogue({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Pedi-Growth — Pediatric Gait Concern Analysis",
  description:
    "A mobile-first platform that helps families and clinicians capture, understand, and communicate gait-related concerns more consistently and earlier. Not a diagnostic tool.",
  robots: "noindex, nofollow", // MVP: private product
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  // P1-04: Removed userScalable: false — accessibility violation for users with visual impairments
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3fbf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1a19" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${epilogue.variable}`}
    >
      <body className="font-sans antialiased">
        <div className="clinical-shell flex min-h-dvh flex-col">
          {/* P1-02: Navigation Header */}
          <header className="sticky top-0 z-50 px-4 py-3">
            <div className="clinical-glass mx-auto flex max-w-5xl items-center justify-between rounded-3xl px-4 py-2.5 shadow-[0_12px_32px_rgba(21,29,28,0.06)]">
              <div className="flex items-center gap-4">
                <Link
                  href="/"
                  className="text-sm font-semibold tracking-tight text-foreground transition-colors hover:text-primary"
                >
                  Pedi-Growth
                </Link>
                <nav className="hidden items-center gap-1.5 md:flex">
                  <Link href="/" className="rounded-full bg-secondary/10 px-3 py-1 text-[11px] font-medium text-foreground/80">Dashboard</Link>
                  <Link href="/start" className="rounded-full px-3 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary/10 hover:text-foreground">Intake</Link>
                  <Link href="/capture" className="rounded-full px-3 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary/10 hover:text-foreground">Capture</Link>
                </nav>
              </div>
              <span className="rounded-full bg-surface-container-low px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                Screening Support Tool
              </span>
            </div>
          </header>

          {/* App Shell */}
          <main className="flex-1">{children}</main>

          {/* Global disclaimer footer — visible on every page */}
          <footer className="clinical-layer px-4 py-5 text-center text-xs text-muted-foreground">
            <p className="mx-auto max-w-4xl">
              Pedi-Growth is a concern documentation and monitoring support tool.
              It does <strong>not</strong> diagnose medical conditions.{" "}
              <span className="hidden sm:inline">
                Always consult qualified healthcare professionals for clinical
                decisions.
              </span>
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
