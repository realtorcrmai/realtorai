import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import type { RealtorBranding } from "./BaseLayout";

interface ListingPhoto {
  url: string;
  alt?: string;
}

interface PremiumListingShowcaseProps {
  branding: RealtorBranding;
  recipientName: string;
  // Property
  address: string;
  cityStatePostal: string;
  price: string;
  beds: number;
  baths: number;
  sqft?: string;
  propertyType?: string;
  // Hero + gallery
  heroPhoto: string;
  galleryPhotos?: ListingPhoto[];
  // Description
  headline: string;
  description: string;
  features?: string[];
  // Open house
  openHouseDate?: string;
  openHouseTime?: string;
  // CTAs
  listingUrl?: string;
  // Required
  unsubscribeUrl: string;
}

/**
 * Premium photo-forward listing showcase email.
 * Inspired by Engel & Völkers, Sotheby's International luxury real estate emails.
 *
 * Design principles:
 * - Photos drive the email — full-width hero, 2x2 gallery
 * - Generous whitespace, light gray background
 * - Helvetica Neue typography, center-aligned
 * - Pipe-separated property specs (BEDS | BATHS | SQ.FT.)
 * - Subtle text-link CTAs (luxury feel, not button-heavy)
 */
export function PremiumListingShowcase({
  branding,
  recipientName,
  address,
  cityStatePostal,
  price,
  beds,
  baths,
  sqft,
  propertyType,
  heroPhoto,
  galleryPhotos = [],
  headline,
  description,
  features = [],
  openHouseDate,
  openHouseTime,
  listingUrl,
  unsubscribeUrl,
}: PremiumListingShowcaseProps) {
  const accent = branding.accentColor || "#1a1a1a";
  const previewText = `${headline} — ${address}`;

  return (
    <Html>
      <Head>
        <meta name="x-apple-disable-message-reformatting" />
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light" />
        <style>{`
          @media only screen and (max-width: 600px) {
            .email-container { width: 100% !important; }
            .email-content { padding: 24px 20px !important; }
            .gallery-cell { width: 100% !important; display: block !important; padding: 4px 0 !important; }
            .hero-text { font-size: 28px !important; }
          }
        `}</style>
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container} className="email-container">
          {/* Header — minimal, just brokerage */}
          <Section style={header}>
            <Text style={brokerageText}>{branding.brokerage || "REALTOR"}</Text>
          </Section>

          {/* Hero Photo — full bleed, no padding */}
          <Img
            src={heroPhoto}
            alt={address}
            width="600"
            style={heroPhotoStyle}
          />

          {/* Property Headline */}
          <Section style={contentSection} className="email-content">
            {propertyType && (
              <Text style={propertyTypeBadge}>{propertyType.toUpperCase()}</Text>
            )}
            <Text style={addressText}>{address}</Text>
            <Text style={cityText}>{cityStatePostal}</Text>

            {/* Price */}
            <Text style={priceText} className="hero-text">
              {price}
            </Text>

            {/* Specs — pipe separated */}
            <Text style={specsText}>
              {beds} BEDS &nbsp;|&nbsp; {baths} BATHS{sqft ? ` |  ${sqft}` : ""}
            </Text>

            <Hr style={dividerThin} />

            {/* Headline + Description */}
            <Text style={headlineText}>{headline}</Text>
            <Text style={descriptionText}>{description}</Text>

            {/* Features */}
            {features.length > 0 && (
              <Section style={featuresSection}>
                {features.map((feature, i) => (
                  <Text key={i} style={featureItem}>
                    — {feature}
                  </Text>
                ))}
              </Section>
            )}

            {/* Open House */}
            {openHouseDate && openHouseTime && (
              <Section style={openHouseBox}>
                <Text style={openHouseLabel}>OPEN HOUSE</Text>
                <Text style={openHouseDateText}>{openHouseDate}</Text>
                <Text style={openHouseTimeText}>{openHouseTime}</Text>
              </Section>
            )}
          </Section>

          {/* Gallery — 2x2 grid */}
          {galleryPhotos.length > 0 && (
            <Section style={gallerySection}>
              <table
                width="100%"
                cellPadding="0"
                cellSpacing="0"
                role="presentation"
                style={{ borderCollapse: "collapse" as const }}
              >
                <tbody>
                  {chunk(galleryPhotos, 2).map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {row.map((photo, colIdx) => (
                        <td
                          key={colIdx}
                          className="gallery-cell"
                          width="50%"
                          style={{
                            padding: "2px",
                            verticalAlign: "top" as const,
                          }}
                        >
                          <Img
                            src={photo.url}
                            alt={photo.alt || ""}
                            width="296"
                            style={galleryImg}
                          />
                        </td>
                      ))}
                      {row.length === 1 && <td width="50%" style={{ padding: "2px" }} />}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* CTA — text link, luxury style */}
          {listingUrl && (
            <Section style={ctaSection}>
              <Link href={listingUrl} style={{ ...ctaLink, color: accent }}>
                VIEW FULL LISTING →
              </Link>
            </Section>
          )}

          {/* Agent Card */}
          <Hr style={divider} />
          <Section style={agentSection}>
            {branding.headshotUrl && (
              <Img
                src={branding.headshotUrl}
                width="80"
                height="80"
                alt={branding.name}
                style={headshotStyle}
              />
            )}
            <Text style={agentName}>{branding.name}</Text>
            {branding.title && <Text style={agentTitle}>{branding.title}</Text>}
            {branding.brokerage && <Text style={agentBrokerage}>{branding.brokerage}</Text>}
            {(branding.phone || branding.email) && (
              <Text style={agentContact}>
                {branding.phone && (
                  <Link href={`tel:${branding.phone}`} style={{ color: accent, textDecoration: "none" }}>
                    {branding.phone}
                  </Link>
                )}
                {branding.phone && branding.email && <span style={{ color: "#999" }}>  ·  </span>}
                {branding.email && (
                  <Link href={`mailto:${branding.email}`} style={{ color: accent, textDecoration: "none" }}>
                    {branding.email}
                  </Link>
                )}
              </Text>
            )}

            <Text style={signoffText}>
              Hi {recipientName}, let me know if you'd like a private showing.
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={divider} />
          <Section style={footerSection}>
            <Text style={footerText}>
              You're receiving this because you're subscribed to {branding.name}'s listings updates.
            </Text>
            <Text style={footerText}>
              <Link href={unsubscribeUrl} style={unsubLink}>
                Unsubscribe
              </Link>
              {" · "}
              <Link href="#" style={unsubLink}>
                View in browser
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Helper to chunk array into rows
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// === STYLES ===

const main = {
  backgroundColor: "#f7f7f8",
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  margin: 0,
  padding: "40px 0",
};

const container = {
  maxWidth: "600px",
  margin: "0 auto",
  backgroundColor: "#ffffff",
};

const header = {
  padding: "32px 40px 24px",
  textAlign: "center" as const,
  borderBottom: "1px solid #e8e8e8",
};

const brokerageText = {
  fontSize: "11px",
  fontWeight: 700 as const,
  letterSpacing: "3px",
  color: "#666",
  textTransform: "uppercase" as const,
  margin: 0,
};

const heroPhotoStyle = {
  width: "100%",
  height: "auto",
  display: "block" as const,
  objectFit: "cover" as const,
};

const contentSection = {
  padding: "40px 40px 24px",
  textAlign: "center" as const,
};

const propertyTypeBadge = {
  fontSize: "11px",
  fontWeight: 600 as const,
  letterSpacing: "2px",
  color: "#999",
  margin: "0 0 12px",
  textTransform: "uppercase" as const,
};

const addressText = {
  fontSize: "20px",
  fontWeight: 400 as const,
  color: "#1a1a1a",
  margin: "0",
  lineHeight: "1.3",
};

const cityText = {
  fontSize: "14px",
  color: "#666",
  margin: "4px 0 24px",
  letterSpacing: "0.5px",
};

const priceText = {
  fontSize: "36px",
  fontWeight: 300 as const,
  color: "#1a1a1a",
  margin: "0 0 12px",
  letterSpacing: "-0.5px",
};

const specsText = {
  fontSize: "12px",
  fontWeight: 600 as const,
  color: "#666",
  letterSpacing: "1.5px",
  margin: "0 0 32px",
  textTransform: "uppercase" as const,
};

const dividerThin = {
  border: "none",
  borderTop: "1px solid #e8e8e8",
  margin: "0 auto 32px",
  width: "60px",
};

const divider = {
  border: "none",
  borderTop: "1px solid #e8e8e8",
  margin: 0,
};

const headlineText = {
  fontSize: "18px",
  fontWeight: 500 as const,
  color: "#1a1a1a",
  margin: "0 0 16px",
  fontStyle: "italic" as const,
};

const descriptionText = {
  fontSize: "15px",
  lineHeight: "1.7",
  color: "#444",
  margin: "0 0 24px",
  textAlign: "left" as const,
};

const featuresSection = {
  textAlign: "left" as const,
  margin: "0 0 24px",
};

const featureItem = {
  fontSize: "14px",
  color: "#444",
  margin: "0 0 6px",
  lineHeight: "1.5",
};

const openHouseBox = {
  backgroundColor: "#fafafa",
  padding: "24px",
  textAlign: "center" as const,
  margin: "24px 0",
  border: "1px solid #e8e8e8",
};

const openHouseLabel = {
  fontSize: "11px",
  fontWeight: 700 as const,
  letterSpacing: "2px",
  color: "#999",
  margin: "0 0 8px",
};

const openHouseDateText = {
  fontSize: "18px",
  fontWeight: 500 as const,
  color: "#1a1a1a",
  margin: "0 0 4px",
};

const openHouseTimeText = {
  fontSize: "14px",
  color: "#666",
  margin: 0,
};

const gallerySection = {
  padding: "0 40px 24px",
};

const galleryImg = {
  width: "100%",
  height: "auto",
  display: "block" as const,
  objectFit: "cover" as const,
};

const ctaSection = {
  padding: "16px 40px 40px",
  textAlign: "center" as const,
};

const ctaLink = {
  fontSize: "12px",
  fontWeight: 700 as const,
  letterSpacing: "2px",
  textDecoration: "none" as const,
  textTransform: "uppercase" as const,
};

const agentSection = {
  padding: "40px",
  textAlign: "center" as const,
  backgroundColor: "#fafafa",
};

const headshotStyle = {
  borderRadius: "50%",
  margin: "0 auto 16px",
  objectFit: "cover" as const,
};

const agentName = {
  fontSize: "16px",
  fontWeight: 600 as const,
  color: "#1a1a1a",
  margin: "0 0 4px",
  letterSpacing: "0.5px",
};

const agentTitle = {
  fontSize: "12px",
  color: "#666",
  margin: "0 0 4px",
  letterSpacing: "1px",
  textTransform: "uppercase" as const,
};

const agentBrokerage = {
  fontSize: "12px",
  color: "#666",
  margin: "0 0 12px",
};

const agentContact = {
  fontSize: "13px",
  color: "#444",
  margin: "0 0 16px",
};

const signoffText = {
  fontSize: "13px",
  fontStyle: "italic" as const,
  color: "#666",
  margin: "16px 0 0",
};

const footerSection = {
  padding: "24px 40px",
  textAlign: "center" as const,
};

const footerText = {
  fontSize: "11px",
  color: "#999",
  margin: "0 0 6px",
  lineHeight: "1.6",
};

const unsubLink = {
  color: "#666",
  textDecoration: "underline" as const,
};

export default PremiumListingShowcase;
