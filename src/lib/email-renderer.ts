"use server";

import { buildEmailFromType } from "@/lib/email-blocks";

/**
 * Render an email template body with variable substitution.
 * Now delegates to the block-based email system instead of hardcoded HTML.
 *
 * @see {@link ./email-blocks.ts} for the canonical assembler.
 */
export async function renderTemplateToHTML(
  body: string,
  subject: string,
  variables: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _accentColor: string = "#4f35d2"
): Promise<string> {
  const resolvedBody = resolveVariablesFromMap(body, variables);
  const resolvedSubject = resolveVariablesFromMap(subject, variables);
  const contactName = variables["name"] || variables["firstName"] || "there";
  const contactType = variables["contactType"] || "buyer";

  return buildEmailFromType(
    "welcome",
    contactName,
    contactType,
    resolvedSubject,
    resolvedBody,
    "Learn More",
  );
}

function resolveVariablesFromMap(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `{{${key}}}`);
}
