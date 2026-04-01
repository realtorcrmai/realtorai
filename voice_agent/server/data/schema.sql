-- ═══════════════════════════════════════════════════════════════════════════════
--  Voice Agent Database Schema
--  SQLite schema for the Real Estate Voice Agent
-- ═══════════════════════════════════════════════════════════════════════════════

-- Buyers table: stores buyer profiles and search criteria
CREATE TABLE IF NOT EXISTS buyers (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    email           TEXT,
    phone           TEXT,
    criteria        TEXT,       -- JSON: {min_price, max_price, beds, baths, areas, property_type, ...}
    status          TEXT DEFAULT 'active',  -- active, paused, closed
    notes           TEXT,
    realtor_id      TEXT NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Listings table: mirrors/extends ListingFlow listings with voice-agent metadata
CREATE TABLE IF NOT EXISTS listings (
    id              TEXT PRIMARY KEY,
    mls_number      TEXT,
    address         TEXT NOT NULL,
    city            TEXT,
    province        TEXT DEFAULT 'BC',
    list_price      REAL,
    beds            INTEGER,
    baths           REAL,
    sqft            INTEGER,
    property_type   TEXT,       -- detached, townhouse, condo, duplex, etc.
    status          TEXT DEFAULT 'Active',  -- Active, Conditional, Subject Removal, Sold, Expired
    phase           INTEGER DEFAULT 1,
    internal_notes  TEXT,       -- Negotiation notes, seller motivations, bottom lines
    seller_name     TEXT,
    seller_phone    TEXT,
    realtor_id      TEXT NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Client feedback: captured during client-mode calls
CREATE TABLE IF NOT EXISTS client_feedback (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name     TEXT NOT NULL,
    client_phone    TEXT,
    listing_id      TEXT,
    feedback_type   TEXT,       -- viewing, general, offer, concern
    feedback        TEXT NOT NULL,
    sentiment       TEXT,       -- positive, neutral, negative
    follow_up       INTEGER DEFAULT 0,  -- 1 = needs follow-up
    realtor_id      TEXT NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id)
);

-- Client playbooks: scripts the realtor configures for automated client calls
CREATE TABLE IF NOT EXISTS client_playbooks (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    listing_id      TEXT,
    questions       TEXT,       -- JSON array of questions to ask
    talking_points  TEXT,       -- JSON array of key points to mention
    mode            TEXT DEFAULT 'feedback',  -- feedback, scheduling, info
    realtor_id      TEXT NOT NULL,
    active          INTEGER DEFAULT 1,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id)
);

-- Conversation logs: full conversation tracking for personalization
CREATE TABLE IF NOT EXISTS conversation_logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      TEXT NOT NULL,
    mode            TEXT NOT NULL,    -- realtor, client
    participant     TEXT,             -- realtor name or client name
    role            TEXT NOT NULL,    -- user, assistant, system, tool
    content         TEXT NOT NULL,
    tool_name       TEXT,             -- if role=tool, which tool was called
    tool_args       TEXT,             -- JSON of tool arguments
    tool_result     TEXT,             -- JSON of tool result
    realtor_id      TEXT NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Personalization: tracks realtor preferences and patterns
CREATE TABLE IF NOT EXISTS personalization (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    realtor_id      TEXT NOT NULL,
    key             TEXT NOT NULL,    -- e.g. "preferred_greeting", "common_search", "workflow_shortcut"
    value           TEXT NOT NULL,    -- JSON value
    frequency       INTEGER DEFAULT 1,
    last_used       DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(realtor_id, key)
);

-- ═══════════════════════════════════════════════════════════════════════════════
--  Generic Assistant Tables
-- ═══════════════════════════════════════════════════════════════════════════════

-- Sessions: persistent session storage
CREATE TABLE IF NOT EXISTS sessions (
    id              TEXT PRIMARY KEY,
    mode            TEXT NOT NULL,    -- realtor, client, generic
    realtor_id      TEXT NOT NULL,
    messages        TEXT NOT NULL,    -- JSON array of messages
    participant     TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at      DATETIME NOT NULL
);

-- Notes: quick notes saved via generic assistant
CREATE TABLE IF NOT EXISTS notes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT NOT NULL,
    content         TEXT NOT NULL,
    tags            TEXT,             -- JSON array of tags
    realtor_id      TEXT NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Reminders: timed reminders
CREATE TABLE IF NOT EXISTS reminders (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    message         TEXT NOT NULL,
    remind_at       DATETIME NOT NULL,
    acknowledged    INTEGER DEFAULT 0,
    realtor_id      TEXT NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
--  Cost Tracking / Logbook
-- ═══════════════════════════════════════════════════════════════════════════════

-- Cost log: tracks every paid API call (LLM, STT, TTS) with token counts and cost
CREATE TABLE IF NOT EXISTS cost_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      TEXT NOT NULL,
    realtor_id      TEXT NOT NULL,
    service         TEXT NOT NULL,    -- 'llm', 'stt', 'tts'
    provider        TEXT NOT NULL,    -- 'anthropic', 'openai', 'ollama', 'edge_tts', etc.
    model           TEXT,             -- 'claude-sonnet-4-20250514', 'whisper-1', 'tts-1-hd', etc.
    input_tokens    INTEGER DEFAULT 0,
    output_tokens   INTEGER DEFAULT 0,
    audio_seconds   REAL DEFAULT 0,   -- for STT: input audio duration; for TTS: output audio duration
    chars_processed INTEGER DEFAULT 0, -- for TTS: characters converted to speech
    cost_usd        REAL NOT NULL,    -- estimated cost in USD
    latency_ms      INTEGER,          -- response time
    metadata        TEXT,             -- JSON: extra context (message preview, tool calls, etc.)
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Daily cost summary view helper
CREATE TABLE IF NOT EXISTS cost_daily_cache (
    date            TEXT NOT NULL,     -- YYYY-MM-DD
    realtor_id      TEXT NOT NULL,
    total_cost_usd  REAL DEFAULT 0,
    llm_cost        REAL DEFAULT 0,
    stt_cost        REAL DEFAULT 0,
    tts_cost        REAL DEFAULT 0,
    conversations   INTEGER DEFAULT 0,
    messages        INTEGER DEFAULT 0,
    audio_minutes   REAL DEFAULT 0,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (date, realtor_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_cost_session ON cost_log(session_id);
CREATE INDEX IF NOT EXISTS idx_cost_realtor ON cost_log(realtor_id);
CREATE INDEX IF NOT EXISTS idx_cost_service ON cost_log(service);
CREATE INDEX IF NOT EXISTS idx_cost_created ON cost_log(created_at);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_buyers_realtor ON buyers(realtor_id);
CREATE INDEX IF NOT EXISTS idx_listings_realtor ON listings(realtor_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_feedback_listing ON client_feedback(listing_id);
CREATE INDEX IF NOT EXISTS idx_feedback_realtor ON client_feedback(realtor_id);
CREATE INDEX IF NOT EXISTS idx_convlog_session ON conversation_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_convlog_realtor ON conversation_logs(realtor_id);
CREATE INDEX IF NOT EXISTS idx_personalization_realtor ON personalization(realtor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_realtor ON sessions(realtor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_notes_realtor ON notes(realtor_id);
CREATE INDEX IF NOT EXISTS idx_reminders_realtor ON reminders(realtor_id);
CREATE INDEX IF NOT EXISTS idx_reminders_time ON reminders(remind_at);
