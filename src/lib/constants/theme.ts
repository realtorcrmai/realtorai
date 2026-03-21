/**
 * Unified Color Theme System
 *
 * Single source of truth for all semantic status colors across the app.
 * Same color = same meaning. Color changes signify status changes only.
 *
 * Semantic mapping:
 *   success  → active, confirmed, completed (emerald/green)
 *   warning  → pending, requested, in-progress (amber)
 *   danger   → denied, urgent, destructive (red)
 *   info     → sold, medium priority (blue)
 *   neutral  → cancelled, low priority, default (gray)
 *   accent   → buyer, special (teal)
 *   emphasis → seller, high priority (purple/orange)
 */

export type ThemeVariant = {
  bg: string;
  text: string;
  border: string;
  dot: string;
  /** Combined Tailwind classes for badge/pill usage */
  badge: string;
  /** Hover background */
  hoverBg: string;
};

/** Core semantic tokens — every status maps to one of these */
const SEMANTIC_TOKENS = {
  success: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500",
    badge:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
    hoverBg: "hover:bg-emerald-50 dark:hover:bg-emerald-950/30",
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
    badge:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
    hoverBg: "hover:bg-amber-50 dark:hover:bg-amber-950/30",
  },
  danger: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
    dot: "bg-red-500",
    badge:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
    hoverBg: "hover:bg-red-50 dark:hover:bg-red-950/30",
  },
  info: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
    dot: "bg-blue-500",
    badge:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
    hoverBg: "hover:bg-blue-50 dark:hover:bg-blue-950/30",
  },
  neutral: {
    bg: "bg-gray-50 dark:bg-gray-900",
    text: "text-gray-600 dark:text-gray-400",
    border: "border-gray-200 dark:border-gray-800",
    dot: "bg-gray-400",
    badge:
      "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-800",
    hoverBg: "hover:bg-gray-50 dark:hover:bg-gray-900",
  },
  accent: {
    bg: "bg-teal-50 dark:bg-teal-950/30",
    text: "text-teal-700 dark:text-teal-400",
    border: "border-teal-200 dark:border-teal-800",
    dot: "bg-teal-500",
    badge:
      "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-800",
    hoverBg: "hover:bg-teal-50 dark:hover:bg-teal-950/30",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950/30",
    text: "text-purple-700 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-800",
    dot: "bg-purple-500",
    badge:
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800",
    hoverBg: "hover:bg-purple-50 dark:hover:bg-purple-950/30",
  },
  orange: {
    bg: "bg-orange-50 dark:bg-orange-950/30",
    text: "text-orange-700 dark:text-orange-400",
    border: "border-orange-200 dark:border-orange-800",
    dot: "bg-orange-500",
    badge:
      "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800",
    hoverBg: "hover:bg-orange-50 dark:hover:bg-orange-950/30",
  },
} as const satisfies Record<string, ThemeVariant>;

export type SemanticToken = keyof typeof SEMANTIC_TOKENS;

/**
 * STATUS_THEME — maps every domain status to a semantic token.
 * Adding a new status? Map it to an existing semantic token.
 */
export const STATUS_THEME = {
  // Listing statuses
  listing_active: SEMANTIC_TOKENS.success,
  listing_pending: SEMANTIC_TOKENS.warning,
  listing_sold: SEMANTIC_TOKENS.info,

  // Showing statuses
  showing_requested: SEMANTIC_TOKENS.warning,
  showing_confirmed: SEMANTIC_TOKENS.success,
  showing_denied: SEMANTIC_TOKENS.danger,
  showing_cancelled: SEMANTIC_TOKENS.neutral,

  // Task statuses
  task_pending: SEMANTIC_TOKENS.warning,
  task_in_progress: SEMANTIC_TOKENS.info,
  task_completed: SEMANTIC_TOKENS.success,

  // Task priorities
  priority_low: SEMANTIC_TOKENS.neutral,
  priority_medium: SEMANTIC_TOKENS.info,
  priority_high: SEMANTIC_TOKENS.orange,
  priority_urgent: SEMANTIC_TOKENS.danger,

  // Contact types
  contact_buyer: SEMANTIC_TOKENS.info,
  contact_seller: SEMANTIC_TOKENS.purple,

  // Workflow step statuses
  step_completed: SEMANTIC_TOKENS.success,
  step_in_progress: SEMANTIC_TOKENS.orange,
  step_pending: SEMANTIC_TOKENS.neutral,

  // Generic/shared
  success: SEMANTIC_TOKENS.success,
  warning: SEMANTIC_TOKENS.warning,
  danger: SEMANTIC_TOKENS.danger,
  info: SEMANTIC_TOKENS.info,
  neutral: SEMANTIC_TOKENS.neutral,
} as const;

export type StatusThemeKey = keyof typeof STATUS_THEME;

/**
 * Get theme colors for a domain + status combination.
 *
 * @example
 *   getStatusColor("listing", "active")   // → emerald theme
 *   getStatusColor("showing", "confirmed") // → emerald theme (same!)
 *   getStatusColor("priority", "urgent")   // → red theme
 */
export function getStatusColor(
  category: string,
  status: string
): ThemeVariant {
  const key = `${category}_${status}` as StatusThemeKey;
  return STATUS_THEME[key] ?? SEMANTIC_TOKENS.neutral;
}

/** Direct access to semantic tokens for non-status usage */
export { SEMANTIC_TOKENS };
