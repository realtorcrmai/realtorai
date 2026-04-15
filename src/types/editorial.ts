// ── Block Types ───────────────────────────────────────────────────────────────

export type BlockType =
  | 'hero'
  | 'just_sold'
  | 'market_commentary'
  | 'rate_watch'
  | 'local_intel'
  | 'neighborhood_spotlight'
  | 'quick_tip'
  | 'agent_note'
  | 'cta'
  | 'divider'

// ── Edition Status & Type ─────────────────────────────────────────────────────

export type EditionStatus =
  | 'draft'
  | 'generating'
  | 'ready'
  | 'sent'
  | 'failed'
  | 'scheduled'

export type EditionType =
  | 'market_update'
  | 'just_sold'
  | 'open_house'
  | 'neighbourhood_spotlight'
  | 'rate_watch'
  | 'seasonal'

// ── Voice Profile Tone ────────────────────────────────────────────────────────

export type VoiceTone =
  | 'professional'
  | 'friendly'
  | 'luxury'
  | 'casual'
  | 'authoritative'

// ── Block Content Interfaces ──────────────────────────────────────────────────

export interface HeroBlockContent {
  headline: string
  subheadline: string | null
  image_url: string | null
  image_alt: string | null
  /** Edition number, e.g. "#42" */
  edition_label: string | null
  neighbourhood: string | null
  date_label: string | null
}

export interface JustSoldBlockContent {
  address: string
  sale_price: number
  list_price: number
  days_on_market: number
  beds: number | null
  baths: number | null
  sqft: number | null
  sold_date: string
  photo_url: string | null
  commentary: string | null
  /** Percentage over/under asking */
  vs_asking_pct: number | null
}

export interface MarketCommentaryBlockContent {
  neighbourhood: string
  /** Human-readable summary written/adjusted by AI */
  body: string
  /** Average sale price this period */
  avg_sale_price: number | null
  /** Average list price this period */
  avg_list_price: number | null
  /** Median days on market */
  median_dom: number | null
  /** Active listings count */
  active_listings: number | null
  /** Sold listings count in period */
  sold_count: number | null
  /** Month-over-month price change percentage */
  price_change_mom_pct: number | null
  /** Year-over-year price change percentage */
  price_change_yoy_pct: number | null
  market_type: 'buyers' | 'sellers' | 'balanced' | null
  period_label: string | null
}

export interface RateWatchBlockContent {
  /** Date rates were fetched/quoted (ISO string) */
  as_of_date: string
  rate_5yr_fixed: number | null
  rate_5yr_variable: number | null
  rate_3yr_fixed: number | null
  rate_1yr_fixed: number | null
  prime_rate: number | null
  /** Basis-point change from last edition */
  change_bps: number | null
  trend: 'rising' | 'falling' | 'stable' | null
  /** AI-written commentary on rate environment */
  commentary: string | null
  source: string | null
}

export interface LocalIntelBlockContent {
  /** Short punchy headline for this intel item */
  headline: string
  body: string
  category: 'development' | 'transit' | 'school' | 'business' | 'zoning' | 'event' | 'other'
  neighbourhood: string | null
  source_url: string | null
  source_label: string | null
  published_date: string | null
}

export interface NeighborhoodSpotlightBlockContent {
  neighbourhood: string
  tagline: string | null
  hero_image_url: string | null
  description: string
  walk_score: number | null
  transit_score: number | null
  bike_score: number | null
  avg_price: number | null
  price_trend: 'up' | 'down' | 'flat' | null
  highlights: string[]
  nearby_amenities: Array<{
    name: string
    type: 'school' | 'park' | 'transit' | 'restaurant' | 'shopping' | 'other'
    distance_m: number | null
  }>
}

export interface QuickTipBlockContent {
  /** Single-sentence tip title */
  title: string
  /** 2-4 sentence elaboration */
  body: string
  category: 'buying' | 'selling' | 'investing' | 'maintenance' | 'financing' | 'staging' | 'general'
  icon_emoji: string | null
}

export interface AgentNoteBlockContent {
  /** Personal note from the realtor — written by AI in realtor's voice or manually authored */
  body: string
  /** Closing sign-off line, e.g. "Warmly, Sarah" */
  sign_off: string | null
  headshot_url: string | null
  agent_name: string | null
}

export interface CtaBlockContent {
  headline: string
  subtext: string | null
  button_label: string
  button_url: string
  /** Optional secondary action */
  secondary_label: string | null
  secondary_url: string | null
  style: 'primary' | 'soft' | 'outlined'
  /** Tracks what goal this CTA serves for analytics */
  cta_type: 'book_call' | 'get_cma' | 'view_listings' | 'open_house_rsvp' | 'referral' | 'custom'
}

export interface DividerBlockContent {
  style: 'line' | 'spacer' | 'dots' | 'wave'
  /** Height in pixels for spacer style */
  spacer_height?: number
  color?: string | null
}

// ── Discriminated Union ───────────────────────────────────────────────────────

export type EditorBlockContent =
  | HeroBlockContent
  | JustSoldBlockContent
  | MarketCommentaryBlockContent
  | RateWatchBlockContent
  | LocalIntelBlockContent
  | NeighborhoodSpotlightBlockContent
  | QuickTipBlockContent
  | AgentNoteBlockContent
  | CtaBlockContent
  | DividerBlockContent

