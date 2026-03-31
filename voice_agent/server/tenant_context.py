"""
Tenant context extraction for the Voice Agent Python server.
Resolves tenant_id from JWT tokens or API keys in request headers.
"""

import os
import json
import base64
from typing import Optional

DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001"
VOICE_AGENT_API_KEY = os.getenv("VOICE_AGENT_API_KEY", "")


def extract_tenant_from_request(headers: dict) -> dict:
    """
    Extract tenant_id and agent_email from request headers.

    Supports:
      - Legacy VOICE_AGENT_API_KEY (maps to default tenant)
      - JWT Bearer tokens with tenant_id claim
      - x-tenant-id header (explicit override for service-to-service)

    Returns:
        {"tenant_id": str, "agent_email": str | None, "error": str | None}
    """
    # Check x-tenant-id header (service-to-service override)
    explicit_tenant = headers.get("x-tenant-id")
    if explicit_tenant:
        return {"tenant_id": explicit_tenant, "agent_email": None, "error": None}

    auth = headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return {"tenant_id": DEFAULT_TENANT_ID, "agent_email": None, "error": "Missing Bearer token"}

    token = auth[7:]

    # Legacy key check
    if VOICE_AGENT_API_KEY and token == VOICE_AGENT_API_KEY:
        return {"tenant_id": DEFAULT_TENANT_ID, "agent_email": None, "error": None}

    # Try JWT decode (no verification here — verified at API gateway level)
    payload = _decode_jwt_payload(token)
    if payload:
        return {
            "tenant_id": payload.get("tenant_id", DEFAULT_TENANT_ID),
            "agent_email": payload.get("sub"),
            "error": None,
        }

    # Unknown token format — use default tenant for backward compat
    return {"tenant_id": DEFAULT_TENANT_ID, "agent_email": None, "error": None}


def _decode_jwt_payload(token: str) -> Optional[dict]:
    """Decode JWT payload without verification (just extract claims)."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        # Add padding
        payload_b64 = parts[1] + "=" * (4 - len(parts[1]) % 4)
        payload_bytes = base64.urlsafe_b64decode(payload_b64)
        return json.loads(payload_bytes)
    except Exception:
        return None
