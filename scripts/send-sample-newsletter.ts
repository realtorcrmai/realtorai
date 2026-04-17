/**
 * send-sample-newsletter.ts
 *
 * Sends a sample Market Update newsletter using the real MarketUpdate React Email
 * template — same template used by the live newsletter engine, with the Apple system
 * font stack and Realtors360 design system.
 *
 * Usage: npx tsx scripts/send-sample-newsletter.ts
 */

import { Resend } from 'resend'
import { render } from '@react-email/components'
import * as React from 'react'
import { PremiumListingShowcase } from '@/emails/PremiumListingShowcase'

const resend = new Resend('re_irQXbNRk_ERs9PMkpZu5nSHJGh7zeSKpM')

const branding = {
  name: 'Aman Dhindsa',
  title: 'REALTOR®',
  brokerage: 'Realtors360 Real Estate Group',
  phone: '+1 (604) 555-0192',
  email: 'aman@realtors360.ai',
  accentColor: '#1a1a1a',
  physicalAddress: '1055 Dunsmuir St, Vancouver, BC V7X 1L3',
}

// High-quality Unsplash photos for demo (publicly accessible, no auth needed)
const HERO = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=85&auto=format'
const G1   = 'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=600&q=80&auto=format'
const G2   = 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=600&q=80&auto=format'
const G3   = 'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=600&q=80&auto=format'
const G4   = 'https://images.unsplash.com/photo-1556020685-ae41abfc9365?w=600&q=80&auto=format'

async function main() {
  const html = await render(
    React.createElement(PremiumListingShowcase, {
      branding,
      recipientName: 'Aman',
      address: '7231 Oak Street',
      cityStatePostal: 'Vancouver, BC  V6P 3Z5',
      price: '$2,105,000',
      beds: 5,
      baths: 4,
      sqft: '3,840 sq.ft.',
      propertyType: 'Detached',
      heroPhoto: HERO,
      galleryPhotos: [
        { url: G1, alt: 'Chef\'s kitchen' },
        { url: G2, alt: 'Primary suite' },
        { url: G3, alt: 'Living room' },
        { url: G4, alt: 'Rear garden' },
      ],
      headline: 'A rare Vancouver Special reimagined with precision and restraint.',
      description:
        'Set on a 50×122 lot on one of South Granville\'s most sought-after blocks, this completely reimagined home delivers 3,840 sq.ft. of considered living across three levels. The main floor centres on a double-height great room with 12-foot ceilings, white oak millwork throughout, and a chef\'s kitchen anchored by Calacatta marble and a 48" La Cornue range. Six offers were received in the first week — this is a replacement property that rarely comes to market in this condition.',
      features: [
        '5 beds · 4 baths across 3 levels',
        'Chef\'s kitchen — La Cornue range, Calacatta marble, Sub-Zero refrigeration',
        'Primary suite with private terrace overlooking rear garden',
        'Radiant in-floor heat + forced air, Control4 smart home',
        'Detached double garage + lane access',
        '97 Walk Score — steps to Arbutus Greenway and South Granville shops',
      ],
      openHouseDate: 'Sunday, April 27, 2026',
      openHouseTime: '2:00 PM – 4:00 PM',
      listingUrl: 'mailto:aman@realtors360.ai?subject=7231 Oak Street — Private Showing',
      unsubscribeUrl: 'https://realtors360.ai/unsubscribe',
    })
  )

  const result = await resend.emails.send({
    from: 'Aman @ Realtors360 <aman@realtors360.ai>',
    to: 'er.amndeep@gmail.com',
    subject: 'New Listing: 7231 Oak Street, Vancouver — $2,105,000',
    html,
  })

  if (result.error) {
    console.error('Send failed:', JSON.stringify(result.error, null, 2))
    process.exit(1)
  } else {
    console.log('Sent successfully! ID:', result.data?.id)
  }
}

main()
