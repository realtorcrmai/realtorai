/**
 * Content Safety Layer — Fair Housing / CREA Compliance
 *
 * Runs on ALL AI-generated text before it is stored.
 * - Detects and removes Fair Housing Act / CREA prohibited language
 * - Auto-corrects REALTOR® trademark usage
 * - Removes BC professional-standards superlatives and guarantees
 */

export interface SafetyCheckResult {
  safe: boolean
  violations: string[]
  cleaned_text: string // text with auto-corrections applied
}

// ── REALTOR® trademark corrections (auto-fix, no violation logged) ────────────

const TRADEMARK_REPLACEMENTS: Array<[RegExp, string]> = [
  // "realtors" before "realtor" to avoid double-match
  [/\brealtors\b(?!®)/gi, 'REALTORS®'],
  [/\brealtor\b(?!®)/gi, 'REALTOR®'],
  // MLS — Canadian context only (safe to always apply)
  [/\bmls\b(?!®)/gi, 'MLS®'],
]

// ── Fair Housing / CREA violations (flag + remove) ───────────────────────────

// Demographic group descriptors that violate Fair Housing Act
const DEMOGRAPHIC_VIOLATIONS: Array<{ pattern: RegExp; label: string }> = [
  {
    pattern: /\b(perfect|ideal|great|suited|designed)\s+for\s+(families|seniors|young\s+professionals?|young\s+people|professionals?|couples?|retirees?|college\s+students?|single\s+people|adults?|millennials?|boomers?)\b/gi,
    label: 'demographic targeting ("perfect for [group]")',
  },
  {
    pattern: /\b(young\s+professionals?|college\s+students?|retirees?|empty\s+nesters?|growing\s+famil(?:y|ies))\b/gi,
    label: 'demographic descriptor',
  },
  {
    pattern: /\b(exclusive|exclusivity)\b/gi,
    label: 'exclusivity language',
  },
  {
    pattern: /\bdesirable\s+(neighborhood|neighbourhood|area|community|district)\b/gi,
    label: 'subjective desirability claim ("desirable [area]")',
  },
  {
    pattern: /\bgood\s+schools\b(?!\s+district|\s+—|\s+with\s+data|\s+according|\s+ranked)/gi,
    label: 'unsubstantiated school claim ("good schools" without factual context)',
  },
  {
    pattern: /\b(diverse\s+community|diverse\s+neighborhood|diverse\s+neighbourhood)\b/gi,
    label: 'demographic community descriptor',
  },
]

// Protected characteristics (flag entire sentence if found)
const PROTECTED_CHARACTERISTIC_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  {
    pattern: /\b(race|racial|ethnicity|ethnic|religion|religious|national\s+origin|nationality)\b/gi,
    label: 'protected characteristic (race/religion/national origin)',
  },
  {
    pattern: /\b(gender|sex(?:ual)?\s+orientation|lgbtq|disability|handicap|familial\s+status)\b/gi,
    label: 'protected characteristic (gender/disability/familial status)',
  },
]

// ── BC Professional Standards (flag + remove) ─────────────────────────────────

const SUPERLATIVE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  {
    pattern: /\b(the\s+)?(most\s+affordable\s+area|cheapest\s+(neighbourhood|neighborhood|area)|best\s+(investment|neighbourhood|neighborhood|area|deal|buy))\b/gi,
    label: 'unsubstantiated superlative',
  },
]

const GUARANTEE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  {
    pattern: /\b(guaranteed?|will\s+appreciate|sure\s+to\s+(appreciate|increase|rise|grow)|certain\s+to\s+(appreciate|increase)|promise(?:d)?\s+(growth|appreciation|returns?))\b/gi,
    label: 'unsubstantiated guarantee or investment claim',
  },
]

// ── Main check function ────────────────────────────────────────────────────────

export function checkContentSafety(text: string): SafetyCheckResult {
  const violations: string[] = []
  let cleaned = text

  // Step 1: Apply REALTOR® trademark auto-corrections (no violation — just fix)
  for (const [pattern, replacement] of TRADEMARK_REPLACEMENTS) {
    cleaned = cleaned.replace(pattern, replacement)
  }

  // Step 2: Check + remove Fair Housing demographic violations
  for (const { pattern, label } of DEMOGRAPHIC_VIOLATIONS) {
    if (pattern.test(cleaned)) {
      violations.push(`Fair Housing violation: ${label}`)
      // Reset lastIndex for global regex before using in replace
      pattern.lastIndex = 0
      cleaned = cleaned.replace(pattern, '')
    }
    pattern.lastIndex = 0
  }

  // Step 3: Check protected characteristics (flag the whole segment)
  for (const { pattern, label } of PROTECTED_CHARACTERISTIC_PATTERNS) {
    if (pattern.test(cleaned)) {
      violations.push(`Fair Housing violation: ${label}`)
      // Remove the matching term
      pattern.lastIndex = 0
      cleaned = cleaned.replace(pattern, '[area]')
    }
    pattern.lastIndex = 0
  }

  // Step 4: BC superlatives
  for (const { pattern, label } of SUPERLATIVE_PATTERNS) {
    if (pattern.test(cleaned)) {
      violations.push(`BC professional standards: ${label}`)
      pattern.lastIndex = 0
      cleaned = cleaned.replace(pattern, '')
    }
    pattern.lastIndex = 0
  }

  // Step 5: Guarantee / investment claim patterns
  for (const { pattern, label } of GUARANTEE_PATTERNS) {
    if (pattern.test(cleaned)) {
      violations.push(`BC professional standards: ${label}`)
      pattern.lastIndex = 0
      cleaned = cleaned.replace(pattern, '')
    }
    pattern.lastIndex = 0
  }

  // Clean up leftover double spaces from removals
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ').trim()

  if (violations.length > 0) {
    console.warn('[content-safety] Violations detected:', violations)
  }

  return {
    safe: violations.length === 0,
    violations,
    cleaned_text: cleaned,
  }
}

/**
 * Apply safety checks to all string fields of a generated content object.
 * Returns the cleaned object and aggregated violations.
 */
export function sanitizeBlockContent(
  content: Record<string, unknown>,
): { content: Record<string, unknown>; violations: string[] } {
  const allViolations: string[] = []
  const cleaned: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(content)) {
    if (typeof value === 'string') {
      const result = checkContentSafety(value)
      cleaned[key] = result.cleaned_text
      allViolations.push(...result.violations)
    } else if (Array.isArray(value)) {
      // Apply to each string element in arrays
      cleaned[key] = value.map((item) => {
        if (typeof item === 'string') {
          const result = checkContentSafety(item)
          allViolations.push(...result.violations)
          return result.cleaned_text
        }
        return item
      })
    } else {
      cleaned[key] = value
    }
  }

  return { content: cleaned, violations: allViolations }
}
