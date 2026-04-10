import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { validateEnv } from "@/lib/env-check";
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

export const metadata: Metadata = {
  title: "RealtorAI — Real Estate Transaction & Showing Automation",
  description:
    "AI-powered Real Estate Transaction & Showing Automation CRM for British Columbia",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RealtorAI",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head />
      <body className="antialiased">

        <SessionProvider refetchOnWindowFocus={false} refetchInterval={300}>
          <TooltipProvider>{children}</TooltipProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
