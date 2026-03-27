/**
 * DDF → CRM field mapper.
 *
 * Maps CREA DDF API property records to the existing CRM data model:
 *   - listings table (core columns)
 *   - form_submissions "step-data-enrichment" (JSONB form_data)
 *   - form_submissions "step-mls-prep" (JSONB form_data)
 *
 * IMPORTANT: This mapper only writes to fields that already exist in the
 * schema. No new columns are created. All enrichment data goes into the
 * flexible JSONB form_data column in form_submissions.
 */

import type { DDFProperty, DDFMappedListing } from "@/types/ddf";

// ─── Property type mapping ────────────────────────────
// DDF PropertySubType → listings.property_type CHECK constraint

const PROPERTY_TYPE_MAP: Record<string, string> = {
  "Single Family": "Residential",
  "Single Family Residence": "Residential",
  Condominium: "Condo/Apartment",
  Apartment: "Condo/Apartment",
  Townhouse: "Townhouse",
  "Row / Townhouse": "Townhouse",
  "Vacant Land": "Land",
  "Agriculture": "Land",
  Farm: "Land",
  Commercial: "Commercial",
  Industrial: "Commercial",
  Office: "Commercial",
  Retail: "Commercial",
  "Business w/ Property": "Commercial",
  Duplex: "Multi-Family",
  Triplex: "Multi-Family",
  Fourplex: "Multi-Family",
  "Multi Family": "Multi-Family",
  "Manufactured Home": "Residential",
  "Mobile Home": "Residential",
};

// ─── Status mapping ───────────────────────────────────
// DDF StandardStatus → listings.status CHECK constraint

const STATUS_MAP: Record<string, string> = {
  Active: "active",
  "Active Under Contract": "conditional",
  Pending: "pending",
  Closed: "sold",
  Expired: "expired",
  Withdrawn: "withdrawn",
  Cancelled: "cancelled",
  Delete: "cancelled",
};

// ─── Dwelling style from stories ──────────────────────

function mapDwellingStyle(stories: number | null): string | null {
  if (stories == null) return null;
  if (stories === 1) return "1 Storey";
  if (stories === 1.5) return "1.5 Storey";
  if (stories === 2) return "2 Storey";
  if (stories === 2.5) return "2.5 Storey";
  if (stories >= 3) return "3 Storey";
  return null;
}

// ─── Dwelling type from PropertySubType ───────────────

function mapDwellingType(subType: string): string | null {
  const map: Record<string, string> = {
    "Single Family": "Detached",
    "Single Family Residence": "Detached",
    Condominium: "Condo/Apartment",
    Apartment: "Condo/Apartment",
    Townhouse: "Townhouse",
    "Row / Townhouse": "Townhouse",
    Duplex: "Duplex",
    Triplex: "Triplex",
    "Manufactured Home": "Manufactured",
    "Mobile Home": "Manufactured",
  };
  return map[subType] ?? null;
}

// ─── Array fields → comma-separated string ────────────

function joinArray(arr: string[] | undefined | null): string | null {
  if (!arr || arr.length === 0) return null;
  return arr.join(", ");
}

// ─── Best heating match for select field ──────────────

function mapHeating(heating: string[]): string | null {
  if (!heating || heating.length === 0) return null;
  const joined = heating.join(", ").toLowerCase();
  if (joined.includes("forced air")) return "Forced Air";
  if (joined.includes("baseboard")) return "Baseboard";
  if (joined.includes("radiant") || joined.includes("in-floor")) return "Radiant/In-Floor";
  if (joined.includes("heat pump")) return "Heat Pump";
  return "Other";
}

function mapCooling(cooling: string[]): string | null {
  if (!cooling || cooling.length === 0) return "None";
  const joined = cooling.join(", ").toLowerCase();
  if (joined.includes("central")) return "Central Air";
  if (joined.includes("wall")) return "Wall Unit";
  if (joined.includes("heat pump")) return "Heat Pump";
  return "Other";
}

function mapRoof(roof: string[]): string | null {
  if (!roof || roof.length === 0) return null;
  const joined = roof.join(", ").toLowerCase();
  if (joined.includes("asphalt") || joined.includes("shingle")) return "Asphalt Shingle";
  if (joined.includes("metal")) return "Metal";
  if (joined.includes("tile")) return "Tile";
  if (joined.includes("flat") || joined.includes("built")) return "Flat/Built-Up";
  if (joined.includes("cedar") || joined.includes("shake")) return "Cedar Shake";
  return "Other";
}

function mapExterior(materials: string[]): string | null {
  if (!materials || materials.length === 0) return null;
  const joined = materials.join(", ").toLowerCase();
  if (joined.includes("vinyl")) return "Vinyl Siding";
  if (joined.includes("wood")) return "Wood";
  if (joined.includes("stucco")) return "Stucco";
  if (joined.includes("brick")) return "Brick";
  if (joined.includes("stone")) return "Stone";
  if (joined.includes("cement") || joined.includes("fibre") || joined.includes("fiber")) return "Cement/Fibre";
  return "Mixed";
}

function mapFoundation(details: string[]): string | null {
  if (!details || details.length === 0) return null;
  const joined = details.join(", ").toLowerCase();
  if (joined.includes("concrete") || joined.includes("poured")) return "Concrete Perimeter";
  if (joined.includes("slab")) return "Slab";
  if (joined.includes("crawl")) return "Crawl Space";
  if (joined.includes("pil")) return "Piling";
  return "Other";
}

// ─── Hero image: pick preferred photo or first ────────

