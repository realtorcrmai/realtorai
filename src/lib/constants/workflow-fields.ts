export type FieldType = "text" | "email" | "phone" | "currency" | "date" | "select" | "textarea";

export type StepFieldDef = {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  colSpan?: 2;
};

export type StepFieldConfig = {
  sectionTitle: string;
  fields: StepFieldDef[];
};

export const STEP_FIELDS: Record<string, StepFieldConfig[]> = {
  "seller-intake": [
    {
      sectionTitle: "Seller Identity",
      fields: [
        { key: "full_name", label: "Full Name", type: "text" },
        { key: "phone", label: "Phone", type: "phone" },
        { key: "email", label: "Email", type: "email" },
        { key: "seller_type", label: "Seller Type", type: "select", options: ["Individual", "Corporation", "Trust", "Estate"] },
      ],
    },
    {
      sectionTitle: "Property",
      fields: [
        { key: "address", label: "Property Address", type: "text", colSpan: 2 },
        { key: "lockbox_code", label: "Lockbox Code", type: "text" },
        { key: "list_price", label: "List Price", type: "currency" },
      ],
    },
    {
      sectionTitle: "Notes",
      fields: [
        { key: "notes", label: "Agent Notes", type: "textarea", colSpan: 2 },
      ],
    },
  ],

  "data-enrichment": [
    {
      sectionTitle: "Location",
      fields: [
        { key: "city", label: "City", type: "text" },
        { key: "province", label: "Province", type: "text" },
        { key: "postal_code", label: "Postal Code", type: "text" },
        { key: "latitude", label: "Latitude", type: "text" },
        { key: "longitude", label: "Longitude", type: "text" },
      ],
    },
    {
      sectionTitle: "Property Assessment",
      fields: [
        { key: "assessed_value", label: "Assessed Value", type: "currency" },
        { key: "assessment_year", label: "Assessment Year", type: "text" },
        { key: "lot_size", label: "Lot Size (sq ft)", type: "text" },
        { key: "year_built", label: "Year Built", type: "text" },
      ],
    },
    {
      sectionTitle: "Tax & Title",
      fields: [
        { key: "annual_taxes", label: "Annual Property Taxes", type: "currency" },
        { key: "tax_year", label: "Tax Year", type: "text" },
        { key: "pid", label: "PID (Parcel Identifier)", type: "text" },
        { key: "title_number", label: "Title Number", type: "text" },
        { key: "legal_description", label: "Legal Description", type: "textarea", colSpan: 2 },
      ],
    },
    {
      sectionTitle: "Strata (if applicable)",
      fields: [
        { key: "strata_plan", label: "Strata Plan #", type: "text" },
        { key: "strata_fees", label: "Monthly Strata Fees", type: "currency" },
        { key: "strata_mgmt", label: "Management Company", type: "text" },
      ],
    },
    {
      sectionTitle: "Dwelling Classification",
      fields: [
        { key: "dwelling_type", label: "Dwelling Type", type: "select", options: ["Detached", "Semi-Detached", "Townhouse", "Condo/Apartment", "Duplex", "Triplex", "Manufactured", "Other"] },
        { key: "dwelling_style", label: "Style", type: "select", options: ["1 Storey", "1.5 Storey", "2 Storey", "2.5 Storey", "3 Storey", "Bi-Level", "Split Level"] },
        { key: "bedrooms", label: "Bedrooms", type: "text" },
        { key: "bathrooms", label: "Bathrooms", type: "text" },
      ],
    },
    {
      sectionTitle: "Floor Area (sq ft)",
      fields: [
        { key: "total_floor_area", label: "Total Floor Area", type: "text" },
        { key: "main_floor_area", label: "Main Floor", type: "text" },
        { key: "upper_floor_area", label: "Upper Floor", type: "text" },
        { key: "lower_floor_area", label: "Lower/Basement Finished", type: "text" },
        { key: "basement_area", label: "Basement Total", type: "text" },
      ],
    },
    {
      sectionTitle: "Property Size",
      fields: [
        { key: "lot_frontage", label: "Lot Frontage (ft)", type: "text" },
        { key: "lot_depth", label: "Lot Depth (ft)", type: "text" },
        { key: "lot_area_sqft", label: "Lot Area (sq ft)", type: "text" },
        { key: "lot_area_acres", label: "Lot Area (acres)", type: "text" },
      ],
    },
    {
      sectionTitle: "Construction & Systems",
      fields: [
        { key: "foundation_type", label: "Foundation", type: "select", options: ["Concrete Perimeter", "Slab", "Crawl Space", "Piling", "Other"] },
        { key: "roof_type", label: "Roof", type: "select", options: ["Asphalt Shingle", "Metal", "Tile", "Flat/Built-Up", "Cedar Shake", "Other"] },
        { key: "exterior_finish", label: "Exterior Finish", type: "select", options: ["Vinyl Siding", "Wood", "Stucco", "Brick", "Stone", "Cement/Fibre", "Mixed", "Other"] },
        { key: "heating_type", label: "Heating", type: "select", options: ["Forced Air", "Baseboard", "Radiant/In-Floor", "Heat Pump", "Fireplace Only", "Other"] },
        { key: "cooling_type", label: "Cooling", type: "select", options: ["Central Air", "Wall Unit", "Heat Pump", "None", "Other"] },
        { key: "fuel_type", label: "Fuel", type: "select", options: ["Natural Gas", "Electric", "Oil", "Propane", "Wood", "Other"] },
        { key: "hot_water", label: "Hot Water", type: "select", options: ["Natural Gas", "Electric", "Tankless", "Solar", "Other"] },
      ],
    },
    {
      sectionTitle: "Fireplaces",
      fields: [
        { key: "num_fireplaces", label: "Number of Fireplaces", type: "text" },
        { key: "fireplace_type", label: "Fireplace Type", type: "select", options: ["Gas", "Wood Burning", "Electric", "Pellet", "None"] },
      ],
    },
    {
      sectionTitle: "Rooms & Finishes",
      fields: [
        { key: "kitchen_finish", label: "Kitchen Finish", type: "select", options: ["Basic", "Standard", "Updated", "Gourmet/Custom"] },
        { key: "floor_finish", label: "Floor Finish", type: "text" },
        { key: "total_rooms", label: "Total Rooms", type: "text" },
        { key: "total_parking", label: "Parking (spaces/type)", type: "text" },
      ],
    },
    {
      sectionTitle: "Outdoor & Views",
      fields: [
        { key: "outdoor_area", label: "Outdoor Features", type: "textarea", colSpan: 2 },
        { key: "view_type", label: "View", type: "select", options: ["Mountain", "Water", "City", "Park/Garden", "Street", "None", "Other"] },
      ],
    },
    {
      sectionTitle: "Restrictions",
      fields: [
        { key: "bylaws_restrictions", label: "Bylaws & Restrictions", type: "textarea", colSpan: 2 },
        { key: "easements", label: "Easements & Rights of Way", type: "textarea", colSpan: 2 },
      ],
    },
    {
      sectionTitle: "DDF / MLS Sync",
      fields: [
        { key: "ddf_listing_key", label: "DDF Listing Key", type: "text" },
        { key: "ddf_list_agent_key", label: "Listing Agent Key", type: "text" },
        { key: "ddf_list_office_key", label: "Listing Office Key", type: "text" },
        { key: "ddf_last_synced", label: "Last Synced", type: "text" },
        { key: "ddf_modification_timestamp", label: "DDF Last Modified", type: "text" },
      ],
    },
  ],

  "cma": [
    {
      sectionTitle: "Comparable Sales",
      fields: [
        { key: "comp_1_address", label: "Comp 1 Address", type: "text", colSpan: 2 },
        { key: "comp_1_price", label: "Comp 1 Sale Price", type: "currency" },
        { key: "comp_1_date", label: "Comp 1 Sale Date", type: "date" },
        { key: "comp_2_address", label: "Comp 2 Address", type: "text", colSpan: 2 },
        { key: "comp_2_price", label: "Comp 2 Sale Price", type: "currency" },
        { key: "comp_2_date", label: "Comp 2 Sale Date", type: "date" },
        { key: "comp_3_address", label: "Comp 3 Address", type: "text", colSpan: 2 },
        { key: "comp_3_price", label: "Comp 3 Sale Price", type: "currency" },
        { key: "comp_3_date", label: "Comp 3 Sale Date", type: "date" },
      ],
    },
    {
      sectionTitle: "Market Analysis",
      fields: [
        { key: "avg_days_on_market", label: "Avg Days on Market", type: "text" },
        { key: "price_range_low", label: "Suggested Price (Low)", type: "currency" },
        { key: "price_range_high", label: "Suggested Price (High)", type: "currency" },
        { key: "market_notes", label: "Market Notes", type: "textarea", colSpan: 2 },
      ],
    },
  ],

  "pricing-review": [
    {
      sectionTitle: "Pricing",
      fields: [
        { key: "final_list_price", label: "Final List Price", type: "currency" },
        { key: "price_strategy", label: "Pricing Strategy", type: "select", options: ["Market Value", "Below Market (Bidding War)", "Above Market (Aspirational)", "Strategic (Multiple Offers)"] },
        { key: "price_justification", label: "Price Justification", type: "textarea", colSpan: 2 },
      ],
    },
    {
      sectionTitle: "Marketing Strategy",
      fields: [
        { key: "marketing_channels", label: "Marketing Channels", type: "text", colSpan: 2 },
        { key: "open_house_dates", label: "Open House Dates", type: "text" },
        { key: "showing_instructions", label: "Showing Instructions", type: "textarea", colSpan: 2 },
      ],
    },
    {
      sectionTitle: "Review",
      fields: [
        { key: "photos_approved", label: "Photos Approved", type: "select", options: ["Yes", "No", "Pending"] },
        { key: "description_approved", label: "Description Approved", type: "select", options: ["Yes", "No", "Pending"] },
        { key: "review_notes", label: "Review Notes", type: "textarea", colSpan: 2 },
      ],
    },
  ],

  "form-generation": [
    {
      sectionTitle: "FINTRAC",
      fields: [
        { key: "fintrac_id_type", label: "ID Type", type: "select", options: ["Driver's License", "Passport", "BC Services Card", "Other"] },
        { key: "fintrac_id_number", label: "ID Number", type: "text" },
        { key: "fintrac_id_expiry", label: "ID Expiry Date", type: "date" },
        { key: "fintrac_dob", label: "Date of Birth", type: "date" },
      ],
    },
    {
      sectionTitle: "DORTS",
      fields: [
        { key: "dorts_representation_type", label: "Representation Type", type: "select", options: ["Sole Agency", "Dual Agency", "Limited Dual Agency"] },
        { key: "dorts_effective_date", label: "Effective Date", type: "date" },
        { key: "dorts_expiry_date", label: "Expiry Date", type: "date" },
      ],
    },
    {
      sectionTitle: "PDS & MLC",
      fields: [
        { key: "pds_defects_disclosed", label: "Defects Disclosed", type: "select", options: ["Yes", "No", "N/A"] },
        { key: "pds_renovations", label: "Renovations/Permits", type: "textarea", colSpan: 2 },
        { key: "mlc_commission_rate", label: "Commission Rate (%)", type: "text" },
        { key: "mlc_listing_period", label: "Listing Period (days)", type: "text" },
      ],
    },
  ],

  "e-signature": [
    {
      sectionTitle: "Document Routing",
      fields: [
        { key: "esign_provider", label: "E-Signature Provider", type: "select", options: ["DocuSign", "Authentisign", "DotLoop", "Manual"] },
        { key: "envelope_id", label: "Envelope/Transaction ID", type: "text" },
        { key: "sent_date", label: "Date Sent", type: "date" },
        { key: "seller_email_for_signing", label: "Seller Email for Signing", type: "email" },
      ],
    },
    {
      sectionTitle: "Signing Status",
      fields: [
        { key: "seller_signed", label: "Seller Signed", type: "select", options: ["Yes", "No", "Pending"] },
        { key: "seller_signed_date", label: "Seller Signed Date", type: "date" },
        { key: "agent_signed", label: "Agent Counter-Signed", type: "select", options: ["Yes", "No", "Pending"] },
        { key: "agent_signed_date", label: "Agent Signed Date", type: "date" },
        { key: "signing_notes", label: "Notes", type: "textarea", colSpan: 2 },
      ],
    },
  ],

  "mls-prep": [
    {
      sectionTitle: "Photography",
      fields: [
        { key: "photographer_name", label: "Photographer", type: "text" },
        { key: "photo_shoot_date", label: "Photo Shoot Date", type: "date" },
        { key: "photo_count", label: "Number of Photos", type: "text" },
        { key: "photos_status", label: "Photos Status", type: "select", options: ["Scheduled", "Shot", "Edited", "Uploaded"] },
      ],
    },
    {
      sectionTitle: "Content",
      fields: [
        { key: "property_headline", label: "Property Headline", type: "text", colSpan: 2 },
        { key: "property_description", label: "Property Description", type: "textarea", colSpan: 2 },
        { key: "feature_sheet_status", label: "Feature Sheet Status", type: "select", options: ["Not Started", "Draft", "Final", "Printed"] },
      ],
    },
    {
      sectionTitle: "Virtual Tour",
      fields: [
        { key: "virtual_tour_provider", label: "Tour Provider", type: "text" },
        { key: "virtual_tour_url", label: "Virtual Tour URL", type: "text", colSpan: 2 },
        { key: "virtual_tour_status", label: "Tour Status", type: "select", options: ["Not Started", "Scheduled", "Processing", "Ready"] },
      ],
    },
  ],

  "mls-submission": [
    {
      sectionTitle: "MLS Listing",
      fields: [
        { key: "mls_number", label: "MLS Number", type: "text" },
        { key: "mls_board", label: "Real Estate Board", type: "select", options: ["REBGV", "FVREB", "BCNREB", "VIREB", "OMREB", "Other"] },
        { key: "listing_type", label: "Listing Type", type: "select", options: ["Exclusive", "MLS", "Mere Posting"] },
        { key: "submission_date", label: "Submission Date", type: "date" },
      ],
    },
    {
      sectionTitle: "Verification",
      fields: [
        { key: "data_verified", label: "Data Verified", type: "select", options: ["Yes", "No", "Pending"] },
        { key: "live_on_mls", label: "Live on MLS", type: "select", options: ["Yes", "No", "Pending"] },
        { key: "listing_url", label: "Public Listing URL", type: "text", colSpan: 2 },
        { key: "submission_notes", label: "Notes", type: "textarea", colSpan: 2 },
      ],
    },
  ],

  "post-listing": [
    {
      sectionTitle: "Showings",
      fields: [
        { key: "total_showings", label: "Total Showings", type: "text" },
        { key: "showing_feedback_summary", label: "Feedback Summary", type: "textarea", colSpan: 2 },
      ],
    },
    {
      sectionTitle: "Offers & Negotiation",
      fields: [
        { key: "offers_received", label: "Offers Received", type: "text" },
        { key: "accepted_offer_price", label: "Accepted Offer Price", type: "currency" },
        { key: "accepted_offer_date", label: "Offer Accepted Date", type: "date" },
        { key: "buyer_name", label: "Buyer Name", type: "text" },
        { key: "buyer_agent", label: "Buyer's Agent", type: "text" },
        { key: "subject_removal_date", label: "Subject Removal Date", type: "date" },
      ],
    },
    {
      sectionTitle: "Closing",
      fields: [
        { key: "completion_date", label: "Completion Date", type: "date" },
        { key: "possession_date", label: "Possession Date", type: "date" },
        { key: "conveyancer", label: "Conveyancer/Lawyer", type: "text" },
        { key: "closing_notes", label: "Closing Notes", type: "textarea", colSpan: 2 },
      ],
    },
  ],
};
