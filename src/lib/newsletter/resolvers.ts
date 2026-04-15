/**
 * External Data Resolvers
 *
 * Single entry point for fetching all external data (mortgage rates, local events)
 * for an editorial edition. Implements cache-first strategy using external_data_cache.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchCAMortgageRates, type CAMortgageRates } from './sources/mortgage-rates-ca'
import { fetchUSMortgageRates, type USMortgageRates } from './sources/mortgage-rates-us'
import { fetchLocalEvents, type LocalEvent } from './sources/local-events'

export type { CAMortgageRates, USMortgageRates, LocalEvent }

// ── Country detection ──────────────────────────────────────────────────────────

const CA_PROVINCE_SUFFIXES = [
  ', BC', ', AB', ', ON', ', QC', ', SK', ', MB',
  ', NS', ', NB', ', NL', ', PE', ', NT', ', YT', ', NU',
]

const US_STATE_SUFFIXES = [
  ', TX', ', CA', ', FL', ', NY', ', WA', ', OR', ', CO',
  ', AZ', ', NV', ', GA', ', NC', ', VA', ', MA', ', IL',
  ', OH', ', MI', ', PA', ', TN', ', MO', ', MN', ', WI',
  ', MD', ', SC', ', AL', ', KY', ', LA', ', OK', ', CT',
  ', UT', ', IA', ', AR', ', MS', ', KS', ', NM', ', NE',
  ', ID', ', WV', ', HI', ', NH', ', ME', ', RI', ', MT',
  ', DE', ', SD', ', ND', ', AK', ', VT', ', WY',
]

function detectCountry(city: string): 'CA' | 'US' {
  const upper = city.toUpperCase()
  for (const suffix of CA_PROVINCE_SUFFIXES) {
    if (upper.includes(suffix.toUpperCase())) return 'CA'
  }
  for (const suffix of US_STATE_SUFFIXES) {
    if (upper.includes(suffix.toUpperCase())) return 'US'
  }
  return 'CA' // default to Canada for this CRM
}

function citySlug(city: string): string {
  return city
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

type CacheRow = {
  payload: Record<string, unknown>
  expires_at: string
}

async function readCache(
  supabase: SupabaseClient,
  realtorId: string,
  cacheKey: string,
): Promise<CacheRow | null> {
  try {
    const { data } = await supabase
      .from('external_data_cache')
      .select('payload, expires_at')
      .eq('realtor_id', realtorId)
      .eq('cache_key', cacheKey)
      .single()

    if (!data) return null
    const row = data as CacheRow
    if (!row.expires_at || new Date(row.expires_at) <= new Date()) return null
    return row
  } catch {
    return null
  }
}

async function writeCache(
  supabase: SupabaseClient,
  realtorId: string,
  cacheKey: string,
  payload: Record<string, unknown>,
  ttlMs: number,
  sourceUrl: string | null = null,
): Promise<void> {
  try {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + ttlMs).toISOString()

    await supabase.from('external_data_cache').upsert(
      {
        realtor_id: realtorId,
        cache_key: cacheKey,
        payload,
        data_as_of: now.toISOString(),
        fetched_at: now.toISOString(),
        expires_at: expiresAt,
        fetch_status: 'ok',
        fetch_error: null,
        source_url: sourceUrl,
        updated_at: now.toISOString(),
      },
      { onConflict: 'realtor_id,cache_key' },
    )
  } catch (err) {
    console.warn('[resolvers] Cache write error for key:', cacheKey, err)
  }
}

// ── Main resolver ─────────────────────────────────────────────────────────────

export interface ResolvedExternalData {
  mortgage_rates: CAMortgageRates | USMortgageRates | null
  local_events: LocalEvent[] | null
  country: 'CA' | 'US'
  city: string
  cache_hits: string[]    // which keys came from cache
  cache_misses: string[]  // which keys were freshly fetched
}

const SIX_HOURS_MS = 6 * 60 * 60 * 1000
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

/**
 * Resolve all external data for a newsletter edition.
 * Reads from cache first; fetches from source on miss.
 * Never throws — returns null values for any failed source.
 */
export async function resolveExternalData(
  realtorId: string,
  city: string,
  supabase: SupabaseClient,
): Promise<ResolvedExternalData> {
  const country = detectCountry(city)
  const monthTag = new Date().toISOString().slice(0, 7) // 'YYYY-MM'
  const slug = citySlug(city)

  const ratesKey = `mortgage_rates_${country}_${monthTag}`
  const eventsKey = `local_events_${slug}_${monthTag}`

  const cacheHits: string[] = []
  const cacheMisses: string[] = []

  // ── Mortgage rates ───────────────────────────────────────────────────────────
  let mortgageRates: CAMortgageRates | USMortgageRates | null = null

  const ratesCacheRow = await readCache(supabase, realtorId, ratesKey)
  if (ratesCacheRow) {
    mortgageRates = ratesCacheRow.payload as unknown as CAMortgageRates | USMortgageRates
    cacheHits.push(ratesKey)
  } else {
    cacheMisses.push(ratesKey)
    try {
      if (country === 'CA') {
        mortgageRates = await fetchCAMortgageRates()
      } else {
        mortgageRates = await fetchUSMortgageRates()
      }
      if (mortgageRates) {
        await writeCache(
          supabase,
          realtorId,
          ratesKey,
          mortgageRates as unknown as Record<string, unknown>,
          SIX_HOURS_MS,
          country === 'CA'
            ? 'https://www.bankofcanada.ca/valet/observations/V122530,V80691311/json?recent=1'
            : 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=MORTGAGE30US',
        )
      }
    } catch (err) {
      console.warn('[resolvers] Failed to fetch mortgage rates:', err)
    }
  }

  // ── Local events ─────────────────────────────────────────────────────────────
  let localEvents: LocalEvent[] | null = null

  const eventsCacheRow = await readCache(supabase, realtorId, eventsKey)
  if (eventsCacheRow) {
    const cached = eventsCacheRow.payload as { events?: LocalEvent[] }
    localEvents = cached.events ?? null
    cacheHits.push(eventsKey)
  } else {
    cacheMisses.push(eventsKey)
    try {
      const result = await fetchLocalEvents(city)
      localEvents = result.events.length > 0 ? result.events : null
      await writeCache(
        supabase,
        realtorId,
        eventsKey,
        { city: result.city, events: result.events, fetched_at: result.fetched_at },
        TWENTY_FOUR_HOURS_MS,
        null,
      )
    } catch (err) {
      console.warn('[resolvers] Failed to fetch local events:', err)
    }
  }

  return {
    mortgage_rates: mortgageRates,
    local_events: localEvents,
    country,
    city,
    cache_hits: cacheHits,
    cache_misses: cacheMisses,
  }
}
