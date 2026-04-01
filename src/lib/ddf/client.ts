"use server";

import type {
  DDFTokenResponse,
  DDFODataResponse,
  DDFProperty,
  DDFMember,
  DDFOffice,
  DDFOpenHouse,
  DDFSearchParams,
} from "@/types/ddf";

// ─── Constants ────────────────────────────────────────

const TOKEN_URL = "https://identity.crea.ca/connect/token";
const API_BASE = "https://ddfapi.realtor.ca/odata/v1";
const TOKEN_SCOPE = "DDFApi_Read";
const MAX_PAGE_SIZE = 100;

// ─── Token cache (in-memory, server-side only) ────────

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

// ─── Helpers ──────────────────────────────────────────

function getCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.DDF_CLIENT_ID;
  const clientSecret = process.env.DDF_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("DDF_CLIENT_ID and DDF_CLIENT_SECRET must be set in environment variables");
  }
  return { clientId, clientSecret };
}

async function getToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const { clientId, clientSecret } = getCredentials();

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      scope: TOKEN_SCOPE,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DDF auth failed (${res.status}): ${text}`);
  }

  const data: DDFTokenResponse = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return cachedToken;
}

async function ddfFetch<T>(path: string): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 0 }, // no cache for fresh data
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DDF API error (${res.status}): ${text}`);
  }

  return res.json();
}

// ─── Property fields we select (avoids fetching all 100+ fields) ──

const PROPERTY_SELECT = [
  "ListingKey",
  "ListingId",
  "ListingURL",
  "StandardStatus",
  "StatusChangeTimestamp",
  "ListPrice",
  "PropertySubType",
  "StructureType",
  "UnparsedAddress",
  "StreetNumber",
  "StreetName",
  "StreetSuffix",
  "UnitNumber",
  "City",
  "CityRegion",
  "StateOrProvince",
  "PostalCode",
  "Country",
  "SubdivisionName",
  "Latitude",
  "Longitude",
  "BedroomsTotal",
  "BedroomsAboveGrade",
  "BedroomsBelowGrade",
  "BathroomsTotalInteger",
  "BathroomsPartial",
  "LivingArea",
  "LivingAreaUnits",
  "AboveGradeFinishedArea",
  "AboveGradeFinishedAreaUnits",
  "BelowGradeFinishedArea",
  "BelowGradeFinishedAreaUnits",
  "Stories",
  "LotSizeDimensions",
  "LotSizeArea",
  "LotSizeUnits",
  "Heating",
  "Cooling",
  "Flooring",
  "Roof",
  "ConstructionMaterials",
  "FoundationDetails",
  "Basement",
  "ExteriorFeatures",
  "Appliances",
  "FireplaceYN",
  "FireplacesTotal",
  "FireplaceFeatures",
  "ArchitecturalStyle",
  "ParkingTotal",
  "ParkingFeatures",
  "WaterSource",
  "Sewer",
  "AssociationFee",
  "AssociationFeeFrequency",
  "AssociationName",
  "AssociationFeeIncludes",
  "TaxAnnualAmount",
  "TaxYear",
  "ParcelNumber",
  "YearBuilt",
  "PublicRemarks",
  "Inclusions",
  "ListAgentKey",
  "ListAgentNationalAssociationId",
  "ListOfficeKey",
  "ListOfficeNationalAssociationId",
  "ListAOR",
  "OriginatingSystemName",
  "PhotosCount",
  "Media",
  "Rooms",
  "OriginalEntryTimestamp",
  "ModificationTimestamp",
  "View",
  "ZoningDescription",
  "InternetEntireListingDisplayYN",
].join(",");

const MEMBER_SELECT = [
  "MemberKey",
  "MemberFirstName",
  "MemberLastName",
  "MemberMlsId",
  "MemberNationalAssociationId",
  "OfficeKey",
].join(",");

const OFFICE_SELECT = [
  "OfficeKey",
  "OfficeName",
  "OfficePhone",
  "OfficeCity",
].join(",");

// ─── Query builder ────────────────────────────────────

