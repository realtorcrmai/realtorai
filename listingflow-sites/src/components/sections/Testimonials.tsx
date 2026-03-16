import React from "react";
import { SiteConfig } from "@/types";

export function Testimonials({ config }: { config: SiteConfig }) {
  const { theme, testimonials } = config;

  if (!testimonials.items.length) return null;

  return (
    <section
      id="testimonials"
      style={{
        padding: "120px 40px",
        background: theme.colors.bg,
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <p
          style={{
            fontSize: "12px",
            letterSpacing: "3px",
            textTransform: "uppercase",
            color: theme.colors.accent,
            marginBottom: "16px",
            fontWeight: 600,
            textAlign: "center",
            fontFamily: theme.fonts.body,
          }}
        >
          Client Reviews
        </p>
        <h2
          style={{
            fontFamily: theme.fonts.heading,
            fontSize: "clamp(28px, 4vw, 42px)",
            fontWeight: 300,
            color: theme.colors.text,
            textAlign: "center",
            marginBottom: "64px",
          }}
        >
          What My Clients Say
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fit, minmax(300px, 1fr))`,
            gap: "32px",
          }}
        >
          {testimonials.items.map((t, i) => (
            <div
              key={i}
              style={{
                padding: "40px",
                border: `1px solid ${theme.colors.text}10`,
                background: `${theme.colors.text}05`,
              }}
            >
              <div
                style={{
                  fontSize: "48px",
                  lineHeight: 1,
                  color: theme.colors.accent,
                  marginBottom: "20px",
                  fontFamily: "Georgia, serif",
                }}
              >
                &ldquo;
              </div>
              <p
                style={{
                  fontFamily: theme.fonts.body,
                  fontSize: "15px",
                  lineHeight: 1.8,
                  color: theme.colors.muted,
                  marginBottom: "24px",
                  fontStyle: "italic",
                }}
              >
                {t.quote}
              </p>
              <div>
                <div
                  style={{
                    fontFamily: theme.fonts.body,
                    fontSize: "14px",
                    fontWeight: 600,
                    color: theme.colors.text,
                  }}
                >
                  {t.name}
                </div>
                <div
                  style={{
                    fontFamily: theme.fonts.body,
                    fontSize: "12px",
                    color: theme.colors.accent,
                    marginTop: "4px",
                  }}
                >
                  {t.role}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
