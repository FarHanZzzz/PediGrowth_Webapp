import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GAITBRIDGE — Pediatric Gait Concern Analysis",
  description:
    "A mobile-first platform that helps families and clinicians capture, understand, and communicate gait-related concerns more consistently and earlier. Not a diagnostic tool.",
  robots: "noindex, nofollow", // MVP: private product
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5fa" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a2e" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <div className="flex min-h-dvh flex-col">
          {/* App Shell */}
          <main className="flex-1">{children}</main>

          {/* Global disclaimer footer — visible on every page */}
          <footer className="border-t border-border bg-muted/50 px-4 py-3 text-center text-xs text-muted-foreground">
            <p>
              GAITBRIDGE is a concern documentation and monitoring support tool.
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
