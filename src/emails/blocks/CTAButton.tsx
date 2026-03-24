/**
 * CTAButtonBlock — Primary action button
 */

import { Section, Link } from "@react-email/components";

type Props = {
  href: string;
  text: string;
  accentColor?: string;
  fullWidth?: boolean;
};

export function CTAButtonBlock({
  href,
  text,
  accentColor = "#4f35d2",
  fullWidth = false,
}: Props) {
  return (
    <Section style={{ textAlign: "center", margin: "20px 0" }}>
      <Link
        href={href}
        style={{
          display: "inline-block",
          background: `linear-gradient(135deg, ${accentColor}, ${lighten(accentColor, 20)})`,
          color: "#ffffff",
          padding: "14px 32px",
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          textDecoration: "none",
          fontFamily: "system-ui, -apple-system, sans-serif",
          width: fullWidth ? "100%" : "auto",
          textAlign: "center",
          boxSizing: "border-box",
        }}
      >
        {text}
      </Link>
    </Section>
  );
}

function lighten(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100));
  const g = Math.min(255, ((num >> 8) & 0x00ff) + Math.round(255 * percent / 100));
  const b = Math.min(255, (num & 0x0000ff) + Math.round(255 * percent / 100));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, "0")}`;
}
