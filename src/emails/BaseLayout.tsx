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
  /** Physical mailing address — required for CASL/CAN-SPAM compliance */
  physicalAddress?: string;
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
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style>{`
          @media (prefers-color-scheme: dark) {
            .email-body { background-color: #1a1535 !important; }
            .email-container { background-color: #2a2555 !important; }
            .email-text { color: #e8e5f5 !important; }
            .email-muted { color: #a0a0c0 !important; }
            .email-footer-bg { background-color: #2a2555 !important; }
          }
          @media only screen and (max-width: 600px) {
            .email-container { width: 100% !important; border-radius: 0 !important; }
            .email-content { padding: 0 16px 16px !important; }
            .email-header { padding: 20px 16px 12px !important; }
            .email-footer { padding: 16px !important; }
          }
        `}</style>
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={main} className="email-body">
        <Container style={container} className="email-container">
          {/* Header */}
          <Section style={header} className="email-header">
            {branding.logoUrl ? (
              <Img src={branding.logoUrl} width="140" alt={`${branding.name} logo`} style={{ margin: "0 auto" }} />
            ) : (
              <Text style={{ ...headerText, color: accent }}>{branding.name}</Text>
            )}
          </Section>

          {/* Content */}
          <Section style={content} className="email-content">
            {children}
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer} className="email-footer email-footer-bg">
            {branding.headshotUrl && (
              <Img
                src={branding.headshotUrl}
                width="60"
                height="60"
                alt={`Photo of ${branding.name}`}
                style={avatar}
              />
            )}
            <Text style={footerName} className="email-text">{branding.name}</Text>
            {branding.title && <Text style={footerDetail} className="email-muted">{branding.title}</Text>}
            {branding.brokerage && <Text style={footerDetail} className="email-muted">{branding.brokerage}</Text>}
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
            <Text style={unsubscribeTextStyle}>
              <Link href={unsubscribeUrl} style={unsubscribeLinkStyle}>Unsubscribe</Link>
              {" "}from these emails
            </Text>
            {branding.physicalAddress && (
              <Text style={physicalAddressStyle}>{branding.physicalAddress}</Text>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#ffffff",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  padding: "20px 0",
};

const container = {
  maxWidth: "600px",
  margin: "0 auto",
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  overflow: "hidden" as const,
  boxShadow: "none",
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

const unsubscribeTextStyle = {
  fontSize: "11px",
  color: "#a0a0b0",
  marginTop: "16px",
};

const unsubscribeLinkStyle = {
  color: "#a0a0b0",
  textDecoration: "underline",
};

const physicalAddressStyle = {
  fontSize: "10px",
  color: "#b0b0c0",
  margin: "4px 0 0",
};
