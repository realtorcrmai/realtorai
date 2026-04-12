export type EntityType = "contacts" | "listings" | "showings";
export type MatchMode = "all" | "any";
export type RuleOperator =
  | "eq" | "neq" | "in" | "not_in"
  | "gt" | "gte" | "lt" | "lte"
  | "contains"
  | "older_than" | "newer_than"
  | "is_null" | "is_not_null";

export interface SmartListRule {
  field: string;
  operator: RuleOperator;
  value: string | number | string[] | null;
}

export interface SmartList {
  id: string;
  realtor_id: string;
  name: string;
  icon: string;
  entity_type: EntityType;
  rules: SmartListRule[];
  match_mode: MatchMode;
  sort_field: string;
  sort_order: "asc" | "desc";
  is_pinned: boolean;
  notify_threshold: number | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface SmartListWithCount extends SmartList {
  count: number;
}

export interface FieldDefinition {
  key: string;
  label: string;
  type: "enum" | "number" | "date" | "text" | "array";
  operators: RuleOperator[];
  values?: string[];
}

export const ENTITY_FIELDS: Record<EntityType, FieldDefinition[]> = {
  contacts: [
    { key: "type", label: "Type", type: "enum", operators: ["eq", "neq", "in"], values: ["buyer", "seller", "dual", "customer", "partner", "other"] },
    { key: "stage_bar", label: "Stage", type: "enum", operators: ["eq", "neq", "in", "not_in"], values: ["new", "qualified", "active_search", "active_listing", "under_contract", "closed", "cold"] },
    { key: "lead_status", label: "Lead Status", type: "enum", operators: ["eq", "neq", "in"], values: ["new", "contacted", "qualified", "nurturing", "converted", "lost"] },
    { key: "newsletter_intelligence->engagement_score", label: "Engagement Score", type: "number", operators: ["gt", "gte", "lt", "lte", "is_null", "is_not_null"] },
    { key: "last_activity_date", label: "Last Activity", type: "date", operators: ["older_than", "newer_than", "is_null"] },
    { key: "created_at", label: "Created Date", type: "date", operators: ["older_than", "newer_than"] },
    { key: "tags", label: "Tags", type: "array", operators: ["contains"] },
    { key: "email", label: "Email", type: "text", operators: ["is_null", "is_not_null", "contains"] },
    { key: "phone", label: "Phone", type: "text", operators: ["is_null", "is_not_null"] },
    { key: "pref_channel", label: "Preferred Channel", type: "enum", operators: ["eq", "neq"], values: ["sms", "whatsapp", "email", "phone"] },
  ],
  listings: [
    { key: "status", label: "Status", type: "enum", operators: ["eq", "neq", "in"], values: ["active", "conditional", "pending", "sold", "expired", "withdrawn"] },
    { key: "list_price", label: "List Price", type: "number", operators: ["gt", "gte", "lt", "lte"] },
    { key: "property_type", label: "Property Type", type: "enum", operators: ["eq", "in"], values: ["detached", "townhouse", "condo", "duplex", "land", "commercial", "other"] },
    { key: "created_at", label: "Created Date", type: "date", operators: ["older_than", "newer_than"] },
    { key: "mls_number", label: "MLS Number", type: "text", operators: ["is_null", "is_not_null"] },
    { key: "address", label: "Address", type: "text", operators: ["contains"] },
  ],
  showings: [
    { key: "status", label: "Status", type: "enum", operators: ["eq", "neq", "in"], values: ["pending", "confirmed", "denied", "completed", "cancelled"] },
    { key: "start_time", label: "Showing Time", type: "date", operators: ["older_than", "newer_than"] },
    { key: "buyer_agent_name", label: "Buyer Agent", type: "text", operators: ["contains", "is_null", "is_not_null"] },
    { key: "created_at", label: "Created Date", type: "date", operators: ["older_than", "newer_than"] },
  ],
};

export const OPERATOR_LABELS: Record<RuleOperator, string> = {
  eq: "is",
  neq: "is not",
  in: "is any of",
  not_in: "is none of",
  gt: "greater than",
  gte: "at least",
  lt: "less than",
  lte: "at most",
  contains: "contains",
  older_than: "more than ... ago",
  newer_than: "within last ...",
  is_null: "is empty",
  is_not_null: "has value",
};
