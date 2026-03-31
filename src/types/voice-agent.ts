import type { Json } from "./database";

// ── Multi-Tenant ────────────────────────────────────────────────────────────

export type VoiceSource = "browser" | "siri" | "google" | "alexa" | "cortana" | "teams" | "api";
export type TenantPlan = "standard" | "professional" | "enterprise";
export type TenantStatus = "active" | "suspended" | "cancelled";
export type MemberRole = "owner" | "admin" | "agent";

export interface Tenant {
  id: string;
  name: string;
  slug: string | null;
  plan: TenantPlan;
  status: TenantStatus;
  owner_email: string;
  billing_email: string | null;
  max_agents: number;
  settings: Json;
  voice_rate_limit_per_minute: number;
  voice_rate_limit_per_hour: number;
  llm_provider: string;
  created_at: string;
}

export interface TenantMembership {
  id: string;
  tenant_id: string;
  agent_email: string;
  role: MemberRole;
  permissions: Json;
  invited_by: string | null;
  joined_at: string;
  removed_at: string | null;
}

// ── Voice Sessions ──────────────────────────────────────────────────────────

export type VoiceSessionStatus = "active" | "idle" | "offline" | "expired";
export type VoiceSessionMode = "realtor" | "client" | "generic";
export type FocusType = "contact" | "listing" | "showing";

export interface VoiceSession {
  id: string;
  tenant_id: string;
  agent_email: string;
  mode: VoiceSessionMode;
  source: VoiceSource;
  daily_room_url: string | null;
  daily_room_name: string | null;
  daily_session_token: string | null;
  status: VoiceSessionStatus;
  focus_type: FocusType | null;
  focus_id: string | null;
  recording_consent: boolean;
  llm_provider: string;
  stt_provider: string;
  tts_provider: string;
  started_at: string;
  last_activity_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VoiceSessionInsert {
  tenant_id: string;
  agent_email: string;
  mode?: VoiceSessionMode;
  source?: VoiceSource;
  daily_room_url?: string | null;
  daily_room_name?: string | null;
  daily_session_token?: string | null;
  status?: VoiceSessionStatus;
  focus_type?: FocusType | null;
  focus_id?: string | null;
  recording_consent?: boolean;
  llm_provider?: string;
  stt_provider?: string;
  tts_provider?: string;
}

export interface VoiceSessionUpdate {
  status?: VoiceSessionStatus;
  daily_room_url?: string | null;
  daily_room_name?: string | null;
  daily_session_token?: string | null;
  focus_type?: FocusType | null;
  focus_id?: string | null;
  recording_consent?: boolean;
  last_activity_at?: string;
  ended_at?: string | null;
}

// ── Voice Calls ─────────────────────────────────────────────────────────────

export type CallDirection = "inbound" | "outbound";

export interface VoiceCall {
  id: string;
  tenant_id: string;
  session_id: string | null;
  contact_id: string | null;
  listing_id: string | null;
  direction: CallDirection;
  source: VoiceSource;
  duration_seconds: number;
  transcript: string | null;
  summary: string | null;
  tool_calls_used: Json;
  llm_provider: string | null;
  total_input_tokens: number;
  total_output_tokens: number;
  cost_usd: number;
  compliance_flagged: boolean;
  compliance_notes: string | null;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

export interface VoiceCallInsert {
  tenant_id: string;
  session_id?: string | null;
  source?: VoiceSource;
  contact_id?: string | null;
  listing_id?: string | null;
  direction?: CallDirection;
  duration_seconds?: number;
  transcript?: string | null;
  summary?: string | null;
  tool_calls_used?: Json;
  llm_provider?: string | null;
  total_input_tokens?: number;
  total_output_tokens?: number;
  cost_usd?: number;
  compliance_flagged?: boolean;
  compliance_notes?: string | null;
  started_at?: string;
  ended_at?: string | null;
}

// ── Voice Notifications ─────────────────────────────────────────────────────

export type NotificationType =
  | "incoming_lead"
  | "showing_update"
  | "compliance_alert"
  | "listing_update"
  | "deal_update"
  | "calendar_reminder";

export type NotificationPriority = "urgent" | "normal" | "low";

export interface VoiceNotification {
  id: string;
  tenant_id: string;
  agent_email: string;
  notification_type: NotificationType;
  title: string;
  body: string;
  payload: Json;
  priority: NotificationPriority;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  spoken_at: string | null;
  created_at: string;
}

export interface VoiceNotificationInsert {
  tenant_id: string;
  agent_email: string;
  notification_type: NotificationType;
  title: string;
  body: string;
  payload?: Record<string, string | number | boolean | null>;
  priority?: NotificationPriority;
}

// ── Daily.co Types ──────────────────────────────────────────────────────────

export interface DailyRoom {
  id: string;
  name: string;
  url: string;
  created_at: string;
  config: {
    max_participants?: number;
    enable_recording?: boolean;
    start_video_off?: boolean;
    start_audio_off?: boolean;
  };
}

export interface DailyMeetingToken {
  token: string;
  room_name: string;
  exp: number;
}

// ── SSE Event Types ─────────────────────────────────────────────────────────

export interface VoiceSSEEvent {
  id: string;
  type: "notification" | "heartbeat" | "session_update";
  data: VoiceNotification | { status: "alive" } | { session_id: string; status: VoiceSessionStatus };
}

// ── Contact Consent ────────────────────────────────────────────────────────

export type ConsentType = "voice" | "recording" | "sms" | "email";
export type ConsentStatus = "granted" | "denied" | "withdrawn" | "pending";
export type ConsentMethod = "verbal" | "written" | "electronic";

export interface ContactConsent {
  id: string;
  contact_id: string;
  consent_type: ConsentType;
  status: ConsentStatus;
  granted_at: string | null;
  withdrawn_at: string | null;
  method: ConsentMethod | null;
  compliance_notes: string | null;
  ip_address: string | null;
  created_at: string;
  updated_at: string;
}

// ── Call Disposition ────────────────────────────────────────────────────────

export type CallDisposition =
  | "interested"
  | "not_interested"
  | "callback_requested"
  | "wrong_number"
  | "left_voicemail"
  | "no_answer"
  | "do_not_call";
