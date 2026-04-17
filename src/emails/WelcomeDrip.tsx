import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface WelcomeDripProps {
  firstName: string;
  day: number;
  appUrl: string;
  unsubscribeUrl: string;
}

// Content per drip day
function getDripContent(day: number, firstName: string, appUrl: string) {
  switch (day) {
    case 0:
      return {
        preview: "Welcome to Realtors360 — your AI-powered real estate CRM",
        heading: `Welcome, ${firstName}!`,
        body: "Your 14-day Professional trial is active — all features unlocked. Here are 3 quick wins to get started:",
        steps: [
          { emoji: "📇", text: "Import your contacts", href: `${appUrl}/contacts/new` },
          { emoji: "🏠", text: "Add your first listing", href: `${appUrl}/listings/new` },
          { emoji: "📅", text: "Connect your calendar", href: `${appUrl}/calendar` },
        ],
        cta: { text: "Go to Dashboard", href: appUrl },
      };
    case 1:
      return {
        preview: "Import your contacts in 60 seconds",
        heading: "Your contacts are waiting",
        body: `${firstName}, did you know you can import your entire contact list in under 60 seconds? We support Google Contacts CSV, Apple vCard, and manual CSV files.`,
        steps: null,
        cta: { text: "Import Contacts", href: `${appUrl}/contacts/new` },
      };
    case 2:
      return {
        preview: "AI writes your MLS remarks instantly",
        heading: "Let AI write your MLS remarks",
        body: `${firstName}, one of Realtors360's most powerful features: AI-generated MLS remarks. Add a listing, and our AI writes both your public remarks and REALTOR remarks instantly.`,
        steps: null,
        cta: { text: "Try It Now", href: `${appUrl}/listings/new` },
      };
    case 3:
      return {
        preview: "Send your first newsletter in 3 minutes",
        heading: "Your first AI newsletter",
        body: `${firstName}, our AI can write personalized emails for each of your contacts. You just approve and we send. Market updates, listing alerts, and neighbourhood guides — all on autopilot.`,
        steps: null,
        cta: { text: "Create a Campaign", href: `${appUrl}/newsletters` },
      };
    case 5:
      return {
        preview: "Never miss a showing with smart scheduling",
        heading: "Smart showing management",
        body: `${firstName}, connect your Google Calendar and we'll sync all your showings. Automated SMS notifications to buyer agents, lockbox code delivery on confirmation, and availability checking — all built in.`,
        steps: null,
        cta: { text: "Connect Calendar", href: `${appUrl}/calendar` },
      };
    case 7:
      return {
        preview: "7 days left on your Professional trial",
        heading: "Halfway there!",
        body: `${firstName}, you're halfway through your Professional trial — 7 days left! Keep exploring all the features. Here's what you can do today:`,
        steps: [
          { emoji: "🤖", text: "Generate AI content for a listing", href: `${appUrl}/content` },
          { emoji: "📧", text: "Set up an email automation", href: `${appUrl}/newsletters` },
          { emoji: "🎙️", text: "Try the voice assistant", href: appUrl },
        ],
        cta: { text: "View Your Account", href: `${appUrl}/settings/billing` },
      };
    case 12:
      return {
        preview: "Your Professional trial ends in 2 days",
        heading: "Trial ending soon",
        body: `${firstName}, your Professional trial ends in 2 days. After that, you'll be on the Free plan (contacts, calendar, and tasks only). Upgrade now to keep all your AI, email marketing, and workflow features.`,
        steps: null,
        cta: { text: "Upgrade Now", href: `${appUrl}/settings/billing` },
      };
    default:
      return {
        preview: "Update from Realtors360",
        heading: `Hi ${firstName}`,
        body: "Check out what's new in your Realtors360 dashboard.",
        steps: null,
        cta: { text: "Open Dashboard", href: appUrl },
      };
  }
}

