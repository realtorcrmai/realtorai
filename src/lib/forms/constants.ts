/**
 * BC Standard Real Estate Forms — Constants
 * Used across the UI for form listings, icons, and type mappings.
 */

export const BC_FORMS = [
  { key: "dorts", name: "DORTS", full: "Disclosure of Representation in Trading Services", icon: "📋", required: true },
  { key: "mlc", name: "MLC", full: "Listing Contract (MLC)", icon: "📝", required: true },
  { key: "pds", name: "PDS", full: "Property Disclosure Statement", icon: "🏠", required: true },
  { key: "fintrac", name: "FINTRAC", full: "Client Identification & Verification", icon: "🔍", required: true },
  { key: "privacy", name: "Privacy", full: "Privacy Notice & Consent", icon: "🔒", required: false },
  { key: "c3", name: "C3", full: "Working with a REALTOR Disclosure", icon: "🤝", required: false },
  { key: "drup", name: "DRUP", full: "Disclosure of Remuneration / Referrals", icon: "💰", required: false },
  { key: "mls", name: "MLS Input", full: "MLS Listing Input Sheet", icon: "📊", required: false },
  { key: "mktauth", name: "Mktg Auth", full: "Marketing Authorization", icon: "📢", required: false },
  { key: "agency", name: "Agency", full: "Agency Relationships", icon: "🏢", required: false },
  { key: "c3conf", name: "C3 Conf", full: "C3 Confirmation of Representation", icon: "✅", required: false },
  { key: "fairhsg", name: "Fair Housing", full: "Fair Housing Declaration", icon: "⚖️", required: false },
] as const;

export type BCFormKey = (typeof BC_FORMS)[number]["key"];

/**
 * Maps form keys to listing_documents.doc_type values.
 * Only the required docs have dedicated types; others map to 'OTHER'.
 */
export const FORM_KEY_TO_DOC_TYPE: Record<string, string> = {
  fintrac: "FINTRAC",
  dorts: "DORTS",
  pds: "PDS",
};

export function getDocType(formKey: string): string {
  return FORM_KEY_TO_DOC_TYPE[formKey] ?? "OTHER";
}

/**
 * Available CRM data paths for field mapping.
 * Used in the admin field mapping editor.
 */
export const CRM_FIELD_OPTIONS = [
  { label: "Property Address", path: "listing.address" },
  { label: "List Price", path: "listing.list_price" },
  { label: "MLS Number", path: "listing.mls_number" },
  { label: "Property Status", path: "listing.status" },
  { label: "Lockbox Code", path: "listing.lockbox_code" },
  { label: "Listing Notes", path: "listing.notes" },
  { label: "Seller Name", path: "seller.name" },
  { label: "Seller Phone", path: "seller.phone" },
  { label: "Seller Email", path: "seller.email" },
  { label: "Agent Name", path: "user.name" },
  { label: "Agent Email", path: "user.email" },
  { label: "Today's Date", path: "_today" },
] as const;
