import React from "react";
import { SiteConfig } from "@/types";

export function Nav({ config }: { config: SiteConfig }) {
  const { theme, nav, about } = config;

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: "20px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(0,0,0,0.3)",
        backdropFilter: "blur(12px)",
        fontFamily: theme.fonts.body,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {nav.logo_url && (
          <img
            src={nav.logo_url}
            alt={about.name}
            style={{ height: "36px", objectFit: "contain" }}
          />
        )}
        <span
          style={{
            fontFamily: theme.fonts.heading,
            fontSize: "20px",
            fontWeight: 600,
            color: theme.colors.text,
            letterSpacing: "1px",
            textTransform: "uppercase",
          }}
        >
          {about.name}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
        {nav.links.map((link) => (
          <a
            key={link}
            href={`#${link.toLowerCase()}`}
            style={{
              color: theme.colors.muted,
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: 500,
              letterSpacing: "2px",
              textTransform: "uppercase",
              transition: "color 0.3s",
            }}
          >
            {link}
          </a>
        ))}
      </div>
    </nav>
  );
}
