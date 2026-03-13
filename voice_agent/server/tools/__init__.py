#!/usr/bin/env python3
"""
Voice Agent Tools Package
Exposes tool schemas and handlers for Realtor, Client, and Generic modes.
"""

from .realtor_tools import REALTOR_TOOLS, handle_realtor_tool
from .client_tools import CLIENT_TOOLS, handle_client_tool
from .generic_tools import GENERIC_TOOLS, handle_generic_tool

# Combined tool sets — real estate tools + generic assistant tools
ALL_REALTOR_TOOLS = REALTOR_TOOLS + GENERIC_TOOLS
ALL_CLIENT_TOOLS = CLIENT_TOOLS + GENERIC_TOOLS

__all__ = [
    "REALTOR_TOOLS", "handle_realtor_tool",
    "CLIENT_TOOLS", "handle_client_tool",
    "GENERIC_TOOLS", "handle_generic_tool",
    "ALL_REALTOR_TOOLS", "ALL_CLIENT_TOOLS",
]
