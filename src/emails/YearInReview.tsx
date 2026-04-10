import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, RealtorBranding } from "./BaseLayout";

interface YearInReviewStat {
  label: string;
  value: string;
}

interface YearInReviewProps {
  branding: RealtorBranding;
  recipientName: string;
  year: string;
  stats: YearInReviewStat[];
  highlights: string[];
  marketSummary: string;
  outlook: string;
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeUrl: string;
}

export function YearInReview({
  branding,
  recipientName,
  year,
  stats,
  highlights,
  marketSummary,
  outlook,
  ctaText = "Let's Connect in the New Year",
  ctaUrl = "#",
  unsubscribeUrl,
}: YearInReviewProps) {
  const accent = branding.accentColor || "#4f35d2";

  return (
    <BaseLayout
      previewText={`Your ${year} Year in Review with ${branding.name}`}
      branding={branding}
      unsubscribeUrl={unsubscribeUrl}
    >
      {/* Year Banner */}
      <Section style={{ textAlign: "center", marginBottom: "24px" }}>
        <Text style={yearBadge}>{year} YEAR IN REVIEW</Text>
        <Text style={yearDisplay}>{year}</Text>
      </Section>

      <Text style={greeting}>Hi {recipientName},</Text>
      <Text style={bodyText}>
        What a year it has been! Here is a look back at the highlights and what lies ahead.
      </Text>

      {/* Stats Grid */}
      {stats.length > 0 && (
        <Section style={statsContainer}>
          {stats.map((stat, i) => (
            <Section key={i} style={statBox}>
              <Text style={statValue}>{stat.value}</Text>
              <Text style={statLabel}>{stat.label}</Text>
            </Section>
          ))}
        </Section>
      )}

      {/* Highlights */}
      {highlights.length > 0 && (
        <>
          <Text style={sectionTitle}>Highlights</Text>
          <Section style={{ marginBottom: "16px" }}>
            {highlights.map((h, i) => (
              <Text key={i} style={highlightItem}>&#11088; {h}</Text>
            ))}
          </Section>
        </>
      )}

      {/* Market Summary */}
      <Text style={sectionTitle}>Market Summary</Text>
      <Text style={bodyText}>{marketSummary}</Text>

      {/* Outlook */}
      <Section style={outlookBox}>
        <Text style={outlookTitle}>Looking Ahead</Text>
        <Text style={outlookText}>{outlook}</Text>
      </Section>

      {ctaUrl && ctaUrl !== "#" && (
        <Section style={{ textAlign: "center", marginTop: "20px" }}>
          <Button href={ctaUrl} style={{ ...btn, backgroundColor: accent }}>
            {ctaText}
          </Button>
        </Section>
      )}

      <Text style={signoff}>
        Here's to a great year ahead,<br />{branding.name}
      </Text>
    </BaseLayout>
  );
}

const yearBadge = {
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

const yearDisplay = {
  fontSize: "48px",
  fontWeight: "700" as const,
  color: "#1a1535",
  margin: "12px 0 0",
  letterSpacing: "-1px",
};

const greeting = { fontSize: "16px", color: "#1a1535", margin: "0 0 12px" };
const bodyText = { fontSize: "15px", color: "#3a3a5c", lineHeight: "1.6", margin: "0 0 16px" };
const signoff = { fontSize: "15px", color: "#3a3a5c", marginTop: "24px" };
const sectionTitle = { fontSize: "17px", fontWeight: "600" as const, color: "#1a1535", margin: "24px 0 12px" };

const statsContainer = { marginBottom: "24px" };
const statBox = {
  display: "inline-block" as const,
  width: "30%",
  textAlign: "center" as const,
  padding: "16px 8px",
  backgroundColor: "#f7f7f8",
  borderRadius: "10px",
  marginRight: "3%",
  marginBottom: "8px",
};
const statValue = { fontSize: "24px", fontWeight: "700" as const, color: "#1a1535", margin: "0" };
const statLabel = { fontSize: "12px", color: "#6b6b8d", margin: "4px 0 0", textTransform: "uppercase" as const };

const highlightItem = {
  fontSize: "14px",
  color: "#3a3a5c",
  margin: "0 0 8px",
  padding: "8px 14px",
  backgroundColor: "#fafafa",
  borderRadius: "8px",
};

const outlookBox = {
  backgroundColor: "#f7f7f8",
  borderRadius: "10px",
  padding: "20px",
  marginBottom: "16px",
};
const outlookTitle = { fontSize: "16px", fontWeight: "600" as const, color: "#1a1535", margin: "0 0 8px" };
const outlookText = { fontSize: "15px", color: "#3a3a5c", lineHeight: "1.6", margin: "0" };

const btn = {
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600" as const,
  borderRadius: "8px",
  padding: "14px 32px",
  textDecoration: "none",
};

export default YearInReview;
