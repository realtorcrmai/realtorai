import { Button, Img, Section, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, RealtorBranding } from "./BaseLayout";

interface OpenHouseInviteProps {
  branding: RealtorBranding;
  recipientName: string;
  address: string;
  price: string;
  date: string;
  time: string;
  photo?: string;
  description: string;
  features: string[];
  rsvpUrl?: string;
  unsubscribeUrl: string;
}

export function OpenHouseInvite({
  branding,
  recipientName,
  address,
  price,
  date,
  time,
  photo,
  description,
  features,
  rsvpUrl = "#",
  unsubscribeUrl,
}: OpenHouseInviteProps) {
  const accent = branding.accentColor || "#4f35d2";

  return (
    <BaseLayout
      previewText={`Open House: ${address} — ${date} at ${time}`}
      branding={branding}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Section style={{ textAlign: "center", marginBottom: "16px" }}>
        <Text style={eventBadge}>OPEN HOUSE</Text>
      </Section>

      {photo && (
        <Img src={photo} width="536" height="300" alt={address} style={heroImage} />
      )}

      <Section style={{ textAlign: "center", padding: "20px 0 8px" }}>
        <Text style={addressText}>{address}</Text>
        <Text style={priceText}>{price}</Text>
      </Section>

      {/* Date/Time Banner */}
      <Section style={dateBox}>
        <Text style={dateText}>{date}</Text>
        <Text style={timeText}>{time}</Text>
      </Section>

      <Text style={greeting}>Hi {recipientName},</Text>
      <Text style={bodyText}>{description}</Text>

      {features.length > 0 && (
        <Section style={{ marginBottom: "16px" }}>
          {features.map((f, i) => (
            <Text key={i} style={featureItem}>&#10003; {f}</Text>
          ))}
        </Section>
      )}

      {rsvpUrl && rsvpUrl !== "#" && (
        <Section style={{ textAlign: "center", marginTop: "20px" }}>
          <Button href={rsvpUrl} style={{ ...btn, backgroundColor: accent }}>
            RSVP — I'll Be There
          </Button>
        </Section>
      )}

      <Text style={signoff}>
        Hope to see you there!<br />{branding.name}
      </Text>
    </BaseLayout>
  );
}

const eventBadge = {
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

const heroImage = {
  width: "100%",
  height: "auto",
  borderRadius: "10px",
  objectFit: "cover" as const,
};

const addressText = { fontSize: "18px", fontWeight: "600" as const, color: "#1a1535", margin: "0" };
const priceText = { fontSize: "24px", fontWeight: "700" as const, color: "#4f35d2", margin: "4px 0 0" };

const dateBox = {
  backgroundColor: "#f6f5ff",
  borderRadius: "10px",
  padding: "16px",
  textAlign: "center" as const,
  marginBottom: "20px",
};
const dateText = { fontSize: "18px", fontWeight: "700" as const, color: "#1a1535", margin: "0" };
const timeText = { fontSize: "15px", color: "#4f35d2", fontWeight: "600" as const, margin: "4px 0 0" };

const greeting = { fontSize: "16px", color: "#1a1535", margin: "0 0 12px" };
const bodyText = { fontSize: "15px", color: "#3a3a5c", lineHeight: "1.6", margin: "0 0 16px" };
const signoff = { fontSize: "15px", color: "#3a3a5c", marginTop: "24px" };
const featureItem = { fontSize: "14px", color: "#3a3a5c", margin: "0 0 6px", paddingLeft: "4px" };

const btn = {
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600" as const,
  borderRadius: "8px",
  padding: "14px 32px",
  textDecoration: "none",
};

export default OpenHouseInvite;
