/**
 * CREA DDF (Data Distribution Facility) API type definitions.
 * OData v1 — https://ddfapi.realtor.ca/odata/v1/
 */

// ─── Auth ─────────────────────────────────────────────

export interface DDFTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

// ─── OData Envelope ───────────────────────────────────

export interface DDFODataResponse<T> {
  "@odata.context": string;
  "@odata.count"?: number;
  "@odata.nextLink"?: string;
  value: T[];
}

// ─── Media ────────────────────────────────────────────

export interface DDFMedia {
  MediaKey: string;
  ResourceRecordKey: string;
  ResourceRecordId: string;
  ResourceName: string;
  MediaCategory: string;
  MediaURL: string;
  LongDescription: string | null;
  ModificationTimestamp: string;
  Order: number;
  PreferredPhotoYN: boolean;
}

// ─── Room ─────────────────────────────────────────────

export interface DDFRoom {
  RoomKey?: string;
  RoomType?: string;
  RoomLevel?: string;
  RoomDimensions?: string;
  RoomArea?: number;
  RoomAreaUnits?: string;
  RoomDescription?: string;
}

// ─── Property (core listing record) ───────────────────

export interface DDFProperty {
  // Identity
  ListingKey: string;
  ListingId: string; // MLS number
  ListingURL: string | null;

  // Status
  StandardStatus: DDFStandardStatus;
  StatusChangeTimestamp: string | null;

  // Price
  ListPrice: number | null;
  LeaseAmount: number | null;
  LeaseAmountFrequency: string | null;
  LeasePerUnit: string | null;
  PricePerUnit: string | null;

  // Classification
  PropertySubType: string;
  StructureType: string[];
  CommonInterest: string | null;
  ZoningDescription: string | null;

  // Address
  UnparsedAddress: string;
  StreetNumber: string | null;
  StreetName: string | null;
  StreetSuffix: string | null;
  StreetDirPrefix: string | null;
  StreetDirSuffix: string | null;
  UnitNumber: string | null;
  City: string;
  CityRegion: string | null;
  StateOrProvince: string;
  PostalCode: string;
  Country: string;
  SubdivisionName: string | null;

  // Geo
  Latitude: number | null;
  Longitude: number | null;
  GeocodeManualYN: boolean | null;

  // Dimensions
  BedroomsTotal: number | null;
  BedroomsAboveGrade: number | null;
  BedroomsBelowGrade: number | null;
  BathroomsTotalInteger: number | null;
  BathroomsPartial: number | null;
  LivingArea: number | null;
  LivingAreaUnits: string | null;
  AboveGradeFinishedArea: number | null;
  AboveGradeFinishedAreaUnits: string | null;
  BelowGradeFinishedArea: number | null;
  BelowGradeFinishedAreaUnits: string | null;
  BuildingAreaTotal: number | null;
  BuildingAreaUnits: string | null;
  Stories: number | null;

  // Lot
  LotSizeDimensions: string | null;
  LotSizeArea: number | null;
  LotSizeUnits: string | null;
  LotFeatures: string[];
  FrontageLengthNumeric: number | null;
  FrontageLengthNumericUnits: string | null;

  // Features
  Heating: string[];
  Cooling: string[];
  Flooring: string[];
  Roof: string[];
  ConstructionMaterials: string[];
  FoundationDetails: string[];
  Basement: string[];
  ExteriorFeatures: string[];
  Appliances: string[];
  SecurityFeatures: string[];
  Fencing: string[];
  PoolFeatures: string[];
  FireplaceYN: boolean;
  FireplacesTotal: number | null;
  FireplaceFeatures: string[];
  ArchitecturalStyle: string[];
  PropertyCondition: string[];
  AccessibilityFeatures: string[];
  BuildingFeatures: string[];
  View: string[];
  WaterfrontFeatures: string[];
  CommunityFeatures: string[];
  WaterBodyName: string | null;

  // Parking
  ParkingTotal: number | null;
  ParkingFeatures: string[];

  // Utilities
  Utilities: string[];
  WaterSource: string[];
  Sewer: string[];
  Electric: string[];
  IrrigationSource: string[];

