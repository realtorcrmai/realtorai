import { describe, it, expect } from "vitest";
import {
  CONTACT_TYPES,
  CONTACT_TYPE_COLORS,
  CONTACT_TYPE_LABELS,
  BUYER_STAGES,
  SELLER_STAGES,
  STAGE_LABELS,
  STAGE_COLORS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  RELATIONSHIP_TYPES,
  RELATIONSHIP_TYPE_LABELS,
  RELATIONSHIP_INVERSE,
  PARTNER_TYPES,
  PARTNER_TYPE_LABELS,
  LEAD_SOURCES,
  CONTACT_TAGS,
  CONTACT_TAG_GROUPS,
  FINANCING_STATUSES,
  FINANCING_STATUS_LABELS,
} from "./contacts";

describe("CONTACT_TYPES", () => {
  it("has exactly 4 types", () => {
    expect(CONTACT_TYPES).toHaveLength(4);
  });

  it("contains buyer, seller, partner, other", () => {
    expect([...CONTACT_TYPES]).toEqual(["buyer", "seller", "partner", "other"]);
  });

  it("has a color mapping for every type", () => {
    for (const type of CONTACT_TYPES) {
      expect(CONTACT_TYPE_COLORS[type]).toBeDefined();
      expect(typeof CONTACT_TYPE_COLORS[type]).toBe("string");
    }
  });

  it("has a label for every type", () => {
    for (const type of CONTACT_TYPES) {
      expect(CONTACT_TYPE_LABELS[type]).toBeDefined();
    }
  });
});

describe("BUYER_STAGES", () => {
  it("has 6 stages", () => {
    expect(BUYER_STAGES).toHaveLength(6);
  });

  it("starts with 'new' and ends with 'cold'", () => {
    expect(BUYER_STAGES[0]).toBe("new");
    expect(BUYER_STAGES[BUYER_STAGES.length - 1]).toBe("cold");
  });
});

describe("SELLER_STAGES", () => {
  it("has 6 stages", () => {
    expect(SELLER_STAGES).toHaveLength(6);
  });

  it("contains 'active_listing' (not 'active_search')", () => {
    expect([...SELLER_STAGES]).toContain("active_listing");
    expect([...SELLER_STAGES]).not.toContain("active_search");
  });
});

describe("STAGE_LABELS", () => {
  it("maps all buyer stages", () => {
    for (const stage of BUYER_STAGES) {
      expect(STAGE_LABELS[stage]).toBeDefined();
      expect(typeof STAGE_LABELS[stage]).toBe("string");
    }
  });

  it("maps all seller stages", () => {
    for (const stage of SELLER_STAGES) {
      expect(STAGE_LABELS[stage]).toBeDefined();
    }
  });
});

describe("STAGE_COLORS", () => {
  it("provides bg, text, and dot for all buyer stages", () => {
    for (const stage of BUYER_STAGES) {
      const color = STAGE_COLORS[stage];
      expect(color).toBeDefined();
      expect(color).toHaveProperty("bg");
      expect(color).toHaveProperty("text");
      expect(color).toHaveProperty("dot");
    }
  });

  it("provides bg, text, and dot for all seller stages", () => {
    for (const stage of SELLER_STAGES) {
      const color = STAGE_COLORS[stage];
      expect(color).toBeDefined();
      expect(color).toHaveProperty("bg");
      expect(color).toHaveProperty("text");
      expect(color).toHaveProperty("dot");
    }
  });
});

describe("LEAD_STATUSES", () => {
  it("has 8 statuses", () => {
    expect(LEAD_STATUSES).toHaveLength(8);
  });

  it("has a label for every status", () => {
    for (const status of LEAD_STATUSES) {
      expect(LEAD_STATUS_LABELS[status]).toBeDefined();
      expect(typeof LEAD_STATUS_LABELS[status]).toBe("string");
    }
  });

  it("has a color mapping for every status", () => {
    for (const status of LEAD_STATUSES) {
      expect(LEAD_STATUS_COLORS[status]).toBeDefined();
    }
  });
});

describe("RELATIONSHIP_TYPES and RELATIONSHIP_INVERSE", () => {
  it("has 8 relationship types", () => {
    expect(RELATIONSHIP_TYPES).toHaveLength(8);
  });

  it("has a label for every relationship type", () => {
    for (const type of RELATIONSHIP_TYPES) {
      expect(RELATIONSHIP_TYPE_LABELS[type]).toBeDefined();
    }
  });

  it("has an inverse for every relationship type", () => {
    for (const type of RELATIONSHIP_TYPES) {
      expect(RELATIONSHIP_INVERSE[type]).toBeDefined();
      expect([...RELATIONSHIP_TYPES]).toContain(RELATIONSHIP_INVERSE[type]);
    }
  });

  it("inverse of inverse returns the original type", () => {
    for (const type of RELATIONSHIP_TYPES) {
      const inv = RELATIONSHIP_INVERSE[type];
      expect(RELATIONSHIP_INVERSE[inv]).toBe(type);
    }
  });

  it("symmetric types map to themselves", () => {
    const symmetric = ["spouse", "sibling", "friend", "colleague", "neighbour", "other"];
    for (const type of symmetric) {
      expect(RELATIONSHIP_INVERSE[type as keyof typeof RELATIONSHIP_INVERSE]).toBe(type);
    }
  });
});

describe("PARTNER_TYPES", () => {
  it("has 6 partner types", () => {
    expect(PARTNER_TYPES).toHaveLength(6);
  });

  it("has a label for every partner type", () => {
    for (const type of PARTNER_TYPES) {
      expect(PARTNER_TYPE_LABELS[type]).toBeDefined();
    }
  });
});

describe("LEAD_SOURCES", () => {
  it("has 12 lead sources", () => {
    expect(LEAD_SOURCES).toHaveLength(12);
  });

  it("includes common sources like Referral and Website", () => {
    expect([...LEAD_SOURCES]).toContain("Referral");
    expect([...LEAD_SOURCES]).toContain("Website");
  });
});

describe("CONTACT_TAGS and CONTACT_TAG_GROUPS", () => {
  it("all tags in groups are present in CONTACT_TAGS", () => {
    const allTags = [...CONTACT_TAGS] as string[];
    for (const tags of Object.values(CONTACT_TAG_GROUPS)) {
      for (const tag of tags) {
        expect(allTags).toContain(tag);
      }
    }
  });
});

describe("FINANCING_STATUSES", () => {
  it("has 3 statuses", () => {
    expect(FINANCING_STATUSES).toHaveLength(3);
  });

  it("has a label for every financing status", () => {
    for (const status of FINANCING_STATUSES) {
      expect(FINANCING_STATUS_LABELS[status]).toBeDefined();
    }
  });
});