function buildPropertyFilter(params: DDFSearchParams): string {
  const filters: string[] = [];

  if (params.mlsNumber) {
    filters.push(`ListingId eq '${params.mlsNumber}'`);
  }
  if (params.city) {
    filters.push(`City eq '${params.city}'`);
  }
  if (params.province) {
    filters.push(`StateOrProvince eq '${params.province}'`);
  }
  if (params.status) {
    filters.push(`StandardStatus eq '${params.status}'`);
  }
  if (params.minPrice != null) {
    filters.push(`ListPrice ge ${params.minPrice}`);
  }
  if (params.maxPrice != null) {
    filters.push(`ListPrice le ${params.maxPrice}`);
  }
  if (params.minBeds != null) {
    filters.push(`BedroomsTotal ge ${params.minBeds}`);
  }
  if (params.minBaths != null) {
    filters.push(`BathroomsTotalInteger ge ${params.minBaths}`);
  }
  if (params.propertySubType) {
    filters.push(`PropertySubType eq '${params.propertySubType}'`);
  }
  if (params.modifiedSince) {
    filters.push(`ModificationTimestamp ge ${params.modifiedSince}`);
  }

  return filters.join(" and ");
}

// ─── Public API ───────────────────────────────────────

/**
 * Search properties with filters. Returns paginated results.
 */
export async function searchProperties(
  params: DDFSearchParams
): Promise<DDFODataResponse<DDFProperty>> {
  const filter = buildPropertyFilter(params);
  const top = Math.min(params.top ?? 20, MAX_PAGE_SIZE);
  const skip = params.skip ?? 0;
  const orderBy = params.orderBy ?? "ModificationTimestamp desc";

  const qs = new URLSearchParams();
  qs.set("$select", PROPERTY_SELECT);
  qs.set("$top", String(top));
  qs.set("$skip", String(skip));
  qs.set("$orderby", orderBy);
  if (filter) qs.set("$filter", filter);
  if (params.count) qs.set("$count", "true");

  return ddfFetch<DDFODataResponse<DDFProperty>>(`/Property?${qs}`);
}

/**
 * Get a single property by DDF ListingKey.
 */
export async function getPropertyByKey(
  listingKey: string
): Promise<DDFProperty | null> {
  const res = await ddfFetch<DDFODataResponse<DDFProperty>>(
    `/Property?$filter=ListingKey eq '${listingKey}'&$select=${PROPERTY_SELECT}&$top=1`
  );
  return res.value[0] ?? null;
}

/**
 * Get a single property by MLS number (ListingId).
 */
export async function getPropertyByMLS(
  mlsNumber: string
): Promise<DDFProperty | null> {
  const res = await ddfFetch<DDFODataResponse<DDFProperty>>(
    `/Property?$filter=ListingId eq '${mlsNumber}'&$select=${PROPERTY_SELECT}&$top=1`
  );
  return res.value[0] ?? null;
}

/**
 * Look up a member (agent) by MemberKey.
 */
export async function getMember(
  memberKey: string
): Promise<DDFMember | null> {
  const res = await ddfFetch<DDFODataResponse<DDFMember>>(
    `/Member?$filter=MemberKey eq '${memberKey}'&$select=${MEMBER_SELECT}&$top=1`
  );
  return res.value[0] ?? null;
}

/**
 * Look up an office by OfficeKey.
 */
export async function getOffice(
  officeKey: string
): Promise<DDFOffice | null> {
  const res = await ddfFetch<DDFODataResponse<DDFOffice>>(
    `/Office?$filter=OfficeKey eq '${officeKey}'&$select=${OFFICE_SELECT}&$top=1`
  );
  return res.value[0] ?? null;
}

/**
 * Get open houses for a listing.
 */
export async function getOpenHouses(
  listingKey: string
): Promise<DDFOpenHouse[]> {
  const res = await ddfFetch<DDFODataResponse<DDFOpenHouse>>(
    `/OpenHouse?$filter=ListingKey eq '${listingKey}'&$top=10&$orderby=OpenHouseDate desc`
  );
  return res.value;
}

/**
 * Count properties matching filters.
 */
export async function countProperties(
  params: Omit<DDFSearchParams, "top" | "skip" | "orderBy" | "count">
): Promise<number> {
  const filter = buildPropertyFilter({ ...params });
  const qs = new URLSearchParams();
  qs.set("$count", "true");
  qs.set("$top", "0");
  if (filter) qs.set("$filter", filter);

  const res = await ddfFetch<DDFODataResponse<DDFProperty>>(`/Property?${qs}`);
  return res["@odata.count"] ?? 0;
}
