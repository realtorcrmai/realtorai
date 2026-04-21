/**
 * L4 Integration Tests — Newsletter Analytics & Post-Showing Feedback (DB layer)
 *
 * Covers RTM gaps:
 *   REQ-NEWSLETTER-005  Analytics tracked (newsletter_events)
 *   REQ-SHOWING-007     Post-showing feedback (communications + related_id)
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

const TEST_PREFIX = "TEST_INTG_NLANALYTICS";

// Track all created row IDs for cleanup
const createdContacts: string[] = [];
const createdListings: string[] = [];
const createdNewsletters: string[] = [];
const createdEvents: string[] = [];
const createdAppointments: string[] = [];
const createdCommunications: string[] = [];

describe.skipIf(!enabled)("L4 Integration — Newsletter Analytics & Feedback", () => {
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
    // Clean up in dependency order: events → newsletters → communications → appointments → listings → contacts
    for (const id of createdEvents) {
      await admin.from("newsletter_events").delete().eq("id", id);
    }
    createdEvents.length = 0;

    for (const id of createdNewsletters) {
      await admin.from("newsletters").delete().eq("id", id);
    }
    createdNewsletters.length = 0;

    for (const id of createdCommunications) {
      await admin.from("communications").delete().eq("id", id);
    }
    createdCommunications.length = 0;

    for (const id of createdAppointments) {
      await admin.from("appointments").delete().eq("id", id);
    }
    createdAppointments.length = 0;

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
      type: "buyer",
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

  async function insertNewsletter(
    contactId: string,
    overrides: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>> {
    const id = (overrides.id as string) ?? crypto.randomUUID();
    const row = {
      id,
      contact_id: contactId,
      email_type: "market_update",
      subject: `${TEST_PREFIX} Newsletter`,
      html_body: "<p>Test newsletter body</p>",
      status: "sent",
      sent_at: new Date().toISOString(),
      send_mode: "auto",
      realtor_id: REALTOR_A,
      is_sample: true,
      ...overrides,
    };

    const { data, error } = await admin
      .from("newsletters")
      .upsert(row, { onConflict: "id" })
      .select()
      .single();

    if (error) throw new Error(`insertNewsletter failed: ${error.message}`);
    createdNewsletters.push(data.id);
    return data;
  }

  async function insertNewsletterEvent(
    newsletterId: string,
    contactId: string,
    overrides: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>> {
    const id = (overrides.id as string) ?? crypto.randomUUID();
    const row = {
      id,
      newsletter_id: newsletterId,
      contact_id: contactId,
      event_type: "opened",
      realtor_id: REALTOR_A,
      ...overrides,
    };

    const { data, error } = await admin
      .from("newsletter_events")
      .upsert(row, { onConflict: "id" })
      .select()
      .single();

    if (error) throw new Error(`insertNewsletterEvent failed: ${error.message}`);
    createdEvents.push(data.id);
    return data;
  }

  async function insertAppointment(
    listingId: string,
    overrides: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>> {
    const id = (overrides.id as string) ?? crypto.randomUUID();
    const row = {
      id,
      listing_id: listingId,
      start_time: new Date(Date.now() + 3600_000).toISOString(),
      end_time: new Date(Date.now() + 7200_000).toISOString(),
      status: "confirmed",
      buyer_agent_name: `${TEST_PREFIX} Agent`,
      buyer_agent_phone: `+1604555${Math.floor(1000 + Math.random() * 9000)}`,
      realtor_id: REALTOR_A,
      ...overrides,
    };

    const { data, error } = await admin
      .from("appointments")
      .upsert(row, { onConflict: "id" })
      .select()
      .single();

    if (error) throw new Error(`insertAppointment failed: ${error.message}`);
    createdAppointments.push(data.id);
    return data;
  }

  async function insertCommunication(
    contactId: string,
    overrides: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>> {
    const id = (overrides.id as string) ?? crypto.randomUUID();
    const row = {
      id,
      contact_id: contactId,
      direction: "outbound",
      channel: "sms",
      body: `${TEST_PREFIX} message`,
      realtor_id: REALTOR_A,
      ...overrides,
    };

    const { data, error } = await admin
      .from("communications")
      .upsert(row, { onConflict: "id" })
      .select()
      .single();

    if (error) throw new Error(`insertCommunication failed: ${error.message}`);
    createdCommunications.push(data.id);
    return data;
  }

  // ─────────────────────────────────────────────────────────────
  // REQ-NEWSLETTER-005 — Analytics tracked
  // ─────────────────────────────────────────────────────────────

  describe("REQ-NEWSLETTER-005 — Analytics tracked", () => {
    it("REQ-NEWSLETTER-005 TC-NA-001: newsletter_events insert with event_type='opened' stores correctly @p0", async () => {
      // Arrange
      const contact = await insertContact();
      const contactId = contact.id as string;
      const newsletter = await insertNewsletter(contactId);
      const newsletterId = newsletter.id as string;

      // Act: insert an 'opened' event
      const event = await insertNewsletterEvent(newsletterId, contactId, {
        event_type: "opened",
      });

      // Assert Layer 1: Response — event created with correct fields
      expect(event.event_type).toBe("opened");
      expect(event.newsletter_id).toBe(newsletterId);
      expect(event.contact_id).toBe(contactId);

      // Assert Layer 2: DB state — queryable by newsletter_id
      const { data: dbRow, error } = await admin
        .from("newsletter_events")
        .select("id, newsletter_id, contact_id, event_type")
        .eq("id", event.id as string)
        .single();

      expect(error).toBeNull();
      expect(dbRow).not.toBeNull();
      expect(dbRow!.event_type).toBe("opened");
      expect(dbRow!.newsletter_id).toBe(newsletterId);
      expect(dbRow!.contact_id).toBe(contactId);

      // Assert Layer 3: Side effect — event appears in newsletter's event list
      const { count } = await admin
        .from("newsletter_events")
        .select("id", { count: "exact", head: true })
        .eq("newsletter_id", newsletterId);

      expect(count).toBeGreaterThanOrEqual(1);
    });

    it("REQ-NEWSLETTER-005 TC-NA-002: newsletter_events supports multiple event types @p1", async () => {
      // Arrange
      const contact = await insertContact();
      const contactId = contact.id as string;
      const newsletter = await insertNewsletter(contactId);
      const newsletterId = newsletter.id as string;

      // Act: insert 3 different event types for the same newsletter
      await insertNewsletterEvent(newsletterId, contactId, { event_type: "opened" });
      await insertNewsletterEvent(newsletterId, contactId, { event_type: "clicked" });
      await insertNewsletterEvent(newsletterId, contactId, { event_type: "bounced" });

      // Assert Layer 2: DB state — 3 distinct events exist
      const { data: events, error } = await admin
        .from("newsletter_events")
        .select("id, event_type")
        .eq("newsletter_id", newsletterId)
        .order("created_at", { ascending: true });

      expect(error).toBeNull();
      expect(events).toHaveLength(3);

      const eventTypes = events!.map((e) => e.event_type).sort();
      expect(eventTypes).toEqual(["bounced", "clicked", "opened"]);

      // Assert Layer 3: Side effect — count by event_type works
      const { count: openCount } = await admin
        .from("newsletter_events")
        .select("id", { count: "exact", head: true })
        .eq("newsletter_id", newsletterId)
        .eq("event_type", "opened");

      expect(openCount).toBe(1);

      const { count: totalCount } = await admin
        .from("newsletter_events")
        .select("id", { count: "exact", head: true })
        .eq("newsletter_id", newsletterId);

      expect(totalCount).toBe(3);
    });

    it("REQ-NEWSLETTER-005 TC-NA-003: newsletter_events link_url stored for click events @p1", async () => {
      // Arrange
      const contact = await insertContact();
      const contactId = contact.id as string;
      const newsletter = await insertNewsletter(contactId);
      const newsletterId = newsletter.id as string;

      // Act: insert a clicked event with link_url and link_type
      const event = await insertNewsletterEvent(newsletterId, contactId, {
        event_type: "clicked",
        link_url: "https://listings.example.com/property/123",
        link_type: "listing",
      });

      // Assert Layer 1: Response — link fields present
      expect(event.link_url).toBe("https://listings.example.com/property/123");
      expect(event.link_type).toBe("listing");

      // Assert Layer 2: DB state — link_url and link_type queryable
      const { data: dbRow, error } = await admin
        .from("newsletter_events")
        .select("id, event_type, link_url, link_type")
        .eq("id", event.id as string)
        .single();

      expect(error).toBeNull();
      expect(dbRow).not.toBeNull();
      expect(dbRow!.event_type).toBe("clicked");
      expect(dbRow!.link_url).toBe("https://listings.example.com/property/123");
      expect(dbRow!.link_type).toBe("listing");

      // Assert Layer 3: Side effect — filterable by link_type
      const { data: clickedListings } = await admin
        .from("newsletter_events")
        .select("id")
        .eq("newsletter_id", newsletterId)
        .eq("event_type", "clicked")
        .eq("link_type", "listing");

      expect(clickedListings).toHaveLength(1);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // REQ-SHOWING-007 — Post-showing feedback
  // ─────────────────────────────────────────────────────────────

  describe("REQ-SHOWING-007 — Post-showing feedback", () => {
    it("REQ-SHOWING-007 TC-FB-001: communications table stores feedback request with related_id pointing to appointment @p1", async () => {
      // Arrange: create listing + appointment
      const listing = await insertListing();
      const listingId = listing.id as string;

      const appointment = await insertAppointment(listingId, {
        status: "confirmed",
      });
      const appointmentId = appointment.id as string;

      // We need a contact for the communication
      const buyerContact = await insertContact({
        name: `${TEST_PREFIX} Buyer Agent`,
        type: "buyer",
      });
      const contactId = buyerContact.id as string;

      // Act: insert a feedback request communication linked to the appointment
      const comm = await insertCommunication(contactId, {
        direction: "outbound",
        channel: "sms",
        body: "Hi! How was your showing today? We'd love your feedback on the property at 123 Main St.",
        related_id: appointmentId,
      });

      // Assert Layer 1: Response — communication created with related_id
      expect(comm.related_id).toBe(appointmentId);
      expect(comm.direction).toBe("outbound");
      expect(comm.channel).toBe("sms");
      expect((comm.body as string).toLowerCase()).toContain("feedback");

      // Assert Layer 2: DB state — queryable by related_id
      const { data: dbRow, error } = await admin
        .from("communications")
        .select("id, contact_id, direction, channel, body, related_id")
        .eq("id", comm.id as string)
        .single();

      expect(error).toBeNull();
      expect(dbRow).not.toBeNull();
      expect(dbRow!.related_id).toBe(appointmentId);
      expect(dbRow!.contact_id).toBe(contactId);

      // Assert Layer 3: Side effect — communication findable via appointment lookup
      const { data: feedbackComms } = await admin
        .from("communications")
        .select("id, body")
        .eq("related_id", appointmentId);

      expect(feedbackComms).toHaveLength(1);
      expect((feedbackComms![0].body as string).toLowerCase()).toContain("feedback");
    });
  });
});
