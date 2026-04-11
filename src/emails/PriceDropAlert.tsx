import { Button, Img, Section, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, RealtorBranding } from "./BaseLayout";

interface PriceDropAlertProps {
  branding: RealtorBranding;
  recipientName: string;
  address: string;
  originalPrice: string;
  newPrice: string;
  savings: string;
  percentOff: string;
  daysOnMarket: number;
  photo?: string;
  message: string;
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeUrl: string;
}

export function PriceDropAlert({
  branding,
  recipientName,
  address,
  originalPrice,
  newPrice,
  savings,
  percentOff,
  daysOnMarket,
  photo,
  message,
  ctaText = "View Listing",
  ctaUrl = "#",
  unsubscribeUrl,
}: PriceDropAlertProps) {
  const accent = branding.accentColor || "#4f35d2";

  return (
    <BaseLayout
      previewText={`Price Drop: ${address} — now ${newPrice} (${percentOff} off)`}
      branding={branding}
      unsubscribeUrl={unsubscribeUrl}
    >
      {/* Badge */}
      <Section style={{ textAlign: "center", marginBottom: "16px" }}>
        <Text style={dropBadge}>PRICE REDUCED</Text>
      </Section>

      {photo && (
        <Img src={photo} width="536" height="300" alt={address} style={heroImage} />
      )}

      {/* Price Section */}
      <Section style={{ textAlign: "center", padding: "20px 0 8px" }}>
        <Text style={addressText}>{address}</Text>
        <Text style={originalPriceText}>{originalPrice}</Text>
        <Text style={newPriceText}>{newPrice}</Text>
      </Section>

      {/* Savings Badge */}
      <Section style={{ textAlign: "center", marginBottom: "20px" }}>
        <Text style={savingsBadge}>Save {savings} ({percentOff} off)</Text>
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
        Best regards,<br />{branding.name}
      </Text>
    </BaseLayout>
  );
}

const dropBadge = {
  display: "inline-block" as const,
  backgroundColor: "#dc2626",
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

const addressText = { fontSize: "18px", fontWeight: "600" as const, color: "#1a1535", margin: "0" };

const originalPriceText = {
  fontSize: "18px",
  color: "#6b6b8d",
  margin: "8px 0 0",
  textDecoration: "line-through",
};

const newPriceText = {
  fontSize: "32px",
  fontWeight: "700" as const,
  color: "#dc2626",
  margin: "4px 0 0",
};

const savingsBadge = {
  display: "inline-block" as const,
  backgroundColor: "#ecfdf5",
  color: "#059669",
  fontSize: "14px",
  fontWeight: "600" as const,
  padding: "6px 16px",
  borderRadius: "20px",
};

const domText = { fontSize: "13px", color: "#6b6b8d", margin: "8px 0 0" };

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

export default PriceDropAlert;
