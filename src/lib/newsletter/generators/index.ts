/**
 * Editorial Block Generator — Entry Point
 *
 * Routes block generation requests to the appropriate per-block generator.
 * Each generator returns a typed block content object with content safety applied.
 *
 * Usage:
 *   import { generateBlockContent } from '@/lib/newsletter/generators'
 *   const content = await generateBlockContent('hero', context, supabase)
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { BlockType } from '@/types/editorial'
import type { EditionContext } from '@/lib/editorial-ai'

import { generateHero } from './hero'
import { generateJustSold } from './just-sold'
import { generateMarketCommentary } from './market-commentary'
import { generateRateWatch } from './rate-watch'
import { generateLocalIntel } from './local-intel'
import { generateNeighborhoodSpotlight } from './neighborhood-spotlight'
import { generateQuickTip } from './quick-tip'
import { generateAgentNote } from './agent-note'
import { generateCta } from './cta'

/**
 * Generate content for a specific block type using the appropriate generator.
 * All generators apply content safety checks internally before returning.
 *
 * @param blockType - The type of block to generate content for
 * @param context   - The edition context (market data, voice profile, city, etc.)
 * @param supabase  - Admin Supabase client for DB access (content library, etc.)
 * @returns A typed block content object ready to store in the edition
 */
export async function generateBlockContent(
  blockType: BlockType,
  context: EditionContext,
  supabase: SupabaseClient,
): Promise<Record<string, unknown>> {
  switch (blockType) {
    case 'hero':
      return (await generateHero(context, supabase)) as unknown as Record<string, unknown>

    case 'just_sold':
      return (await generateJustSold(context, supabase)) as unknown as Record<string, unknown>

    case 'market_commentary':
      return (await generateMarketCommentary(context, supabase)) as unknown as Record<string, unknown>

    case 'rate_watch':
      return (await generateRateWatch(context, supabase)) as unknown as Record<string, unknown>

    case 'local_intel':
      return (await generateLocalIntel(context, supabase)) as unknown as Record<string, unknown>

    case 'neighborhood_spotlight':
      return (await generateNeighborhoodSpotlight(context, supabase)) as unknown as Record<string, unknown>

    case 'quick_tip':
      return (await generateQuickTip(context, supabase)) as unknown as Record<string, unknown>

    case 'agent_note':
      return (await generateAgentNote(context, supabase)) as unknown as Record<string, unknown>

    case 'cta':
      return (await generateCta(context, supabase)) as unknown as Record<string, unknown>

    case 'divider':
      // Dividers require no generation
      return { style: 'line' }

    default: {
      // Exhaustive type guard — TypeScript will warn if a new BlockType is added
      const _exhaustive: never = blockType
      console.warn(`[generators] Unknown block type: ${String(_exhaustive)}`)
      return {}
    }
  }
}
