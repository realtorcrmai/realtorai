import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, RealtorBranding } from "./BaseLayout";

interface ReferralThankYouProps {
  branding: RealtorBranding;
  recipientName: string;
  referredName: string;
  message: string;
  giftDescription?: string;
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeUrl: string;
}

export function ReferralThankYou({
  branding,
  recipientName,
  referredName,
  message,
  giftDescription,
  ctaText = "Refer Another Friend",
  ctaUrl = "#",
  unsubscribeUrl,
}: ReferralThankYouProps) {
  const accent = branding.accentColor || "#4f35d2";

  return (
    <BaseLayout
      previewText={`Thank you for referring ${referredName}!`}
      branding={branding}
      unsubscribeUrl={unsubscribeUrl}
    >
      {/* Badge */}
      <Section style={{ textAlign: "center", marginBottom: "16px" }}>
        <Text style={thanksBadge}>THANK YOU</Text>
      </Section>

      <Text style={greeting}>Hi {recipientName},</Text>
      <Text style={bodyText}>{message}</Text>

      {/* Referral Callout */}
      <Section style={referralBox}>
        <Text style={referralLabel}>You referred</Text>
        <Text style={referralName}>{referredName}</Text>
      </Section>

      {/* Gift Section */}
      {giftDescription && (
        <Section style={giftBox}>
          <Text style={giftTitle}>A Small Token of Appreciation</Text>
          <Text style={giftText}>{giftDescription}</Text>
        </Section>
      )}

      <Text style={bodyText}>
        Your trust means the world to me. Referrals from clients like you are the highest compliment I can receive.
      </Text>

      {ctaUrl && ctaUrl !== "#" && (
        <Section style={{ textAlign: "center", marginTop: "20px" }}>
          <Button href={ctaUrl} style={{ ...btn, backgroundColor: accent }}>
            {ctaText}
          </Button>
        </Section>
      )}

      <Text style={signoff}>
        With gratitude,<br />{branding.name}
      </Text>
    </BaseLayout>
  );
}

const thanksBadge = {
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

const greeting = { fontSize: "16px", color: "#1a1535", margin: "0 0 12px" };
const bodyText = { fontSize: "15px", color: "#3a3a5c", lineHeight: "1.6", margin: "0 0 16px" };
const signoff = { fontSize: "15px", color: "#3a3a5c", marginTop: "24px" };

const referralBox = {
  backgroundColor: "#f7f7f8",
  borderRadius: "10px",
  padding: "20px",
  textAlign: "center" as const,
  marginBottom: "20px",
};
const referralLabel = { fontSize: "13px", color: "#6b6b8d", margin: "0 0 4px", textTransform: "uppercase" as const };
const referralName = { fontSize: "22px", fontWeight: "700" as const, color: "#1a1535", margin: "0" };

const giftBox = {
  backgroundColor: "#ecfdf5",
  borderRadius: "10px",
  padding: "20px",
  textAlign: "center" as const,
  marginBottom: "20px",
};
const giftTitle = { fontSize: "16px", fontWeight: "600" as const, color: "#059669", margin: "0 0 8px" };
const giftText = { fontSize: "15px", color: "#3a3a5c", lineHeight: "1.5", margin: "0" };

const btn = {
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600" as const,
  borderRadius: "8px",
  padding: "14px 32px",
  textDecoration: "none",
};

export default ReferralThankYou;
