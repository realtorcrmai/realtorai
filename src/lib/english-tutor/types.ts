export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type Scenario =
  | "free-talk"
  | "job-interview"
  | "meeting"
  | "presentation"
  | "daily-life"
  | "debate";

export type SessionStatus = "active" | "completed";
export type MessageRole = "user" | "assistant" | "system";

// ── Supabase Row types ──────────────────────────────────────────────────────

export interface TutorUser {
  id: string;
  name: string;
  native_language: string;
  cefr_level: CEFRLevel;
  interests: string[];
  profession: string | null;
  api_key: string;
  created_at: string;
  updated_at: string;
}

export interface TutorUserInsert {
  name: string;
  native_language?: string;
  cefr_level?: CEFRLevel;
  interests?: string[];
  profession?: string | null;
  api_key: string;
}

export interface TutorSession {
  id: string;
  user_id: string;
  scenario: Scenario;
  status: SessionStatus;
  cefr_score: CEFRLevel | null;
  fluency_score: number | null;
  grammar_score: number | null;
  vocabulary_score: number | null;
  pronunciation_score: number | null;
  duration_seconds: number | null;
  summary: string | null;
  corrections: Correction[];
  created_at: string;
  ended_at: string | null;
}

export interface TutorMessage {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  pronunciation_data: PronunciationData | null;
  created_at: string;
}

export interface TutorCEFRHistory {
  id: string;
  user_id: string;
  session_id: string;
  cefr_level: CEFRLevel;
  scores: SessionScores;
  assessed_at: string;
}

// ── Domain types ────────────────────────────────────────────────────────────

export interface Correction {
  original: string;
  corrected: string;
  explanation: string;
  type: "grammar" | "vocabulary" | "pronunciation" | "style";
}

export interface SessionScores {
  fluency: number;
  grammar: number;
  vocabulary: number;
  pronunciation: number;
}

export interface PronunciationData {
  overall_score: number;
  phonemes: PhonemeScore[];
}

export interface PhonemeScore {
  phoneme: string;
  score: number;
  word: string;
}

export interface TutorResponse {
  reply: string;
  corrections: Correction[];
  vocabulary: VocabularyItem[];
}

export interface VocabularyItem {
  word: string;
  definition: string;
  example: string;
}

export interface SessionReport {
  session_id: string;
  scenario: Scenario;
  duration_seconds: number;
  cefr_score: CEFRLevel;
  scores: SessionScores;
  corrections: Correction[];
  vocabulary_learned: VocabularyItem[];
  summary: string;
  strengths: string[];
  areas_to_improve: string[];
}
