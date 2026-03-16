import React from "react";
import { SiteConfig } from "@/types";

export function Hero({ config }: { config: SiteConfig }) {
  const { theme, hero } = config;
  const bgImage = hero.images[0] || "";

  return (
    <section
      id="home"
      style={{
        position: "relative",
        height: "100vh",
        minHeight: "600px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        overflow: "hidden",
        background: theme.colors.bg,
      }}
    >
      {bgImage && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${bgImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "brightness(0.4)",
          }}
        />
      )}

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "800px",
          padding: "0 24px",
        }}
      >
        <h1
          style={{
            fontFamily: theme.fonts.heading,
            fontSize: "clamp(36px, 6vw, 72px)",
            fontWeight: 300,
            color: theme.colors.text,
            lineHeight: 1.1,
            marginBottom: "24px",
            letterSpacing: "2px",
          }}
        >
          {hero.headline}
        </h1>
        <p
          style={{
            fontFamily: theme.fonts.body,
            fontSize: "clamp(14px, 2vw, 18px)",
            color: theme.colors.muted,
            lineHeight: 1.6,
            maxWidth: "600px",
            margin: "0 auto 40px",
            letterSpacing: "1px",
          }}
        >
          {hero.subheadline}
        </p>
        <a
          href="#contact"
          style={{
            display: "inline-block",
            padding: "14px 48px",
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
          Get In Touch
        </a>
      </div>
    </section>
  );
}
