/**
 * L4 Integration Tests — Listing Enrichment & Photo Storage (DB layer)
 *
 * Covers RTM gaps:
 *   REQ-LISTING-012  Photos linked to listing (listing_documents)
 *   REQ-WORKFLOW-004  Data enrichment JSONB round-trip (listing_enrichment)
 *   REQ-WORKFLOW-005  MLS remarks stored on listings
 *
 * Uses Supabase admin client. Env-gated — skips if vars missing.
 * All test data cleaned up in afterEach.
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

const TEST_PREFIX = "TEST_INTG_ENRICH";

// Track all created row IDs for cleanup
const createdListings: string[] = [];
const createdContacts: string[] = [];
const createdDocuments: string[] = [];
const createdEnrichments: string[] = [];

describe.skipIf(!enabled)("L4 Integration — Enrichment & Photos", () => {
  let admin: SupabaseClient;
  let REALTOR_A: string;

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Resolve real demo user ID
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
    // Clean up in dependency order: documents/enrichments → listings → contacts
    for (const id of createdDocuments) {
      await admin.from("listing_documents").delete().eq("id", id);
    }
    createdDocuments.length = 0;

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

  async function insertDocument(
    listingId: string,
    overrides: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>> {
    const id = (overrides.id as string) ?? crypto.randomUUID();
    const row = {
      id,
      listing_id: listingId,
      doc_type: "OTHER",
      file_name: `${TEST_PREFIX}_photo.jpg`,
      file_url: `https://storage.example.com/photos/${id}.jpg`,
      realtor_id: REALTOR_A,
      ...overrides,
    };

    const { data, error } = await admin
      .from("listing_documents")
      .upsert(row, { onConflict: "id" })
      .select()
      .single();

    if (error) throw new Error(`insertDocument failed: ${error.message}`);
    createdDocuments.push(data.id);
    return data;
  }

  // ─────────────────────────────────────────────────────────────
  // REQ-LISTING-012 — Photos linked to listing
  // ─────────────────────────────────────────────────────────────

  describe("REQ-LISTING-012 — Photos linked to listing", () => {
    it("REQ-LISTING-012 TC-PH-001: listing_documents insert with file_url links to listing @p1", async () => {
      // Arrange
      const listing = await insertListing();
      const listingId = listing.id as string;

      // Act: insert a document (photo) linked to the listing
      const doc = await insertDocument(listingId, {
        doc_type: "OTHER",
        file_name: `${TEST_PREFIX}_hero.jpg`,
        file_url: "https://storage.example.com/photos/hero.jpg",
      });

      // Assert Layer 1: Response — document created with correct fields
      expect(doc.listing_id).toBe(listingId);
      expect(doc.file_url).toBe("https://storage.example.com/photos/hero.jpg");
      expect(doc.file_name).toBe(`${TEST_PREFIX}_hero.jpg`);

      // Assert Layer 2: DB state — queryable by listing_id
      const { data: docs, error } = await admin
        .from("listing_documents")
        .select("id, listing_id, file_url, file_name, doc_type")
        .eq("listing_id", listingId)
        .eq("id", doc.id as string);

      expect(error).toBeNull();
      expect(docs).toHaveLength(1);
      expect(docs![0].listing_id).toBe(listingId);
      expect(docs![0].file_url).toBe("https://storage.example.com/photos/hero.jpg");

      // Assert Layer 3: Side effect — document appears in listing_documents for this listing
      const { count } = await admin
        .from("listing_documents")
        .select("id", { count: "exact", head: true })
        .eq("listing_id", listingId);

      expect(count).toBeGreaterThanOrEqual(1);
    });

    it("REQ-LISTING-012 TC-PH-002: listing_documents cascade delete when listing deleted @p1", async () => {
      // Arrange: create listing + document
      const listing = await insertListing();
      const listingId = listing.id as string;

      const doc = await insertDocument(listingId, {
        doc_type: "OTHER",
        file_name: `${TEST_PREFIX}_cascade.jpg`,
        file_url: "https://storage.example.com/photos/cascade.jpg",
      });
      const docId = doc.id as string;

      // Verify document exists before delete
      const { data: before } = await admin
        .from("listing_documents")
        .select("id")
        .eq("id", docId);

      expect(before).toHaveLength(1);

      // Act: delete the listing — FK CASCADE should remove the document
      const { error } = await admin
        .from("listings")
        .delete()
        .eq("id", listingId);

      expect(error).toBeNull();

      // Remove from cleanup arrays since they're already deleted
      const listingIdx = createdListings.indexOf(listingId);
      if (listingIdx !== -1) createdListings.splice(listingIdx, 1);
      const docIdx = createdDocuments.indexOf(docId);
      if (docIdx !== -1) createdDocuments.splice(docIdx, 1);

      // Assert Layer 2: DB state — document no longer exists
      const { data: after, error: afterError } = await admin
        .from("listing_documents")
        .select("id")
        .eq("id", docId);

      expect(afterError).toBeNull();
      expect(after).toEqual([]);

      // Assert Layer 3: listing itself is gone
      const { data: listingAfter } = await admin
        .from("listings")
        .select("id")
        .eq("id", listingId);

      expect(listingAfter).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // REQ-WORKFLOW-004 — Data enrichment JSONB round-trip
  // ─────────────────────────────────────────────────────────────

  describe("REQ-WORKFLOW-004 — Data enrichment", () => {
    it("REQ-WORKFLOW-004 TC-EN-001: listing_enrichment upsert with geo JSONB stores complex nested data @p1", async () => {
      // Arrange
      const listing = await insertListing();
      const listingId = listing.id as string;

      const geoData = {
        lat: 49.2827,
        lng: -123.1207,
        formatted_address: "123 Main St, Vancouver, BC V6A 1A1",
        address_components: {
          street_number: "123",
          street_name: "Main St",
          city: "Vancouver",
          province: "BC",
          postal_code: "V6A 1A1",
          country: "Canada",
        },
        confidence: 0.98,
        source: "BC Geocoder",
      };

      const enrichmentId = crypto.randomUUID();

      // Act: upsert enrichment with realistic geo data
      const { data, error } = await admin
        .from("listing_enrichment")
        .upsert(
          {
            id: enrichmentId,
            listing_id: listingId,
            geo: geoData,
            enrich_status: { geo: "complete", parcel: "pending", ltsa: "not_started" },
            realtor_id: REALTOR_A,
          },
          { onConflict: "id" }
        )
        .select()
        .single();

      if (error) throw new Error(`insertEnrichment failed: ${error.message}`);
      createdEnrichments.push(data.id);

      // Assert Layer 1: Response — data returned with geo populated
      expect(data.listing_id).toBe(listingId);
      expect(data.geo).not.toBeNull();

      // Assert Layer 2: DB state — full JSONB round-trip with nested fields
      const { data: dbRow, error: readError } = await admin
        .from("listing_enrichment")
        .select("id, listing_id, geo, enrich_status")
        .eq("id", enrichmentId)
        .single();

      expect(readError).toBeNull();
      expect(dbRow).not.toBeNull();

      const geo = dbRow!.geo as typeof geoData;
      expect(geo.lat).toBe(49.2827);
      expect(geo.lng).toBe(-123.1207);
      expect(geo.formatted_address).toBe("123 Main St, Vancouver, BC V6A 1A1");
      expect(geo.address_components.city).toBe("Vancouver");
      expect(geo.address_components.postal_code).toBe("V6A 1A1");
      expect(geo.confidence).toBe(0.98);
      expect(geo.source).toBe("BC Geocoder");

      // Assert Layer 3: enrich_status JSONB also round-trips
      const status = dbRow!.enrich_status as Record<string, string>;
      expect(status.geo).toBe("complete");
      expect(status.parcel).toBe("pending");
      expect(status.ltsa).toBe("not_started");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // REQ-WORKFLOW-005 — MLS remarks stored on listings
  // ─────────────────────────────────────────────────────────────

  describe("REQ-WORKFLOW-005 — MLS remarks", () => {
    it("REQ-WORKFLOW-005 TC-MR-DB-001: listings table stores mls_remarks and mls_realtor_remarks @p0", async () => {
      // Arrange
      const listing = await insertListing();
      const listingId = listing.id as string;

      // Act: update with MLS remarks (columns from migration 080)
      const { error: updateError } = await admin
        .from("listings")
        .update({
          mls_remarks: "Stunning 3BR home in heart of Kitsilano. Open floor plan, hardwood floors, updated kitchen.",
          mls_realtor_remarks: "Seller motivated. Offers reviewed Tuesday. Lockbox on front gate. Remove shoes.",
        })
        .eq("id", listingId);

      // Assert Layer 1: Response — no error on update
      expect(updateError).toBeNull();

      // Assert Layer 2: DB state — both fields persisted and queryable
      const { data: dbRow, error: readError } = await admin
        .from("listings")
        .select("id, mls_remarks, mls_realtor_remarks")
        .eq("id", listingId)
        .single();

      expect(readError).toBeNull();
      expect(dbRow).not.toBeNull();
      expect(dbRow!.mls_remarks).toBe(
        "Stunning 3BR home in heart of Kitsilano. Open floor plan, hardwood floors, updated kitchen."
      );
      expect(dbRow!.mls_realtor_remarks).toBe(
        "Seller motivated. Offers reviewed Tuesday. Lockbox on front gate. Remove shoes."
      );

      // Assert Layer 3: Side effect — fields are independently queryable via filter
      const { data: filtered } = await admin
        .from("listings")
        .select("id")
        .eq("id", listingId)
        .not("mls_remarks", "is", null);

      expect(filtered).toHaveLength(1);
      expect(filtered![0].id).toBe(listingId);
    });
  });
});
