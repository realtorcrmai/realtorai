import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, RealtorBranding } from "./BaseLayout";

interface MarketStat {
  label: string;
  value: string;
  change?: string;
}

interface RecentSale {
  address: string;
  price: string;
  daysOnMarket: number;
}

interface MarketUpdateProps {
  branding: RealtorBranding;
  recipientName: string;
  area: string;
  month: string;
  intro: string;
  stats: MarketStat[];
  recentSales: RecentSale[];
  commentary: string;
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeUrl: string;
}

export function MarketUpdate({
  branding,
  recipientName,
  area,
  month,
  intro,
  stats,
  recentSales,
  commentary,
  ctaText = "Get Your Home's Value",
  ctaUrl = "#",
  unsubscribeUrl,
}: MarketUpdateProps) {
  const accent = branding.accentColor || "#4f35d2";

  return (
    <BaseLayout
      previewText={`${area} Market Update — ${month}`}
      branding={branding}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={greeting}>Hi {recipientName},</Text>
      <Text style={bodyText}>{intro}</Text>

      {/* Stats Grid */}
      <Section style={statsContainer}>
        {stats.map((stat, i) => (
          <Section key={i} style={statBox}>
            <Text style={statValue}>{stat.value}</Text>
            <Text style={statLabel}>{stat.label}</Text>
            {stat.change && (
              <Text style={{
                ...statChange,
                color: stat.change.startsWith("+") ? "#059669" : stat.change.startsWith("-") ? "#dc2626" : "#6b6b8d",
              }}>
                {stat.change}
              </Text>
            )}
          </Section>
        ))}
      </Section>

      {/* Recent Sales */}
      {recentSales.length > 0 && (
        <>
          <Text style={sectionTitle}>Recent Sales in {area}</Text>
          <Section style={salesTable}>
            {recentSales.map((sale, i) => (
              <Section key={i} style={saleRow}>
                <Text style={saleAddress}>{sale.address}</Text>
                <Text style={saleDetails}>
                  {sale.price} · {sale.daysOnMarket} days on market
                </Text>
              </Section>
            ))}
          </Section>
        </>
      )}

      {/* Commentary */}
      <Text style={bodyText}>{commentary}</Text>

      {ctaUrl && ctaUrl !== "#" && (
        <Section style={{ textAlign: "center", marginTop: "20px" }}>
          <Button href={ctaUrl} style={{ ...btn, backgroundColor: accent }}>
            {ctaText}
          </Button>
        </Section>
      )}

      <Text style={signoff}>
        Best regards,<br />{branding.name}
      </Text>
    </BaseLayout>
  );
}

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
const statChange = { fontSize: "12px", fontWeight: "600" as const, margin: "2px 0 0" };

const salesTable = { marginBottom: "16px" };
const saleRow = {
  padding: "10px 14px",
  backgroundColor: "#fafafa",
  borderRadius: "8px",
  marginBottom: "6px",
};
const saleAddress = { fontSize: "14px", fontWeight: "600" as const, color: "#1a1535", margin: "0" };
const saleDetails = { fontSize: "13px", color: "#6b6b8d", margin: "2px 0 0" };

const btn = {
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600" as const,
  borderRadius: "8px",
  padding: "14px 32px",
  textDecoration: "none",
};

export default MarketUpdate;
