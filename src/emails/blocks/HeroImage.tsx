/**
 * HeroImageBlock — Full-width property image with dark overlay + text
 * Email-safe: uses tables + inline styles only
 */

import { Section, Img, Text, Heading } from "@react-email/components";

type Props = {
  imageUrl: string;
  alt?: string;
  headline?: string;
  subheadline?: string;
  overlayColor?: string;
  textColor?: string;
};

export function HeroImageBlock({
  imageUrl,
  alt = "Property",
  headline,
  subheadline,
  overlayColor = "rgba(0,0,0,0.4)",
  textColor = "#ffffff",
}: Props) {
  return (
    <Section style={{ position: "relative", width: "100%", maxWidth: 600 }}>
      <Img
        src={imageUrl}
        alt={alt}
        width="600"
        style={{ width: "100%", height: "auto", display: "block", borderRadius: 0 }}
      />
      {(headline || subheadline) && (
        <Section
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "24px 32px",
            background: overlayColor,
          }}
        >
          {headline && (
            <Heading
              as="h1"
              style={{
                color: textColor,
                fontSize: 24,
                fontWeight: 700,
                margin: "0 0 4px",
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              {headline}
            </Heading>
          )}
          {subheadline && (
            <Text
              style={{
                color: textColor,
                fontSize: 15,
                margin: 0,
                opacity: 0.9,
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              {subheadline}
            </Text>
          )}
        </Section>
      )}
    </Section>
  );
}
