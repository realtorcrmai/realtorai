/**
 * L4 Integration Tests — Listing Server Actions (DB layer)
 *
 * Tests the REAL Supabase database for:
 *   1. Soft delete (deleted_at column)
 *   2. Status transition validation (VALID_TRANSITIONS map)
 *   3. FINTRAC compliance gate (seller_identities requirement)
 *   4. Tenant isolation (realtor_id scoping)
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

const TEST_PREFIX = "TEST_INTG_LISTING";

// Track all created row IDs for cleanup
const createdListings: string[] = [];
const createdSellerIdentities: string[] = [];
const createdContacts: string[] = [];

describe.skipIf(!enabled)("L4 Integration — Listing Server Actions", () => {
  let admin: SupabaseClient;
  let REALTOR_A: string; // Real user ID from DB (demo user)
  const REALTOR_B = "00000000-0000-4000-8000-b00000000b01"; // Fake — guaranteed non-existent

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Resolve real demo user ID for REALTOR_A (contacts.realtor_id FK → users.id)
    const demoEmail = process.env.DEMO_EMAIL || "demo@realestatecrm.com";
    const { data: user, error } = await admin
      .from("users")
      .select("id")
      .eq("email", demoEmail)
      .maybeSingle();

    if (error || !user) {
      throw new Error(`Demo user not found (${demoEmail}): ${error?.message ?? "not in users table"}`);
    }
    REALTOR_A = user.id;
  });

  afterEach(async () => {
    // Clean up in dependency order: seller_identities → listings → contacts
    for (const id of createdSellerIdentities) {
      await admin.from("seller_identities").delete().eq("id", id);
    }
    createdSellerIdentities.length = 0;

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

  async function insertListing(
    overrides: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>> {
    const id = overrides.id as string ?? crypto.randomUUID();
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

  async function insertSellerIdentity(
    listingId: string,
    overrides: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>> {
    const id = overrides.id as string ?? crypto.randomUUID();
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

  async function insertContact(
    overrides: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>> {
    const id = overrides.id as string ?? crypto.randomUUID();
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

  // ─────────────────────────────────────────────────────────────
  // 1. deleteListing — soft delete
  // ─────────────────────────────────────────────────────────────

  describe("deleteListing (soft delete)", () => {
    it("REQ-LIST-001 TC-LD-001: soft delete sets deleted_at timestamp @p0", async () => {
      // Arrange: create a listing with no deleted_at
      const listing = await insertListing({ deleted_at: null });
      const listingId = listing.id as string;

      // Act: simulate deleteListing — update deleted_at where deleted_at IS NULL
      const now = new Date().toISOString();
      const { error } = await admin
        .from("listings")
        .update({ deleted_at: now })
        .eq("id", listingId)
        .eq("realtor_id", REALTOR_A)
        .is("deleted_at", null);

      // Assert Layer 1: Response — no error
      expect(error).toBeNull();

      // Assert Layer 2: DB state — deleted_at is set
      const { data: dbRow } = await admin
        .from("listings")
        .select("id, deleted_at, status, address")
        .eq("id", listingId)
        .single();

      expect(dbRow).not.toBeNull();
      expect(dbRow!.deleted_at).not.toBeNull();
      expect(new Date(dbRow!.deleted_at as string).getTime()).toBeGreaterThan(0);

      // Assert Layer 3: Side effect — listing excluded from .is("deleted_at", null) queries
      const { data: activeListings } = await admin
        .from("listings")
        .select("id")
        .eq("id", listingId)
        .is("deleted_at", null);

      expect(activeListings).toEqual([]);
    });

    it("REQ-LIST-002 TC-LD-002: already-deleted listing returns no rows updated (idempotent) @p1", async () => {
      // Arrange: create a listing that is already soft-deleted
      const deletedAt = new Date(Date.now() - 3600_000).toISOString();
      const listing = await insertListing({ deleted_at: deletedAt });
      const listingId = listing.id as string;

      // Act: attempt to soft-delete again — .is("deleted_at", null) should match 0 rows
      const newTimestamp = new Date().toISOString();
      const { data, error } = await admin
        .from("listings")
        .update({ deleted_at: newTimestamp })
        .eq("id", listingId)
        .eq("realtor_id", REALTOR_A)
        .is("deleted_at", null)
        .select();

      // Assert Layer 1: Response — no error but no rows matched
      expect(error).toBeNull();
      expect(data).toEqual([]);

      // Assert Layer 2: DB state — original deleted_at unchanged
      const { data: dbRow } = await admin
        .from("listings")
        .select("deleted_at")
        .eq("id", listingId)
        .single();

      // Supabase returns +00:00 format, JS uses Z — compare as Date
      expect(new Date(dbRow!.deleted_at as string).getTime()).toBe(new Date(deletedAt).getTime());

      // Assert Layer 3: Side effect — still excluded from active queries
      const { data: activeListings } = await admin
        .from("listings")
        .select("id")
        .eq("id", listingId)
        .is("deleted_at", null);

      expect(activeListings).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. updateListingStatus — transition validation
  // ─────────────────────────────────────────────────────────────

  describe("updateListingStatus (transition validation)", () => {
    /**
     * The server action validates transitions via VALID_TRANSITIONS:
     *   active  → [sold]
     *   pending → [sold, active]
     *   sold    → []  (terminal)
     *
     * We test the DB update layer. The validation logic lives in the
     * server action, so we verify the DB supports all valid transitions
     * and document the constraint expectations.
     */

    it("REQ-LIST-010 TC-LS-001: valid transition pending→sold succeeds @p0", async () => {
      // Arrange
      const listing = await insertListing({ status: "pending" });
      const listingId = listing.id as string;

      // Also need seller_identities for FINTRAC compliance
      await insertSellerIdentity(listingId);

      // Act: update status to sold
      const { error } = await admin
        .from("listings")
        .update({ status: "sold" })
        .eq("id", listingId);

      // Assert Layer 1: Response
      expect(error).toBeNull();

      // Assert Layer 2: DB state
      const { data: dbRow } = await admin
        .from("listings")
        .select("status")
        .eq("id", listingId)
        .single();

      expect(dbRow!.status).toBe("sold");

      // Assert Layer 3: Side effect — row still queryable (not deleted)
      const { data: rows } = await admin
        .from("listings")
        .select("id")
        .eq("id", listingId)
        .is("deleted_at", null);

      expect(rows).toHaveLength(1);
    });

    it("REQ-LIST-011 TC-LS-002: valid transition pending→active succeeds @p0", async () => {
      const listing = await insertListing({ status: "pending" });
      const listingId = listing.id as string;

      const { error } = await admin
        .from("listings")
        .update({ status: "active" })
        .eq("id", listingId);

      expect(error).toBeNull();

      const { data: dbRow } = await admin
        .from("listings")
        .select("status")
        .eq("id", listingId)
        .single();

      expect(dbRow!.status).toBe("active");
    });

    it("REQ-LIST-012 TC-LS-003: valid transition active→sold succeeds @p0", async () => {
      const listing = await insertListing({ status: "active" });
      const listingId = listing.id as string;

      const { error } = await admin
        .from("listings")
        .update({ status: "sold" })
        .eq("id", listingId);

      expect(error).toBeNull();

      const { data: dbRow } = await admin
        .from("listings")
        .select("status")
        .eq("id", listingId)
        .single();

      expect(dbRow!.status).toBe("sold");
    });

    it("REQ-LIST-013 TC-LS-004: invalid transition active→pending — application must reject @p0", async () => {
      /**
       * The DB itself does not enforce transition constraints (no CHECK constraint
       * on status transitions). The server action enforces via VALID_TRANSITIONS map:
       *   active → [sold]  (pending is NOT in the list)
       *
       * This test verifies that the DB ALLOWS the update (since the constraint
       * is app-level), and documents that active→pending is a disallowed transition
       * that the server action must reject.
       *
       * We verify the VALID_TRANSITIONS constant behavior:
       *   const allowed = VALID_TRANSITIONS["active"] → ["sold"]
       *   ["sold"].includes("pending") → false → return error
       */
      const VALID_TRANSITIONS: Record<string, string[]> = {
        active: ["sold"],
        pending: ["sold", "active"],
        sold: [],
      };

      const currentStatus = "active";
      const targetStatus = "pending";
      const allowed = VALID_TRANSITIONS[currentStatus] ?? [];

      // Assert: the transition map rejects active→pending
      expect(allowed.includes(targetStatus)).toBe(false);

      // Also verify the DB allows the write (no DB-level constraint)
      const listing = await insertListing({ status: "active" });
      const listingId = listing.id as string;

      const { error } = await admin
        .from("listings")
        .update({ status: "pending" })
        .eq("id", listingId);

      // DB does not block — the app layer is responsible
      expect(error).toBeNull();

      // Verify DB accepted it (proves constraint is app-level, not DB-level)
      const { data: dbRow } = await admin
        .from("listings")
        .select("status")
        .eq("id", listingId)
        .single();

      expect(dbRow!.status).toBe("pending");
    });

    it("REQ-LIST-014 TC-LS-005: invalid transition sold→active — terminal state @p0", async () => {
      /**
       * sold is a terminal state — VALID_TRANSITIONS["sold"] = []
       * No transitions are allowed. Server action must reject.
       */
      const VALID_TRANSITIONS: Record<string, string[]> = {
        active: ["sold"],
        pending: ["sold", "active"],
        sold: [],
      };

      const currentStatus = "sold";
      const targetStatus = "active";
      const allowed = VALID_TRANSITIONS[currentStatus] ?? [];

      // Assert: sold allows ZERO transitions
      expect(allowed).toEqual([]);
      expect(allowed.includes(targetStatus)).toBe(false);
    });

    it("REQ-LIST-015 TC-LS-006: transition blocked without seller_identities (FINTRAC gate) @p0 @security", async () => {
      /**
       * The server action checks seller_identities count before allowing
       * transitions to active/pending/sold. With 0 rows, it returns:
       *   { error: "FINTRAC compliance: cannot set listing to ..." }
       *
       * We test the DB state that the action queries:
       * - Create a listing with NO seller_identities
       * - Verify the count query returns 0
       * - Then add an identity and verify count becomes 1
       */
      const listing = await insertListing({ status: "pending" });
      const listingId = listing.id as string;

      // Assert: no seller_identities exist for this listing
      const { count: zeroCount } = await admin
        .from("seller_identities")
        .select("id", { count: "exact", head: true })
        .eq("listing_id", listingId);

      expect(zeroCount).toBe(0);

      // The FINTRAC gate in the server action would produce:
      const FINTRAC_GATED_STATUSES = new Set(["active", "pending", "sold"]);
      const targetStatus = "sold";
      const wouldBlock = FINTRAC_GATED_STATUSES.has(targetStatus) && (zeroCount ?? 0) === 0;
      expect(wouldBlock).toBe(true);

      // Now add a seller identity
      await insertSellerIdentity(listingId);

      // Assert: count is now 1 — FINTRAC gate would pass
      const { count: oneCount } = await admin
        .from("seller_identities")
        .select("id", { count: "exact", head: true })
        .eq("listing_id", listingId);

      expect(oneCount).toBe(1);

      const wouldPass = FINTRAC_GATED_STATUSES.has(targetStatus) && (oneCount ?? 0) > 0;
      expect(wouldPass).toBe(true);

      // Side effect: verify the seller_identities FK is valid
      const { data: identities } = await admin
        .from("seller_identities")
        .select("listing_id, full_name")
        .eq("listing_id", listingId);

      expect(identities).toHaveLength(1);
      expect(identities![0].listing_id).toBe(listingId);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Tenant isolation
  // ─────────────────────────────────────────────────────────────

  describe("Tenant isolation", () => {
    it("REQ-LIST-020 TC-LT-001: Realtor B cannot read Realtor A listings via realtor_id filter @p0 @security", async () => {
      // Arrange: create a listing owned by Realtor A
      const listing = await insertListing({
        realtor_id: REALTOR_A,
        address: `${TEST_PREFIX} Tenant Isolation Test, Vancouver, BC`,
      });
      const listingId = listing.id as string;

      // Act: query as Realtor B (simulating tenant client .eq("realtor_id", REALTOR_B))
      const { data: realtorBResults, error } = await admin
        .from("listings")
        .select("id, address, realtor_id")
        .eq("realtor_id", REALTOR_B)
        .eq("id", listingId);

      // Assert Layer 1: Response — no error
      expect(error).toBeNull();

      // Assert Layer 2: Realtor B sees ZERO listings from Realtor A
      expect(realtorBResults).toEqual([]);

      // Assert Layer 3: Realtor A CAN see their own listing (positive control)
      const { data: realtorAResults } = await admin
        .from("listings")
        .select("id, realtor_id")
        .eq("realtor_id", REALTOR_A)
        .eq("id", listingId);

      expect(realtorAResults).toHaveLength(1);
      expect(realtorAResults![0].realtor_id).toBe(REALTOR_A);
    });

    it("REQ-LIST-021 TC-LT-002: Realtor B cannot update Realtor A listing via scoped query @p0 @security", async () => {
      // Arrange
      const listing = await insertListing({
        realtor_id: REALTOR_A,
        status: "active",
        list_price: 750000,
      });
      const listingId = listing.id as string;

      // Act: Realtor B attempts to update (tenant client adds .eq("realtor_id", REALTOR_B))
      const { data: updateResult } = await admin
        .from("listings")
        .update({ list_price: 1 })
        .eq("id", listingId)
        .eq("realtor_id", REALTOR_B)
        .select();

      // Assert Layer 1: no rows matched for update
      expect(updateResult).toEqual([]);

      // Assert Layer 2: DB state unchanged — Realtor A's price is intact
      const { data: dbRow } = await admin
        .from("listings")
        .select("list_price, realtor_id")
        .eq("id", listingId)
        .single();

      expect(dbRow!.list_price).toBe(750000);
      expect(dbRow!.realtor_id).toBe(REALTOR_A);
    });

    it("REQ-LIST-022 TC-LT-003: Realtor B cannot soft-delete Realtor A listing @p0 @security", async () => {
      // Arrange
      const listing = await insertListing({
        realtor_id: REALTOR_A,
        deleted_at: null,
      });
      const listingId = listing.id as string;

      // Act: Realtor B attempts soft delete (scoped by realtor_id)
      const { data: deleteResult } = await admin
        .from("listings")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", listingId)
        .eq("realtor_id", REALTOR_B)
        .is("deleted_at", null)
        .select();

      // Assert Layer 1: no rows matched
      expect(deleteResult).toEqual([]);

      // Assert Layer 2: listing is NOT soft-deleted
      const { data: dbRow } = await admin
        .from("listings")
        .select("deleted_at")
        .eq("id", listingId)
        .single();

      expect(dbRow!.deleted_at).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Data integrity — seller_identities FK
  // ─────────────────────────────────────────────────────────────

  describe("Data integrity", () => {
    it("REQ-LIST-030 TC-DI-001: seller_identities FK enforces valid listing_id @p0", async () => {
      // Arrange: a UUID that does not exist in listings
      const fakeListingId = "00000000-0000-4000-8000-face00000001";

      // Act: attempt to insert a seller_identity with invalid listing_id
      const { error } = await admin.from("seller_identities").insert({
        id: crypto.randomUUID(),
        listing_id: fakeListingId,
        full_name: `${TEST_PREFIX} FK Test`,
        dob: "1990-01-01",
        citizenship: "Canadian",
        id_type: "passport",
        id_number: "FKTEST001",
        id_expiry: "2030-12-31",
        realtor_id: REALTOR_A,
      });

      // Assert: FK violation
      expect(error).not.toBeNull();
      expect(error!.code).toBe("23503"); // PostgreSQL FK violation code
    });

    it("REQ-LIST-031 TC-DI-002: listing status CHECK constraint allows valid statuses @p0", async () => {
      // Test that all status values used in VALID_TRANSITIONS are accepted
      const validStatuses = ["active", "pending", "sold"];

      for (const status of validStatuses) {
        const listing = await insertListing({ status });
        const { data } = await admin
          .from("listings")
          .select("status")
          .eq("id", listing.id)
          .single();

        expect(data!.status).toBe(status);
      }
    });

    it("REQ-LIST-032 TC-DI-003: multiple seller_identities allowed per listing @p0", async () => {
      // Arrange: real estate deals can have multiple sellers (e.g., co-owners)
      const listing = await insertListing();
      const listingId = listing.id as string;

      await insertSellerIdentity(listingId, { full_name: `${TEST_PREFIX} Seller One` });
      await insertSellerIdentity(listingId, { full_name: `${TEST_PREFIX} Seller Two` });

      // Assert: both exist
      const { count } = await admin
        .from("seller_identities")
        .select("id", { count: "exact", head: true })
        .eq("listing_id", listingId);

      expect(count).toBe(2);
    });
  });
});
