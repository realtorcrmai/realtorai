import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, RealtorBranding } from "./BaseLayout";

interface Comparable {
  address: string;
  price: string;
  sqft: string;
}

interface HomeValueUpdateProps {
  branding: RealtorBranding;
  recipientName: string;
  address: string;
  currentValue: string;
  previousValue: string;
  changeAmount: string;
  changePercent: string;
  comparables: Comparable[];
  message: string;
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeUrl: string;
}

export function HomeValueUpdate({
  branding,
  recipientName,
  address,
  currentValue,
  previousValue,
  changeAmount,
  changePercent,
  comparables,
  message,
  ctaText = "Get a Full Valuation",
  ctaUrl = "#",
  unsubscribeUrl,
}: HomeValueUpdateProps) {
  const accent = branding.accentColor || "#4f35d2";
  const isPositive = !changeAmount.startsWith("-");
  const changeColor = isPositive ? "#059669" : "#dc2626";
  const changeArrow = isPositive ? "↑" : "↓";

  return (
    <BaseLayout
      previewText={`Your home value update: ${address} — ${currentValue}`}
      branding={branding}
      unsubscribeUrl={unsubscribeUrl}
    >
      {/* Chart Emoji Header */}
      <Section style={{ textAlign: "center", marginBottom: "8px" }}>
        <Text style={emojiStyle}>📊</Text>
      </Section>

      <Section style={{ textAlign: "center", marginBottom: "20px" }}>
        <Text style={headerLabel}>HOME VALUE UPDATE</Text>
        <Text style={addressText}>{address}</Text>
      </Section>

      {/* Value Card */}
      <Section style={valueCard}>
        <Text style={valueLabelTop}>Estimated Value</Text>
        <Text style={valueNumber}>{currentValue}</Text>
        <Text style={{ ...changeText, color: changeColor }}>
          {changeArrow} {changeAmount} ({changePercent})
        </Text>
        <Text style={previousText}>Previous: {previousValue}</Text>
      </Section>

      <Text style={greeting}>Hi {recipientName},</Text>
      <Text style={bodyText}>{message}</Text>

      {/* Comparables Table */}
      {comparables.length > 0 && (
        <Section style={compSection}>
          <Text style={compTitle}>Recent Comparable Sales</Text>
          {/* Table Header */}
          <Section style={compHeaderRow}>
            <Text style={compHeaderCell}>Address</Text>
            <Text style={compHeaderCellRight}>Price</Text>
            <Text style={compHeaderCellRight}>Sq Ft</Text>
          </Section>
          {comparables.map((comp, i) => (
            <Section
              key={i}
              style={{
                ...compRow,
                backgroundColor: i % 2 === 0 ? "#ffffff" : "#f7f7f8",
              }}
            >
              <Text style={compCell}>{comp.address}</Text>
              <Text style={compCellRight}>{comp.price}</Text>
              <Text style={compCellRight}>{comp.sqft}</Text>
            </Section>
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
        Keeping you informed,<br />{branding.name}
      </Text>
    </BaseLayout>
  );
}

const emojiStyle = {
  fontSize: "40px",
  margin: "0",
  lineHeight: "1",
};

const headerLabel = {
  fontSize: "12px",
  fontWeight: "700" as const,
  color: "#6b6b8d",
  textTransform: "uppercase" as const,
  letterSpacing: "1.5px",
  margin: "0 0 4px",
};

const addressText = {
  fontSize: "16px",
  fontWeight: "600" as const,
  color: "#1a1535",
  margin: "0",
};

const valueCard = {
  textAlign: "center" as const,
  backgroundColor: "#f7f7f8",
  borderRadius: "12px",
  padding: "24px 16px",
  marginBottom: "20px",
};

const valueLabelTop = {
  fontSize: "12px",
  fontWeight: "600" as const,
  color: "#6b6b8d",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
  margin: "0 0 4px",
};

const valueNumber = {
  fontSize: "36px",
  fontWeight: "800" as const,
  color: "#1a1535",
  margin: "0",
  lineHeight: "1.1",
};

const changeText = {
  fontSize: "16px",
  fontWeight: "700" as const,
  margin: "8px 0 0",
};

const previousText = {
  fontSize: "13px",
  color: "#6b6b8d",
  margin: "4px 0 0",
};

const greeting = { fontSize: "16px", color: "#1a1535", margin: "0 0 12px" };
const bodyText = { fontSize: "15px", color: "#3a3a5c", lineHeight: "1.6", margin: "0 0 16px" };

const compSection = {
  marginTop: "8px",
  border: "1px solid #e8e5f5",
  borderRadius: "10px",
  overflow: "hidden" as const,
};

const compTitle = {
  fontSize: "14px",
  fontWeight: "700" as const,
  color: "#1a1535",
  padding: "12px 16px",
  margin: "0",
  backgroundColor: "#f7f7f8",
  borderBottom: "1px solid #e8e5f5",
};

const compHeaderRow = {
  display: "flex" as const,
  padding: "8px 16px",
  backgroundColor: "#f7f7f8",
  borderBottom: "1px solid #e8e5f5",
};

const compHeaderCell = {
  fontSize: "11px",
  fontWeight: "700" as const,
  color: "#6b6b8d",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0",
  flex: "2" as const,
};

const compHeaderCellRight = {
  fontSize: "11px",
  fontWeight: "700" as const,
  color: "#6b6b8d",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0",
  flex: "1" as const,
  textAlign: "right" as const,
};

const compRow = {
  display: "flex" as const,
  padding: "10px 16px",
  borderBottom: "1px solid #f0eff5",
};

const compCell = {
  fontSize: "13px",
  color: "#3a3a5c",
  margin: "0",
  flex: "2" as const,
};

const compCellRight = {
  fontSize: "13px",
  color: "#3a3a5c",
  margin: "0",
  flex: "1" as const,
  textAlign: "right" as const,
};

const signoff = { fontSize: "15px", color: "#3a3a5c", marginTop: "24px" };

const btn = {
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600" as const,
  borderRadius: "8px",
  padding: "14px 32px",
  textDecoration: "none",
};

export default HomeValueUpdate;
