import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, RealtorBranding } from "./BaseLayout";

interface AreaHighlight {
  category: string;
  items: string[];
}

interface NeighbourhoodGuideProps {
  branding: RealtorBranding;
  recipientName: string;
  area: string;
  intro: string;
  highlights: AreaHighlight[];
  funFact?: string;
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeUrl: string;
}

export function NeighbourhoodGuide({
  branding,
  recipientName,
  area,
  intro,
  highlights,
  funFact,
  ctaText = "Explore Homes in " + area,
  ctaUrl = "#",
  unsubscribeUrl,
}: NeighbourhoodGuideProps) {
  const accent = branding.accentColor || "#4f35d2";

  return (
    <BaseLayout
      previewText={`Discover ${area} — Your Neighbourhood Guide`}
      branding={branding}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Section style={{ textAlign: "center", marginBottom: "20px" }}>
        <Text style={areaBadge}>{area}</Text>
        <Text style={title}>Neighbourhood Guide</Text>
      </Section>

      <Text style={greeting}>Hi {recipientName},</Text>
      <Text style={bodyText}>{intro}</Text>

      {highlights.map((h, i) => (
        <Section key={i} style={highlightSection}>
          <Text style={categoryTitle}>{h.category}</Text>
          {h.items.map((item, j) => (
            <Text key={j} style={highlightItem}>&#8226; {item}</Text>
          ))}
        </Section>
      ))}

      {funFact && (
        <Section style={funFactBox}>
          <Text style={funFactLabel}>Fun Fact</Text>
          <Text style={funFactText}>{funFact}</Text>
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
        Happy exploring!<br />{branding.name}
      </Text>
    </BaseLayout>
  );
}

const areaBadge = {
  fontSize: "13px",
  fontWeight: "600" as const,
  color: "#4f35d2",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
  margin: "0",
};
const title = { fontSize: "26px", fontWeight: "700" as const, color: "#1a1535", margin: "4px 0 0" };

const greeting = { fontSize: "16px", color: "#1a1535", margin: "0 0 12px" };
const bodyText = { fontSize: "15px", color: "#3a3a5c", lineHeight: "1.6", margin: "0 0 20px" };
const signoff = { fontSize: "15px", color: "#3a3a5c", marginTop: "24px" };

const highlightSection = {
  marginBottom: "16px",
  padding: "16px",
  backgroundColor: "#fafafa",
  borderRadius: "10px",
};
const categoryTitle = {
  fontSize: "15px",
  fontWeight: "700" as const,
  color: "#1a1535",
  margin: "0 0 8px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};
const highlightItem = { fontSize: "14px", color: "#3a3a5c", margin: "0 0 4px", paddingLeft: "4px" };

const funFactBox = {
  backgroundColor: "#f7f7f8",
  borderRadius: "10px",
  padding: "16px",
  borderLeft: "4px solid #4f35d2",
  marginTop: "16px",
};
const funFactLabel = { fontSize: "12px", fontWeight: "700" as const, color: "#4f35d2", margin: "0 0 4px", textTransform: "uppercase" as const };
const funFactText = { fontSize: "14px", color: "#3a3a5c", fontStyle: "italic", margin: "0" };

const btn = {
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600" as const,
  borderRadius: "8px",
  padding: "14px 32px",
  textDecoration: "none",
};

export default NeighbourhoodGuide;
