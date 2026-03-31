import React from "react";
import { SiteConfig } from "@/types";

export function About({ config }: { config: SiteConfig }) {
  const { theme, about } = config;

  return (
    <section
      id="about"
      style={{
        padding: "120px 40px",
        background: theme.colors.bg,
        fontFamily: theme.fonts.body,
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "minmax(280px, 400px) 1fr",
          gap: "80px",
          alignItems: "center",
        }}
      >
        {/* Headshot */}
        <div>
          {about.headshot_url ? (
            <img
              src={about.headshot_url}
              alt={about.name}
              style={{
                width: "100%",
                aspectRatio: "3/4",
                objectFit: "cover",
                filter: "grayscale(20%)",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                aspectRatio: "3/4",
                background: `linear-gradient(135deg, ${theme.colors.accent}33, ${theme.colors.bg})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "64px",
                color: theme.colors.accent,
              }}
            >
              {about.name.charAt(0)}
            </div>
          )}
        </div>

        {/* Bio */}
        <div>
          <p
            style={{
              fontSize: "12px",
              letterSpacing: "3px",
              textTransform: "uppercase",
              color: theme.colors.accent,
              marginBottom: "16px",
              fontWeight: 600,
            }}
          >
            About
          </p>
          <h2
            style={{
              fontFamily: theme.fonts.heading,
              fontSize: "clamp(28px, 4vw, 42px)",
              fontWeight: 300,
              color: theme.colors.text,
              marginBottom: "32px",
              lineHeight: 1.2,
            }}
          >
            {about.name}
          </h2>
          {about.title && (
            <p
              style={{
                fontSize: "16px",
                color: theme.colors.accent,
                marginBottom: "24px",
                fontWeight: 500,
              }}
            >
              {about.title}
            </p>
          )}
          <p
            style={{
              fontSize: "16px",
              lineHeight: 1.8,
              color: theme.colors.muted,
              marginBottom: "32px",
            }}
          >
            {about.bio}
          </p>
          {about.credentials.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {about.credentials.map((cred) => (
                <span
                  key={cred}
                  style={{
                    padding: "6px 16px",
                    fontSize: "11px",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    border: `1px solid ${theme.colors.accent}44`,
                    color: theme.colors.accent,
                  }}
                >
                  {cred}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
