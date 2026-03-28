import { BUYER_STAGES, SELLER_STAGES } from "@/lib/constants/contacts";

type ContactType = "buyer" | "seller" | "customer" | "agent" | "partner" | "other";

const BUYER_STAGE_SET = new Set<string>(BUYER_STAGES);
const SELLER_STAGE_SET = new Set<string>(SELLER_STAGES);

// Stages that must sync with lead_status
const STAGE_STATUS_SYNC: Record<string, string> = {
  closed: "closed",
  cold: "lost",
};
const STATUS_STAGE_SYNC: Record<string, string> = {
  closed: "closed",
  lost: "cold",
};

// Tags that conflict with certain statuses
const LOST_INCOMPATIBLE_TAGS = [
  "hot lead",
  "warm lead",
  "pre-approved",
  "under contract",
  "closing soon",
];

/**
 * Validate that a stage_bar value is valid for the contact type.
 * Returns the corrected stage, or null for partner/other.
 */
export function validateStageForType(
  type: ContactType,
  stage: string | null
): string | null {
  if (type === "partner" || type === "other")
    return stage === "cold" ? "cold" : null;
  if (!stage) return null;

  if (type === "buyer") {
    if (BUYER_STAGE_SET.has(stage)) return stage;
    // Auto-correct seller stages to buyer equivalents
    if (stage === "active_listing") return "active_search";
    return "new"; // fallback
  }

  if (type === "seller") {
    if (SELLER_STAGE_SET.has(stage)) return stage;
    if (stage === "active_search") return "active_listing";
    return "new";
  }

  return null;
}

/**
 * Sync lead_status and stage_bar bidirectionally.
 * If one changes, the other follows.
 */
export function syncLeadStatusAndStage(
  leadStatus: string,
  stageBar: string | null,
  type: ContactType
): { lead_status: string; stage_bar: string | null } {
  let syncedStatus = leadStatus;
  let syncedStage = stageBar;

  // stage → status sync
  if (syncedStage && STAGE_STATUS_SYNC[syncedStage]) {
    syncedStatus = STAGE_STATUS_SYNC[syncedStage];
  }

  // status → stage sync
  if (STATUS_STAGE_SYNC[syncedStatus]) {
    syncedStage = STATUS_STAGE_SYNC[syncedStatus];
  }

  // Validate stage for type
  syncedStage = validateStageForType(type, syncedStage);

  return { lead_status: syncedStatus, stage_bar: syncedStage };
}

/**
 * Filter out tags that are inappropriate for the contact's current state.
 */
export function filterInvalidTags(
  tags: string[],
  _type: ContactType,
  leadStatus: string
): string[] {
  let filtered = [...tags];

  // Lost/cold contacts can't have warm/hot tags
  if (leadStatus === "lost") {
    filtered = filtered.filter((t) => !LOST_INCOMPATIBLE_TAGS.includes(t));
  }

  return filtered;
}

/**
 * Master enforcement function. Takes the current contact and proposed updates,
 * returns a clean payload with all cross-field consistency enforced.
 */
export function enforceConsistency(
  current: {
    type: string;
    lead_status: string;
    stage_bar: string | null;
    tags: unknown;
  },
  updates: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...updates };

  // Determine the effective values after update
  const effectiveType = (result.type ?? current.type) as ContactType;
  const effectiveStatus = (result.lead_status ?? current.lead_status) as string;
  const effectiveStage = (
    result.stage_bar !== undefined ? result.stage_bar : current.stage_bar
  ) as string | null;
  const effectiveTags = (result.tags ?? current.tags ?? []) as string[];

  // 1. If type changed to partner/other, reset stage
  if (result.type && (result.type === "partner" || result.type === "other")) {
    result.stage_bar = null;
    result.lead_status = result.lead_status ?? current.lead_status;
  }

  // 2. If type changed from seller↔buyer, reset stage to "new" if current stage is invalid
  if (result.type && result.type !== current.type) {
    const validStage = validateStageForType(effectiveType, effectiveStage);
    if (validStage !== effectiveStage) {
      result.stage_bar = validStage;
    }
  }

  // 3. Validate stage for type
  if (result.stage_bar !== undefined) {
    result.stage_bar = validateStageForType(
      effectiveType,
      result.stage_bar as string | null
    );
  }

  // 4. Sync lead_status ↔ stage_bar
  if (result.lead_status !== undefined || result.stage_bar !== undefined) {
    const synced = syncLeadStatusAndStage(
      (result.lead_status ?? current.lead_status) as string,
      (result.stage_bar !== undefined
        ? result.stage_bar
        : current.stage_bar) as string | null,
      effectiveType
    );
    if (
      result.lead_status !== undefined ||
      synced.lead_status !== current.lead_status
    ) {
      result.lead_status = synced.lead_status;
    }
    if (
      result.stage_bar !== undefined ||
      synced.stage_bar !== current.stage_bar
    ) {
      result.stage_bar = synced.stage_bar;
    }
  }

  // 5. Filter invalid tags
  if (result.tags !== undefined) {
    const finalStatus = (result.lead_status ?? current.lead_status) as string;
    result.tags = filterInvalidTags(
      effectiveTags,
      effectiveType,
      finalStatus
    );
  }

  return result;
}
