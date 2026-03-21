import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, RealtorBranding } from "./BaseLayout";

interface HomeAnniversaryProps {
  branding: RealtorBranding;
  recipientName: string;
  address: string;
  purchaseDate: string;
  years: number;
  estimatedValue?: string;
  appreciation?: string;
  message: string;
  tips: string[];
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeUrl: string;
}

export function HomeAnniversary({
  branding,
  recipientName,
  address,
  purchaseDate,
  years,
  estimatedValue,
  appreciation,
  message,
  tips,
  ctaText = "Get a Free Home Valuation",
  ctaUrl = "#",
  unsubscribeUrl,
}: HomeAnniversaryProps) {
  const accent = branding.accentColor || "#4f35d2";

  return (
    <BaseLayout
      previewText={`Happy ${years}-Year Home Anniversary, ${recipientName}!`}
      branding={branding}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Section style={{ textAlign: "center", marginBottom: "20px" }}>
        <Text style={emoji}>&#127881;</Text>
        <Text style={title}>Happy Home Anniversary!</Text>
        <Text style={subtitle}>{years} year{years > 1 ? "s" : ""} at {address}</Text>
      </Section>

      {(estimatedValue || appreciation) && (
        <Section style={valueBox}>
          {estimatedValue && (
            <>
              <Text style={valueLabel}>Estimated Current Value</Text>
              <Text style={valueAmount}>{estimatedValue}</Text>
            </>
          )}
          {appreciation && (
            <Text style={appreciationText}>{appreciation} since purchase</Text>
          )}
        </Section>
      )}

      <Text style={greeting}>Hi {recipientName},</Text>
      <Text style={bodyText}>{message}</Text>

      {tips.length > 0 && (
        <Section style={tipsSection}>
          <Text style={tipsTitle}>Seasonal Home Tips</Text>
          {tips.map((tip, i) => (
            <Text key={i} style={tipItem}>&#10003; {tip}</Text>
          ))}
        </Section>
      )}

      {ctaUrl && ctaUrl !== "#" && (
        <Section style={{ textAlign: "center", marginTop: "24px" }}>
          <Button href={ctaUrl} style={{ ...btn, backgroundColor: accent }}>
            {ctaText}
          </Button>
        </Section>
      )}

      <Text style={signoff}>
        Warmly,<br />{branding.name}
      </Text>
    </BaseLayout>
  );
}

const emoji = { fontSize: "48px", margin: "0" };
const title = { fontSize: "24px", fontWeight: "700" as const, color: "#1a1535", margin: "8px 0 4px" };
const subtitle = { fontSize: "15px", color: "#6b6b8d", margin: "0" };

const valueBox = {
  backgroundColor: "#f6f5ff",
  borderRadius: "10px",
  padding: "20px",
  textAlign: "center" as const,
  marginBottom: "20px",
};
const valueLabel = { fontSize: "12px", color: "#6b6b8d", textTransform: "uppercase" as const, margin: "0 0 4px", letterSpacing: "1px" };
const valueAmount = { fontSize: "32px", fontWeight: "700" as const, color: "#4f35d2", margin: "0" };
const appreciationText = { fontSize: "14px", color: "#059669", fontWeight: "600" as const, margin: "8px 0 0" };

const greeting = { fontSize: "16px", color: "#1a1535", margin: "0 0 12px" };
const bodyText = { fontSize: "15px", color: "#3a3a5c", lineHeight: "1.6", margin: "0 0 16px" };
const signoff = { fontSize: "15px", color: "#3a3a5c", marginTop: "24px" };

const tipsSection = {
  backgroundColor: "#fafafa",
  borderRadius: "10px",
  padding: "16px",
  marginBottom: "16px",
};
const tipsTitle = { fontSize: "15px", fontWeight: "700" as const, color: "#1a1535", margin: "0 0 10px" };
const tipItem = { fontSize: "14px", color: "#3a3a5c", margin: "0 0 6px" };

const btn = {
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600" as const,
  borderRadius: "8px",
  padding: "14px 32px",
  textDecoration: "none",
};

export default HomeAnniversary;
