import type { ListingDocument } from "@/types";
import { formatPrice } from "./messages";

export type FieldItem = {
  label: string;
  value: string;
  editKey?: string;
  editTarget?: "listing" | "contact";
  inputType?: "text" | "number" | "time" | "array";
};

export type DataSection = { title: string; fields: FieldItem[] };

export type StepDataContext = {
  seller?: { name: string; phone: string; email: string | null; type?: string };
  listing: {
    status: string;
    address?: string;
    list_price?: number | null;
    mls_number?: string | null;
    lockbox_code?: string;
    notes?: string | null;
    showing_window_start?: string | null;
    showing_window_end?: string | null;
    created_at?: string;
    bedrooms?: number | null;
    bathrooms?: number | null;
    total_sqft?: number | null;
    finished_sqft?: number | null;
    lot_sqft?: number | null;
    year_built?: number | null;
    parking_spaces?: number | null;
    stories?: number | null;
    basement_type?: string | null;
    heating_type?: string | null;
    cooling_type?: string | null;
    roof_type?: string | null;
    exterior_type?: string | null;
    flooring?: string[];
    features?: string[];
  };
  documents: ListingDocument[];
  formStatuses: Record<string, "draft" | "completed">;
  showingsCount?: number;
};

export function getStepDataSections(stepId: string, ctx: StepDataContext): DataSection[] | null {
  const { seller, listing, documents, formStatuses } = ctx;
  const price = listing.list_price ? formatPrice(listing.list_price) : "Not set";

  switch (stepId) {
    case "seller-intake":
      return [
        {
          title: "Seller Identity",
          fields: [
            { label: "Full Name", value: seller?.name ?? "—", editKey: "name", editTarget: "contact" },
            { label: "Phone", value: seller?.phone ?? "—", editKey: "phone", editTarget: "contact" },
            { label: "Email", value: seller?.email ?? "—", editKey: "email", editTarget: "contact" },
            { label: "Type", value: seller?.type ? seller.type.charAt(0).toUpperCase() + seller.type.slice(1) : "—" },
          ],
        },
        {
          title: "Property",
          fields: [
            { label: "Address", value: listing.address ?? "—", editKey: "address", editTarget: "listing" },
            { label: "Lockbox Code", value: listing.lockbox_code ?? "—", editKey: "lockbox_code", editTarget: "listing" },
          ],
        },
        {
          title: "Property Details",
          fields: [
            { label: "Bedrooms", value: listing.bedrooms != null ? String(listing.bedrooms) : "—", editKey: "bedrooms", editTarget: "listing", inputType: "number" },
            { label: "Bathrooms", value: listing.bathrooms != null ? String(listing.bathrooms) : "—", editKey: "bathrooms", editTarget: "listing", inputType: "number" },
            { label: "Total Sqft", value: listing.total_sqft != null ? listing.total_sqft.toLocaleString() : "—", editKey: "total_sqft", editTarget: "listing", inputType: "number" },
            { label: "Finished Sqft", value: listing.finished_sqft != null ? listing.finished_sqft.toLocaleString() : "—", editKey: "finished_sqft", editTarget: "listing", inputType: "number" },
            { label: "Lot Size (sqft)", value: listing.lot_sqft != null ? listing.lot_sqft.toLocaleString() : "—", editKey: "lot_sqft", editTarget: "listing", inputType: "number" },
            { label: "Year Built", value: listing.year_built != null ? String(listing.year_built) : "—", editKey: "year_built", editTarget: "listing", inputType: "number" },
            { label: "Parking Spaces", value: listing.parking_spaces != null ? String(listing.parking_spaces) : "—", editKey: "parking_spaces", editTarget: "listing", inputType: "number" },
            { label: "Stories", value: listing.stories != null ? String(listing.stories) : "—", editKey: "stories", editTarget: "listing", inputType: "number" },
          ],
        },
        {
          title: "Construction & Systems",
          fields: [
            { label: "Basement", value: listing.basement_type ?? "—", editKey: "basement_type", editTarget: "listing" },
            { label: "Heating", value: listing.heating_type ?? "—", editKey: "heating_type", editTarget: "listing" },
            { label: "Cooling", value: listing.cooling_type ?? "—", editKey: "cooling_type", editTarget: "listing" },
            { label: "Roof", value: listing.roof_type ?? "—", editKey: "roof_type", editTarget: "listing" },
            { label: "Exterior", value: listing.exterior_type ?? "—", editKey: "exterior_type", editTarget: "listing" },
            { label: "Flooring", value: listing.flooring?.length ? listing.flooring.join(", ") : "—", editKey: "flooring", editTarget: "listing", inputType: "array" },
            { label: "Features", value: listing.features?.length ? listing.features.join(", ") : "—", editKey: "features", editTarget: "listing", inputType: "array" },
          ],
        },
        {
          title: "Pricing & Terms",
          fields: [
            { label: "List Price", value: price, editKey: "list_price", editTarget: "listing", inputType: "number" },
            { label: "Status", value: listing.status.charAt(0).toUpperCase() + listing.status.slice(1) },
            ...(listing.notes ? [{ label: "Notes", value: listing.notes, editKey: "notes", editTarget: "listing" as const }] : [{ label: "Notes", value: "—", editKey: "notes", editTarget: "listing" as const }]),
          ],
        },
      ];

    case "data-enrichment":
      return [
        {
          title: "Property Assessment",
          fields: [
            { label: "Address", value: listing.address ?? "—" },
            { label: "Source", value: "BC Assessment" },
            { label: "Status", value: "✓ Retrieved" },
          ],
        },
        {
          title: "Records & Search",
          fields: [
            { label: "Tax Records", value: "✓ Retrieved from municipality" },
            { label: "Title Search", value: "✓ Complete via LTSA" },
            { label: "Strata Docs", value: "Collected (if applicable)" },
          ],
        },
      ];

    case "cma":
      return [
        {
          title: "Market Analysis",
          fields: [
            { label: "Area", value: listing.address ?? "—" },
            { label: "Comparable Sales", value: "✓ Pulled from MLS" },
            { label: "Market Trends", value: "✓ Analyzed" },
            { label: "CMA Report", value: "✓ Generated" },
            { label: "Presented To", value: seller?.name ?? "Seller" },
          ],
        },
      ];

    case "pricing-review":
      return [
        {
          title: "Pricing",
          fields: [
            { label: "List Price", value: price, editKey: "list_price", editTarget: "listing", inputType: "number" },
            { label: "Marketing Strategy", value: "✓ Defined" },
          ],
        },
        {
          title: "Review",
          fields: [
            { label: "Listing Details", value: "✓ Reviewed" },
            { label: "Photos & Descriptions", value: "✓ Approved" },
            { label: "Showing Start", value: listing.showing_window_start ?? "Not set", editKey: "showing_window_start", editTarget: "listing", inputType: "time" },
            { label: "Showing End", value: listing.showing_window_end ?? "Not set", editKey: "showing_window_end", editTarget: "listing", inputType: "time" },
          ],
        },
      ];

    case "form-generation": {
      const formNames: Record<string, string> = { fintrac: "FINTRAC", dorts: "DORTS", pds: "PDS", mlc: "MLC" };
      const fields: FieldItem[] = Object.entries(formNames).map(([key, name]) => {
        const s = formStatuses[key];
        return { label: name, value: s === "completed" ? "✓ Completed" : s === "draft" ? "◐ Draft" : "○ Pending" };
      });
      return [{ title: "BC Standard Forms", fields }];
    }

    case "e-signature": {
      const docCount = documents.length;
      return [
        {
          title: "Document Signing",
          fields: [
            { label: "Documents Sent", value: `✓ Sent to ${seller?.name ?? "seller"}` },
            { label: "Seller Signature", value: "✓ Signed" },
            { label: "Agent Counter-Sign", value: "✓ Counter-signed" },
            { label: "Archived", value: `✓ ${docCount} document${docCount !== 1 ? "s" : ""} archived` },
          ],
        },
      ];
    }

    case "mls-prep":
      return [
        {
          title: "Listing Media",
          fields: [
            { label: "Professional Photos", value: "✓ Uploaded" },
            { label: "Property Description", value: "✓ Written" },
            { label: "Feature Sheet", value: "✓ Created" },
            { label: "Virtual Tour", value: "✓ Ready" },
          ],
        },
      ];

    case "mls-submission":
      return [
        {
          title: "MLS Details",
          fields: [
            { label: "MLS Number", value: listing.mls_number ?? "—", editKey: "mls_number", editTarget: "listing" },
            { label: "Status", value: "✓ Live on MLS" },
            { label: "Submitted To", value: "Real Estate Board" },
            { label: "Listing Address", value: listing.address ?? "—" },
          ],
        },
      ];

    case "post-listing": {
      const showings = ctx.showingsCount ?? 0;
      const isSold = listing.status === "sold";
      const isPending = listing.status === "pending";
      return [
        {
          title: "Transaction Progress",
          fields: [
            { label: "Showings", value: showings > 0 ? `${showings} showing${showings !== 1 ? "s" : ""} managed` : "No showings yet" },
            { label: "Offers", value: isSold || isPending ? "✓ Reviewed" : "Pending" },
            { label: "Negotiation", value: isSold ? "✓ Accepted" : isPending ? "In progress" : "Pending" },
            { label: "Closing", value: isSold ? "✓ Transaction closed" : "Pending" },
          ],
        },
      ];
    }

    default:
      return null;
  }
}
