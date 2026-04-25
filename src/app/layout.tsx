import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { validateEnv } from "@/lib/env-check";
import { CookieConsent } from "@/components/layout/CookieConsent";
import "./globals.css";

// Validate required env vars on first server-side import.
// In production: throws if any are missing (deploy fails fast).
// In development: logs warnings but lets the server start.
validateEnv();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Magnate — 360 AI Platform for Realtors",
  description:
    "Magnate — the 360 AI Platform for Realtors. Automate listings, showings, emails, and client journeys.",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Magnate",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable}`}>
      <head />
      <body className="antialiased">
        {/* Inline script runs before React hydrates — sets layout data attribute to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var l=localStorage.getItem("lf-layout-mode");if(l==="sidebar")document.documentElement.dataset.layout="sidebar"}catch(e){}`,
          }}
        />

        <SessionProvider refetchOnWindowFocus={false} refetchInterval={300}>
          <TooltipProvider>{children}</TooltipProvider>
        </SessionProvider>
        <CookieConsent />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
