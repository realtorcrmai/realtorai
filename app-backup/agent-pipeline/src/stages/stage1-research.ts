import { askClaude } from "../clients/claude.js";
import { config } from "../config.js";
import { logger } from "../logger.js";

const RESEARCH_SYSTEM_PROMPT = `You are a senior software architect with deep knowledge of SaaS products, especially CRM platforms and real estate technology.

Your task is to research how the best products implement a specific feature, based on your extensive training knowledge.

For each feature request, return a structured analysis:

## Market Leaders
List 5-10 specific products that implement this feature well. For each:
- Product name and target market
- How they implement the feature (specific screens, workflows, data models)
- What makes their implementation notable

## Common Data Model Patterns
- What database tables/entities are standard
- Key fields, relationships, status enumerations
- How data flows between related features

## UX Patterns
- What screens/views users expect
- Common interaction patterns (drag-drop, inline edit, modals, etc.)
- Navigation and information hierarchy

## API & Integration Patterns
- Standard endpoints and operations
- Common third-party integrations
- Webhook/notification patterns

## Table Stakes vs. Differentiators
- Features every competitor has (must-have baseline)
- Features that set leaders apart (competitive advantages)
- Emerging trends not yet mainstream

## Technical Considerations
- Performance implications and data validation rules
- Edge cases and error scenarios
- Compliance or regulatory requirements (if applicable)

Be SPECIFIC: name exact field names, status values, workflow steps. Use concrete examples, not abstract descriptions.`;

export async function runStage1(featureRequest: string): Promise<string> {
  logger.stage(1, 4, "Research");
  logger.info(`Researching: "${featureRequest}"`);
  logger.step("Analyzing best-in-market implementations with Claude...");

  const userPrompt = `Research the best implementations of this feature for a real estate CRM application:

"${featureRequest}"

Focus on how top real estate CRMs (Follow Up Boss, kvCORE, LionDesk, BoomTown, Chime, Sierra Interactive, Wise Agent, Dotloop, SkySlope) and general CRMs (HubSpot, Salesforce) implement this.

Also consider the BC/Canadian real estate market context where relevant (BCREA forms, FINTRAC compliance, etc.).

Return a comprehensive, structured analysis with specific details — field names, status values, workflow steps, API patterns. Not vague descriptions.`;

  const content = await askClaude(RESEARCH_SYSTEM_PROMPT, userPrompt, {
    model: config.CLAUDE_RESEARCH_MODEL,
    maxTokens: 8192,
  });

  const research = `# Market Research: ${featureRequest}\n## Date: ${new Date().toISOString().substring(0, 10)}\n## Query: ${featureRequest}\n\n${content}`;

  logger.success(`Stage 1 complete — ${research.split("\n").length} lines of research`);
  return research;
}
