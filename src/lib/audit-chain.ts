// SOC 2 CC7.2 — Audit log hash chain validation
//
// The compliance_audit_log table is written with a server-side trigger
// (migration 146) that computes sha256(prev_hash || canonical(row)) for
// every row. This module re-runs that computation server-side and
// compares stored vs expected for each row, detecting tampering.
//
// Why server-side recompute (not TS):
//   The trigger's canonical form uses Postgres-native serialization:
//     - jsonb::text emits '{"k": v}' (space after colon)
//     - timestamptz::text emits '2026-04-25 18:25:36.336508+00'
//     - host(inet) strips CIDR mask
//   JS can't reproduce these formats reliably across versions, and an
//   off-by-one-byte canonical produces a different hash, leading to
//   false positives. Migration 150 wraps the canonical formula in a
//   SQL function (compliance_audit_log_verify_chain), so the trigger
//   and verifier share one source of truth.

import { createAdminClient } from "@/lib/supabase/admin";

export interface ChainVerificationResult {
  ok: boolean;
  rows_checked: number;
  first_break_sequence: number | null;
  first_break_reason: string | null;
  checked_at: string;
}

interface VerifyRow {
  out_sequence: number;
  out_prev_hash: string | null;
  out_prev_hash_expected: string | null;
  out_row_hash: string;
  out_row_hash_expected: string;
}

/**
 * Verify the audit log chain end-to-end (default) or a sequence range.
 *
 * Each returned row carries (stored_hash, expected_hash) computed by
 * Postgres using the same canonical expression as the BEFORE-INSERT
 * trigger. We walk the result and report the first row where either
 * the row hash or the prev-hash linkage disagrees.
 */
export async function verifyAuditChain(
  fromSequence = 1,
  limit = 10_000
): Promise<ChainVerificationResult> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc(
    "compliance_audit_log_verify_chain",
    { p_from_sequence: fromSequence, p_max_rows: limit }
  );

  if (error) {
    return {
      ok: false,
      rows_checked: 0,
      first_break_sequence: null,
      first_break_reason: `verify rpc failed: ${error.message}`,
      checked_at: new Date().toISOString(),
    };
  }

  const rows = (data ?? []) as VerifyRow[];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];

    // prev_hash linkage check
    if ((r.out_prev_hash ?? null) !== (r.out_prev_hash_expected ?? null)) {
      return {
        ok: false,
        rows_checked: i + 1,
        first_break_sequence: r.out_sequence,
        first_break_reason: "prev_hash does not match prior row's row_hash",
        checked_at: new Date().toISOString(),
      };
    }

    // row_hash recompute check
    if (r.out_row_hash !== r.out_row_hash_expected) {
      return {
        ok: false,
        rows_checked: i + 1,
        first_break_sequence: r.out_sequence,
        first_break_reason: "row_hash does not match recomputed hash",
        checked_at: new Date().toISOString(),
      };
    }
  }

  return {
    ok: true,
    rows_checked: rows.length,
    first_break_sequence: null,
    first_break_reason: null,
    checked_at: new Date().toISOString(),
  };
}
