/**
 * Escape SQL ILIKE/LIKE wildcards in user input.
 * Prevents wildcard injection via %, _, and \ characters.
 */
export function escapeIlike(input: string): string {
  return input.replace(/[\\%_]/g, (ch) => '\\' + ch);
}
