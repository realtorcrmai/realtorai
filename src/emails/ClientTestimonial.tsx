import { Button, Img, Section, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, RealtorBranding } from "./BaseLayout";

interface Testimonial {
  quote: string;
  clientName: string;
  clientRole: string;
  photo?: string;
}

interface ClientTestimonialProps {
  branding: RealtorBranding;
  recipientName: string;
  testimonial: Testimonial;
  message: string;
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeUrl: string;
}

export function ClientTestimonial({
  branding,
  recipientName,
  testimonial,
  message,
  ctaText = "Refer a Friend",
  ctaUrl = "#",
  unsubscribeUrl,
}: ClientTestimonialProps) {
  const accent = branding.accentColor || "#4f35d2";

  return (
    <BaseLayout
      previewText={`"${testimonial.quote.slice(0, 60)}..." — ${testimonial.clientName}`}
      branding={branding}
      unsubscribeUrl={unsubscribeUrl}
    >
      {/* Star Emoji Header */}
      <Section style={{ textAlign: "center", marginBottom: "8px" }}>
        <Text style={emojiStyle}>⭐</Text>
      </Section>

      <Section style={{ textAlign: "center", marginBottom: "20px" }}>
        <Text style={headerLabel}>CLIENT SUCCESS STORY</Text>
      </Section>

      {/* Quote Card */}
      <Section style={quoteCard}>
        <Text style={quoteMarks}>&ldquo;</Text>
        <Text style={quoteText}>{testimonial.quote}</Text>
        <Section style={{ textAlign: "center", marginTop: "16px" }}>
          {testimonial.photo && (
            <Img
              src={testimonial.photo}
              width="48"
              height="48"
              alt={`Photo of ${testimonial.clientName}`}
              style={clientAvatar}
            />
          )}
          <Text style={clientName}>{testimonial.clientName}</Text>
          <Text style={clientRole}>{testimonial.clientRole}</Text>
        </Section>
      </Section>

      <Text style={greeting}>Hi {recipientName},</Text>
      <Text style={bodyText}>{message}</Text>

      {ctaUrl && ctaUrl !== "#" && (
        <Section style={{ textAlign: "center", marginTop: "24px" }}>
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

const emojiStyle = {
  fontSize: "40px",
  margin: "0",
  lineHeight: "1",
};

const headerLabel = {
  display: "inline-block" as const,
  fontSize: "12px",
  fontWeight: "700" as const,
  color: "#6b6b8d",
  textTransform: "uppercase" as const,
  letterSpacing: "1.5px",
  margin: "0",
};

const quoteCard = {
  backgroundColor: "#f7f7f8",
  borderRadius: "12px",
  padding: "24px 24px 20px",
  marginBottom: "20px",
  textAlign: "center" as const,
};

const quoteMarks = {
  fontSize: "48px",
  color: "#4f35d2",
  margin: "0",
  lineHeight: "1",
  fontFamily: "Georgia, serif",
};

const quoteText = {
  fontSize: "17px",
  color: "#1a1535",
  lineHeight: "1.6",
  fontStyle: "italic" as const,
  margin: "0",
};

const clientAvatar = {
  borderRadius: "50%",
  margin: "0 auto 8px",
  objectFit: "cover" as const,
};

const clientName = {
  fontSize: "15px",
  fontWeight: "600" as const,
  color: "#1a1535",
  margin: "0",
};

const clientRole = {
  fontSize: "13px",
  color: "#6b6b8d",
  margin: "2px 0 0",
};

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

export default ClientTestimonial;
