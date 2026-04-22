/**
 * Team System Type Definitions
 *
 * Covers: roles, permissions, membership, invites, activity logging,
 * and session extensions for the agent team collaboration feature.
 */

// ============================================================
// Roles & Permissions
// ============================================================

export type TeamRole = "owner" | "admin" | "agent" | "assistant";

export type TeamAction =
  | "team:manage_settings"
  | "team:invite_members"
  | "team:remove_members"
  | "team:view_audit_log"
  | "contacts:view_team"
  | "contacts:create"
  | "contacts:delete"
  | "contacts:share"
  | "contacts:export"
  | "listings:create"
  | "listings:delete"
  | "listings:modify_financials"
  | "listings:share"
  | "showings:manage_team"
  | "showings:delegate"
  | "deals:view_financials"
  | "deals:create"
  | "newsletters:create"
  | "newsletters:send"
  | "newsletters:send_team"
  | "workflows:create"
  | "tasks:assign"
  | "content:create"
  | "content:publish"
  | "billing:access"
  | "data:export"
  | "integrations:manage";

export type ResourceAction = "delete" | "edit" | "share";

export type DataVisibility = "private" | "team";

export type DataScope = "personal" | "team";

export type ListingAgentRole = "primary" | "co-list" | "support";

export type DealAgentRole = "primary" | "co-agent" | "referral" | "team_override";

export type CommissionStatus = "pending" | "approved" | "paid" | "disputed";

export type InviteStatus = "pending" | "sent" | "accepted" | "expired" | "cancelled";

export type ConsentType = "email_marketing" | "sms_marketing" | "data_sharing" | "data_processing";

export type ConsentStatus = "granted" | "withdrawn" | "not_requested" | "expired";

export type ConsentGrantedToType = "agent" | "team";

export type ConsentSource = "web_form" | "verbal" | "written" | "imported" | "double_opt_in";

// ============================================================
// Database Row Types
// ============================================================

export interface TeamTenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: "active" | "suspended" | "cancelled";
  owner_email: string;
  logo_url: string | null;
  brokerage_name: string | null;
  max_members: number;
  features: Record<string, boolean>;
  twilio_number: string | null;
  brand_color: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMembership {
  id: string;
  tenant_id: string;
  user_id: string | null;
  agent_email: string;
  role: TeamRole;
  permissions: Record<string, boolean>;
  invited_by: string | null;
  joined_at: string | null;
  removed_at: string | null;
  created_at: string;
}

export interface TeamInvite {
  id: string;
  team_id: string;
  inviter_id: string;
  inviter_name: string | null;
  team_name: string | null;
  team_logo_url: string | null;
  email: string;
  invite_token: string;
  role: TeamRole;
  status: InviteStatus;
  expires_at: string;
  created_at: string;
}

export interface TeamActivityLogEntry {
  id: string;
  team_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  team_id: string | null;
  user_id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface ListingAgent {
  id: string;
  listing_id: string;
  user_id: string;
  role: ListingAgentRole;
  assigned_at: string;
  assigned_by: string | null;
}

export interface DealAgent {
  id: string;
  deal_id: string;
  user_id: string;
  role: DealAgentRole;
  commission_split_pct: number | null;
  commission_amount: number | null;
  status: CommissionStatus;
}

export interface ContactConsent {
  id: string;
  contact_id: string;
  consent_type: ConsentType;
  status: ConsentStatus;
  granted_at: string | null;
  withdrawn_at: string | null;
  expires_at: string | null;
  granted_to_type: ConsentGrantedToType | null;
  granted_to_id: string | null;
  source: ConsentSource | null;
  proof_url: string | null;
  ip_address: string | null;
  created_at: string;
}

// ============================================================
// Materialized View Types
// ============================================================

export interface TeamMemberActive {
  team_id: string;
  user_id: string;
  email: string;
  name: string | null;
  role: TeamRole;
  permissions: Record<string, boolean> | null;
}

// ============================================================
// Session Extensions
// ============================================================

export interface TeamSessionContext {
  teamId: string | null;
  teamRole: TeamRole | null;
  teamPermissions: Record<string, boolean>;
}

// ============================================================
// API / Action Input Types
// ============================================================

export interface CreateTeamInput {
  name: string;
  brokerage_name?: string;
  logo_url?: string;
}

export interface InviteMemberInput {
  email: string;
  role: TeamRole;
}

export interface AcceptInviteInput {
  token: string;
}

export interface UpdateRoleInput {
  membership_id: string;
  new_role: TeamRole;
}

export interface OffboardAgentInput {
  user_id: string;
  reassign_to: string | null; // null = return to unassigned pool
  reassign_mode: "all" | "selective";
}

export interface TransferOwnershipInput {
  new_owner_id: string;
}

// ============================================================
// API Response Types
// ============================================================

export interface TeamMemberWithUser {
  id: string;
  user_id: string | null;
  agent_email: string;
  role: TeamRole;
  joined_at: string | null;
  removed_at: string | null;
  user?: {
    id: string;
    name: string | null;
    email: string;
    avatar_url: string | null;
    last_active_at?: string | null;
  };
}

export interface TeamOverview {
  team: TeamTenant;
  members: TeamMemberWithUser[];
  pending_invites: TeamInvite[];
  seat_count: number;
  max_seats: number;
}

export interface OffboardImpact {
  contacts_count: number;
  listings_count: number;
  deals_count: number;
  active_workflows_count: number;
  scheduled_showings_count: number;
}
