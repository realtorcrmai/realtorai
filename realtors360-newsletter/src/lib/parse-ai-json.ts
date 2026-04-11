/**
 * Parse JSON from Claude AI responses.
 *
 * Claude frequently wraps JSON in markdown fences (```json ... ```)
 * even when explicitly told "Return ONLY valid JSON, no markdown fences."
 * This helper strips fences, trims whitespace, and handles common
 * formatting issues before parsing.
 *
 * Also converts literal \n in string values to actual newlines for
 * proper HTML rendering.
 */

/**
 * Strip markdown code fences and parse JSON from AI output.
 * Returns null if parsing fails (caller decides fallback).
 */
export function parseAIJson<T = unknown>(text: string): T | null {
  if (!text || text.trim().length === 0) return null;

  let cleaned = text.trim();

  // Strip markdown fences: ```json ... ``` or ``` ... ```
  const fenceMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  // Also handle case where fences are at start but not end (truncated)
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7).trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3).trim();
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3).trim();
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Try fixing common issues: trailing commas, single quotes
    try {
      const fixed = cleaned
        .replace(/,\s*}/g, '}')      // trailing comma before }
        .replace(/,\s*]/g, ']');     // trailing comma before ]
      return JSON.parse(fixed) as T;
    } catch {
      return null;
    }
  }
}

/**
 * Convert literal \n in a string to actual newlines.
 * Claude sometimes returns "Hey Alex,\n\nJust spotted..." with
 * escaped newlines instead of real ones.
 */
export function unescapeNewlines(text: string): string {
  return text.replace(/\\n/g, '\n');
}

/**
 * Prepare AI-generated body text for HTML rendering.
 * Converts newlines to <br> tags and unescapes literal \n.
 */
export function bodyToHtml(text: string): string {
  return unescapeNewlines(text)
    .replace(/\n/g, '<br>');
}