  // Strata / Association
  AssociationFee: number | null;
  AssociationFeeFrequency: string | null;
  AssociationFeeIncludes: string[];
  AssociationName: string | null;

  // Tax
  TaxAnnualAmount: number | null;
  TaxYear: number | null;
  TaxBlock: string | null;
  TaxLot: string | null;
  ParcelNumber: string | null;

  // Building
  YearBuilt: number | null;
  NumberOfBuildings: number | null;
  NumberOfUnitsTotal: number | null;
  PropertyAttachedYN: boolean | null;

  // Remarks
  PublicRemarks: string | null;
  Directions: string | null;
  Inclusions: string | null;

  // Agent / Office references
  ListAgentKey: string;
  ListAgentNationalAssociationId: string | null;
  CoListAgentKey: string | null;
  CoListAgentKey2: string | null;
  CoListAgentKey3: string | null;
  CoListAgentNationalAssociationId: string | null;
  ListOfficeKey: string;
  ListOfficeNationalAssociationId: string | null;
  CoListOfficeKey: string | null;
  CoListOfficeKey2: string | null;
  CoListOfficeKey3: string | null;

  // Board
  ListAOR: string | null;
  ListAORKey: string | null;
  OriginatingSystemName: string | null;

  // Photos
  PhotosCount: number;
  PhotosChangeTimestamp: string | null;

  // Media
  Media: DDFMedia[];
  Rooms: DDFRoom[];

  // Timestamps
  OriginalEntryTimestamp: string;
  ModificationTimestamp: string;

  // Display
  InternetEntireListingDisplayYN: boolean;
  InternetAddressDisplayYN: boolean;

  // Commercial / land
  BusinessType: string[];
  CurrentUse: string[];
  PossibleUse: string[];
  AnchorsCoTenants: string | null;
  TotalActualRent: number | null;
  ExistingLeaseType: string[];
  AvailabilityDate: string | null;
  RoadSurfaceType: string[];
  DocumentsAvailable: string[];
  OtherEquipment: string[];
}

// ─── Member (agent) ───────────────────────────────────

export interface DDFMember {
  MemberKey: string;
  MemberFirstName: string;
  MemberLastName: string;
  MemberMlsId: string;
  MemberNationalAssociationId: string | null;
  OfficeKey: string;
}

// ─── Office ───────────────────────────────────────────

export interface DDFOffice {
  OfficeKey: string;
  OfficeName: string;
  OfficePhone: string | null;
  OfficeCity: string | null;
}

// ─── Open House ───────────────────────────────────────

export interface DDFOpenHouse {
  OpenHouseKey: string;
  ListingKey: string;
  ListingId: string;
  OpenHouseDate: string;
  OpenHouseStartTime: string;
  OpenHouseEndTime: string;
  OpenHouseRemarks: string | null;
  OpenHouseType: string;
  OpenHouseStatus: string;
  LivestreamOpenHouseURL: string | null;
}

// ─── Enums ────────────────────────────────────────────

export type DDFStandardStatus =
  | "Active"
  | "Active Under Contract"
  | "Pending"
  | "Closed"
  | "Expired"
  | "Withdrawn"
  | "Cancelled"
  | "Delete";

// ─── Query params ─────────────────────────────────────

export interface DDFSearchParams {
  city?: string;
  province?: string;
  status?: DDFStandardStatus;
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  minBaths?: number;
  propertySubType?: string;
  modifiedSince?: string; // ISO datetime for delta sync
  mlsNumber?: string; // Direct ListingId lookup
  top?: number;
  skip?: number;
  orderBy?: string;
  count?: boolean;
}

// ─── Mapped result (DDF → CRM) ───────────────────────

export interface DDFMappedListing {
  // → listings table
  listing: {
    address: string;
    mls_number: string;
    list_price: number | null;
    property_type: string;
    status: string;
    hero_image_url: string | null;
    lockbox_code: string;
    notes: string;
  };
  // → form_submissions (step-data-enrichment)
  enrichment: Record<string, string | number | null>;
  // → form_submissions (step-mls-prep)
  mlsPrep: {
    property_description: string | null;
    photo_count: string;
  };
  // Raw DDF record for reference
  raw: DDFProperty;
}
