// SOC 2 CC7.2 — Audit log hash chain validation
//
// The compliance_audit_log table is written with a server-side trigger
// that computes sha256(prev_hash || canonical(row)) for every row.
// This module re-computes the chain end-to-end to detect tampering.
//
// If any row's stored row_hash disagrees with the recomputed hash, or
// any row's prev_hash disagrees with the prior row's row_hash, the
// chain is broken. Break == tampering OR bug in hash computation.
// Both warrant a P1 investigation.

import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ChainVerificationResult {
  ok: boolean;
  rows_checked: number;
  first_break_sequence: number | null;
  first_break_reason: string | null;
  checked_at: string;
}

interface AuditRow {
  sequence: number;
  occurred_at: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  category: string;
  severity: string;
  resource_type: string | null;
  resource_id: string | null;
  tenant_id: string | null;
  metadata: unknown;
  ip_address: string | null;
  request_id: string | null;
  prev_hash: string | null;
  row_hash: string;
}

// Must match the canonical form in migration 146's trigger.
function canonical(row: AuditRow, prevHash: string | null): string {
  const parts = [
    prevHash ?? "GENESIS",
    String(row.sequence),
    row.occurred_at,
    row.actor_id ?? "",
    row.actor_email ?? "",
    row.action,
    row.category,
    row.severity,
    row.resource_type ?? "",
    row.resource_id ?? "",
    row.tenant_id ?? "",
    row.metadata == null ? "{}" : JSON.stringify(row.metadata),
    row.ip_address ?? "",
    row.request_id ?? "",
  ];
  return parts.join("|");
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Verify the audit log chain in a given sequence range.
 *
 * Note: JSON canonicalization between Postgres jsonb::text and
 * JSON.stringify can differ in whitespace/key ordering. If the chain
 * breaks in production on metadata rows only, the mismatch likely
 * stems from that — reconcile by reading metadata::text directly via
 * a Postgres function rather than through the JS client.
 */
export async function verifyAuditChain(
  fromSequence = 1,
  limit = 10_000
): Promise<ChainVerificationResult> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("compliance_audit_log")
    .select(
      "sequence, occurred_at, actor_id, actor_email, action, category, severity, resource_type, resource_id, tenant_id, metadata, ip_address, request_id, prev_hash, row_hash"
    )
    .gte("sequence", fromSequence)
    .order("sequence", { ascending: true })
    .limit(limit);

  if (error) {
    return {
      ok: false,
      rows_checked: 0,
      first_break_sequence: null,
      first_break_reason: `query failed: ${error.message}`,
      checked_at: new Date().toISOString(),
    };
  }

  const rows = (data ?? []) as AuditRow[];
  let priorHash: string | null = null;

  // Seed priorHash from the row before our range, if any
  if (fromSequence > 1) {
    const { data: priorRow } = await supabase
      .from("compliance_audit_log")
      .select("row_hash")
      .lt("sequence", fromSequence)
      .order("sequence", { ascending: false })
      .limit(1)
      .maybeSingle();
    priorHash = (priorRow as { row_hash: string } | null)?.row_hash ?? null;
  }

  for (const row of rows) {
    // Check prev_hash linkage
    if ((row.prev_hash ?? null) !== priorHash) {
      return {
        ok: false,
        rows_checked: rows.indexOf(row) + 1,
        first_break_sequence: row.sequence,
        first_break_reason: "prev_hash does not match prior row's row_hash",
        checked_at: new Date().toISOString(),
      };
    }

    // Recompute row_hash
    const computed = sha256(canonical(row, priorHash));
    if (computed !== row.row_hash) {
      return {
        ok: false,
        rows_checked: rows.indexOf(row) + 1,
        first_break_sequence: row.sequence,
        first_break_reason: "row_hash does not match recomputed hash",
        checked_at: new Date().toISOString(),
      };
    }

    priorHash = row.row_hash;
  }

  return {
    ok: true,
    rows_checked: rows.length,
    first_break_sequence: null,
    first_break_reason: null,
    checked_at: new Date().toISOString(),
  };
}
