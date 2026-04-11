import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, RealtorBranding } from "./BaseLayout";

interface ClosingReminderProps {
  branding: RealtorBranding;
  recipientName: string;
  address: string;
  closingDate: string;
  daysRemaining: number;
  checklist: string[];
  message: string;
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeUrl: string;
}

export function ClosingReminder({
  branding,
  recipientName,
  address,
  closingDate,
  daysRemaining,
  checklist,
  message,
  ctaText = "View Closing Details",
  ctaUrl = "#",
  unsubscribeUrl,
}: ClosingReminderProps) {
  const accent = branding.accentColor || "#4f35d2";

  return (
    <BaseLayout
      previewText={`${daysRemaining} days until closing: ${address}`}
      branding={branding}
      unsubscribeUrl={unsubscribeUrl}
    >
      {/* Calendar Emoji Header */}
      <Section style={{ textAlign: "center", marginBottom: "8px" }}>
        <Text style={emojiStyle}>📅</Text>
      </Section>

      {/* Countdown */}
      <Section style={countdownBox}>
        <Text style={countdownNumber}>{daysRemaining}</Text>
        <Text style={countdownLabel}>days until closing</Text>
      </Section>

      <Section style={{ textAlign: "center", marginBottom: "20px" }}>
        <Text style={addressText}>{address}</Text>
        <Text style={dateText}>Closing Date: {closingDate}</Text>
      </Section>

      <Text style={greeting}>Hi {recipientName},</Text>
      <Text style={bodyText}>{message}</Text>

      {/* Checklist */}
      {checklist.length > 0 && (
        <Section style={checklistBox}>
          <Text style={checklistTitle}>Your Closing Checklist</Text>
          {checklist.map((item, i) => (
            <Text key={i} style={checklistItem}>
              ✅ {item}
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
        Almost there!<br />{branding.name}
      </Text>
    </BaseLayout>
  );
}

const emojiStyle = {
  fontSize: "40px",
  margin: "0",
  lineHeight: "1",
};

const countdownBox = {
  textAlign: "center" as const,
  backgroundColor: "#f7f7f8",
  borderRadius: "12px",
  padding: "24px 16px",
  marginBottom: "16px",
};

const countdownNumber = {
  fontSize: "56px",
  fontWeight: "800" as const,
  color: "#4f35d2",
  margin: "0",
  lineHeight: "1",
};

const countdownLabel = {
  fontSize: "14px",
  color: "#6b6b8d",
  margin: "4px 0 0",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
};

const addressText = {
  fontSize: "18px",
  fontWeight: "600" as const,
  color: "#1a1535",
  margin: "0",
};

const dateText = {
  fontSize: "14px",
  color: "#6b6b8d",
  margin: "4px 0 0",
};

const greeting = { fontSize: "16px", color: "#1a1535", margin: "0 0 12px" };
const bodyText = { fontSize: "15px", color: "#3a3a5c", lineHeight: "1.6", margin: "0 0 16px" };

const checklistBox = {
  backgroundColor: "#f7f7f8",
  borderRadius: "10px",
  padding: "16px 20px",
  marginTop: "8px",
};

const checklistTitle = {
  fontSize: "14px",
  fontWeight: "700" as const,
  color: "#1a1535",
  margin: "0 0 10px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

const checklistItem = {
  fontSize: "14px",
  color: "#3a3a5c",
  margin: "0 0 6px",
  lineHeight: "1.5",
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

export default ClosingReminder;
