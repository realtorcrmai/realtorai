import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, RealtorBranding } from "./BaseLayout";

interface InspectionReminderProps {
  branding: RealtorBranding;
  recipientName: string;
  address: string;
  inspectionDate: string;
  inspectionTime: string;
  inspectorName: string;
  preparationTips: string[];
  message: string;
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeUrl: string;
}

export function InspectionReminder({
  branding,
  recipientName,
  address,
  inspectionDate,
  inspectionTime,
  inspectorName,
  preparationTips,
  message,
  ctaText = "View Inspection Details",
  ctaUrl = "#",
  unsubscribeUrl,
}: InspectionReminderProps) {
  const accent = branding.accentColor || "#4f35d2";

  return (
    <BaseLayout
      previewText={`Inspection Reminder: ${address} — ${inspectionDate} at ${inspectionTime}`}
      branding={branding}
      unsubscribeUrl={unsubscribeUrl}
    >
      {/* Badge */}
      <Section style={{ textAlign: "center", marginBottom: "16px" }}>
        <Text style={badge}>INSPECTION REMINDER</Text>
      </Section>

      <Section style={{ textAlign: "center", marginBottom: "20px" }}>
        <Text style={addressText}>{address}</Text>
      </Section>

      {/* Date/Time Box */}
      <Section style={dateBox}>
        <Text style={dateText}>{inspectionDate}</Text>
        <Text style={timeText}>{inspectionTime}</Text>
        <Text style={inspectorText}>Inspector: {inspectorName}</Text>
      </Section>

      <Text style={greeting}>Hi {recipientName},</Text>
      <Text style={bodyText}>{message}</Text>

      {/* Preparation Checklist */}
      {preparationTips.length > 0 && (
        <>
          <Text style={sectionTitle}>Preparation Checklist</Text>
          <Section style={checklistContainer}>
            {preparationTips.map((tip, i) => (
              <Text key={i} style={checklistItem}>&#9744; {tip}</Text>
            ))}
          </Section>
        </>
      )}

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

const badge = {
  display: "inline-block" as const,
  backgroundColor: "#4f35d2",
  color: "#ffffff",
  fontSize: "13px",
  fontWeight: "700" as const,
  padding: "6px 20px",
  borderRadius: "20px",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
};

const addressText = { fontSize: "18px", fontWeight: "600" as const, color: "#1a1535", margin: "0" };

const dateBox = {
  backgroundColor: "#f7f7f8",
  borderRadius: "10px",
  padding: "16px",
  textAlign: "center" as const,
  marginBottom: "20px",
};
const dateText = { fontSize: "18px", fontWeight: "700" as const, color: "#1a1535", margin: "0" };
const timeText = { fontSize: "15px", color: "#4f35d2", fontWeight: "600" as const, margin: "4px 0 0" };
const inspectorText = { fontSize: "13px", color: "#6b6b8d", margin: "8px 0 0" };

const greeting = { fontSize: "16px", color: "#1a1535", margin: "0 0 12px" };
const bodyText = { fontSize: "15px", color: "#3a3a5c", lineHeight: "1.6", margin: "0 0 16px" };
const signoff = { fontSize: "15px", color: "#3a3a5c", marginTop: "24px" };
const sectionTitle = { fontSize: "17px", fontWeight: "600" as const, color: "#1a1535", margin: "24px 0 12px" };

const checklistContainer = { marginBottom: "16px" };
const checklistItem = {
  fontSize: "14px",
  color: "#3a3a5c",
  margin: "0 0 8px",
  paddingLeft: "4px",
  padding: "8px 14px",
  backgroundColor: "#fafafa",
  borderRadius: "8px",
};

const btn = {
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600" as const,
  borderRadius: "8px",
  padding: "14px 32px",
  textDecoration: "none",
};

export default InspectionReminder;
