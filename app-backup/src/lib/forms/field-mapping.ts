/**
 * Field Mapping Service
 *
 * Resolves CRM data paths (e.g. "listing.address", "seller.name")
 * into actual values, then produces a field-value map for PDF filling.
 */

export type CrmContext = {
  listing: Record<string, unknown>;
  seller: { name: string; phone: string; email: string | null };
  user: { name?: string | null; email?: string | null };
};

/**
 * Resolve a dot-path like "listing.address" or "seller.name" from CRM context.
 * Special paths:
 *   _today  → today's date in YYYY-MM-DD format
 */
function resolvePath(context: CrmContext, path: string): string {
  // Special built-in paths
  if (path === "_today") {
    return new Date().toISOString().split("T")[0];
  }

  const parts = path.split(".");
  let current: unknown = context;

  for (const part of parts) {
    if (current == null || typeof current !== "object") return "";

    // Handle array notation like "sellers[0]"
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, key, idx] = arrayMatch;
      current = (current as Record<string, unknown>)[key];
      if (Array.isArray(current)) {
        current = current[Number(idx)];
      } else {
        return "";
      }
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }

  if (current == null) return "";

  // Format currency values
  if (typeof current === "number") {
    // If the path suggests it's a price/money field, format as currency
    if (path.includes("price") || path.includes("Price")) {
      return current.toLocaleString("en-CA", {
        style: "currency",
        currency: "CAD",
        maximumFractionDigits: 0,
      });
    }
    return String(current);
  }

  return String(current);
}

/**
 * Apply a field mapping to produce PDF field values from CRM data.
 *
 * @param fieldMapping - Map of PDF field names → CRM data paths
 *   e.g. { "clientName": "seller.name", "propertyAddress": "listing.address" }
 * @param context - CRM data context (listing, seller, user)
 * @returns Map of PDF field names → resolved string values
 */
export function applyFieldMapping(
  fieldMapping: Record<string, string>,
  context: CrmContext
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [pdfFieldName, crmPath] of Object.entries(fieldMapping)) {
    const value = resolvePath(context, crmPath);
    if (value) {
      result[pdfFieldName] = value;
    }
  }

  return result;
}
