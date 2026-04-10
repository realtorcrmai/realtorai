import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, RealtorBranding } from "./BaseLayout";

interface MortgageRenewalAlertProps {
  branding: RealtorBranding;
  recipientName: string;
  renewalDate: string;
  monthsRemaining: number;
  currentRate: string;
  marketRate: string;
  potentialSavings: string;
  tips: string[];
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeUrl: string;
}

export function MortgageRenewalAlert({
  branding,
  recipientName,
  renewalDate,
  monthsRemaining,
  currentRate,
  marketRate,
  potentialSavings,
  tips,
  ctaText = "Connect with a Mortgage Specialist",
  ctaUrl = "#",
  unsubscribeUrl,
}: MortgageRenewalAlertProps) {
  const accent = branding.accentColor || "#4f35d2";
  const isLower = parseFloat(marketRate) < parseFloat(currentRate);

  return (
    <BaseLayout
      previewText={`Mortgage renewal in ${monthsRemaining} months — rates are ${isLower ? "lower" : "changing"}`}
      branding={branding}
      unsubscribeUrl={unsubscribeUrl}
    >
      {/* Bank Emoji Header */}
      <Section style={{ textAlign: "center", marginBottom: "8px" }}>
        <Text style={emojiStyle}>🏦</Text>
      </Section>

      {/* Urgency Badge */}
      <Section style={{ textAlign: "center", marginBottom: "16px" }}>
        <Text style={urgencyBadge}>
          {monthsRemaining <= 3 ? "ACTION NEEDED" : "UPCOMING RENEWAL"}
        </Text>
      </Section>

      <Section style={{ textAlign: "center", marginBottom: "20px" }}>
        <Text style={titleText}>Mortgage Renewal Reminder</Text>
        <Text style={subtitleText}>
          Renewal Date: {renewalDate} ({monthsRemaining} months away)
        </Text>
      </Section>

      <Text style={greeting}>Hi {recipientName},</Text>
      <Text style={bodyText}>
        Your mortgage is coming up for renewal. Now is the perfect time to explore your options
        and potentially save on your monthly payments.
      </Text>

      {/* Rate Comparison Box */}
      <Section style={rateBox}>
        <Section style={rateRow}>
          <Section style={rateColumn}>
            <Text style={rateLabel}>Your Current Rate</Text>
            <Text style={rateValue}>{currentRate}%</Text>
          </Section>
          <Section style={rateDivider} />
          <Section style={rateColumn}>
            <Text style={rateLabel}>Today&apos;s Market Rate</Text>
            <Text style={{ ...rateValue, color: isLower ? "#059669" : "#1a1535" }}>
              {marketRate}%
            </Text>
          </Section>
        </Section>
      </Section>

      {/* Savings Highlight */}
      {potentialSavings && (
        <Section style={savingsBox}>
          <Text style={savingsLabel}>Potential Savings</Text>
          <Text style={savingsAmount}>{potentialSavings}</Text>
          <Text style={savingsNote}>estimated annual savings by refinancing</Text>
        </Section>
      )}

      {/* Tips */}
      {tips.length > 0 && (
        <Section style={tipsSection}>
          <Text style={tipsTitle}>Tips for Your Renewal</Text>
          {tips.map((tip, i) => (
            <Text key={i} style={tipItem}>
              💡 {tip}
            </Text>
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
        Here to help,<br />{branding.name}
      </Text>
    </BaseLayout>
  );
}

const emojiStyle = {
  fontSize: "40px",
  margin: "0",
  lineHeight: "1",
};

const urgencyBadge = {
  display: "inline-block" as const,
  fontSize: "11px",
  fontWeight: "700" as const,
  color: "#ffffff",
  backgroundColor: "#dc2626",
  padding: "4px 14px",
  borderRadius: "20px",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
};

const titleText = {
  fontSize: "22px",
  fontWeight: "700" as const,
  color: "#1a1535",
  margin: "0",
};

const subtitleText = {
  fontSize: "14px",
  color: "#6b6b8d",
  margin: "4px 0 0",
};

const greeting = { fontSize: "16px", color: "#1a1535", margin: "0 0 12px" };
const bodyText = { fontSize: "15px", color: "#3a3a5c", lineHeight: "1.6", margin: "0 0 20px" };

const rateBox = {
  backgroundColor: "#f7f7f8",
  borderRadius: "12px",
  padding: "20px 16px",
  marginBottom: "16px",
};

const rateRow = {
  display: "flex" as const,
  alignItems: "center" as const,
};

const rateColumn = {
  flex: "1" as const,
  textAlign: "center" as const,
};

const rateDivider = {
  width: "1px",
  backgroundColor: "#e8e5f5",
  alignSelf: "stretch" as const,
  margin: "0 8px",
};

const rateLabel = {
  fontSize: "11px",
  fontWeight: "600" as const,
  color: "#6b6b8d",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 4px",
};

const rateValue = {
  fontSize: "28px",
  fontWeight: "800" as const,
  color: "#1a1535",
  margin: "0",
  lineHeight: "1",
};

const savingsBox = {
  textAlign: "center" as const,
  backgroundColor: "#ecfdf5",
  border: "1px solid #a7f3d0",
  borderRadius: "12px",
  padding: "16px",
  marginBottom: "16px",
};

const savingsLabel = {
  fontSize: "11px",
  fontWeight: "600" as const,
  color: "#059669",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
  margin: "0 0 4px",
};

const savingsAmount = {
  fontSize: "28px",
  fontWeight: "800" as const,
  color: "#059669",
  margin: "0",
  lineHeight: "1.1",
};

const savingsNote = {
  fontSize: "12px",
  color: "#6b6b8d",
  margin: "4px 0 0",
};

const tipsSection = {
  backgroundColor: "#f7f7f8",
  borderRadius: "10px",
  padding: "16px 20px",
  marginTop: "8px",
};

const tipsTitle = {
  fontSize: "14px",
  fontWeight: "700" as const,
  color: "#1a1535",
  margin: "0 0 10px",
};

const tipItem = {
  fontSize: "14px",
  color: "#3a3a5c",
  lineHeight: "1.5",
  margin: "0 0 6px",
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

export default MortgageRenewalAlert;
