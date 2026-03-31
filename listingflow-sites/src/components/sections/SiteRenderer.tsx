import React from "react";
import { SiteConfig } from "@/types";
import { Nav } from "./Nav";
import { Hero } from "./Hero";
import { About } from "./About";
import { Stats } from "./Stats";
import { Testimonials } from "./Testimonials";
import { Listings } from "./Listings";
import { CTA } from "./CTA";
import { Contact } from "./Contact";
import { Footer } from "./Footer";

/**
 * Renders a complete single-page realtor website from a SiteConfig.
 * Used both in admin preview and by the agent's static renderer.
 */
export function SiteRenderer({ config }: { config: SiteConfig }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: config.theme.colors.bg,
        color: config.theme.colors.text,
      }}
    >
      <Nav config={config} />
      <Hero config={config} />
      <About config={config} />
      <Stats config={config} />
      <Listings config={config} />
      <Testimonials config={config} />
      <CTA config={config} />
      <Contact config={config} />
      <Footer config={config} />
    </div>
  );
}

/**
 * Renders the full HTML document (for static export).
 * Includes Google Fonts via CDN — no build step needed.
 */
export function renderSiteHTML(config: SiteConfig, bodyHTML: string): string {
  const { heading, body } = config.theme.fonts;
  const fontsParam = [heading, body]
    .filter((f, i, arr) => arr.indexOf(f) === i)
    .map((f) => f.replace(/ /g, "+"))
    .join("&family=");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${config.about.name} — Real Estate</title>
  <meta name="description" content="${config.hero.subheadline}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=${fontsParam}&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { background: ${config.theme.colors.bg}; color: ${config.theme.colors.text}; -webkit-font-smoothing: antialiased; }
    a:hover { opacity: 0.8; }
    button:hover { opacity: 0.9; }
    img { max-width: 100%; display: block; }
    @media (max-width: 768px) {
      nav > div:last-child { display: none !important; }
      section > div { grid-template-columns: 1fr !important; }
      footer > div:first-child { grid-template-columns: 1fr !important; }
      form > div { grid-template-columns: 1fr !important; }
    }
  </style>
</head>
<body>
${bodyHTML}
</body>
</html>`;
}
