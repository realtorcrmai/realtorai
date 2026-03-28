/**
 * StatBoxBlock — Big number + label + trend arrow
 * Used in market update emails (3-column layout)
 */

import { Column, Row, Section, Text } from "@react-email/components";

type Stat = {
  value: string;
  label: string;
  change?: string; // "+3.2%" or "-5%"
};

type Props = {
  stats: Stat[];
  accentColor?: string;
};

export function StatBoxBlock({ stats, accentColor = "#4f35d2" }: Props) {
  return (
    <Section style={{ marginBottom: 16 }}>
      <Row>
        {stats.slice(0, 3).map((stat, i) => (
          <Column
            key={i}
            style={{
              width: "30%",
              textAlign: "center",
              padding: "14px 8px",
              background: "#f6f5ff",
              borderRadius: 10,
              marginRight: i < 2 ? "3%" : 0,
            }}
          >
            <Text
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "#1a1535",
                margin: 0,
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              {stat.value}
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: "#6b6b8d",
                margin: "4px 0 0",
                textTransform: "uppercase" as const,
                letterSpacing: 0.5,
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              {stat.label}
            </Text>
            {stat.change && (
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: stat.change.startsWith("+") ? "#059669" : "#dc2626",
                  margin: "2px 0 0",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                {stat.change}
              </Text>
            )}
          </Column>
        ))}
      </Row>
    </Section>
  );
}
