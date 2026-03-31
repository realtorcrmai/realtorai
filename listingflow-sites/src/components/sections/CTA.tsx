import React from "react";
import { SiteConfig } from "@/types";

export function CTA({ config }: { config: SiteConfig }) {
  const { theme, cta } = config;

  return (
    <section
      style={{
        padding: "100px 40px",
        background: `linear-gradient(135deg, ${theme.colors.accent}15, ${theme.colors.bg})`,
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        <h2
          style={{
            fontFamily: theme.fonts.heading,
            fontSize: "clamp(28px, 4vw, 48px)",
            fontWeight: 300,
            color: theme.colors.text,
            marginBottom: "40px",
            lineHeight: 1.2,
          }}
        >
          {cta.headline}
        </h2>
        <a
          href={cta.button_link}
          style={{
            display: "inline-block",
            padding: "16px 56px",
            fontFamily: theme.fonts.body,
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "3px",
            textTransform: "uppercase",
            color: theme.colors.bg,
            background: theme.colors.accent,
            textDecoration: "none",
            transition: "opacity 0.3s",
          }}
        >
          {cta.button_text}
        </a>
      </div>
    </section>
  );
}
