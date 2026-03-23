import { describe, it, expect } from "vitest";

/**
 * Contact sorting by activity score, extracted from contacts/layout.tsx.
 * Tests the pure scoring and sorting logic.
 */

interface ContactSummary {
  id: string;
  name: string;
  last_activity_date: string | null;
  created_at: string;
}

interface CommRecord {
  contact_id: string;
}

interface TaskRecord {
  contact_id: string | null;
}

interface EnrollmentRecord {
  contact_id: string;
}

/**
 * Build activity scores the same way the layout does.
 */
function buildActivityScore(
  commCounts: CommRecord[],
  taskCounts: TaskRecord[],
  enrollCounts: EnrollmentRecord[],
): Record<string, number> {
  const activityScore: Record<string, number> = {};
  for (const c of commCounts) {
    activityScore[c.contact_id] = (activityScore[c.contact_id] || 0) + 1;
  }
  for (const t of taskCounts) {
    if (t.contact_id) activityScore[t.contact_id] = (activityScore[t.contact_id] || 0) + 1;
  }
  for (const e of enrollCounts) {
    activityScore[e.contact_id] = (activityScore[e.contact_id] || 0) + 2;
  }
  return activityScore;
}

/**
 * Sort contacts by activity score descending, then by date.
 */
function sortContacts(
  contacts: ContactSummary[],
  activityScore: Record<string, number>,
): ContactSummary[] {
  return [...contacts].sort((a, b) => {
    const scoreA = activityScore[a.id] || 0;
    const scoreB = activityScore[b.id] || 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    const dateA = a.last_activity_date || a.created_at;
    const dateB = b.last_activity_date || b.created_at;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });
}

describe("buildActivityScore", () => {
  it("counts communications as weight 1 each", () => {
    const scores = buildActivityScore(
      [{ contact_id: "C1" }, { contact_id: "C1" }, { contact_id: "C1" }],
      [],
      [],
    );
    expect(scores["C1"]).toBe(3);
  });

  it("counts tasks as weight 1 each", () => {
    const scores = buildActivityScore(
      [],
      [{ contact_id: "C1" }, { contact_id: "C1" }],
      [],
    );
    expect(scores["C1"]).toBe(2);
  });

  it("counts workflow enrollments as weight 2 each", () => {
    const scores = buildActivityScore(
      [],
      [],
      [{ contact_id: "C1" }],
    );
    expect(scores["C1"]).toBe(2);
  });

  it("score calculation is additive across all sources", () => {
    const scores = buildActivityScore(
      [{ contact_id: "C1" }, { contact_id: "C1" }], // +2
      [{ contact_id: "C1" }],                         // +1
      [{ contact_id: "C1" }],                         // +2
    );
    expect(scores["C1"]).toBe(5);
  });

  it("ignores tasks with null contact_id", () => {
    const scores = buildActivityScore(
      [],
      [{ contact_id: null }, { contact_id: "C1" }],
      [],
    );
    expect(scores["C1"]).toBe(1);
    expect(scores["null"]).toBeUndefined();
  });

  it("returns empty object for no activity", () => {
    const scores = buildActivityScore([], [], []);
    expect(Object.keys(scores)).toHaveLength(0);
  });
});

describe("sortContacts by activity score", () => {
  const makeContact = (id: string, lastActivity: string | null, created: string): ContactSummary => ({
    id,
    name: `Contact ${id}`,
    last_activity_date: lastActivity,
    created_at: created,
  });

  it("contacts with more communications rank higher", () => {
    const contacts = [
      makeContact("C1", null, "2026-01-01"),
      makeContact("C2", null, "2026-01-01"),
    ];
    const scores = buildActivityScore(
      [{ contact_id: "C2" }, { contact_id: "C2" }, { contact_id: "C2" }],
      [],
      [],
    );
    const sorted = sortContacts(contacts, scores);
    expect(sorted[0].id).toBe("C2");
  });

  it("contacts with more tasks rank higher", () => {
    const contacts = [
      makeContact("C1", null, "2026-01-01"),
      makeContact("C2", null, "2026-01-01"),
    ];
    const scores = buildActivityScore(
      [],
      [{ contact_id: "C2" }, { contact_id: "C2" }],
      [],
    );
    const sorted = sortContacts(contacts, scores);
    expect(sorted[0].id).toBe("C2");
  });

  it("workflow enrollments have 2x weight", () => {
    const contacts = [
      makeContact("C1", null, "2026-01-01"),
      makeContact("C2", null, "2026-01-01"),
    ];
    // C1 has 1 comm (score=1), C2 has 1 enrollment (score=2)
    const scores = buildActivityScore(
      [{ contact_id: "C1" }],
      [],
      [{ contact_id: "C2" }],
    );
    const sorted = sortContacts(contacts, scores);
    expect(sorted[0].id).toBe("C2");
  });

  it("tiebreaker uses last_activity_date", () => {
    const contacts = [
      makeContact("C1", "2026-03-01", "2026-01-01"),
      makeContact("C2", "2026-03-15", "2026-01-01"),
    ];
    // Same activity score
    const scores = buildActivityScore(
      [{ contact_id: "C1" }, { contact_id: "C2" }],
      [],
      [],
    );
    const sorted = sortContacts(contacts, scores);
    expect(sorted[0].id).toBe("C2"); // More recent last_activity_date
  });

  it("contacts with zero activity sort by created_at", () => {
    const contacts = [
      makeContact("C1", null, "2026-01-01"),
      makeContact("C2", null, "2026-03-01"),
    ];
    const scores = buildActivityScore([], [], []);
    const sorted = sortContacts(contacts, scores);
    expect(sorted[0].id).toBe("C2"); // More recently created
  });

  it("partners/other contacts can rank high with referrals (enrollments)", () => {
    const contacts = [
      makeContact("buyer1", null, "2026-01-01"),
      makeContact("partner1", null, "2026-01-01"),
    ];
    // Partner has 3 enrollments (score=6), buyer has 2 comms (score=2)
    const scores = buildActivityScore(
      [{ contact_id: "buyer1" }, { contact_id: "buyer1" }],
      [],
      [{ contact_id: "partner1" }, { contact_id: "partner1" }, { contact_id: "partner1" }],
    );
    const sorted = sortContacts(contacts, scores);
    expect(sorted[0].id).toBe("partner1");
  });
});
