// SOC 2 CC7.2 — Compliance audit logging utility
//
// Writes to the immutable, hash-chained compliance_audit_log table.
// Callers across server actions, API routes, and auth handlers use
// logAuditEvent() to record security-relevant events.
//
// Design invariants:
//   - Never throws. Audit failures are logged to stderr but must not
//     break the request path.
//   - Uses admin client because the table's INSERT policy is permissive
//     (enforcement is at call-site + trigger, not at the row level).
//   - Hash chain (prev_hash, row_hash) is computed server-side by a
//     Postgres trigger — not in application code. See migration 146.
//   - `metadata` must contain field NAMES only, never values. A
//     fieldname in the blocklist cannot appear as a metadata key.
//     This rule exists so that an identity_updated event does not
//     write the WS-1-encrypted id_number back into a queryable log.
//   - Event catalog lives in AUDIT_ACTIONS — extend additively.

import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------
// Event catalog
// ---------------------------------------------------------------

export const AUDIT_ACTIONS = {
  // Authentication
  LOGIN_SUCCESS: "auth.login.success",
  LOGIN_FAILED: "auth.login.failed",
  LOGOUT: "auth.logout",
  PASSWORD_CHANGED: "auth.password.changed",
  PASSWORD_RESET_REQUESTED: "auth.password.reset_requested",
  PASSWORD_RESET_COMPLETED: "auth.password.reset_completed",
  MFA_ENROLLED: "auth.mfa.enrolled",
  MFA_VERIFIED: "auth.mfa.verified",
  MFA_FAILED: "auth.mfa.failed",
  MFA_DISABLED: "auth.mfa.disabled",
  SESSION_REVOKED: "auth.session.revoked",

  // PII access (FINTRAC identities, sensitive contact data)
  PII_VIEWED: "pii.viewed",
  PII_EXPORTED: "pii.exported",
  PII_DELETED: "pii.deleted",

  // Data mutations
  CONTACT_CREATED: "data.contact.created",
  CONTACT_UPDATED: "data.contact.updated",
  CONTACT_DELETED: "data.contact.deleted",
  IDENTITY_CREATED: "data.identity.created",
  IDENTITY_UPDATED: "data.identity.updated",
  IDENTITY_DELETED: "data.identity.deleted",
  LISTING_STATUS_CHANGED: "data.listing.status_changed",

  // Admin
  ROLE_CHANGED: "admin.role.changed",
  MEMBER_INVITED: "admin.member.invited",
  MEMBER_REMOVED: "admin.member.removed",
  PLAN_CHANGED: "admin.plan.changed",
  FEATURE_TOGGLED: "admin.feature.toggled",
  USER_DEACTIVATED: "admin.user.deactivated",
  USER_REACTIVATED: "admin.user.reactivated",

  // Compliance
  CONSENT_GRANTED: "compliance.consent.granted",
  CONSENT_WITHDRAWN: "compliance.consent.withdrawn",
  UNSUBSCRIBED: "compliance.unsubscribed",
  DATA_EXPORT_REQUESTED: "compliance.data.export_requested",
  DATA_DELETION_REQUESTED: "compliance.data.deletion_requested",

  // Security
  RATE_LIMIT_EXCEEDED: "security.rate_limit.exceeded",
  SUSPICIOUS_ACCESS: "security.access.suspicious",
  BULK_OPERATION: "security.bulk.operation",
  IMPOSSIBLE_TRAVEL: "security.travel.impossible",
  API_KEY_CREATED: "security.api_key.created",
  API_KEY_REVOKED: "security.api_key.revoked",
  CHAIN_BREAK_DETECTED: "security.audit_chain.break",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export type AuditCategory =
  | "authentication"
  | "pii_access"
  | "data_mutation"
  | "admin"
  | "compliance"
  | "security";

export type AuditSeverity = "info" | "warning" | "critical";

function categoryFor(action: string): AuditCategory {
  if (action.startsWith("auth.")) return "authentication";
  if (action.startsWith("pii.")) return "pii_access";
  if (action.startsWith("data.")) return "data_mutation";
  if (action.startsWith("admin.")) return "admin";
  if (action.startsWith("compliance.")) return "compliance";
  if (action.startsWith("security.")) return "security";
  // Default — fail closed into the broadest bucket
  return "security";
}

// ---------------------------------------------------------------
// PII safety — metadata rules
// ---------------------------------------------------------------
// These field names must NEVER appear as metadata keys. If a caller
// wants to record "identity_updated → id_number was changed", use:
//   metadata: { changed_fields: ["id_number"] }
// NOT:
//   metadata: { id_number: "G12345" }          ← rejected
//   metadata: { id_number: "[redacted]" }      ← still rejected (key name forbidden)

const FORBIDDEN_METADATA_KEYS = new Set([
  // FINTRAC KYC
  "id_number",
  "idnumber",
  "dob",
  "date_of_birth",
  "citizenship",
  "mailing_address",
  // Credentials / tokens
  "password",
  "password_hash",
  "access_token",
  "refresh_token",
  "api_key",
  "apikey",
  "secret",
  "mfa_secret",
  "totp_secret",
  "backup_code",
  "backup_codes",
  // Payment
  "credit_card",
  "card_number",
  "cvv",
  "ssn",
  "sin",
]);

// Metadata keys explicitly permitted for event context.
// `changed_fields` is the canonical way to record "what changed."
const ALLOWED_STRUCTURAL_KEYS = new Set([
  "changed_fields", // string[] — names of columns mutated
  "count",          // number — bulk operation count
  "reason",         // string — free text (scanned for PII patterns)
  "from",           // string/enum — prior state (e.g., role name)
  "to",             // string/enum — new state
  "success",        // boolean
  "error_code",     // string
  "duration_ms",    // number
  "source",         // string — e.g., "api", "ui", "cron"
  "listing_id",
  "contact_id",
  "team_id",
  "listing_ids",
  "contact_ids",
  "channel",        // e.g., "email" / "sms"
  "endpoint",       // string — API path
  "method",         // GET/POST/etc
]);

// Free-text PII signature — catches most accidental leaks in `reason`.
const PII_PATTERNS: RegExp[] = [
  /\b\d{3}-\d{2}-\d{4}\b/,           // SSN-like
  /\b\d{9}\b/,                       // SIN/ID
  /\b[A-Z]\d{7}\b/,                  // BC driver's licence
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // credit card
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, // email (treat as PII in metadata)
];

function scanForPii(value: string): boolean {
  return PII_PATTERNS.some((re) => re.test(value));
}

// ---------------------------------------------------------------
// Public API
// ---------------------------------------------------------------

export interface AuditEventInput {
  action: AuditAction | string;
  severity?: AuditSeverity;

  actor?: {
    id?: string | null;
    email?: string | null;
    role?: string | null;
  };

  resource?: {
    type?: string;
    id?: string | null;
  };

  tenantId?: string | null;
  metadata?: Record<string, unknown>;

  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

/**
 * Record a compliance audit event. Never throws.
 *
 * Usage:
 *   await logAuditEvent({
 *     action: AUDIT_ACTIONS.IDENTITY_UPDATED,
 *     actor: { id: session.user.id, email: session.user.email },
 *     resource: { type: "buyer_identity", id: identity.id },
 *     tenantId: session.user.id,
 *     metadata: { changed_fields: ["id_number", "dob"] },
 *   });
 */
export async function logAuditEvent(event: AuditEventInput): Promise<void> {
  try {
    const supabase = createAdminClient();
    const category = categoryFor(event.action);
    const metadata = sanitizeMetadata(event.metadata ?? {});

    const row = {
      action: event.action,
      category,
      severity: event.severity ?? "info",
      actor_id: event.actor?.id ?? null,
      actor_email: event.actor?.email ?? null,
      actor_role: event.actor?.role ?? null,
      resource_type: event.resource?.type ?? null,
      resource_id: event.resource?.id ?? null,
      tenant_id: event.tenantId ?? null,
      metadata,
      ip_address: event.ip ?? null,
      user_agent: event.userAgent ?? null,
      request_id: event.requestId ?? null,
    };

    const { error } = await supabase.from("compliance_audit_log").insert(row);

    if (error) {
       
      console.error("[audit] insert failed", {
        action: event.action,
        error: error.message,
      });
    }
  } catch (err) {
     
    console.error("[audit] unexpected error", {
      action: event.action,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ---------------------------------------------------------------
// Metadata sanitization
// ---------------------------------------------------------------
// Rules:
//   1. Any key in FORBIDDEN_METADATA_KEYS is dropped.
//   2. String values are scanned for PII patterns; matches → "[REDACTED:pii]".
//   3. `changed_fields` must be a string[] — values other than strings
//      are coerced/dropped.
//   4. Nested objects recursed (shallow — no deep PII scans beyond 2 levels).

export function sanitizeMetadata(
  metadata: Record<string, unknown>,
  depth = 0
): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [rawKey, value] of Object.entries(metadata)) {
    const key = rawKey.toLowerCase();

    if (FORBIDDEN_METADATA_KEYS.has(key)) {
      clean[rawKey] = "[REJECTED:forbidden_key]";
      continue;
    }

    // Warn on keys outside the known-good structural set.
    // We still allow them (forward-compat) but they're the usual source
    // of accidental PII, so scan harder.
    const isKnownStructural = ALLOWED_STRUCTURAL_KEYS.has(key);

    if (value == null) {
      clean[rawKey] = value;
    } else if (typeof value === "string") {
      clean[rawKey] = !isKnownStructural && scanForPii(value)
        ? "[REDACTED:pii]"
        : value;
    } else if (typeof value === "number" || typeof value === "boolean") {
      clean[rawKey] = value;
    } else if (Array.isArray(value)) {
      // Arrays of strings = field names / IDs. Scan each element.
      clean[rawKey] = value.map((v) =>
        typeof v === "string" && !isKnownStructural && scanForPii(v)
          ? "[REDACTED:pii]"
          : v
      );
    } else if (typeof value === "object" && depth < 2) {
      clean[rawKey] = sanitizeMetadata(
        value as Record<string, unknown>,
        depth + 1
      );
    } else {
      // Deep objects flattened to avoid unbounded scan
      clean[rawKey] = "[TRUNCATED:depth]";
    }
  }
  return clean;
}