function pickHeroImage(media: DDFProperty["Media"]): string | null {
  if (!media || media.length === 0) return null;
  const preferred = media.find((m) => m.PreferredPhotoYN && m.MediaCategory === "Property Photo");
  if (preferred) return preferred.MediaURL;
  const photo = media.find((m) => m.MediaCategory === "Property Photo");
  return photo?.MediaURL ?? media[0]?.MediaURL ?? null;
}

// ─── View mapping ─────────────────────────────────────

function mapView(views: string[]): string | null {
  if (!views || views.length === 0) return "None";
  const joined = views.join(", ").toLowerCase();
  if (joined.includes("mountain")) return "Mountain";
  if (joined.includes("water") || joined.includes("ocean") || joined.includes("lake")) return "Water";
  if (joined.includes("city")) return "City";
  if (joined.includes("park") || joined.includes("garden")) return "Park/Garden";
  return "Other";
}

// ─── Main mapper ──────────────────────────────────────

export function mapDDFToListing(property: DDFProperty): DDFMappedListing {
  const propertyType = PROPERTY_TYPE_MAP[property.PropertySubType] ?? "Residential";
  const status = STATUS_MAP[property.StandardStatus] ?? "active";
  const heroImage = pickHeroImage(property.Media);

  // Build enrichment data — only include non-null values
  const enrichmentRaw: Record<string, string | number | null> = {
    // Location (new fields)
    city: property.City,
    province: property.StateOrProvince,
    postal_code: property.PostalCode,
    latitude: property.Latitude,
    longitude: property.Longitude,

    // Dwelling classification
    dwelling_type: mapDwellingType(property.PropertySubType),
    dwelling_style: mapDwellingStyle(property.Stories),
    bedrooms: property.BedroomsTotal != null ? String(property.BedroomsTotal) : null,
    bathrooms: property.BathroomsTotalInteger != null ? String(property.BathroomsTotalInteger) : null,

    // Floor area
    total_floor_area: property.LivingArea != null ? String(property.LivingArea) : null,
    main_floor_area: property.AboveGradeFinishedArea != null ? String(property.AboveGradeFinishedArea) : null,
    lower_floor_area: property.BelowGradeFinishedArea != null ? String(property.BelowGradeFinishedArea) : null,

    // Lot
    lot_size: property.LotSizeDimensions,
    lot_area_sqft: property.LotSizeArea != null ? String(property.LotSizeArea) : null,
    lot_frontage: property.FrontageLengthNumeric != null ? String(property.FrontageLengthNumeric) : null,

    // Assessment & tax
    year_built: property.YearBuilt != null ? String(property.YearBuilt) : null,
    annual_taxes: property.TaxAnnualAmount != null ? String(property.TaxAnnualAmount) : null,
    tax_year: property.TaxYear != null ? String(property.TaxYear) : null,
    pid: property.ParcelNumber,

    // Strata
    strata_fees: property.AssociationFee != null ? String(property.AssociationFee) : null,
    strata_mgmt: property.AssociationName || null,

    // Construction & systems
    heating_type: mapHeating(property.Heating),
    cooling_type: mapCooling(property.Cooling),
    roof_type: mapRoof(property.Roof),
    exterior_finish: mapExterior(property.ConstructionMaterials),
    foundation_type: mapFoundation(property.FoundationDetails),
    floor_finish: joinArray(property.Flooring),
    hot_water: joinArray(property.WaterSource),

    // Fireplaces
    num_fireplaces: property.FireplacesTotal != null ? String(property.FireplacesTotal) : null,
    fireplace_type: property.FireplaceYN ? (joinArray(property.FireplaceFeatures) || "Gas") : "None",

    // Parking
    total_parking: property.ParkingTotal != null ? String(property.ParkingTotal) : null,

    // Outdoor & views
    outdoor_area: joinArray(property.ExteriorFeatures),
    view_type: mapView(property.View),

    // Zoning
    bylaws_restrictions: property.ZoningDescription,

    // DDF sync metadata
    ddf_listing_key: property.ListingKey,
    ddf_list_agent_key: property.ListAgentKey,
    ddf_list_office_key: property.ListOfficeKey,
    ddf_last_synced: new Date().toISOString(),
    ddf_modification_timestamp: property.ModificationTimestamp,
  };

  // Strip null/undefined values
  const enrichment: Record<string, string | number | null> = {};
  for (const [k, v] of Object.entries(enrichmentRaw)) {
    if (v != null && v !== "") {
      enrichment[k] = v;
    }
  }

  return {
    listing: {
      address: property.UnparsedAddress,
      mls_number: property.ListingId,
      list_price: property.ListPrice,
      property_type: propertyType,
      status,
      hero_image_url: heroImage,
      lockbox_code: "TBD",
      notes: `Imported from DDF (${property.OriginatingSystemName ?? "CREA"}) on ${new Date().toLocaleDateString("en-CA")}`,
    },
    enrichment,
    mlsPrep: {
      property_description: property.PublicRemarks,
      photo_count: String(property.PhotosCount ?? 0),
    },
    raw: property,
  };
}

/**
 * Map DDF property type to CRM property_type enum value.
 * Exported for use in search UI filter mapping.
 */
export function mapPropertyType(ddfSubType: string): string {
  return PROPERTY_TYPE_MAP[ddfSubType] ?? "Residential";
}

/**
 * Map CRM status back to DDF StandardStatus for search.
 */
export function mapStatusToDDF(crmStatus: string): string | null {
  const reverse: Record<string, string> = {
    active: "Active",
    conditional: "Active Under Contract",
    pending: "Pending",
    sold: "Closed",
    expired: "Expired",
    withdrawn: "Withdrawn",
    cancelled: "Cancelled",
  };
  return reverse[crmStatus] ?? null;
}
