// ============================================================
// Unified Agent — Guardrails (safety checks + prompt injection)
// ============================================================
// Ported from src/lib/rag/guardrails.ts with additional patterns
// for prompt injection and PII exposure prevention.
// ============================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GuardrailResult {
  blocked: boolean;
  type: string | null;
  disclaimer: string | null;
}

// ---------------------------------------------------------------------------
// Guardrail patterns — refuse and add disclaimer
// ---------------------------------------------------------------------------

const GUARDRAIL_PATTERNS: Array<{ pattern: RegExp; type: string }> = [
  // --- Existing RAG patterns ---
  { pattern: /tax.*(?:strategy|advice|plan|structure|deduct)/i, type: 'tax' },
  { pattern: /legal.*(?:advice|opinion|liability|sue|lawsuit)/i, type: 'legal' },
  { pattern: /(?:guarantee|guaranteed).*(?:return|appreciation|sale|profit)/i, type: 'financial' },
  {
    pattern: /(?:mortgage|loan|qualify).*(?:qualify|approval|rate.*lock|pre-approv|mortgage)/i,
    type: 'mortgage',
  },
  {
    pattern: /(?:invest|investment|should.*buy).*(?:advice|recommend|should.*buy|invest|property)/i,
    type: 'financial',
  },

  // --- FINTRAC PII requests ---
  { pattern: /\b(?:SIN|social\s*insurance\s*number)\b/i, type: 'fintrac_pii' },
  { pattern: /\bpassport\s*number\b/i, type: 'fintrac_pii' },
  { pattern: /\bbank\s*account\s*(?:number|#)\b/i, type: 'fintrac_pii' },

  // --- Prompt injection detection (10 patterns) ---
  { pattern: /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions/i, type: 'injection' },
  { pattern: /disregard\s+(?:all\s+)?(?:previous|prior|above)/i, type: 'injection' },
  { pattern: /you\s+are\s+now\s+(?:a|an|in)\b/i, type: 'injection' },
  { pattern: /(?:reveal|show|print|output|display)\s+(?:your\s+)?system\s*prompt/i, type: 'injection' },
  { pattern: /\bDAN\s+mode\b/i, type: 'injection' },
  { pattern: /\bjailbreak\b/i, type: 'injection' },
  { pattern: /pretend\s+(?:you\s+are|to\s+be)\s+(?:a|an)\b/i, type: 'injection' },
  { pattern: /(?:bypass|override|disable)\s+(?:your\s+)?(?:safety|guardrail|filter|restriction)/i, type: 'injection' },
  { pattern: /(?:act|behave)\s+as\s+(?:if|though)\s+you\s+(?:have|are|were)/i, type: 'injection' },
  { pattern: /(?:forget|clear)\s+(?:all\s+)?(?:your|previous)\s+(?:instructions|rules|context)/i, type: 'injection' },

  // --- FINTRAC PII: DOB ---
  { pattern: /\b(?:date\s*of\s*birth|DOB)\b.*(?:show|give|what|tell)/i, type: 'fintrac_pii' },

  // --- Cross-tenant & data exfiltration (8 patterns) ---
  { pattern: /(?:list|show|dump|export)\s+all\s+(?:contacts|clients|sellers|buyers|listings)\b/i, type: 'data_exfil' },
  { pattern: /(?:all|every)\s+(?:realtor|tenant|user|agent)\b.*(?:data|record|info)/i, type: 'data_exfil' },
  { pattern: /(?:other|another)\s+(?:realtor|agent|tenant).*(?:contacts|listings|data)/i, type: 'cross_tenant' },
  { pattern: /(?:how\s+many|total)\s+(?:realtors|agents|tenants|users)\b/i, type: 'cross_tenant' },
  { pattern: /(?:who\s+else|which\s+(?:realtor|agent)).*(?:using|has|listed|sold)/i, type: 'cross_tenant' },
  { pattern: /(?:compare|benchmark).*(?:my|mine).*(?:other|another)\s+(?:realtor|agent)/i, type: 'cross_tenant' },
  { pattern: /(?:competitor|rival|competing)\s+(?:realtor|agent).*(?:listing|client|contact)/i, type: 'cross_tenant' },
  { pattern: /(?:switch|access|view)\s+(?:to|as)\s+(?:another|different)\s+(?:realtor|account|tenant)/i, type: 'cross_tenant' },
];

// ---------------------------------------------------------------------------
// Disclaimer text by guardrail type
// ---------------------------------------------------------------------------

const DISCLAIMERS: Record<string, string> = {
  tax: "I can't provide tax advice. Please consult a qualified accountant or tax professional.",
  legal: "I can't provide legal advice. Please consult a licensed real estate lawyer.",
  financial:
    "I can't provide financial or investment advice. Please consult a licensed financial advisor.",
  mortgage:
    "I can't provide mortgage qualification advice. Please consult a licensed mortgage broker.",
  fintrac_pii:
    "I can't retrieve or display sensitive identity documents (SIN, passport numbers, bank accounts). This information is protected under FINTRAC regulations. Please access it through the secure FINTRAC compliance section of the CRM.",
  injection:
    "I'm unable to process that request. If you have a real estate question, I'm happy to help!",
  data_exfil:
    "I can only show data from your account. I can't access other realtors' data or bulk-export records.",
  cross_tenant:
    "Each realtor's data is completely isolated. I can only access your contacts, listings, and communications. I cannot view, compare, or reference any other realtor's data.",
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check if a user message should be blocked by guardrails.
 * Returns { blocked: false } if OK, or { blocked: true, type, disclaimer } if blocked.
 */
export function checkAgentGuardrails(message: string): GuardrailResult {
  for (const { pattern, type } of GUARDRAIL_PATTERNS) {
    if (pattern.test(message)) {
      return {
        blocked: true,
        type,
        disclaimer:
          DISCLAIMERS[type] ??
          `I can't provide ${type} advice. Please consult a qualified professional.`,
      };
    }
  }
  return { blocked: false, type: null, disclaimer: null };
}

/**
 * Scrub PII from agent output before returning to the user.
 * Masks phone numbers and email addresses that might leak from DB results.
 */
export function scrubPiiFromOutput(text: string): string {
  // Mask phone numbers: +1 604 555 1234 → +1 604 *** ****
  let scrubbed = text.replace(
    /(\+?1[\s.-]?\d{3})[\s.-]?\d{3}[\s.-]?\d{4}/g,
    '$1 *** ****'
  );

  // Mask email addresses: john@example.com → j***@example.com
  scrubbed = scrubbed.replace(
    /\b([a-zA-Z0-9])[a-zA-Z0-9._%+-]*@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
    '$1***@$2'
  );

  return scrubbed;
}
