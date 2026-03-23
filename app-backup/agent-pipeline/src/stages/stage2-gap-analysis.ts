import { z } from "zod";
import { askClaudeJSON } from "../clients/claude.js";
import { readCodebase, formatSnapshot } from "../codebase-reader.js";
import { config } from "../config.js";
import { logger } from "../logger.js";

// Schema for the structured gap analysis output
const GapSchema = z.object({
  id: z.string(),
  category: z.enum(["database", "api", "ui", "integration", "workflow"]),
  description: z.string(),
  priority: z.enum(["must-have", "should-have", "nice-to-have"]),
  estimated_complexity: z.enum(["small", "medium", "large"]),
  dependencies: z.array(z.string()),
});

const GapAnalysisSchema = z.object({
  feature_summary: z.string(),
  current_state: z.object({
    existing_components: z.array(z.string()),
    partial_implementations: z.array(z.string()),
    relevant_patterns: z.array(z.string()),
  }),
  gaps: z.array(GapSchema),
  implementation_order: z.array(z.string()),
  new_tables: z.array(
    z.object({
      name: z.string(),
      columns: z.array(
        z.object({
          name: z.string(),
          type: z.string(),
          notes: z.string().optional(),
        })
      ),
    })
  ),
  new_files: z.array(
    z.object({
      path: z.string(),
      purpose: z.string(),
    })
  ),
  modified_files: z.array(
    z.object({
      path: z.string(),
      changes: z.string(),
    })
  ),
});

export type GapAnalysis = z.infer<typeof GapAnalysisSchema>;

const SYSTEM_PROMPT = `You are a senior software architect analyzing a real estate CRM codebase.

You will receive:
1. Market research on how best-in-class CRMs implement a specific feature
2. The current state of the codebase (CLAUDE.md, directory structure, types, migrations)

Your job: produce a **structured gap analysis** as JSON identifying exactly what needs to be built.

Rules:
- Compare the market research against the codebase's current state
- Identify specific gaps — things the market does that this codebase doesn't
- Be concrete: name exact files to create/modify, exact table columns, exact component names
- Follow the project's existing conventions (from CLAUDE.md): server actions, Zod validation, lf-* CSS classes, emoji icons, etc.
- Order gaps by dependency (things that depend on nothing first, then things that depend on those)
- Mark priority based on how critical the gap is for a functional feature

Return ONLY a JSON object wrapped in \`\`\`json blocks matching this exact schema:
{
  "feature_summary": "string — one paragraph describing the feature",
  "current_state": {
    "existing_components": ["file paths that already exist and are relevant"],
    "partial_implementations": ["things partially done"],
    "relevant_patterns": ["existing patterns to follow, with file paths"]
  },
  "gaps": [
    {
      "id": "gap-1",
      "category": "database|api|ui|integration|workflow",
      "description": "What needs to be built",
      "priority": "must-have|should-have|nice-to-have",
      "estimated_complexity": "small|medium|large",
      "dependencies": ["gap-ids this depends on"]
    }
  ],
  "implementation_order": ["gap-1", "gap-2", ...],
  "new_tables": [
    { "name": "table_name", "columns": [{ "name": "col", "type": "text", "notes": "optional" }] }
  ],
  "new_files": [
    { "path": "src/...", "purpose": "What this file does" }
  ],
  "modified_files": [
    { "path": "src/...", "changes": "What to change in this file" }
  ]
}`;

export async function runStage2(researchOutput: string): Promise<GapAnalysis> {
  logger.stage(2, 4, "Gap Analysis");

  logger.step("Reading current codebase...");
  const snapshot = await readCodebase();
  const snapshotText = formatSnapshot(snapshot);

  logger.step("Analyzing gaps with Claude...");
  const userPrompt = `## Market Research

${researchOutput}

---

## Current Codebase State

${snapshotText}

---

Analyze the gaps between the market research and the current codebase. Return a structured JSON gap analysis.`;

  const rawResult = await askClaudeJSON<GapAnalysis>(
    SYSTEM_PROMPT,
    userPrompt,
    {
      model: config.CLAUDE_ANALYSIS_MODEL,
      maxTokens: 8192,
    }
  );

  // Validate with Zod
  const result = GapAnalysisSchema.parse(rawResult);

  logger.success(`Stage 2 complete — ${result.gaps.length} gaps identified`);
  logger.info(`  Must-have: ${result.gaps.filter((g) => g.priority === "must-have").length}`);
  logger.info(`  Should-have: ${result.gaps.filter((g) => g.priority === "should-have").length}`);
  logger.info(`  Nice-to-have: ${result.gaps.filter((g) => g.priority === "nice-to-have").length}`);
  logger.info(`  New tables: ${result.new_tables.length}`);
  logger.info(`  New files: ${result.new_files.length}`);
  logger.info(`  Modified files: ${result.modified_files.length}`);

  return result;
}
