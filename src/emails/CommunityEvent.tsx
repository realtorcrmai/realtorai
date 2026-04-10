import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, RealtorBranding } from "./BaseLayout";

interface CommunityEventProps {
  branding: RealtorBranding;
  recipientName: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  location: string;
  description: string;
  whyAttend: string[];
  ctaText?: string;
  rsvpUrl?: string;
  unsubscribeUrl: string;
}

export function CommunityEvent({
  branding,
  recipientName,
  eventName,
  eventDate,
  eventTime,
  location,
  description,
  whyAttend,
  ctaText = "RSVP Now",
  rsvpUrl = "#",
  unsubscribeUrl,
}: CommunityEventProps) {
  const accent = branding.accentColor || "#4f35d2";

  return (
    <BaseLayout
      previewText={`You're Invited: ${eventName} — ${eventDate}`}
      branding={branding}
      unsubscribeUrl={unsubscribeUrl}
    >
      {/* Badge */}
      <Section style={{ textAlign: "center", marginBottom: "16px" }}>
        <Text style={eventBadge}>COMMUNITY EVENT</Text>
      </Section>

      {/* Event Name */}
      <Section style={{ textAlign: "center", marginBottom: "20px" }}>
        <Text style={eventNameText}>{eventName}</Text>
      </Section>

      {/* Date/Time/Location Card */}
      <Section style={dateBox}>
        <Text style={dateText}>{eventDate}</Text>
        <Text style={timeText}>{eventTime}</Text>
        <Text style={locationText}>{location}</Text>
      </Section>

      <Text style={greeting}>Hi {recipientName},</Text>
      <Text style={bodyText}>{description}</Text>

      {/* Why Attend */}
      {whyAttend.length > 0 && (
        <>
          <Text style={sectionTitle}>Why You Should Attend</Text>
          <Section style={{ marginBottom: "16px" }}>
            {whyAttend.map((reason, i) => (
              <Text key={i} style={reasonItem}>&#10003; {reason}</Text>
            ))}
          </Section>
        </>
      )}

      {rsvpUrl && rsvpUrl !== "#" && (
        <Section style={{ textAlign: "center", marginTop: "20px" }}>
          <Button href={rsvpUrl} style={{ ...btn, backgroundColor: accent }}>
            {ctaText}
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

const eventNameText = {
  fontSize: "24px",
  fontWeight: "700" as const,
  color: "#1a1535",
  margin: "0",
};

const dateBox = {
  backgroundColor: "#f7f7f8",
  borderRadius: "10px",
  padding: "16px",
  textAlign: "center" as const,
  marginBottom: "20px",
};
const dateText = { fontSize: "18px", fontWeight: "700" as const, color: "#1a1535", margin: "0" };
const timeText = { fontSize: "15px", color: "#4f35d2", fontWeight: "600" as const, margin: "4px 0 0" };
const locationText = { fontSize: "13px", color: "#6b6b8d", margin: "8px 0 0" };

const greeting = { fontSize: "16px", color: "#1a1535", margin: "0 0 12px" };
const bodyText = { fontSize: "15px", color: "#3a3a5c", lineHeight: "1.6", margin: "0 0 16px" };
const signoff = { fontSize: "15px", color: "#3a3a5c", marginTop: "24px" };
const sectionTitle = { fontSize: "17px", fontWeight: "600" as const, color: "#1a1535", margin: "24px 0 12px" };

const reasonItem = { fontSize: "14px", color: "#3a3a5c", margin: "0 0 6px", paddingLeft: "4px" };

const btn = {
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600" as const,
  borderRadius: "8px",
  padding: "14px 32px",
  textDecoration: "none",
};

export default CommunityEvent;
