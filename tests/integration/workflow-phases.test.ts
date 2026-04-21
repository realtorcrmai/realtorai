/**
 * L4 Integration Tests — Workflow Phases (DB layer)
 *
 * Tests the REAL Supabase database for:
 *   1. form_submissions — upsert, UNIQUE constraint, updated_at tracking
 *   2. seller_identities — FINTRAC identity collection, FK validation
 *   3. listing_enrichment — geo data storage, enrich_status tracking
 *
 * Since server actions use getAuthenticatedTenantClient() which requires
 * a Next.js server context, we test the DB layer directly via the admin
 * client — verifying the same constraints and behaviors the actions enforce.
 *
 * 3-layer assertions: Response/return + DB state + Side effects
 */

import { describe, it, expect, afterEach, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// ── Setup ──────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enabled = Boolean(SUPABASE_URL && SUPABASE_KEY);

const TEST_PREFIX = "TEST_INTG_WORKFLOW";

// Track all created row IDs for cleanup
const createdListings: string[] = [];
const createdContacts: string[] = [];
const createdFormSubmissions: string[] = [];
const createdSellerIdentities: string[] = [];
const createdEnrichments: string[] = [];

describe.skipIf(!enabled)("L4 Integration — Workflow Phases", () => {
  let admin: SupabaseClient;
  let REALTOR_A: string; // Real user ID from DB (demo user)

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Resolve real demo user ID for REALTOR_A
    const demoEmail = process.env.DEMO_EMAIL || "demo@realestatecrm.com";
    const { data: user, error } = await admin
      .from("users")
      .select("id")
      .eq("email", demoEmail)
      .maybeSingle();

    if (error || !user) {
      throw new Error(
        `Demo user not found (${demoEmail}): ${error?.message ?? "not in users table"}`
      );
    }
    REALTOR_A = user.id;
  });

  afterEach(async () => {
    // Clean up in dependency order:
    // form_submissions → seller_identities → listing_enrichment → listings → contacts
    for (const id of createdFormSubmissions) {
      await admin.from("form_submissions").delete().eq("id", id);
    }
    createdFormSubmissions.length = 0;

    for (const id of createdSellerIdentities) {
      await admin.from("seller_identities").delete().eq("id", id);
    }
    createdSellerIdentities.length = 0;

    for (const id of createdEnrichments) {
      await admin.from("listing_enrichment").delete().eq("id", id);
    }
    createdEnrichments.length = 0;

    for (const id of createdListings) {
      await admin.from("listings").delete().eq("id", id);
    }
    createdListings.length = 0;

    for (const id of createdContacts) {
      await admin.from("contacts").delete().eq("id", id);
    }
    createdContacts.length = 0;
  });

  // ── Helpers ────────────────────────────────────────────────

  async function insertContact(
    overrides: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>> {
    const id = (overrides.id as string) ?? crypto.randomUUID();
    const row = {
      id,
      name: `${TEST_PREFIX} Contact`,
      phone: `+1604555${Math.floor(1000 + Math.random() * 9000)}`,
      email: `${TEST_PREFIX.toLowerCase()}_${id.slice(0, 8)}@test.example.com`,
      type: "seller",
      realtor_id: REALTOR_A,
      is_sample: true,
      ...overrides,
    };

    const { data, error } = await admin
      .from("contacts")
      .upsert(row, { onConflict: "id" })
      .select()
      .single();

    if (error) throw new Error(`insertContact failed: ${error.message}`);
    createdContacts.push(data.id);
    return data;
  }

  async function insertListing(
    overrides: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>> {
    const id = (overrides.id as string) ?? crypto.randomUUID();
    const realtorId = (overrides.realtor_id as string) ?? REALTOR_A;

    // listings.seller_id is NOT NULL — auto-create a contact if not provided
    let sellerId = overrides.seller_id as string | undefined;
    if (!sellerId) {
      const seller = await insertContact({ realtor_id: realtorId, type: "seller" });
      sellerId = seller.id as string;
    }

    const row = {
      id,
      address: `${TEST_PREFIX} ${Math.random().toString(36).slice(2, 8)}, Vancouver, BC`,
      property_type: "Residential",
      status: "active",
      list_price: 999000,
      lockbox_code: "0000",
      realtor_id: realtorId,
      seller_id: sellerId,
      is_sample: true,
      ...overrides,
    };

    const { data, error } = await admin
      .from("listings")
      .upsert(row, { onConflict: "id" })
      .select()
      .single();

    if (error) throw new Error(`insertListing failed: ${error.message}`);
    createdListings.push(data.id);
    return data;
  }

  async function insertFormSubmission(
    listingId: string,
    formKey: string,
    overrides: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>> {
    const id = (overrides.id as string) ?? crypto.randomUUID();
    const row = {
      id,
      listing_id: listingId,
      form_key: formKey,
      form_data: {},
      status: "draft",
      realtor_id: REALTOR_A,
      ...overrides,
    };

    const { data, error } = await admin
      .from("form_submissions")
      .upsert(row, { onConflict: "listing_id,form_key" })
      .select()
      .single();

    if (error) throw new Error(`insertFormSubmission failed: ${error.message}`);
    createdFormSubmissions.push(data.id);
    return data;
  }

  async function insertSellerIdentity(
    listingId: string,
    overrides: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>> {
    const id = (overrides.id as string) ?? crypto.randomUUID();
    const row = {
      id,
      listing_id: listingId,
      full_name: `${TEST_PREFIX} Seller`,
      dob: "1985-06-15",
      citizenship: "Canadian",
      id_type: "passport",
      id_number: "AB1234567",
      id_expiry: "2030-12-31",
      realtor_id: REALTOR_A,
      ...overrides,
    };

    const { data, error } = await admin
      .from("seller_identities")
      .upsert(row, { onConflict: "id" })
      .select()
      .single();

    if (error) throw new Error(`insertSellerIdentity failed: ${error.message}`);
    createdSellerIdentities.push(data.id);
    return data;
  }

  async function insertListingEnrichment(
    listingId: string,
    overrides: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>> {
    const id = (overrides.id as string) ?? crypto.randomUUID();
    const row = {
      id,
      listing_id: listingId,
      enrich_status: {
        geo: "pending",
        ltsa: "pending",
        parcel: "pending",
        assessment: "pending",
      },
      realtor_id: REALTOR_A,
      ...overrides,
    };

    const { data, error } = await admin
      .from("listing_enrichment")
      .upsert(row, { onConflict: "listing_id" })
      .select()
      .single();

    if (error) throw new Error(`insertListingEnrichment failed: ${error.message}`);
    createdEnrichments.push(data.id);
    return data;
  }

  // ─────────────────────────────────────────────────────────────
  // 1. Phase validation — REQ-WORKFLOW-002 (form_submissions)
  // ─────────────────────────────────────────────────────────────

  describe("Phase validation (form_submissions)", () => {
    it("REQ-WORKFLOW-002 TC-WP-001: form_submissions upsert creates record with draft status @p0", async () => {
      // Arrange: create a listing
      const listing = await insertListing();
      const listingId = listing.id as string;
      const formKey = "step-seller-intake";

      // Act: upsert a form_submission
      const submission = await insertFormSubmission(listingId, formKey, {
        form_data: { seller_name: "Jane Doe", notes: "Test intake" },
      });

      // Assert Layer 1: Response — submission created
      expect(submission).not.toBeNull();
      expect(submission.id).toBeDefined();

      // Assert Layer 2: DB state — verify persisted correctly
      const { data: dbRow, error } = await admin
        .from("form_submissions")
        .select("id, listing_id, form_key, status, form_data")
        .eq("id", submission.id as string)
        .single();

      expect(error).toBeNull();
      expect(dbRow).not.toBeNull();
      expect(dbRow!.listing_id).toBe(listingId);
      expect(dbRow!.form_key).toBe(formKey);
      expect(dbRow!.status).toBe("draft");
      expect((dbRow!.form_data as Record<string, unknown>).seller_name).toBe("Jane Doe");

      // Assert Layer 3: Side effect — queryable by listing_id
      const { data: byListing } = await admin
        .from("form_submissions")
        .select("id")
        .eq("listing_id", listingId)
        .eq("form_key", formKey);

      expect(byListing).toHaveLength(1);
    });

    it("REQ-WORKFLOW-002 TC-WP-002: form_submissions UNIQUE constraint on (listing_id, form_key) @p0", async () => {
      // Arrange: create a listing and a form submission
      const listing = await insertListing();
      const listingId = listing.id as string;
      const formKey = "step-seller-intake";

      const original = await insertFormSubmission(listingId, formKey, {
        form_data: { version: 1 },
      });

      // Act: upsert again with same listing_id + form_key (should update, not duplicate)
      const { data: upserted, error } = await admin
        .from("form_submissions")
        .upsert(
          {
            listing_id: listingId,
            form_key: formKey,
            form_data: { version: 2 },
            status: "draft",
            realtor_id: REALTOR_A,
          },
          { onConflict: "listing_id,form_key" }
        )
        .select()
        .single();

      // Assert Layer 1: Response — upsert succeeded
      expect(error).toBeNull();
      expect(upserted).not.toBeNull();

      // Assert Layer 2: DB state — only ONE row exists for this listing+form_key
      const { data: allRows } = await admin
        .from("form_submissions")
        .select("id, form_data")
        .eq("listing_id", listingId)
        .eq("form_key", formKey);

      expect(allRows).toHaveLength(1);
      expect((allRows![0].form_data as Record<string, unknown>).version).toBe(2);

      // Assert Layer 3: If the upsert reused the same row, track for cleanup
      if (upserted!.id !== original.id) {
        createdFormSubmissions.push(upserted!.id);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Audit trail — REQ-WORKFLOW-006
  // ─────────────────────────────────────────────────────────────

  describe("Audit trail", () => {
    it("REQ-WORKFLOW-006 TC-WP-010: form_submissions tracks updated_at on changes @p1", async () => {
      // Arrange: create a form submission
      const listing = await insertListing();
      const listingId = listing.id as string;

      const submission = await insertFormSubmission(listingId, "step-cma", {
        form_data: { comps_count: 3 },
      });
      const originalUpdatedAt = submission.updated_at as string;

      // Wait a tiny bit so Postgres now() advances
      await new Promise((r) => setTimeout(r, 50));

      // Act: update the form_data
      const { error } = await admin
        .from("form_submissions")
        .update({ form_data: { comps_count: 5 } })
        .eq("id", submission.id as string);

      // Assert Layer 1: Response — no error
      expect(error).toBeNull();

      // Assert Layer 2: DB state — updated_at changed
      const { data: dbRow } = await admin
        .from("form_submissions")
        .select("updated_at, form_data")
        .eq("id", submission.id as string)
        .single();

      expect(dbRow).not.toBeNull();
      const newUpdatedAt = dbRow!.updated_at as string;
      expect(new Date(newUpdatedAt).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      );

      // Assert Layer 3: Side effect — form_data also updated
      expect((dbRow!.form_data as Record<string, unknown>).comps_count).toBe(5);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. FINTRAC identity collection — REQ-WORKFLOW-007
  // ─────────────────────────────────────────────────────────────

  describe("FINTRAC identity collection (seller_identities)", () => {
    it("REQ-WORKFLOW-007 TC-WP-020: seller_identities stores identity fields for listing @p0", async () => {
      // Arrange: create a listing
      const listing = await insertListing();
      const listingId = listing.id as string;

      // Act: insert seller identity with full FINTRAC fields
      const identity = await insertSellerIdentity(listingId, {
        full_name: `${TEST_PREFIX} John Smith`,
        dob: "1980-03-25",
        citizenship: "Canadian",
        id_type: "drivers_license",
        id_number: "DL9876543",
        id_expiry: "2028-11-30",
      });

      // Assert Layer 1: Response — identity created
      expect(identity).not.toBeNull();
      expect(identity.id).toBeDefined();

      // Assert Layer 2: DB state — all fields persisted correctly
      const { data: dbRow, error } = await admin
        .from("seller_identities")
        .select("full_name, dob, citizenship, id_type, id_number, id_expiry, listing_id")
        .eq("id", identity.id as string)
        .single();

      expect(error).toBeNull();
      expect(dbRow).not.toBeNull();
      expect(dbRow!.full_name).toBe(`${TEST_PREFIX} John Smith`);
      expect(dbRow!.dob).toBe("1980-03-25");
      expect(dbRow!.citizenship).toBe("Canadian");
      expect(dbRow!.id_type).toBe("drivers_license");
      expect(dbRow!.id_number).toBe("DL9876543");
      expect(dbRow!.id_expiry).toBe("2028-11-30");
      expect(dbRow!.listing_id).toBe(listingId);

      // Assert Layer 3: Side effect — queryable by listing_id for FINTRAC check
      const { count } = await admin
        .from("seller_identities")
        .select("id", { count: "exact", head: true })
        .eq("listing_id", listingId);

      expect(count).toBe(1);
    });

    it("REQ-WORKFLOW-007 TC-WP-021: seller_identities requires valid listing_id FK @p0", async () => {
      // Arrange: a UUID that does not exist in listings
      const fakeListingId = "00000000-0000-4000-8000-face00000099";

      // Act: attempt to insert seller_identity with invalid listing_id
      const { error } = await admin.from("seller_identities").insert({
        id: crypto.randomUUID(),
        listing_id: fakeListingId,
        full_name: `${TEST_PREFIX} FK Test`,
        dob: "1990-01-01",
        citizenship: "Canadian",
        id_type: "passport",
        id_number: "FKTEST099",
        id_expiry: "2030-12-31",
        realtor_id: REALTOR_A,
      });

      // Assert Layer 1: FK violation error
      expect(error).not.toBeNull();
      expect(error!.code).toBe("23503"); // PostgreSQL FK violation code

      // Assert Layer 2: no row was created
      const { data: rows } = await admin
        .from("seller_identities")
        .select("id")
        .eq("id_number", "FKTEST099");

      expect(rows).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Data enrichment — REQ-WORKFLOW-004
  // ─────────────────────────────────────────────────────────────

  describe("Data enrichment (listing_enrichment)", () => {
    it("REQ-WORKFLOW-004 TC-WP-030: listing_enrichment upsert stores geo data @p1", async () => {
      // Arrange: create a listing
      const listing = await insertListing();
      const listingId = listing.id as string;

      const geoData = {
        lat: 49.2827,
        lng: -123.1207,
        address: "123 Main St, Vancouver, BC V6B 1A1",
        confidence: 0.95,
        source: "bc-geocoder",
      };

      // Act: upsert enrichment with geo data
      const enrichment = await insertListingEnrichment(listingId, {
        geo: geoData,
        enrich_status: {
          geo: "ok",
          ltsa: "pending",
          parcel: "pending",
          assessment: "pending",
        },
      });

      // Assert Layer 1: Response — enrichment created
      expect(enrichment).not.toBeNull();
      expect(enrichment.id).toBeDefined();

      // Assert Layer 2: DB state — geo JSONB persisted correctly
      const { data: dbRow, error } = await admin
        .from("listing_enrichment")
        .select("listing_id, geo, enrich_status")
        .eq("id", enrichment.id as string)
        .single();

      expect(error).toBeNull();
      expect(dbRow).not.toBeNull();
      expect(dbRow!.listing_id).toBe(listingId);

      const storedGeo = dbRow!.geo as Record<string, unknown>;
      expect(storedGeo.lat).toBe(49.2827);
      expect(storedGeo.lng).toBe(-123.1207);
      expect(storedGeo.confidence).toBe(0.95);

      // Assert Layer 3: Side effect — enrich_status reflects geo success
      const status = dbRow!.enrich_status as Record<string, string>;
      expect(status.geo).toBe("ok");
    });

    it("REQ-WORKFLOW-004 TC-WP-031: listing_enrichment enrich_status tracks per-source status @p1", async () => {
      // Arrange: create a listing
      const listing = await insertListing();
      const listingId = listing.id as string;

      const enrichStatus = {
        geo: "ok",
        ltsa: "skipped",
        parcel: "skipped",
        assessment: "pending",
      };

      // Act: upsert enrichment with mixed status
      const enrichment = await insertListingEnrichment(listingId, {
        enrich_status: enrichStatus,
      });

      // Assert Layer 1: Response — created
      expect(enrichment).not.toBeNull();

      // Assert Layer 2: DB state — each source status tracked independently
      const { data: dbRow, error } = await admin
        .from("listing_enrichment")
        .select("enrich_status")
        .eq("id", enrichment.id as string)
        .single();

      expect(error).toBeNull();
      const status = dbRow!.enrich_status as Record<string, string>;
      expect(status.geo).toBe("ok");
      expect(status.ltsa).toBe("skipped");
      expect(status.parcel).toBe("skipped");
      expect(status.assessment).toBe("pending");

      // Assert Layer 3: Side effect — update a single source status
      const { error: updateError } = await admin
        .from("listing_enrichment")
        .update({
          enrich_status: { ...status, assessment: "ok" },
        })
        .eq("id", enrichment.id as string);

      expect(updateError).toBeNull();

      // Verify the update
      const { data: updated } = await admin
        .from("listing_enrichment")
        .select("enrich_status")
        .eq("id", enrichment.id as string)
        .single();

      const updatedStatus = updated!.enrich_status as Record<string, string>;
      expect(updatedStatus.assessment).toBe("ok");
      expect(updatedStatus.geo).toBe("ok"); // unchanged
    });
  });
});
