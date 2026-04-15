import type { SmartList, SmartListRule, EntityType } from "@/types/smart-lists";
import { escapeIlike } from "@/lib/escape-ilike";

const TABLE_MAP: Record<EntityType, string> = {
  contacts: "contacts",
  listings: "listings",
  showings: "appointments",
};

const SELECT_MAP: Record<EntityType, string> = {
  contacts: "id, name, email, phone, type, stage_bar, lead_status, last_activity_date, created_at, newsletter_intelligence, tags",
  listings: "id, address, status, list_price, property_type, mls_number, created_at, contacts!listings_seller_id_fkey(name)",
  showings: "id, start_time, status, buyer_agent_name, buyer_agent_phone, listing_id, listings!inner(address)",
};

/**
 * Parse relative date expressions like "7d", "24h", "30d" into absolute ISO date strings.
 */
function parseRelativeDate(expr: string): string {
  const match = expr.match(/^(\d+)(h|d|w|m)$/);
  if (!match) return new Date().toISOString();

  const amount = parseInt(match[1], 10);
  const unit = match[2];
  const now = Date.now();
  const ms: Record<string, number> = {
    h: 3600000,
    d: 86400000,
    w: 604800000,
    m: 2592000000, // ~30 days
  };

  return new Date(now - amount * ms[unit]).toISOString();
}

/**
 * Check if a field is a JSONB arrow path (e.g., "newsletter_intelligence->engagement_score").
 */
function isJsonbPath(field: string): boolean {
  return field.includes("->");
}

/**
 * Build a PostgREST filter string for a single rule.
 * Used for .or() filter strings in "any" match mode.
 */
function ruleToFilterString(rule: SmartListRule): string | null {
  const { field, operator, value } = rule;

  // For JSONB paths, use ->> for text extraction
  const filterField = isJsonbPath(field) ? field.replace("->", "->>") : field;

  switch (operator) {
    case "eq":
      return `${filterField}.eq.${value}`;
    case "neq":
      return `${filterField}.neq.${value}`;
    case "in":
      return `${filterField}.in.(${(value as string[]).join(",")})`;
    case "not_in":
      return `${filterField}.not.in.(${(value as string[]).join(",")})`;
    case "gt":
      return `${filterField}.gt.${value}`;
    case "gte":
      return `${filterField}.gte.${value}`;
    case "lt":
      return `${filterField}.lt.${value}`;
    case "lte":
      return `${filterField}.lte.${value}`;
    case "contains":
      if (Array.isArray(value)) {
        return `${filterField}.cs.{${(value as string[]).join(",")}}`;
      }
      return `${filterField}.ilike.*${value}*`;
    case "older_than":
      return `${filterField}.lt.${parseRelativeDate(value as string)}`;
    case "newer_than":
      return `${filterField}.gt.${parseRelativeDate(value as string)}`;
    case "is_null":
      return `${filterField}.is.null`;
    case "is_not_null":
      return `${filterField}.not.is.null`;
    default:
      return null;
  }
}

/**
 * Apply a single rule to a Supabase query builder (AND mode).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyRule(query: any, rule: SmartListRule): any {
  const { field, operator, value } = rule;

  // For JSONB paths, use the ->> text extraction operator for comparisons
  const filterField = isJsonbPath(field) ? field.replace("->", "->>") : field;

  switch (operator) {
    case "eq":
      return query.eq(filterField, value);
    case "neq":
      return query.neq(filterField, value);
    case "in":
      return query.in(filterField, value as string[]);
    case "not_in":
      return query.not(filterField, "in", `(${(value as string[]).join(",")})`);
    case "gt":
      return query.gt(filterField, value);
    case "gte":
      return query.gte(filterField, value);
    case "lt":
      return query.lt(filterField, value);
    case "lte":
      return query.lte(filterField, value);
    case "contains":
      if (Array.isArray(value)) {
        return query.contains(filterField, value);
      }
      return query.ilike(filterField, `%${escapeIlike(String(value))}%`);
    case "older_than":
      return query.lt(filterField, parseRelativeDate(value as string));
    case "newer_than":
      return query.gt(filterField, parseRelativeDate(value as string));
    case "is_null":
      return query.is(filterField, null);
    case "is_not_null":
      return query.not(filterField, "is", null);
    default:
      return query;
  }
}

/**
 * Execute a Smart List's rules and return matching rows.
 */
export async function executeSmartListQuery(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tc: { raw: any; realtorId: string },
  smartList: SmartList
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  const table = TABLE_MAP[smartList.entity_type];
  const select = SELECT_MAP[smartList.entity_type];

  let query = tc.raw
    .from(table)
    .select(select)
    .eq("realtor_id", tc.realtorId);

  if (smartList.match_mode === "all") {
    // AND: chain all rules sequentially
    for (const rule of smartList.rules) {
      query = applyRule(query, rule);
    }
  } else {
    // OR: build a filter string and use .or()
    const filterParts = smartList.rules
      .map(ruleToFilterString)
      .filter(Boolean) as string[];
    if (filterParts.length > 0) {
      query = query.or(filterParts.join(","));
    }
  }

  query = query.order(smartList.sort_field, { ascending: smartList.sort_order === "asc" });
  query = query.limit(500); // Safety limit

  const { data, error } = await query;
  if (error) {
    console.error("[smart-list-engine] Query error:", error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Count matching rows for a Smart List (lightweight — no data transfer).
 */
export async function countSmartListMatches(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tc: { raw: any; realtorId: string },
  smartList: SmartList
): Promise<number> {
  const table = TABLE_MAP[smartList.entity_type];

  let query = tc.raw
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("realtor_id", tc.realtorId);

  if (smartList.match_mode === "all") {
    for (const rule of smartList.rules) {
      query = applyRule(query, rule);
    }
  } else {
    const filterParts = smartList.rules
      .map(ruleToFilterString)
      .filter(Boolean) as string[];
    if (filterParts.length > 0) {
      query = query.or(filterParts.join(","));
    }
  }

  const { count, error } = await query;
  if (error) {
    console.error("[smart-list-engine] Count error:", error.message);
    return 0;
  }
  return count ?? 0;
}
