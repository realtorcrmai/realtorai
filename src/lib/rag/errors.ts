// ============================================================
// RAG Error Helpers — Standardized error responses
// ============================================================

import { NextResponse } from 'next/server';

export type RagErrorCode =
  | 'RATE_LIMITED'
  | 'GUARDRAIL_BLOCKED'
  | 'TIMEOUT'
  | 'INTERNAL_ERROR'
  | 'INVALID_INPUT'
  | 'DUPLICATE_REQUEST'
  | 'UNAUTHORIZED'
  | 'SERVICE_UNAVAILABLE';

interface RagErrorBody {
  error: {
    code: RagErrorCode;
    message: string;
  };
}

/**
 * Build a standardized RAG error response.
 * All RAG endpoints return errors in the shape: { error: { code, message } }
 */
export function ragError(
  code: RagErrorCode,
  message: string,
  status: number,
  headers?: Record<string, string>
): NextResponse<RagErrorBody> {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers }
  );
}
