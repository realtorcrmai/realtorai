/**
 * Test Data Factories — Faker-based generators for Realtors360 entities
 *
 * Each factory produces realistic, randomized test data.
 * Use `seed()` from db helpers to persist. Use directly for unit/component tests.
 *
 * All factories produce data scoped to a `realtorId` for tenant isolation.
 */

import { faker } from "@faker-js/faker";

// ── Contacts ────────────────────────────────────────────────

export function buildContact(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    phone: `+1604${faker.string.numeric(7)}`,
    email: faker.internet.email().toLowerCase(),
    type: faker.helpers.arrayElement(["buyer", "seller", "customer", "agent", "partner", "other"]),
    pref_channel: faker.helpers.arrayElement(["sms", "whatsapp"]),
    lifecycle_stage: faker.helpers.arrayElement([
      "prospect", "nurture", "active_buyer", "active_seller",
      "dual_client", "under_contract", "closed", "past_client",
    ]),
    lead_status: faker.helpers.arrayElement(["new", "qualified", "active", "under_contract", "closed"]),
    notes: faker.lorem.sentence(),
    casl_consent_given: faker.datatype.boolean(),
    tags: JSON.stringify([faker.word.noun(), faker.word.adjective()]),
    is_sample: true,
    created_at: faker.date.recent({ days: 30 }).toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ── Listings ────────────────────────────────────────────────

export function buildListing(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.string.uuid(),
    address: `${faker.location.streetAddress()}, ${faker.location.city()}, BC`,
    property_type: faker.helpers.arrayElement([
      "Residential", "Condo/Apartment", "Townhouse", "Land", "Commercial", "Multi-Family",
    ]),
    status: faker.helpers.arrayElement(["active", "pending", "sold"]),
    list_price: faker.number.int({ min: 300000, max: 5000000 }),
    mls_number: `V${faker.string.numeric(7)}`,
    lockbox_code: faker.string.numeric(4),
    bedrooms: faker.number.int({ min: 1, max: 6 }),
    bathrooms: faker.number.int({ min: 1, max: 4 }),
    total_sqft: faker.number.int({ min: 500, max: 5000 }),
    year_built: faker.number.int({ min: 1960, max: 2025 }),
    hero_image_url: null,
    notes: faker.lorem.sentence(),
    is_sample: true,
    created_at: faker.date.recent({ days: 30 }).toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ── Showings (Appointments) ─────────────────────────────────

export function buildShowing(overrides: Record<string, unknown> = {}) {
  const startTime = faker.date.soon({ days: 7 });
  return {
    id: faker.string.uuid(),
    start_time: startTime.toISOString(),
    end_time: new Date(startTime.getTime() + 30 * 60 * 1000).toISOString(),
    status: faker.helpers.arrayElement(["requested", "confirmed", "denied", "cancelled", "completed"]),
    buyer_agent_name: faker.person.fullName(),
    buyer_agent_phone: `+1604${faker.string.numeric(7)}`,
    buyer_agent_email: faker.internet.email().toLowerCase(),
    buyer_agent_brokerage: faker.company.name(),
    notes: faker.lorem.sentence(),
    created_at: faker.date.recent({ days: 7 }).toISOString(),
    ...overrides,
  };
}

// ── Communications ──────────────────────────────────────────

export function buildCommunication(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.string.uuid(),
    direction: faker.helpers.arrayElement(["inbound", "outbound"]),
    channel: faker.helpers.arrayElement(["sms", "whatsapp", "email", "phone"]),
    body: faker.lorem.sentence(),
    created_at: faker.date.recent({ days: 14 }).toISOString(),
    ...overrides,
  };
}

// ── Notifications ───────────────────────────────────────────

export function buildNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.string.uuid(),
    type: faker.helpers.arrayElement(["speed_to_lead", "showing_request", "system", "reminder"]),
    title: faker.lorem.words(3),
    body: faker.lorem.sentence(),
    is_read: false,
    related_type: faker.helpers.arrayElement(["contact", "listing", "showing", null]),
    created_at: faker.date.recent({ days: 3 }).toISOString(),
    ...overrides,
  };
}

// ── Newsletters ─────────────────────────────────────────────

export function buildNewsletter(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.string.uuid(),
    subject: faker.lorem.words(5),
    status: faker.helpers.arrayElement(["draft", "pending_approval", "approved", "sent"]),
    template_type: faker.helpers.arrayElement([
      "new_listing", "market_update", "just_sold", "open_house",
      "neighbourhood_guide", "home_anniversary",
    ]),
    created_at: faker.date.recent({ days: 30 }).toISOString(),
    ...overrides,
  };
}

// ── Tasks ───────────────────────────────────────────────────

export function buildTask(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.string.uuid(),
    title: faker.lorem.words(4),
    status: faker.helpers.arrayElement(["pending", "in_progress", "completed"]),
    priority: faker.helpers.arrayElement(["low", "medium", "high", "urgent"]),
    category: faker.helpers.arrayElement(["general", "follow_up", "showing", "paperwork"]),
    due_date: faker.date.soon({ days: 14 }).toISOString().split("T")[0],
    created_at: faker.date.recent({ days: 7 }).toISOString(),
    ...overrides,
  };
}

// ── Seller Identities (FINTRAC) ─────────────────────────────

export function buildSellerIdentity(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.string.uuid(),
    full_name: faker.person.fullName(),
    dob: faker.date.birthdate({ min: 25, max: 75, mode: "age" }).toISOString().split("T")[0],
    citizenship: faker.helpers.arrayElement(["Canadian", "Permanent Resident", "Foreign National"]),
    id_type: faker.helpers.arrayElement(["passport", "drivers_license", "provincial_id"]),
    id_number: faker.string.alphanumeric(9).toUpperCase(),
    id_expiry: faker.date.future({ years: 5 }).toISOString().split("T")[0],
    ...overrides,
  };
}

// ── Batch builder ───────────────────────────────────────────

export function buildMany<T>(
  factory: (overrides?: Record<string, unknown>) => T,
  count: number,
  overrides: Record<string, unknown> = {}
): T[] {
  return Array.from({ length: count }, () => factory(overrides));
}
