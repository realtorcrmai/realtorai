import React from "react";
import { SiteConfig } from "@/types";

export function Stats({ config }: { config: SiteConfig }) {
  const { theme, stats } = config;

  if (!stats.items.length) return null;

  return (
    <section
      style={{
        padding: "80px 40px",
        background: theme.colors.bg,
        borderTop: `1px solid ${theme.colors.text}10`,
        borderBottom: `1px solid ${theme.colors.text}10`,
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(stats.items.length, 4)}, 1fr)`,
          gap: "40px",
          textAlign: "center",
        }}
      >
        {stats.items.map((stat, i) => (
          <div key={i}>
            <div
              style={{
                fontFamily: theme.fonts.heading,
                fontSize: "clamp(36px, 5vw, 56px)",
                fontWeight: 300,
                color: theme.colors.accent,
                lineHeight: 1,
                marginBottom: "12px",
              }}
            >
              {stat.number}
            </div>
            <div
              style={{
                fontFamily: theme.fonts.body,
                fontSize: "11px",
                letterSpacing: "3px",
                textTransform: "uppercase",
                color: theme.colors.muted,
                fontWeight: 500,
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
