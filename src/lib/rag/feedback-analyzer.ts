// ============================================================
// Feedback Analyzer — pattern detection & improvement suggestions
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdmin() {
  return createClient(supabaseUrl, supabaseKey);
}

export interface FeedbackPattern {
  dimension: 'intent' | 'source_table' | 'low_similarity';
  value: string;
  count: number;
  percentage: number;
}

export interface ImprovementSuggestion {
  area: string;
  severity: 'high' | 'medium' | 'low';
  suggestion: string;
  metric: string;
}

/**
 * Analyze recent negative feedback and group by intent / source_table.
 * Returns the top 3 problem areas.
 */
export async function analyzeFeedbackPatterns(
  daysBack = 7,
  limit = 3
): Promise<FeedbackPattern[]> {
  const admin = getAdmin();
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

  // Get negative feedback joined with audit log to get intent & source info
  const { data: feedbackRows } = await admin
    .from('rag_feedback')
    .select('id, session_id, created_at')
    .eq('rating', 'negative')
    .gte('created_at', since);

  if (!feedbackRows || feedbackRows.length === 0) return [];

  const sessionIds = [...new Set(feedbackRows.map((r: { session_id: string }) => r.session_id))];

  // Get audit log entries for these sessions to find intents and retrieved sources
  const { data: auditRows } = await admin
    .from('rag_audit_log')
    .select('session_id, intent, retrieved_ids, retrieved_scores')
    .in('session_id', sessionIds.slice(0, 100));

  const totalNegative = feedbackRows.length;

  // Count by intent
  const intentCounts: Record<string, number> = {};
  // Count by low similarity (avg score < 0.3)
  let lowSimilarityCount = 0;

  for (const row of auditRows ?? []) {
    const audit = row as { session_id: string; intent: string | null; retrieved_scores: number[] | null };
    if (audit.intent) {
      intentCounts[audit.intent] = (intentCounts[audit.intent] ?? 0) + 1;
    }
    const scores = audit.retrieved_scores ?? [];
    if (scores.length > 0) {
      const avg = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
      if (avg < 0.3) lowSimilarityCount++;
    }
  }

  const patterns: FeedbackPattern[] = [];

  // Intent patterns
  for (const [intent, count] of Object.entries(intentCounts)) {
    patterns.push({
      dimension: 'intent',
      value: intent,
      count,
      percentage: Math.round((count / totalNegative) * 100),
    });
  }

  // Low similarity pattern
  if (lowSimilarityCount > 0) {
    patterns.push({
      dimension: 'low_similarity',
      value: 'low_retrieval_scores',
      count: lowSimilarityCount,
      percentage: Math.round((lowSimilarityCount / totalNegative) * 100),
    });
  }

  // Sort by count descending and take top N
  patterns.sort((a, b) => b.count - a.count);
  return patterns.slice(0, limit);
}

/**
 * Generate actionable improvement suggestions based on feedback patterns.
 */
export async function getImprovementSuggestions(
  daysBack = 7
): Promise<ImprovementSuggestion[]> {
  const patterns = await analyzeFeedbackPatterns(daysBack, 10);
  const suggestions: ImprovementSuggestion[] = [];

  for (const pattern of patterns) {
    if (pattern.dimension === 'low_similarity' && pattern.count >= 2) {
      suggestions.push({
        area: 'Knowledge Gaps',
        severity: pattern.count >= 5 ? 'high' : 'medium',
        suggestion:
          'Knowledge base may have gaps — many queries return low similarity scores. Consider re-ingesting recent data or adding knowledge articles for common questions.',
        metric: `${pattern.count} queries with low retrieval scores (${pattern.percentage}% of negative feedback)`,
      });
    }

    if (pattern.dimension === 'intent' && pattern.count >= 3) {
      suggestions.push({
        area: `Intent: ${pattern.value}`,
        severity: pattern.count >= 5 ? 'high' : 'medium',
        suggestion:
          `Query planner may be misclassifying "${pattern.value}" intent. Review recent audit logs for this intent to verify correct routing.`,
        metric: `${pattern.count} negative ratings for "${pattern.value}" queries (${pattern.percentage}%)`,
      });
    }

    if (pattern.dimension === 'source_table' && pattern.count >= 3) {
      suggestions.push({
        area: `Source: ${pattern.value}`,
        severity: pattern.count >= 5 ? 'high' : 'medium',
        suggestion:
          `Embeddings for "${pattern.value}" may need re-ingestion. Many negative-rated responses relied on this source.`,
        metric: `${pattern.count} negative ratings involving "${pattern.value}" (${pattern.percentage}%)`,
      });
    }
  }

  // Sort by severity
  const severityOrder = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return suggestions;
}

/**
 * Check for feedback spikes: 3+ negative ratings in the last hour for the same intent.
 * Returns the intents that triggered an alert (empty if none).
 */
export async function checkFeedbackSpike(
  sessionId: string,
  currentIntent?: string
): Promise<string[]> {
  if (!currentIntent) return [];

  const admin = getAdmin();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // Count recent negative feedback across all sessions
  // that share the same intent in audit logs
  const { data: recentAudit } = await admin
    .from('rag_audit_log')
    .select('session_id, intent')
    .eq('intent', currentIntent)
    .gte('created_at', oneHourAgo);

  if (!recentAudit || recentAudit.length === 0) return [];

  const recentSessionIds = [...new Set(recentAudit.map((r: { session_id: string }) => r.session_id))];

  const { count } = await admin
    .from('rag_feedback')
    .select('id', { count: 'exact', head: true })
    .eq('rating', 'negative')
    .gte('created_at', oneHourAgo)
    .in('session_id', recentSessionIds.slice(0, 50));

  if ((count ?? 0) >= 3) {
    // Log alert to audit log
    await admin.from('rag_audit_log').insert({
      session_id: sessionId,
      query_text: `[FEEDBACK ALERT] 3+ negative ratings in last hour for intent: ${currentIntent}`,
      intent: currentIntent,
      action: 'feedback_alert',
    });
    return [currentIntent];
  }

  return [];
}