export type EditorBlock =
  | { id: string; type: 'hero'; content: HeroBlockContent; is_locked: boolean }
  | { id: string; type: 'just_sold'; content: JustSoldBlockContent; is_locked: boolean }
  | { id: string; type: 'market_commentary'; content: MarketCommentaryBlockContent; is_locked: boolean }
  | { id: string; type: 'rate_watch'; content: RateWatchBlockContent; is_locked: boolean }
  | { id: string; type: 'local_intel'; content: LocalIntelBlockContent; is_locked: boolean }
  | { id: string; type: 'neighborhood_spotlight'; content: NeighborhoodSpotlightBlockContent; is_locked: boolean }
  | { id: string; type: 'quick_tip'; content: QuickTipBlockContent; is_locked: boolean }
  | { id: string; type: 'agent_note'; content: AgentNoteBlockContent; is_locked: boolean }
  | { id: string; type: 'cta'; content: CtaBlockContent; is_locked: boolean }
  | { id: string; type: 'divider'; content: DividerBlockContent; is_locked: boolean }

// ── Main Edition Interface ────────────────────────────────────────────────────

export interface EditorialEdition {
  id: string
  realtor_id: string
  title: string
  edition_type: EditionType
  status: EditionStatus
  blocks: EditorBlock[]
  /** Sequential edition number per realtor, e.g. 1, 2, 3 */
  edition_number: number

  // A/B subject testing
  subject_a: string | null
  subject_b: string | null
  active_variant: 'a' | 'b'

  // Send metrics
  send_count: number
  recipient_count: number

  // Scheduling
  scheduled_at: string | null
  sent_at: string | null

  // Generation tracking
  generation_started_at: string | null
  generation_error: string | null

  // Voice profile used during generation
  voice_profile_id: string | null

  created_at: string
  updated_at: string
}

// ── Voice Profile ─────────────────────────────────────────────────────────────

export interface EditorialVoiceProfile {
  id: string
  realtor_id: string
  name: string
  tone: VoiceTone
  /** Free-form description of the agent's communication style */
  style_description: string | null
  /** Phrases the AI should avoid */
  avoid_phrases: string[]
  /** Phrases or structures the AI should favour */
  preferred_phrases: string[]
  /** Example email body excerpts used to tune generation */
  writing_examples: string[]
  /** Short personal bio injected into agent_note blocks */
  bio_snippet: string | null
  /** Default sign-off string */
  default_sign_off: string | null
  /** Markets this profile focuses on */
  focus_neighbourhoods: string[]
  is_default: boolean
  created_at: string
  updated_at: string
}

// ── Block Template ────────────────────────────────────────────────────────────

export interface EditorialBlockTemplate {
  id: string
  name: string
  block_type: BlockType
  /** Label shown in the template picker UI */
  display_label: string
  description: string | null
  /** Default content pre-populated when this template is dropped into an edition */
  default_content: EditorBlockContent
  /** Tags for filtering in the template picker */
  tags: string[]
  is_active: boolean
  /** Whether this template is available to all realtors or specific ones */
  is_global: boolean
  realtor_id: string | null
  created_at: string
  updated_at: string
}

// ── Content Library Item ──────────────────────────────────────────────────────

export interface EditorialContentLibraryItem {
  id: string
  realtor_id: string
  block_type: BlockType
  title: string
  /** Serialized EditorBlockContent for this saved item */
  content: EditorBlockContent
  /** How many editions this item has been used in */
  usage_count: number
  /** Tags for organisation and search */
  tags: string[]
  is_pinned: boolean
  created_at: string
  updated_at: string
}

// ── External Data Cache ───────────────────────────────────────────────────────

export interface ExternalDataCache {
  id: string
  realtor_id: string
  /** Identifier for the data source, e.g. "BoC_prime_rate", "REBoard_SFD_VAN" */
  cache_key: string
  /** Raw payload from the external source */
  payload: Record<string, unknown>
  /** ISO timestamp of when the external source reported this data */
  data_as_of: string | null
  /** ISO timestamp of when we last fetched from the source */
  fetched_at: string
  /** ISO timestamp after which this cache entry should be re-fetched */
  expires_at: string
  /** HTTP status or provider-specific status of the last fetch */
  fetch_status: 'ok' | 'error' | 'stale'
  /** Error detail if fetch_status is "error" */
  fetch_error: string | null
  source_url: string | null
  created_at: string
  updated_at: string
}

// ── Edition Analytics ─────────────────────────────────────────────────────────

export interface EditionAnalytics {
  id: string
  edition_id: string
  realtor_id: string

  // Delivery
  recipients: number
  delivered: number
  bounced: number
  unsubscribed: number

  // Engagement
  opens: number
  unique_opens: number
  clicks: number
  unique_clicks: number
  open_rate: number | null
  click_rate: number | null

  // A/B split results
  variant_a_opens: number
  variant_a_clicks: number
  variant_b_opens: number
  variant_b_clicks: number
  winning_variant: 'a' | 'b' | null

  // Block-level click tracking
  /** Map of block_id → click count */
  block_clicks: Record<string, number>
  /** Map of cta_type → click count */
  cta_clicks: Record<string, number>

  // Conversion signals
  /** Contacts who clicked a book_call or get_cma CTA */
  high_intent_clicks: number
  /** Contacts who replied to the email */
  replies: number

  // Snapshot of generation cost (tokens)
  ai_input_tokens: number | null
  ai_output_tokens: number | null
  ai_cost_cents: number | null

  created_at: string
  updated_at: string
}

// ── Action Result ─────────────────────────────────────────────────────────────

export type ActionResult<T = void> =
  | { data: T; error: null }
  | { data: null; error: string }

// ── Generation Status (polling) ───────────────────────────────────────────────

export type GenerationStatus = {
  status: EditionStatus
  /** 0–100 */
  progress: number
  /** Human-readable label of the block currently being generated */
  current_block?: string
  error?: string
}

// ── Send Edition Result ───────────────────────────────────────────────────────

export type SendEditionResult = {
  sent: number
  /** Contacts filtered out by CASL / unsubscribe / suppression */
  skipped: number
  failed: number
  edition_id: string
}
