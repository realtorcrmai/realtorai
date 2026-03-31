-- Migration: 063_voice_consent.sql
-- Voice agent consent tracking for PIPEDA/CASL compliance
-- PRD: docs/PRD_Voice_Agent_Complete.md (F2 — consent notice)
-- Plan: docs/PLAN_Voice_Agent_Phase1_Completion.md

-- ============================================================================
-- Contact Consent — tracks voice/recording consent per contact
-- ============================================================================

CREATE TABLE IF NOT EXISTS contact_consent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Contact Reference
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    -- Consent Details
    consent_type TEXT NOT NULL                        -- voice, recording, sms, email
        CHECK (consent_type IN ('voice', 'recording', 'sms', 'email')),
    status TEXT NOT NULL DEFAULT 'pending'            -- granted, denied, withdrawn, pending
        CHECK (status IN ('granted', 'denied', 'withdrawn', 'pending')),
    -- Consent Metadata
    granted_at TIMESTAMPTZ,                          -- when consent was granted
    withdrawn_at TIMESTAMPTZ,                        -- when consent was withdrawn (if applicable)
    method TEXT                                       -- how consent was obtained
        CHECK (method IN ('verbal', 'written', 'electronic') OR method IS NULL),
    compliance_notes TEXT,                            -- CASL/PIPEDA documentation
    ip_address INET,                                 -- for electronic consent audit trail
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- One consent record per contact per type
    UNIQUE (contact_id, consent_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_consent_contact ON contact_consent(contact_id);
CREATE INDEX IF NOT EXISTS idx_consent_type_status ON contact_consent(consent_type, status);

-- RLS
ALTER TABLE contact_consent ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage consent"
    ON contact_consent FOR ALL TO authenticated USING (true);

-- ============================================================================
-- Add disposition column to voice_calls (for post-call tracking)
-- ============================================================================

ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS disposition TEXT
    CHECK (disposition IN ('interested', 'not_interested', 'callback_requested',
           'wrong_number', 'left_voicemail', 'no_answer', 'do_not_call')
           OR disposition IS NULL);

ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS recording_url TEXT;
