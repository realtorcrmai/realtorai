import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

export interface RealtorBranding {
  name: string;
  title?: string;
  brokerage?: string;
  phone?: string;
  email?: string;
  headshotUrl?: string;
  logoUrl?: string;
  accentColor?: string;
}

interface BaseLayoutProps {
  previewText: string;
  branding: RealtorBranding;
  children: React.ReactNode;
  unsubscribeUrl: string;
}

export function BaseLayout({ previewText, branding, children, unsubscribeUrl }: BaseLayoutProps) {
  const accent = branding.accentColor || "#4f35d2";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            {branding.logoUrl ? (
              <Img src={branding.logoUrl} width="140" alt={branding.name} style={{ margin: "0 auto" }} />
            ) : (
              <Text style={{ ...headerText, color: accent }}>{branding.name}</Text>
            )}
          </Section>

          {/* Content */}
          <Section style={content}>
            {children}
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            {branding.headshotUrl && (
              <Img
                src={branding.headshotUrl}
                width="60"
                height="60"
                alt={branding.name}
                style={avatar}
              />
            )}
            <Text style={footerName}>{branding.name}</Text>
            {branding.title && <Text style={footerDetail}>{branding.title}</Text>}
            {branding.brokerage && <Text style={footerDetail}>{branding.brokerage}</Text>}
            {branding.phone && (
              <Text style={footerDetail}>
                <Link href={`tel:${branding.phone}`} style={{ color: accent }}>{branding.phone}</Link>
              </Text>
            )}
            {branding.email && (
              <Text style={footerDetail}>
                <Link href={`mailto:${branding.email}`} style={{ color: accent }}>{branding.email}</Link>
              </Text>
            )}
            <Text style={unsubscribeText}>
              <Link href={unsubscribeUrl} style={unsubscribeLink}>Unsubscribe</Link>
              {" "}from these emails
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: "#f6f5ff",
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
};

const container = {
  maxWidth: "600px",
  margin: "0 auto",
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  overflow: "hidden" as const,
  boxShadow: "0 2px 12px rgba(79,53,210,0.06)",
};

const header = {
  padding: "28px 32px 20px",
  textAlign: "center" as const,
};

const headerText = {
  fontSize: "22px",
  fontWeight: "700" as const,
  margin: "0",
};

const content = {
  padding: "0 32px 24px",
};

const hr = {
  borderColor: "#e8e5f5",
  margin: "0",
};

const footer = {
  padding: "24px 32px",
  textAlign: "center" as const,
};

const avatar = {
  borderRadius: "50%",
  margin: "0 auto 12px",
  objectFit: "cover" as const,
};

const footerName = {
  fontSize: "15px",
  fontWeight: "600" as const,
  color: "#1a1535",
  margin: "0 0 2px",
};

const footerDetail = {
  fontSize: "13px",
  color: "#6b6b8d",
  margin: "0 0 2px",
};

const unsubscribeText = {
  fontSize: "11px",
  color: "#a0a0b0",
  marginTop: "16px",
};

const unsubscribeLink = {
  color: "#a0a0b0",
  textDecoration: "underline",
};
