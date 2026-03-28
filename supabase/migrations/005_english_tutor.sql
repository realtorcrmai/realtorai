-- English Tutor tables
-- Migration: 002_english_tutor

-- ══════════════════════════════════════════════════════════════════════════════
--  tutor_users: learner profiles
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE tutor_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  native_language TEXT NOT NULL DEFAULT 'Hindi',
  cefr_level TEXT NOT NULL DEFAULT 'B1'
    CHECK (cefr_level IN ('A1','A2','B1','B2','C1','C2')),
  interests TEXT[] DEFAULT '{}',
  profession TEXT,
  api_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tutor_users_api_key ON tutor_users(api_key);

-- ══════════════════════════════════════════════════════════════════════════════
--  tutor_sessions: conversation sessions
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE tutor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES tutor_users(id) ON DELETE CASCADE,
  scenario TEXT NOT NULL DEFAULT 'free-talk'
    CHECK (scenario IN ('free-talk','job-interview','meeting','presentation','daily-life','debate')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','completed')),
  cefr_score TEXT CHECK (cefr_score IS NULL OR cefr_score IN ('A1','A2','B1','B2','C1','C2')),
  fluency_score NUMERIC(4,1),
  grammar_score NUMERIC(4,1),
  vocabulary_score NUMERIC(4,1),
  pronunciation_score NUMERIC(4,1),
  duration_seconds INTEGER,
  summary TEXT,
  corrections JSONB NOT NULL DEFAULT '[]',
  strengths JSONB DEFAULT '[]',
  areas_to_improve JSONB DEFAULT '[]',
  vocabulary_learned JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX idx_tutor_sessions_user ON tutor_sessions(user_id);
CREATE INDEX idx_tutor_sessions_status ON tutor_sessions(status);

-- ══════════════════════════════════════════════════════════════════════════════
--  tutor_messages: conversation messages
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE tutor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES tutor_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  corrections JSONB DEFAULT '[]',
  vocabulary JSONB DEFAULT '[]',
  pronunciation_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tutor_messages_session ON tutor_messages(session_id);

-- ══════════════════════════════════════════════════════════════════════════════
--  tutor_cefr_history: CEFR level changes over time
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE tutor_cefr_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES tutor_users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES tutor_sessions(id) ON DELETE SET NULL,
  cefr_level TEXT NOT NULL
    CHECK (cefr_level IN ('A1','A2','B1','B2','C1','C2')),
  scores JSONB NOT NULL, -- {fluency, grammar, vocabulary, pronunciation}
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tutor_cefr_history_user ON tutor_cefr_history(user_id);

-- ══════════════════════════════════════════════════════════════════════════════
--  Auto-update updated_at trigger
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_tutor_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tutor_users_updated_at
  BEFORE UPDATE ON tutor_users
  FOR EACH ROW EXECUTE FUNCTION update_tutor_updated_at();
