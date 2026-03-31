// ============================================================
// PII Redactor — PIPEDA/FINTRAC compliant PII stripping
// ============================================================

const PII_PATTERNS = [
  { name: 'phone', regex: /(\+?1?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/g, replacement: '[PHONE]' },
  { name: 'email', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL]' },
  { name: 'sin', regex: /\b\d{3}[\s-]?\d{3}[\s-]?\d{3}\b/g, replacement: '[SIN]' },
  { name: 'dob', regex: /\b(19|20)\d{2}[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/g, replacement: '[DOB]' },
  { name: 'id_number', regex: /\b[A-Z]{1,2}\d{6,8}\b/g, replacement: '[ID_NUM]' },
  { name: 'postal_code', regex: /\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/gi, replacement: '[POSTAL]' },
];

/**
 * Redact PII from text. Returns the redacted string and a list of PII types found.
 */
export function redactPII(text: string): { redacted: string; piiFound: string[] } {
  const piiFound: string[] = [];
  let redacted = text;

  for (const { name, regex, replacement } of PII_PATTERNS) {
    // Reset lastIndex for global regexes
    regex.lastIndex = 0;
    if (regex.test(redacted)) {
      piiFound.push(name);
      regex.lastIndex = 0;
      redacted = redacted.replace(regex, replacement);
    }
  }

  return { redacted, piiFound };
}

/**
 * Check whether text contains any PII patterns.
 */
export function containsPII(text: string): boolean {
  for (const { regex } of PII_PATTERNS) {
    regex.lastIndex = 0;
    if (regex.test(text)) return true;
  }
  return false;
}
