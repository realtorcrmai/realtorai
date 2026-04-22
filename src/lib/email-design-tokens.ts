/**
 * Email Design Tokens — G-E02
 *
 * Centralised token system for the email block renderer.
 * Three themes: standard (brand indigo), luxury (minimal black), editorial (serif warm).
 * Tokens are injected into EmailData at assembly time (_theme, _tokens).
 */

export type EmailTheme = "standard" | "luxury" | "editorial";

export type ThemeTokens = {
  colors: {
    bg: string;
    surface: string;
    surfaceAlt: string;
    border: string;
    text: string;
    textMuted: string;
    textInverse: string;
    accent: string;
    positive: string;
    negative: string;
    headerBg: string;
    footerBg: string;
    footerText: string;
  };
  font: {
    family: string;
    familyHeading: string;
    size: {
      display: string;
      h1: string;
      h2: string;
      h3: string;
      body: string;
      small: string;
      micro: string;
    };
    weight: {
      normal: string;
      medium: string;
      semibold: string;
      bold: string;
      heavy: string;
    };
    lineHeight: {
      tight: string;
      normal: string;
      loose: string;
    };
  };
  space: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
    section: string;
  };
  radius: { sm: string; md: string; lg: string; xl: string };
  shadow: { card: string; sm: string };
};

const SF =
  "-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',Arial,sans-serif";
const SF_DISPLAY =
  "-apple-system,BlinkMacSystemFont,'SF Pro Display','Helvetica Neue',Arial,sans-serif";

export const LUXURY_THEME: ThemeTokens = {
  colors: {
    bg: "#ffffff",
    surface: "#ffffff",
    surfaceAlt: "#f9f9f9",
    border: "#e8e8e8",
    text: "#1a1a1a",
    textMuted: "#6b6b6b",
    textInverse: "#ffffff",
    accent: "#1a1a1a",
    positive: "#1a6e3c",
    negative: "#b91c1c",
    headerBg: "#ffffff",
    footerBg: "#f5f5f5",
    footerText: "#999999",
  },
  font: {
    family: SF,
    familyHeading: SF_DISPLAY,
    size: {
      display: "32px",
      h1: "24px",
      h2: "20px",
      h3: "17px",
      body: "15px",
      small: "13px",
      micro: "11px",
    },
    weight: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
      heavy: "800",
    },
    lineHeight: { tight: "1.3", normal: "1.6", loose: "1.8" },
  },
  space: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    xxl: "48px",
    section: "40px",
  },
  radius: { sm: "4px", md: "8px", lg: "12px", xl: "16px" },
  shadow: {
    card: "0 1px 3px rgba(0,0,0,0.08)",
    sm: "0 1px 2px rgba(0,0,0,0.05)",
  },
};

export const STANDARD_THEME: ThemeTokens = {
  colors: {
    bg: "#f4f2ff",
    surface: "#ffffff",
    surfaceAlt: "#f5f5f7",
    border: "#e8e5f5",
    text: "#1a1535",
    textMuted: "#6b6b8d",
    textInverse: "#ffffff",
    accent: "#4f35d2",
    positive: "#059669",
    negative: "#dc2626",
    headerBg: "#4f35d2",
    footerBg: "#f5f5f7",
    footerText: "#a0a0b0",
  },
  font: {
    family: SF,
    familyHeading: SF_DISPLAY,
    size: {
      display: "32px",
      h1: "24px",
      h2: "20px",
      h3: "17px",
      body: "15px",
      small: "13px",
      micro: "11px",
    },
    weight: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
      heavy: "800",
    },
    lineHeight: { tight: "1.3", normal: "1.6", loose: "1.8" },
  },
  space: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    xxl: "48px",
    section: "40px",
  },
  radius: { sm: "4px", md: "8px", lg: "12px", xl: "16px" },
  shadow: {
    card: "0 2px 12px rgba(79,53,210,0.08)",
    sm: "0 1px 4px rgba(79,53,210,0.06)",
  },
};

export const EDITORIAL_THEME: ThemeTokens = {
  colors: {
    bg: "#f9f7f2",
    surface: "#ffffff",
    surfaceAlt: "#f0ebe0",
    border: "#e8e2d5",
    text: "#4a4a3a",
    textMuted: "#6b6b5a",
    textInverse: "#ffffff",
    accent: "#1a2e1a",
    positive: "#1a6e3c",
    negative: "#b91c1c",
    headerBg: "#1a2e1a",
    footerBg: "#f0ebe0",
    footerText: "#6b6b5a",
  },
  font: {
    family: "Georgia,'Times New Roman',serif",
    familyHeading: "Georgia,'Times New Roman',serif",
    size: {
      display: "32px",
      h1: "24px",
      h2: "20px",
      h3: "17px",
      body: "15px",
      small: "13px",
      micro: "11px",
    },
    weight: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
      heavy: "800",
    },
    lineHeight: { tight: "1.3", normal: "1.6", loose: "1.8" },
  },
  space: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    xxl: "48px",
    section: "40px",
  },
  radius: { sm: "4px", md: "8px", lg: "12px", xl: "16px" },
  shadow: {
    card: "0 1px 3px rgba(0,0,0,0.06)",
    sm: "0 1px 2px rgba(0,0,0,0.04)",
  },
};

export const THEMES: Record<EmailTheme, ThemeTokens> = {
  standard: STANDARD_THEME,
  luxury: LUXURY_THEME,
  editorial: EDITORIAL_THEME,
};

/**
 * Returns the most appropriate theme for a given email type.
 * Callers can always override via the `themeOverride` param in assembleEmail.
 */
export function getDefaultTheme(emailType: string): EmailTheme {
  const luxuryTypes = [
    "listing_alert",
    "luxury_showcase",
    "open_house",
    "price_drop_alert",
    "luxury_listing",
  ];
  const editorialTypes = [
    "market_update",
    "neighbourhood_guide",
    "just_sold",
    "home_anniversary",
  ];
  if (luxuryTypes.includes(emailType)) return "luxury";
  if (editorialTypes.includes(emailType)) return "editorial";
  return "standard";
}
