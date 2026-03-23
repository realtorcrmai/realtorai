import { askClaudeJSON } from "../clients/claude.js";
import { config } from "../config.js";
import { logger } from "../logger.js";

export type TaskComplexity = "small" | "medium" | "complex";

interface TriageResult {
  complexity: TaskComplexity;
  reason: string;
  suggestion: string;
}

const TRIAGE_SYSTEM_PROMPT = `You are a task complexity classifier for a real estate CRM codebase (Next.js 16, Supabase, TypeScript).

Classify the given task into exactly one category:

**small** — Single-file changes, simple fixes, minor UI tweaks, adding a field, fixing a typo, updating text, adding a button, CSS adjustments, renaming things. Typically 1-3 files, no new tables, no new API routes.
Examples: "fix the login button color", "add phone field to contact form", "change the header text", "fix TypeScript error in ListingCard"

**medium** — Multi-file features that touch 4-15 files, may need a new API route or component, but follow existing patterns. No new database tables or major architectural changes.
Examples: "add filtering to the contacts page", "add export to CSV for listings", "add email notifications for showings", "build a contact merge feature"

**complex** — New subsystems, new database tables, new integrations, cross-cutting features touching 15+ files, new workflows, or features requiring market research to design properly.
Examples: "build offer management", "add DocuSign integration", "build a referral tracking system", "implement MLS auto-sync"

Return JSON only:
\`\`\`json
{
  "complexity": "small" | "medium" | "complex",
  "reason": "one-line explanation of why this complexity level",
  "suggestion": "what to do instead if small, or 'proceed' if medium/complex"
}
\`\`\``;

export async function triageTask(featureRequest: string): Promise<TriageResult> {
  logger.info("Running complexity triage...");

  const result = await askClaudeJSON<TriageResult>(
    TRIAGE_SYSTEM_PROMPT,
    `Classify this task:\n\n"${featureRequest}"`,
    {
      model: config.CLAUDE_TRIAGE_MODEL,
      maxTokens: 512,
    }
  );

  logger.info(`Triage result: ${result.complexity} — ${result.reason}`);
  return result;
}
