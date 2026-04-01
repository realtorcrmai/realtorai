import React from "react";
import { SiteConfig } from "@/types";

export function Listings({ config }: { config: SiteConfig }) {
  const { theme, listings } = config;

  if (!listings.items.length) return null;

  return (
    <section
      id="listings"
      style={{
        padding: "120px 40px",
        background: theme.colors.bg,
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
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
          Featured Properties
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
          Current Listings
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "24px",
          }}
        >
          {listings.items.map((listing, i) => (
            <div
              key={i}
              style={{
                overflow: "hidden",
                border: `1px solid ${theme.colors.text}10`,
                transition: "transform 0.3s",
              }}
            >
              {/* Photo */}
              <div
                style={{
                  aspectRatio: "16/10",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {listing.photo ? (
                  <img
                    src={listing.photo}
                    alt={listing.address}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      background: `linear-gradient(135deg, ${theme.colors.accent}22, ${theme.colors.bg})`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: theme.colors.muted,
                      fontSize: "14px",
                    }}
                  >
                    No Photo
                  </div>
                )}
                {listing.status && (
                  <span
                    style={{
                      position: "absolute",
                      top: "12px",
                      left: "12px",
                      padding: "4px 12px",
                      fontSize: "10px",
                      letterSpacing: "2px",
                      textTransform: "uppercase",
                      fontWeight: 600,
                      background: theme.colors.accent,
                      color: theme.colors.bg,
                    }}
                  >
                    {listing.status}
                  </span>
                )}
              </div>

              {/* Details */}
              <div style={{ padding: "24px" }}>
                <div
                  style={{
                    fontFamily: theme.fonts.heading,
                    fontSize: "22px",
                    fontWeight: 500,
                    color: theme.colors.accent,
                    marginBottom: "8px",
                  }}
                >
                  {listing.price}
                </div>
                <div
                  style={{
                    fontFamily: theme.fonts.body,
                    fontSize: "14px",
                    color: theme.colors.text,
                    marginBottom: "12px",
                  }}
                >
                  {listing.address}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "20px",
                    fontFamily: theme.fonts.body,
                    fontSize: "12px",
                    color: theme.colors.muted,
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                  }}
                >
                  <span>{listing.beds} Beds</span>
                  <span>{listing.baths} Baths</span>
                  {listing.sqft && <span>{listing.sqft} Sqft</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
