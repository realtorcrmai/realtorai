/**
 * Canadian Mortgage Rate Fetcher
 *
 * Source: Bank of Canada Valet API (free, no auth required)
 * Series used:
 *   V122530  — Prime business lending rate (proxy for prime)
 *   V80691311 — Conventional mortgage 5-year rate
 */

export interface CAMortgageRates {
  prime_rate: number        // e.g. 5.45
  rate_5yr_fixed: number    // e.g. 4.39
  rate_variable: number     // calculated: prime - 0.90
  overnight_rate: number    // calculated: prime - 2.70 (historical spread)
  next_boc_date: string     // e.g. 'June 4, 2026'
  as_of_date: string        // ISO date string
  source: 'boc_valet' | 'fallback'
}

// BoC 2026 decision dates — published annually in advance
const BOC_DATES_2026 = [
  '2026-01-29',
  '2026-03-12',
  '2026-04-16',
  '2026-06-04',
  '2026-07-30',
  '2026-09-17',
  '2026-10-29',
  '2026-12-10',
]

function getNextBoCDate(): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const dateStr of BOC_DATES_2026) {
    const d = new Date(dateStr)
    if (d >= today) {
      return d.toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
    }
  }

  // If all 2026 dates have passed, return last known date
  const last = BOC_DATES_2026[BOC_DATES_2026.length - 1]
  return new Date(last).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
}

const FALLBACK_RATES: CAMortgageRates = {
  prime_rate: 5.45,
  rate_5yr_fixed: 4.39,
  rate_variable: 4.55,   // prime - 0.90
  overnight_rate: 2.75,  // prime - 2.70
  next_boc_date: getNextBoCDate(),
  as_of_date: new Date().toISOString().slice(0, 10),
  source: 'fallback',
}

/**
 * Fetch Canadian mortgage rates from the Bank of Canada Valet API.
 * Falls back to hardcoded realistic values if the API is unavailable.
 */
export async function fetchCAMortgageRates(): Promise<CAMortgageRates> {
  const nextBoCDate = getNextBoCDate()

  try {
    const url =
      'https://www.bankofcanada.ca/valet/observations/V122530,V80691311/json?recent=1'

    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      console.warn(`[mortgage-rates-ca] BoC API returned ${res.status} — using fallback`)
      return { ...FALLBACK_RATES, next_boc_date: nextBoCDate }
    }

    const json = (await res.json()) as {
      observations?: Array<Record<string, { v: string }>>
    }

    const obs = json.observations?.[0]
    if (!obs) {
      console.warn('[mortgage-rates-ca] No observations in BoC response — using fallback')
      return { ...FALLBACK_RATES, next_boc_date: nextBoCDate }
    }

    const primeRaw = parseFloat(obs['V122530']?.v ?? '')
    const fixedRaw = parseFloat(obs['V80691311']?.v ?? '')

    if (isNaN(primeRaw) || isNaN(fixedRaw)) {
      console.warn('[mortgage-rates-ca] Could not parse rate values — using fallback', obs)
      return { ...FALLBACK_RATES, next_boc_date: nextBoCDate }
    }

    const primeRate = Math.round(primeRaw * 100) / 100
    const rate5yrFixed = Math.round(fixedRaw * 100) / 100
    const rateVariable = Math.round((primeRate - 0.9) * 100) / 100
    const overnightRate = Math.round((primeRate - 2.7) * 100) / 100

    return {
      prime_rate: primeRate,
      rate_5yr_fixed: rate5yrFixed,
      rate_variable: rateVariable,
      overnight_rate: overnightRate,
      next_boc_date: nextBoCDate,
      as_of_date: new Date().toISOString().slice(0, 10),
      source: 'boc_valet',
    }
  } catch (err) {
    console.warn('[mortgage-rates-ca] Fetch error — using fallback:', err)
    return { ...FALLBACK_RATES, next_boc_date: nextBoCDate }
  }
}