export function WelcomeDrip({ firstName, day, appUrl, unsubscribeUrl }: WelcomeDripProps) {
  const content = getDripContent(day, firstName, appUrl);

  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light dark" />
        <style>{`
          @media (prefers-color-scheme: dark) {
            .drip-body { background-color: #1a1535 !important; }
            .drip-card { background-color: #2a2555 !important; }
            .drip-text { color: #e8e5f5 !important; }
            .drip-muted { color: #a0a0c0 !important; }
          }
          @media only screen and (max-width: 600px) {
            .drip-card { width: 100% !important; border-radius: 0 !important; }
          }
        `}</style>
      </Head>
      <Preview>{content.preview}</Preview>
      <Body style={main} className="drip-body">
        <Container style={container} className="drip-card">
          {/* Brand header */}
          <Section style={header}>
            <Text style={brandName}>Realtors360</Text>
          </Section>

          {/* Content */}
          <Section style={contentSection}>
            <Heading style={heading} className="drip-text">{content.heading}</Heading>
            <Text style={bodyText} className="drip-text">{content.body}</Text>

            {/* Steps list */}
            {content.steps && (
              <Section style={stepsContainer}>
                {content.steps.map((step, i) => (
                  <Link key={i} href={step.href} style={stepLink}>
                    <Text style={stepText}>
                      <span style={stepEmoji}>{step.emoji}</span> {step.text}
                    </Text>
                  </Link>
                ))}
              </Section>
            )}

            {/* CTA button */}
            <Section style={ctaSection}>
              <Button style={ctaButton} href={content.cta.href}>
                {content.cta.text}
              </Button>
            </Section>
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText} className="drip-muted">
              Rahul from Realtors360
            </Text>
            <Text style={unsubText}>
              <Link href={unsubscribeUrl} style={unsubLink}>Unsubscribe</Link>
              {" "}from onboarding emails
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default WelcomeDrip;

const main = {
  backgroundColor: "#f4f2ff",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  padding: "32px 16px",
};

const container = {
  maxWidth: "560px",
  margin: "0 auto",
  backgroundColor: "#ffffff",
  borderRadius: "16px",
  overflow: "hidden" as const,
};

const header = {
  padding: "28px 32px 0",
  textAlign: "center" as const,
};

const brandName = {
  fontSize: "20px",
  fontWeight: "700" as const,
  color: "#2D3E50",
  margin: "0",
  letterSpacing: "-0.5px",
};

const contentSection = {
  padding: "20px 32px 28px",
};

const heading = {
  fontSize: "22px",
  fontWeight: "700" as const,
  color: "#1a1535",
  margin: "0 0 12px",
  lineHeight: "1.3",
};

const bodyText = {
  fontSize: "15px",
  color: "#4a4a6a",
  lineHeight: "1.6",
  margin: "0 0 20px",
};

const stepsContainer = {
  margin: "0 0 24px",
};

const stepLink = {
  textDecoration: "none",
  display: "block" as const,
};

const stepText = {
  fontSize: "14px",
  color: "#4f35d2",
  padding: "10px 16px",
  margin: "0 0 6px",
  backgroundColor: "#f4f2ff",
  borderRadius: "10px",
  lineHeight: "1.4",
};

const stepEmoji = {
  fontSize: "16px",
  marginRight: "8px",
};

const ctaSection = {
  textAlign: "center" as const,
};

const ctaButton = {
  backgroundColor: "#4f35d2",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600" as const,
  padding: "12px 28px",
  borderRadius: "10px",
  textDecoration: "none",
};

const hr = {
  borderColor: "#e8e5f5",
  margin: "0",
};

const footer = {
  padding: "20px 32px",
  textAlign: "center" as const,
};

const footerText = {
  fontSize: "13px",
  color: "#6b6b8d",
  margin: "0 0 8px",
};

const unsubText = {
  fontSize: "11px",
  color: "#a0a0b0",
  margin: "0",
};

const unsubLink = {
  color: "#a0a0b0",
  textDecoration: "underline",
};
