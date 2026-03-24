/**
 * PropertyCardBlock — Photo + address + price + beds/baths + CTA
 * Email-safe: table-based layout
 */

import { Section, Img, Text, Link } from "@react-email/components";

type Props = {
  photoUrl?: string;
  address: string;
  price: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  ctaUrl?: string;
  ctaText?: string;
  accentColor?: string;
};

export function PropertyCardBlock({
  photoUrl,
  address,
  price,
  beds,
  baths,
  sqft,
  ctaUrl = "#",
  ctaText = "View Details",
  accentColor = "#4f35d2",
}: Props) {
  const details = [
    beds ? `${beds} BD` : null,
    baths ? `${baths} BA` : null,
    sqft ? `${sqft.toLocaleString()} sqft` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Section
      style={{
        border: "1px solid #e8e5f5",
        borderRadius: 10,
        overflow: "hidden",
        marginBottom: 12,
      }}
    >
      {photoUrl && (
        <Img
          src={photoUrl}
          alt={address}
          width="100%"
          style={{ display: "block", width: "100%", height: "auto" }}
        />
      )}
      <Section style={{ padding: "12px 16px" }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#1a1535",
            margin: "0 0 2px",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          {address}
        </Text>
        <Text
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: accentColor,
            margin: "0 0 4px",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          {price}
        </Text>
        {details && (
          <Text
            style={{
              fontSize: 13,
              color: "#6b6b8d",
              margin: "0 0 10px",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            {details}
          </Text>
        )}
        <Link
          href={ctaUrl}
          style={{
            display: "inline-block",
            background: accentColor,
            color: "#ffffff",
            padding: "8px 20px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          {ctaText}
        </Link>
      </Section>
    </Section>
  );
}
