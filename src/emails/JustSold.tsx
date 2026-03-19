import { Button, Img, Section, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, RealtorBranding } from "./BaseLayout";

interface JustSoldProps {
  branding: RealtorBranding;
  recipientName: string;
  address: string;
  salePrice: string;
  daysOnMarket: number;
  photo?: string;
  message: string;
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeUrl: string;
}

export function JustSold({
  branding,
  recipientName,
  address,
  salePrice,
  daysOnMarket,
  photo,
  message,
  ctaText = "What's Your Home Worth?",
  ctaUrl = "#",
  unsubscribeUrl,
}: JustSoldProps) {
  const accent = branding.accentColor || "#4f35d2";

  return (
    <BaseLayout
      previewText={`Just Sold: ${address} for ${salePrice}`}
      branding={branding}
      unsubscribeUrl={unsubscribeUrl}
    >
      {/* Sold Banner */}
      <Section style={{ textAlign: "center", marginBottom: "20px" }}>
        <Text style={soldBadge}>JUST SOLD</Text>
      </Section>

      {photo && (
        <Img src={photo} width="536" height="300" alt={address} style={heroImage} />
      )}

      <Section style={{ textAlign: "center", padding: "20px 0" }}>
        <Text style={priceText}>{salePrice}</Text>
        <Text style={addressText}>{address}</Text>
        <Text style={domText}>{daysOnMarket} days on market</Text>
      </Section>

      <Text style={greeting}>Hi {recipientName},</Text>
      <Text style={bodyText}>{message}</Text>

      {ctaUrl && ctaUrl !== "#" && (
        <Section style={{ textAlign: "center", marginTop: "20px" }}>
          <Button href={ctaUrl} style={{ ...btn, backgroundColor: accent }}>
            {ctaText}
          </Button>
        </Section>
      )}

      <Text style={signoff}>
        Cheers,<br />{branding.name}
      </Text>
    </BaseLayout>
  );
}

const soldBadge = {
  display: "inline-block" as const,
  backgroundColor: "#059669",
  color: "#ffffff",
  fontSize: "13px",
  fontWeight: "700" as const,
  padding: "6px 20px",
  borderRadius: "20px",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
};

const heroImage = {
  width: "100%",
  height: "auto",
  borderRadius: "10px",
  objectFit: "cover" as const,
};

const priceText = { fontSize: "32px", fontWeight: "700" as const, color: "#1a1535", margin: "0" };
const addressText = { fontSize: "16px", color: "#3a3a5c", margin: "4px 0 0" };
const domText = { fontSize: "14px", color: "#059669", fontWeight: "600" as const, margin: "8px 0 0" };

const greeting = { fontSize: "16px", color: "#1a1535", margin: "0 0 12px" };
const bodyText = { fontSize: "15px", color: "#3a3a5c", lineHeight: "1.6", margin: "0 0 16px" };
const signoff = { fontSize: "15px", color: "#3a3a5c", marginTop: "24px" };

const btn = {
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600" as const,
  borderRadius: "8px",
  padding: "14px 32px",
  textDecoration: "none",
};

export default JustSold;
