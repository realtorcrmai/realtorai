import {
  Button,
  Column,
  Img,
  Row,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { BaseLayout, RealtorBranding } from "./BaseLayout";

interface ListingItem {
  photo?: string;
  address: string;
  price: string;
  beds: number;
  baths: number;
  sqft?: string;
  listingUrl?: string;
}

interface NewListingAlertProps {
  branding: RealtorBranding;
  recipientName: string;
  area: string;
  intro: string;
  listings: ListingItem[];
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeUrl: string;
}

export function NewListingAlert({
  branding,
  recipientName,
  area,
  intro,
  listings,
  ctaText = "Book a Showing",
  ctaUrl = "#",
  unsubscribeUrl,
}: NewListingAlertProps) {
  const accent = branding.accentColor || "#4f35d2";

  return (
    <BaseLayout
      previewText={`${listings.length} new listing${listings.length > 1 ? "s" : ""} in ${area}`}
      branding={branding}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={greeting}>Hi {recipientName},</Text>
      <Text style={bodyText}>{intro}</Text>

      {listings.map((listing, i) => (
        <Section key={i} style={listingCard}>
          {listing.photo && (
            <Img src={listing.photo} width="536" height="280" alt={listing.address} style={listingPhoto} />
          )}
          <Section style={listingBody}>
            <Text style={listingPrice}>{listing.price}</Text>
            <Text style={listingAddress}>{listing.address}</Text>
            <Text style={listingSpecs}>
              {listing.beds} bed · {listing.baths} bath{listing.sqft ? ` · ${listing.sqft}` : ""}
            </Text>
            {listing.listingUrl && (
              <Button href={listing.listingUrl} style={{ ...btn, backgroundColor: accent }}>
                View Details
              </Button>
            )}
          </Section>
        </Section>
      ))}

      {ctaUrl && ctaUrl !== "#" && (
        <Section style={{ textAlign: "center", marginTop: "24px" }}>
          <Button href={ctaUrl} style={{ ...btn, backgroundColor: accent, padding: "14px 32px" }}>
            {ctaText}
          </Button>
        </Section>
      )}

      <Text style={signoff}>
        Talk soon,<br />{branding.name}
      </Text>
    </BaseLayout>
  );
}

const greeting = { fontSize: "16px", color: "#1a1535", margin: "0 0 12px" };
const bodyText = { fontSize: "15px", color: "#3a3a5c", lineHeight: "1.6", margin: "0 0 20px" };
const signoff = { fontSize: "15px", color: "#3a3a5c", marginTop: "24px" };

const listingCard = {
  border: "1px solid #e8e5f5",
  borderRadius: "10px",
  overflow: "hidden" as const,
  marginBottom: "16px",
};
const listingPhoto = {
  width: "100%",
  height: "auto",
  objectFit: "cover" as const,
  display: "block" as const,
};
const listingBody = { padding: "16px" };
const listingPrice = { fontSize: "20px", fontWeight: "700" as const, color: "#1a1535", margin: "0 0 4px" };
const listingAddress = { fontSize: "15px", color: "#3a3a5c", margin: "0 0 4px" };
const listingSpecs = { fontSize: "13px", color: "#6b6b8d", margin: "0 0 12px" };

const btn = {
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600" as const,
  borderRadius: "8px",
  padding: "10px 20px",
  textDecoration: "none",
  display: "inline-block" as const,
};

export default NewListingAlert;
