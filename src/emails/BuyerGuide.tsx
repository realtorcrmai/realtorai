import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, RealtorBranding } from "./BaseLayout";

interface BuyerGuideStep {
  stepNumber: number;
  title: string;
  description: string;
}

interface BuyerGuideProps {
  branding: RealtorBranding;
  recipientName: string;
  title: string;
  intro: string;
  steps: BuyerGuideStep[];
  tip: string;
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeUrl: string;
}

export function BuyerGuide({
  branding,
  recipientName,
  title,
  intro,
  steps,
  tip,
  ctaText = "Book a Free Consultation",
  ctaUrl = "#",
  unsubscribeUrl,
}: BuyerGuideProps) {
  const accent = branding.accentColor || "#4f35d2";

  return (
    <BaseLayout
      previewText={`${title} — Your guide to buying a home`}
      branding={branding}
      unsubscribeUrl={unsubscribeUrl}
    >
      {/* Book Emoji Header */}
      <Section style={{ textAlign: "center", marginBottom: "8px" }}>
        <Text style={emojiStyle}>📖</Text>
      </Section>

      <Section style={{ textAlign: "center", marginBottom: "20px" }}>
        <Text style={titleText}>{title}</Text>
      </Section>

      <Text style={greeting}>Hi {recipientName},</Text>
      <Text style={bodyText}>{intro}</Text>

      {/* Numbered Steps */}
      {steps.map((step) => (
        <Section key={step.stepNumber} style={stepBox}>
          <Text style={stepNumberStyle}>
            <span style={stepCircle}>{step.stepNumber}</span>
          </Text>
          <Text style={stepTitle}>{step.title}</Text>
          <Text style={stepDescription}>{step.description}</Text>
        </Section>
      ))}

      {/* Pro Tip Box */}
      {tip && (
        <Section style={tipBox}>
          <Text style={tipLabel}>💡 Pro Tip</Text>
          <Text style={tipText}>{tip}</Text>
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
        Happy house hunting!<br />{branding.name}
      </Text>
    </BaseLayout>
  );
}

const emojiStyle = {
  fontSize: "40px",
  margin: "0",
  lineHeight: "1",
};

const titleText = {
  fontSize: "24px",
  fontWeight: "700" as const,
  color: "#1a1535",
  margin: "0",
};

const greeting = { fontSize: "16px", color: "#1a1535", margin: "0 0 12px" };
const bodyText = { fontSize: "15px", color: "#3a3a5c", lineHeight: "1.6", margin: "0 0 20px" };

const stepBox = {
  backgroundColor: "#f7f7f8",
  borderRadius: "10px",
  padding: "16px 20px",
  marginBottom: "12px",
};

const stepNumberStyle = {
  fontSize: "14px",
  margin: "0 0 6px",
};

const stepCircle = {
  display: "inline-block" as const,
  width: "28px",
  height: "28px",
  lineHeight: "28px",
  textAlign: "center" as const,
  borderRadius: "50%",
  backgroundColor: "#4f35d2",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "700" as const,
};

const stepTitle = {
  fontSize: "16px",
  fontWeight: "600" as const,
  color: "#1a1535",
  margin: "0 0 4px",
};

const stepDescription = {
  fontSize: "14px",
  color: "#3a3a5c",
  lineHeight: "1.5",
  margin: "0",
};

const tipBox = {
  backgroundColor: "#fef9e7",
  border: "1px solid #f5e6a3",
  borderRadius: "10px",
  padding: "16px 20px",
  marginTop: "8px",
};

const tipLabel = {
  fontSize: "13px",
  fontWeight: "700" as const,
  color: "#92780c",
  margin: "0 0 6px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

const tipText = {
  fontSize: "14px",
  color: "#5c4f1a",
  lineHeight: "1.5",
  margin: "0",
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

export default BuyerGuide;
