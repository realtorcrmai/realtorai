# MCP Consumer Tests

> **Status:** Scaffolded. Activate when Realtors360 integrates MCP servers.

## Purpose

Test MCP server integrations consumed via Claude:
- Tool catalog verification (pinned snapshots)
- Per-tool invocation correctness
- Claude-to-MCP integration loops (real prompts)
- Safety: prompt injection via tool results, PII leakage

## Current AI Integrations (candidates for future MCP)

| Integration | Current Implementation | MCP Candidate? |
|-------------|----------------------|----------------|
| Claude AI (MLS remarks) | Direct Anthropic SDK | Yes — when MCP tool |
| Lead scoring | `src/lib/ai-agent/lead-scorer.ts` | Yes |
| Newsletter AI | `src/lib/newsletter-ai.ts` | Yes |
| BC Assessment | Manual lookup | Future MCP server |
| LTSA | Manual lookup | Future MCP server |
| ParcelMap BC | API call | Future MCP server |
| MLS feed | Not implemented | Future MCP server |

## When to implement

Phase 4 of the testing rollout, OR when an MCP server is first connected.

## Test structure

```
tests/mcp/
├── <server>-contract.spec.ts    # Catalog snapshot pin
├── <server>-invocation.spec.ts  # Per-tool tests
├── <server>-integration.spec.ts # Claude loop tests
├── <server>-safety.spec.ts      # Injection tests
└── snapshots/<server>.json      # Pinned catalog
```
