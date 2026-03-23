import { describe, it, expect } from "vitest";
import {
  WORKFLOW_BLUEPRINTS,
  WORKFLOW_ACTION_TYPES,
  ACTION_TYPE_LABELS,
  ACTION_TYPE_ICONS,
  ACTION_TYPE_COLORS,
  WORKFLOW_STAGE_MAP,
  TEMPLATE_CATEGORIES,
  TEMPLATE_CATEGORY_LABELS,
  TEMPLATE_VARIABLES,
  ENROLLMENT_STATUSES,
  ENROLLMENT_STATUS_COLORS,
  WORKFLOW_TRIGGER_TYPES,
  TRIGGER_TYPE_LABELS,
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_COLORS,
  getWorkflowBlueprint,
  calculateWorkflowDuration,
  formatDelay,
  type WorkflowStepBlueprint,
} from "./workflows";

describe("WORKFLOW_BLUEPRINTS", () => {
  it("has exactly 7 workflows", () => {
    expect(WORKFLOW_BLUEPRINTS).toHaveLength(7);
  });

  it("each blueprint has slug, name, icon, description, and steps", () => {
    for (const bp of WORKFLOW_BLUEPRINTS) {
      expect(bp.slug).toBeTruthy();
      expect(bp.name).toBeTruthy();
      expect(bp.icon).toBeTruthy();
      expect(bp.description).toBeTruthy();
      expect(Array.isArray(bp.steps)).toBe(true);
      expect(bp.steps.length).toBeGreaterThan(0);
    }
  });

  it("all blueprint slugs are unique", () => {
    const slugs = WORKFLOW_BLUEPRINTS.map((bp) => bp.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("contains the expected workflow slugs", () => {
    const slugs = WORKFLOW_BLUEPRINTS.map((bp) => bp.slug);
    expect(slugs).toContain("speed_to_contact");
    expect(slugs).toContain("buyer_nurture");
    expect(slugs).toContain("post_close_buyer");
    expect(slugs).toContain("post_close_seller");
    expect(slugs).toContain("lead_reengagement");
    expect(slugs).toContain("open_house_followup");
    expect(slugs).toContain("referral_partner");
  });
});

describe("getWorkflowBlueprint", () => {
  it("returns correct workflow by slug", () => {
    const bp = getWorkflowBlueprint("speed_to_contact");
    expect(bp).toBeDefined();
    expect(bp!.name).toBe("Lead Speed-to-Contact");
  });

  it("returns correct workflow for buyer_nurture", () => {
    const bp = getWorkflowBlueprint("buyer_nurture");
    expect(bp).toBeDefined();
    expect(bp!.name).toBe("Buyer Nurture Plan");
  });

  it("returns undefined for unknown slug", () => {
    expect(getWorkflowBlueprint("nonexistent")).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(getWorkflowBlueprint("")).toBeUndefined();
  });
});

describe("calculateWorkflowDuration", () => {
  it("returns 0 for steps with no waits", () => {
    const steps: WorkflowStepBlueprint[] = [
      { name: "Send email", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
    ];
    expect(calculateWorkflowDuration(steps)).toBe(0);
  });

  it("calculates days correctly from day waits", () => {
    const steps: WorkflowStepBlueprint[] = [
      { name: "Wait 3 days", action_type: "wait", delay_value: 3, delay_unit: "days" },
      { name: "Wait 7 days", action_type: "wait", delay_value: 7, delay_unit: "days" },
    ];
    expect(calculateWorkflowDuration(steps)).toBe(10);
  });

  it("calculates days correctly from hour waits", () => {
    const steps: WorkflowStepBlueprint[] = [
      { name: "Wait 48 hours", action_type: "wait", delay_value: 48, delay_unit: "hours" },
    ];
    expect(calculateWorkflowDuration(steps)).toBe(2);
  });

  it("rounds up partial days", () => {
    const steps: WorkflowStepBlueprint[] = [
      { name: "Wait 25 hours", action_type: "wait", delay_value: 25, delay_unit: "hours" },
    ];
    // 25 hours = 1500 minutes, 1500/1440 = 1.04... -> ceil = 2
    expect(calculateWorkflowDuration(steps)).toBe(2);
  });

  it("handles minute delays", () => {
    const steps: WorkflowStepBlueprint[] = [
      { name: "Wait 5 min", action_type: "wait", delay_value: 5, delay_unit: "minutes" },
    ];
    // 5 minutes -> ceil(5/1440) = 1
    expect(calculateWorkflowDuration(steps)).toBe(1);
  });

  it("only counts wait steps, ignoring other action types", () => {
    const steps: WorkflowStepBlueprint[] = [
      { name: "Send email", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      { name: "Wait 1 day", action_type: "wait", delay_value: 1, delay_unit: "days" },
      { name: "Manual task", action_type: "manual_task", delay_value: 0, delay_unit: "minutes" },
    ];
    expect(calculateWorkflowDuration(steps)).toBe(1);
  });
});

describe("formatDelay", () => {
  it("returns 'Immediate' for value 0", () => {
    expect(formatDelay(0, "minutes")).toBe("Immediate");
    expect(formatDelay(0, "hours")).toBe("Immediate");
    expect(formatDelay(0, "days")).toBe("Immediate");
  });

  it("formats minutes under 60", () => {
    expect(formatDelay(5, "minutes")).toBe("5 min");
    expect(formatDelay(30, "minutes")).toBe("30 min");
  });

  it("formats singular hour", () => {
    expect(formatDelay(1, "hours")).toBe("1 hour");
  });

  it("formats plural hours", () => {
    expect(formatDelay(4, "hours")).toBe("4 hours");
    expect(formatDelay(24, "hours")).toBe("24 hours");
  });

  it("formats singular day", () => {
    expect(formatDelay(1, "days")).toBe("1 day");
  });

  it("formats plural days", () => {
    expect(formatDelay(7, "days")).toBe("7 days");
    expect(formatDelay(30, "days")).toBe("30 days");
  });

  it("falls back to generic format for unknown units", () => {
    expect(formatDelay(10, "weeks")).toBe("10 weeks");
  });
});

describe("WORKFLOW_STAGE_MAP", () => {
  it("has entries for all 7 workflow slugs", () => {
    const expectedSlugs = [
      "speed_to_contact",
      "buyer_nurture",
      "post_close_buyer",
      "post_close_seller",
      "lead_reengagement",
      "open_house_followup",
      "referral_partner",
    ];
    for (const slug of expectedSlugs) {
      expect(WORKFLOW_STAGE_MAP[slug]).toBeDefined();
    }
  });

  it("each entry has buyer and seller properties", () => {
    for (const [, mapping] of Object.entries(WORKFLOW_STAGE_MAP)) {
      expect(mapping.buyer).toBeTruthy();
      expect(mapping.seller).toBeTruthy();
    }
  });
});

describe("ACTION_TYPE_LABELS", () => {
  it("has a label for every action type", () => {
    for (const type of WORKFLOW_ACTION_TYPES) {
      expect(ACTION_TYPE_LABELS[type]).toBeTruthy();
    }
  });

  it("maps auto_email to 'Auto Email'", () => {
    expect(ACTION_TYPE_LABELS.auto_email).toBe("Auto Email");
  });
});

describe("ACTION_TYPE_ICONS", () => {
  it("has an icon for every action type", () => {
    for (const type of WORKFLOW_ACTION_TYPES) {
      expect(ACTION_TYPE_ICONS[type]).toBeTruthy();
    }
  });
});

describe("ACTION_TYPE_COLORS", () => {
  it("has bg and text colors for every action type", () => {
    for (const type of WORKFLOW_ACTION_TYPES) {
      expect(ACTION_TYPE_COLORS[type].bg).toBeTruthy();
      expect(ACTION_TYPE_COLORS[type].text).toBeTruthy();
    }
  });
});

describe("TEMPLATE_CATEGORIES", () => {
  it("is a non-empty array", () => {
    expect(TEMPLATE_CATEGORIES.length).toBeGreaterThan(0);
  });

  it("includes expected categories", () => {
    expect(TEMPLATE_CATEGORIES).toContain("general");
    expect(TEMPLATE_CATEGORIES).toContain("nurture");
    expect(TEMPLATE_CATEGORIES).toContain("post_close");
    expect(TEMPLATE_CATEGORIES).toContain("follow_up");
  });

  it("has labels for all categories", () => {
    for (const cat of TEMPLATE_CATEGORIES) {
      expect(TEMPLATE_CATEGORY_LABELS[cat]).toBeTruthy();
    }
  });
});

describe("TEMPLATE_VARIABLES", () => {
  it("is a non-empty array", () => {
    expect(TEMPLATE_VARIABLES.length).toBeGreaterThan(0);
  });

  it("each variable has key, label, and example", () => {
    for (const v of TEMPLATE_VARIABLES) {
      expect(v.key).toBeTruthy();
      expect(v.label).toBeTruthy();
      expect(v.example).toBeTruthy();
    }
  });
});

describe("ENROLLMENT_STATUSES", () => {
  it("has colors for all enrollment statuses", () => {
    for (const status of ENROLLMENT_STATUSES) {
      expect(ENROLLMENT_STATUS_COLORS[status]).toBeTruthy();
    }
  });
});

describe("WORKFLOW_TRIGGER_TYPES", () => {
  it("has labels for all trigger types", () => {
    for (const type of WORKFLOW_TRIGGER_TYPES) {
      expect(TRIGGER_TYPE_LABELS[type]).toBeTruthy();
    }
  });
});

describe("NOTIFICATION_TYPES", () => {
  it("has colors for all notification types", () => {
    for (const type of NOTIFICATION_TYPES) {
      expect(NOTIFICATION_TYPE_COLORS[type]).toBeTruthy();
    }
  });
});
