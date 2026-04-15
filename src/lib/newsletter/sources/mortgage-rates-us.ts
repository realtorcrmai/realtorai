/**
 * US Mortgage Rate Fetcher
 *
 * Source: FRED (Federal Reserve Economic Data) — free, no auth required
 * Series used:
 *   MORTGAGE30US — 30-year fixed-rate mortgage average (weekly)
 *   MORTGAGE15US — 15-year fixed-rate mortgage average (weekly)
 */

export interface USMortgageRates {
  rate_30yr_fixed: number   // e.g. 6.82
  rate_15yr_fixed: number   // e.g. 6.10
  rate_7yr_arm: number      // calculated: 30yr - 0.50
  prime_rate: number        // US Prime: Fed Funds target + 3.00 (approximated from 30yr spread)
  next_fed_date: string     // e.g. 'June 18, 2026'
  as_of_date: string        // ISO date string
  source: 'fred' | 'fallback'
}

// Fed meeting dates 2026 — published annually in advance
const FED_DATES_2026 = [
  '2026-01-29',
  '2026-03-19',
  '2026-05-07',
  '2026-06-18',
  '2026-07-30',
  '2026-09-17',
  '2026-11-05',
  '2026-12-10',
]

function getNextFedDate(): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const dateStr of FED_DATES_2026) {
    const d = new Date(dateStr)
    if (d >= today) {
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    }
  }

  const last = FED_DATES_2026[FED_DATES_2026.length - 1]
  return new Date(last).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

const FALLBACK_RATES: USMortgageRates = {
  rate_30yr_fixed: 6.82,
  rate_15yr_fixed: 6.10,
  rate_7yr_arm: 6.32,    // 30yr - 0.50
  prime_rate: 8.50,      // typical US prime (fed funds ~5.50 + 3.00)
  next_fed_date: getNextFedDate(),
  as_of_date: new Date().toISOString().slice(0, 10),
  source: 'fallback',
}

/**
 * Parse the last non-empty line from a FRED CSV response.
 * Format: date,value
 */
function parseLastFredCsvValue(csv: string): number | null {
  const lines = csv.trim().split('\n')
  // Iterate in reverse to find the last line with a real value (not '.')
  for (let i = lines.length - 1; i >= 1; i--) {
    const parts = lines[i].split(',')
    if (parts.length >= 2) {
      const val = parseFloat(parts[1].trim())
      if (!isNaN(val)) return val
    }
  }
  return null
}

/**
 * Fetch US mortgage rates from FRED (Federal Reserve Economic Data).
 * Falls back to hardcoded realistic values if the API is unavailable.
 */
export async function fetchUSMortgageRates(): Promise<USMortgageRates> {
  const nextFedDate = getNextFedDate()

  try {
    const [res30, res15] = await Promise.all([
      fetch('https://fred.stlouisfed.org/graph/fredgraph.csv?id=MORTGAGE30US', {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: 'text/csv' },
      }),
      fetch('https://fred.stlouisfed.org/graph/fredgraph.csv?id=MORTGAGE15US', {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: 'text/csv' },
      }),
    ])

    if (!res30.ok || !res15.ok) {
      console.warn(
        `[mortgage-rates-us] FRED API returned ${res30.status}/${res15.status} — using fallback`,
      )
      return { ...FALLBACK_RATES, next_fed_date: nextFedDate }
    }

    const [csv30, csv15] = await Promise.all([res30.text(), res15.text()])

    const rate30 = parseLastFredCsvValue(csv30)
    const rate15 = parseLastFredCsvValue(csv15)

    if (rate30 === null || rate15 === null) {
      console.warn('[mortgage-rates-us] Could not parse FRED CSV values — using fallback')
      return { ...FALLBACK_RATES, next_fed_date: nextFedDate }
    }

    const rate30Rounded = Math.round(rate30 * 100) / 100
    const rate15Rounded = Math.round(rate15 * 100) / 100
    const rate7Arm = Math.round((rate30Rounded - 0.5) * 100) / 100
    // Approximate US prime: 30yr mortgage minus historical spread (~1.5%) + 3.00 for prime
    // Simpler: US prime is typically Fed Funds + 3; Fed Funds ≈ 30yr - 1.50 - 3.00 * 0 → use 8.5 proxy
    const primeRate = Math.round((rate30Rounded + 1.68) * 100) / 100 // approximate prime via spread

    return {
      rate_30yr_fixed: rate30Rounded,
      rate_15yr_fixed: rate15Rounded,
      rate_7yr_arm: rate7Arm,
      prime_rate: primeRate,
      next_fed_date: nextFedDate,
      as_of_date: new Date().toISOString().slice(0, 10),
      source: 'fred',
    }
  } catch (err) {
    console.warn('[mortgage-rates-us] Fetch error — using fallback:', err)
    return { ...FALLBACK_RATES, next_fed_date: nextFedDate }
  }
}
