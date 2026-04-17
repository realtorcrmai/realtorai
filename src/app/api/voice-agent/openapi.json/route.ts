import { NextResponse } from "next/server";

/**
 * Serves the OpenAPI 3.1 specification for the Magnate Voice Agent API.
 * Used by Gemini Extensions, Google Actions, and external integrations.
 */
export async function GET() {
  const spec = {
    openapi: "3.1.0",
    info: {
      title: "Magnate Voice Agent API",
      version: "1.0.0",
      description:
        "Multi-tenant voice agent API for real estate CRM. Supports contacts, listings, showings, deals, tasks, and voice session management. All endpoints require Bearer token authentication and are scoped to the authenticated tenant.",
      contact: { name: "Magnate Engineering", url: "https://realtorai.com" },
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        description: "Magnate API",
      },
    ],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "OAuth2 access token or tenant API key",
        },
        oauth2: {
          type: "oauth2",
          flows: {
            authorizationCode: {
              authorizationUrl: "/api/oauth/authorize",
              tokenUrl: "/api/oauth/token",
              scopes: {
                "voice:read": "Read voice sessions, calls, notifications",
                "voice:write": "Create/update voice sessions and calls",
                "crm:read": "Read contacts, listings, showings, deals",
                "crm:write": "Create/update CRM records via voice",
              },
            },
          },
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: { type: "string", description: "Error message" },
          },
          required: ["error"],
        },
        Contact: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            type: { type: "string", enum: ["buyer", "seller", "both", "agent", "other"] },
          },
        },
        Listing: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            address: { type: "string" },
            list_price: { type: "number" },
            status: { type: "string" },
            current_phase: { type: "integer", minimum: 1, maximum: 8 },
          },
        },
        VoiceSession: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            tenant_id: { type: "string", format: "uuid" },
            agent_email: { type: "string" },
            mode: { type: "string", enum: ["realtor", "client", "generic"] },
            source: { type: "string", enum: ["browser", "siri", "google", "alexa", "cortana", "teams", "api"] },
            status: { type: "string", enum: ["active", "idle", "offline", "expired"] },
          },
        },
      },
      parameters: {
        cursor: {
          name: "cursor",
          in: "query",
          schema: { type: "string" },
          description: "Pagination cursor (created_at of last item)",
        },
        limit: {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 20, maximum: 100 },
          description: "Number of items to return",
        },
      },
    },
    paths: {
      "/api/voice-agent/sessions": {
        get: {
          operationId: "listSessions",
          summary: "List voice sessions",
          tags: ["Sessions"],
          parameters: [
            { name: "agent_email", in: "query", schema: { type: "string" } },
            { name: "status", in: "query", schema: { type: "string", enum: ["active", "idle", "offline", "expired"] } },
          ],
          responses: {
            "200": { description: "List of sessions", content: { "application/json": { schema: { type: "object", properties: { sessions: { type: "array", items: { $ref: "#/components/schemas/VoiceSession" } } } } } } },
            "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
        post: {
          operationId: "createSession",
          summary: "Create a voice session",
          tags: ["Sessions"],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["agent_email"],
                  properties: {
                    agent_email: { type: "string" },
                    mode: { type: "string", enum: ["realtor", "client", "generic"] },
                    source: { type: "string", enum: ["browser", "siri", "google", "alexa", "cortana", "teams", "api"] },
                    focus_type: { type: "string", enum: ["contact", "listing", "showing"], nullable: true },
                    focus_id: { type: "string", format: "uuid", nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Session created" },
            "400": { description: "Bad request", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "429": { description: "Rate limited", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/api/voice-agent/contacts": {
        get: {
          operationId: "searchContacts",
          summary: "Search contacts",
          tags: ["CRM"],
          parameters: [
            { name: "q", in: "query", schema: { type: "string" }, description: "Search query (name, email, phone)" },
            { name: "type", in: "query", schema: { type: "string", enum: ["buyer", "seller", "both", "agent"] } },
          ],
          responses: {
            "200": { description: "List of contacts" },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/api/voice-agent/listings": {
        get: {
          operationId: "searchListings",
          summary: "Search listings",
          tags: ["CRM"],
          parameters: [
            { name: "status", in: "query", schema: { type: "string" } },
            { name: "min_price", in: "query", schema: { type: "number" } },
            { name: "max_price", in: "query", schema: { type: "number" } },
          ],
          responses: {
            "200": { description: "List of listings" },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/api/voice-agent/showings": {
        get: {
          operationId: "listShowings",
          summary: "List showings",
          tags: ["CRM"],
          responses: { "200": { description: "List of showings" } },
        },
      },
      "/api/voice-agent/deals": {
        get: {
          operationId: "listDeals",
          summary: "List deals in pipeline",
          tags: ["CRM"],
          responses: { "200": { description: "List of deals" } },
        },
      },
      "/api/voice-agent/tasks": {
        get: {
          operationId: "listTasks",
          summary: "List tasks",
          tags: ["CRM"],
          responses: { "200": { description: "List of tasks" } },
        },
      },
      "/api/voice-agent/calls": {
        get: {
          operationId: "listVoiceCalls",
          summary: "List voice call history",
          tags: ["Voice"],
          responses: { "200": { description: "List of voice calls" } },
        },
      },
      "/api/voice-agent/notifications": {
        get: {
          operationId: "listNotifications",
          summary: "List voice notifications",
          tags: ["Voice"],
          responses: { "200": { description: "List of notifications" } },
        },
      },
      "/api/voice-agent/keys": {
        get: {
          operationId: "listApiKeys",
          summary: "List tenant API keys (prefix only)",
          tags: ["Admin"],
          responses: { "200": { description: "List of API keys" } },
        },
        post: {
          operationId: "createApiKey",
          summary: "Create a new tenant API key",
          tags: ["Admin"],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    permissions: { type: "array", items: { type: "string" } },
                    rate_limit_per_minute: { type: "integer" },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "API key created (plaintext returned once)" },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/api/oauth/authorize": {
        get: {
          operationId: "authorize",
          summary: "OAuth2 authorization endpoint",
          tags: ["OAuth"],
          parameters: [
            { name: "response_type", in: "query", required: true, schema: { type: "string", enum: ["code"] } },
            { name: "client_id", in: "query", required: true, schema: { type: "string" } },
            { name: "redirect_uri", in: "query", required: true, schema: { type: "string" } },
            { name: "state", in: "query", required: true, schema: { type: "string" } },
            { name: "scope", in: "query", schema: { type: "string" } },
            { name: "code_challenge", in: "query", schema: { type: "string" } },
            { name: "code_challenge_method", in: "query", schema: { type: "string", enum: ["S256"] } },
          ],
          responses: {
            "302": { description: "Redirect to redirect_uri with authorization code" },
            "400": { description: "Invalid request" },
          },
        },
      },
      "/api/oauth/token": {
        post: {
          operationId: "exchangeToken",
          summary: "OAuth2 token exchange",
          tags: ["OAuth"],
          requestBody: {
            content: {
              "application/x-www-form-urlencoded": {
                schema: {
                  type: "object",
                  required: ["grant_type", "client_id"],
                  properties: {
                    grant_type: { type: "string", enum: ["authorization_code", "refresh_token"] },
                    client_id: { type: "string" },
                    code: { type: "string" },
                    redirect_uri: { type: "string" },
                    code_verifier: { type: "string" },
                    refresh_token: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Token response with access_token and refresh_token" },
            "400": { description: "Invalid grant" },
          },
        },
      },
    },
  };

  return NextResponse.json(spec, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
