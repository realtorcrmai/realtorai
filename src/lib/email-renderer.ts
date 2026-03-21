"use server";

import { resolveTemplateVariables } from "@/lib/workflow-engine";

/**
 * Render an email template body with variable substitution.
 * Wraps plain text in a responsive HTML layout.
 */
export async function renderTemplateToHTML(
  body: string,
  subject: string,
  variables: Record<string, string>,
  accentColor: string = "#4f35d2"
): Promise<string> {
  const resolvedBody = resolveVariablesFromMap(body, variables);
  const resolvedSubject = resolveVariablesFromMap(subject, variables);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background: #f6f5ff; }
    .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(79,53,210,0.06); }
    .header { padding: 24px 32px 16px; border-bottom: 1px solid #e8e5f5; }
    .header h1 { font-size: 18px; font-weight: 700; color: ${accentColor}; margin: 0; }
    .content { padding: 24px 32px; font-size: 15px; line-height: 1.6; color: #1a1535; }
    .content p { margin: 0 0 12px; }
    .footer { padding: 16px 32px; border-top: 1px solid #e8e5f5; text-align: center; }
    .footer p { font-size: 11px; color: #a0a0b0; margin: 0; }
    @media (prefers-color-scheme: dark) {
      body { background: #1a1535; }
      .container { background: #2a2555; }
      .content { color: #e8e5f5; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>${resolvedSubject}</h1></div>
    <div class="content">${resolvedBody.replace(/\n/g, "<br>")}</div>
    <div class="footer"><p>Sent via ListingFlow</p></div>
  </div>
</body>
</html>`;
}

function resolveVariablesFromMap(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `{{${key}}}`);
}
