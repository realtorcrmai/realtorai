import React from "react";
import { SiteConfig } from "@/types";

export function Footer({ config }: { config: SiteConfig }) {
  const { theme, footer, about, nav } = config;

  return (
    <footer
      style={{
        padding: "80px 40px 40px",
        background: theme.colors.bg,
        borderTop: `1px solid ${theme.colors.text}10`,
        fontFamily: theme.fonts.body,
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr",
          gap: "60px",
        }}
      >
        {/* Brand column */}
        <div>
          <h3
            style={{
              fontFamily: theme.fonts.heading,
              fontSize: "20px",
              fontWeight: 500,
              color: theme.colors.text,
              marginBottom: "16px",
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            {about.name}
          </h3>
          {about.title && (
            <p
              style={{
                fontSize: "13px",
                color: theme.colors.accent,
                marginBottom: "16px",
              }}
            >
              {about.title}
            </p>
          )}
          {footer.address && (
            <p style={{ fontSize: "13px", color: theme.colors.muted, lineHeight: 1.8 }}>
              {footer.address}
            </p>
          )}
          {footer.phone && (
            <p style={{ fontSize: "13px", color: theme.colors.muted, marginTop: "8px" }}>
              {footer.phone}
            </p>
          )}
          {footer.email && (
            <p style={{ fontSize: "13px", color: theme.colors.muted, marginTop: "4px" }}>
              {footer.email}
            </p>
          )}
        </div>

        {/* Quick links */}
        <div>
          <h4
            style={{
              fontSize: "11px",
              letterSpacing: "3px",
              textTransform: "uppercase",
              color: theme.colors.accent,
              marginBottom: "20px",
              fontWeight: 600,
            }}
          >
            Quick Links
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {nav.links.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                style={{
                  color: theme.colors.muted,
                  textDecoration: "none",
                  fontSize: "13px",
                  transition: "color 0.3s",
                }}
              >
                {link}
              </a>
            ))}
          </div>
        </div>

        {/* Areas served */}
        {footer.areas.length > 0 && (
          <div>
            <h4
              style={{
                fontSize: "11px",
                letterSpacing: "3px",
                textTransform: "uppercase",
                color: theme.colors.accent,
                marginBottom: "20px",
                fontWeight: 600,
              }}
            >
              Areas Served
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {footer.areas.map((area) => (
                <span
                  key={area}
                  style={{ color: theme.colors.muted, fontSize: "13px" }}
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div
        style={{
          maxWidth: "1100px",
          margin: "60px auto 0",
          paddingTop: "24px",
          borderTop: `1px solid ${theme.colors.text}10`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <p style={{ fontSize: "11px", color: theme.colors.muted, letterSpacing: "1px" }}>
          &copy; {new Date().getFullYear()} {about.name}. All rights reserved.
        </p>
        {footer.social_links && (
          <div style={{ display: "flex", gap: "20px" }}>
            {Object.entries(footer.social_links).map(
              ([platform, url]) =>
                url && (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: "12px",
                      color: theme.colors.muted,
                      textDecoration: "none",
                      textTransform: "capitalize",
                      letterSpacing: "1px",
                    }}
                  >
                    {platform}
                  </a>
                )
            )}
          </div>
        )}
      </div>
    </footer>
  );
}
