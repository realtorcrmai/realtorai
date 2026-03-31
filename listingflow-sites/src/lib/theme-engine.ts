import type { RealtorSite } from "@/types";

const TEMPLATE_DEFAULTS: Record<
  string,
  { primary: string; secondary: string; accent: string; background: string }
> = {
  modern: {
    primary: "#0f7694",
    secondary: "#1a1535",
    accent: "#ff5c3a",
    background: "#ffffff",
  },
  classic: {
    primary: "#2d5a3d",
    secondary: "#3d2b1f",
    accent: "#c4883a",
    background: "#faf8f5",
  },
  luxury: {
    primary: "#1a1a2e",
    secondary: "#d4af37",
    accent: "#e6c75a",
    background: "#0f0f1a",
  },
  minimal: {
    primary: "#111111",
    secondary: "#555555",
    accent: "#0066ff",
    background: "#ffffff",
  },
  bold: {
    primary: "#6c2bd9",
    secondary: "#1a1535",
    accent: "#ff3d71",
    background: "#fafafe",
  },
};

export function generateThemeCSS(site: RealtorSite): string {
  const defaults = TEMPLATE_DEFAULTS[site.template] ?? TEMPLATE_DEFAULTS.modern;

  const primary = site.colors?.primary ?? defaults.primary;
  const secondary = site.colors?.secondary ?? defaults.secondary;
  const accent = site.colors?.accent ?? defaults.accent;
  const background = site.colors?.background ?? defaults.background;
  const heading = site.fonts?.heading ?? "Inter";
  const body = site.fonts?.body ?? "Inter";

  return `
    :root {
      --rt-primary: ${primary};
      --rt-secondary: ${secondary};
      --rt-accent: ${accent};
      --rt-bg: ${background};
      --rt-font-heading: '${heading}', sans-serif;
      --rt-font-body: '${body}', sans-serif;
    }
  `;
}

export function getTemplateFonts(site: RealtorSite): string[] {
  const heading = site.fonts?.heading ?? "Inter";
  const body = site.fonts?.body ?? "Inter";
  const unique = new Set([heading, body]);
  return Array.from(unique);
}
