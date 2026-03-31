-- Migration: 060_voice_agent_system.sql
-- Voice Agent Complete System — sessions, calls, notifications
-- PRD: docs/PRD_Voice_Agent_Complete.md
-- Depends on: contacts, listings, appointments tables

-- ============================================================================
-- Voice Sessions — Daily.co WebRTC room sessions
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Agent & Identity
    agent_email TEXT NOT NULL,                       -- realtor email from NextAuth session
    mode TEXT NOT NULL DEFAULT 'realtor',            -- realtor, client, generic
    -- Daily.co Room
    daily_room_url TEXT,                             -- https://listingflow.daily.co/room-xxx
    daily_room_name TEXT,                            -- room-xxx identifier for API calls
    daily_session_token TEXT,                        -- JWT token for Daily.co room access
    -- Status
    status TEXT NOT NULL DEFAULT 'active'            -- active, idle, offline, expired
        CHECK (status IN ('active', 'idle', 'offline', 'expired')),
    -- Context
    focus_type TEXT                                  -- contact, listing, showing, or NULL (general)
        CHECK (focus_type IN ('contact', 'listing', 'showing') OR focus_type IS NULL),
    focus_id UUID,                                  -- ID of focused entity (contact_id, listing_id, etc.)
    -- Privacy & Consent (PIPEDA/PIPA)
    recording_consent BOOLEAN DEFAULT FALSE,         -- TRUE after realtor acknowledges transcript notice
    -- Provider Tracking
    llm_provider TEXT DEFAULT 'anthropic',           -- anthropic, openai, groq, ollama
    stt_provider TEXT DEFAULT 'whisper_local',       -- whisper_local, openai_whisper
    tts_provider TEXT DEFAULT 'edge_tts',            -- edge_tts, openai_tts, elevenlabs, piper
    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_sessions_agent ON voice_sessions(agent_email, status);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_status ON voice_sessions(status, last_activity_at);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_focus ON voice_sessions(focus_type, focus_id) WHERE focus_type IS NOT NULL;

ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY voice_sessions_policy ON voice_sessions FOR ALL USING (true);
-- Single-tenant: allows all authenticated users. For multi-tenant, change to USING (agent_email = auth.jwt()->>'email')

-- ============================================================================
-- Voice Calls — logged voice interactions with transcripts
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Session Reference
    session_id UUID REFERENCES voice_sessions(id) ON DELETE SET NULL,
    -- Contact Context (optional — NULL for general queries)
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    -- Call Metadata
    direction TEXT NOT NULL DEFAULT 'outbound'       -- outbound (realtor initiated), inbound (client mode)
        CHECK (direction IN ('inbound', 'outbound')),
    duration_seconds INTEGER DEFAULT 0,              -- calculated from first audio to session end
    -- Content
    transcript TEXT,                                 -- full conversation transcript (plain text)
    summary TEXT,                                    -- AI-generated 1-2 sentence summary
    tool_calls_used JSONB DEFAULT '[]'::jsonb,       -- array of tool names invoked during session
    -- Cost Tracking
    llm_provider TEXT,                               -- which LLM handled this call
    total_input_tokens INTEGER DEFAULT 0,            -- total input tokens across all LLM calls
    total_output_tokens INTEGER DEFAULT 0,           -- total output tokens across all LLM calls
    cost_usd NUMERIC(10,6) DEFAULT 0,               -- estimated cost in USD
    -- Compliance
    compliance_flagged BOOLEAN DEFAULT FALSE,        -- TRUE if FINTRAC topics discussed
    compliance_notes TEXT,                           -- auto-generated compliance observations
    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_calls_session ON voice_calls(session_id);
CREATE INDEX IF NOT EXISTS idx_voice_calls_contact ON voice_calls(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_voice_calls_listing ON voice_calls(listing_id) WHERE listing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_voice_calls_date ON voice_calls(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_calls_compliance ON voice_calls(compliance_flagged) WHERE compliance_flagged = TRUE;

ALTER TABLE voice_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY voice_calls_policy ON voice_calls FOR ALL USING (true);
-- Single-tenant: allows all authenticated users. For multi-tenant, filter by session owner

-- ============================================================================
-- Voice Notifications — proactive CRM event alerts for voice agent
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Recipient
    agent_email TEXT NOT NULL,                       -- realtor email
    -- Notification Content
    notification_type TEXT NOT NULL                   -- incoming_lead, showing_update, compliance_alert,
        CHECK (notification_type IN (                --   listing_update, deal_update, calendar_reminder
            'incoming_lead', 'showing_update', 'compliance_alert',
            'listing_update', 'deal_update', 'calendar_reminder'
        )),
    title TEXT NOT NULL,                             -- short title for display: "New Hot Lead"
    body TEXT NOT NULL,                              -- spoken text: "Sarah Johnson just booked a showing..."
    payload JSONB DEFAULT '{}'::jsonb,               -- structured data: contact_id, listing_id, urgency, etc.
    -- Priority
    priority TEXT NOT NULL DEFAULT 'normal'          -- urgent (speak immediately), normal (queue), low (batch)
        CHECK (priority IN ('urgent', 'normal', 'low')),
    -- Delivery Status
    sent_at TIMESTAMPTZ,                            -- when pushed to SSE stream
    delivered_at TIMESTAMPTZ,                       -- when client acknowledged receipt
    read_at TIMESTAMPTZ,                            -- when agent heard/dismissed it
    spoken_at TIMESTAMPTZ,                          -- when voice agent spoke it aloud
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_notif_agent ON voice_notifications(agent_email, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_voice_notif_type ON voice_notifications(notification_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_notif_priority ON voice_notifications(priority, created_at) WHERE read_at IS NULL;

ALTER TABLE voice_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY voice_notifications_policy ON voice_notifications FOR ALL USING (true);
-- Single-tenant: allows all authenticated users. For multi-tenant, change to USING (agent_email = auth.jwt()->>'email')
