import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const RESEND_KEY = process.env.RESEND_API_KEY

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const resend = new Resend(RESEND_KEY)

const EDITION_ID = 'ebda943c-4052-4ee4-9a72-2c203701e331'
const TEST_EMAIL = 'er.amndeep@gmail.com'

const { data: edition, error } = await supabase
  .from('editorial_editions')
  .select('*')
  .eq('id', EDITION_ID)
  .single()

if (error) { console.error('Fetch error:', error.message); process.exit(1) }

console.log('Edition:', edition.title)
console.log('Status:', edition.status)

const blocks = edition.blocks || []
console.log('Blocks:', blocks.length)

// Build a styled editorial email HTML
const blockRows = blocks.map(b => {
  const content = b.content || {}
  switch (b.type) {
    case 'hero':
      return `
        <div style="background:#1a2e1a;padding:40px;text-align:center;color:#fff">
          <p style="font:700 10px/1 Arial;letter-spacing:3px;color:#c9a96e;text-transform:uppercase;margin:0 0 12px">Realtors360 Editorial</p>
          <h1 style="font:700 32px/1.2 Georgia,serif;margin:0 0 12px">${content.headline || edition.title}</h1>
          ${content.subheadline ? `<p style="font:16px/1.5 Georgia,serif;color:#e0d8c8;margin:0">${content.subheadline}</p>` : ''}
        </div>`
    case 'market_commentary':
      return `
        <div style="padding:28px 40px;background:#fff">
          <p style="font:700 10px/1 Arial;letter-spacing:2.5px;color:#c9a96e;text-transform:uppercase;margin:0 0 6px">Market Commentary</p>
          <h2 style="font:700 20px/1.2 Georgia,serif;color:#1a2e1a;margin:0 0 16px">${content.neighbourhood || 'Vancouver'}</h2>
          ${content.avg_sale_price ? `<p style="font:bold 22px Georgia;color:#1a2e1a;margin:0 0 4px">Avg Sale: $${(content.avg_sale_price/100).toLocaleString('en-CA')}</p>` : ''}
          <p style="font:15px/1.75 Georgia,serif;color:#4a4a3a;margin:0">${content.body || ''}</p>
        </div>`
    case 'rate_watch':
      return `
        <div style="padding:28px 40px;background:#fff">
          <p style="font:700 10px/1 Arial;letter-spacing:2.5px;color:#c9a96e;text-transform:uppercase;margin:0 0 6px">Rate Watch</p>
          <h2 style="font:700 20px/1.2 Georgia,serif;color:#1a2e1a;margin:0 0 16px">Canadian Mortgage Rates</h2>
          ${content.rate_5yr_fixed != null ? `<p style="margin:4px 0"><strong>5yr Fixed:</strong> ${content.rate_5yr_fixed.toFixed(2)}%</p>` : ''}
          ${content.prime_rate != null ? `<p style="margin:4px 0"><strong>BoC Prime:</strong> ${content.prime_rate.toFixed(2)}%</p>` : ''}
          ${content.commentary ? `<p style="font-style:italic;color:#4a4a3a;margin-top:12px">${content.commentary}</p>` : ''}
        </div>`
    case 'just_sold':
      return `
        <div style="padding:24px 28px;background:#f9f7f2;border-left:4px solid #c9a96e">
          <p style="font:700 10px/1 Arial;letter-spacing:2.5px;color:#c9a96e;text-transform:uppercase;margin:0 0 8px">Just Sold</p>
          <p style="font:700 18px/1.3 Georgia,serif;color:#1a2e1a;margin:0 0 8px">${content.address || ''}</p>
          ${content.sale_price ? `<p style="font:700 26px/1 Georgia,serif;color:#1a6e3c;margin:0 0 6px">$${(content.sale_price/100).toLocaleString('en-CA')}</p>` : ''}
          ${content.commentary ? `<p style="font:14px/1.65 Arial;color:#4a4a3a;margin:12px 0 0;border-top:1px solid #e8e2d5;padding-top:12px">${content.commentary}</p>` : ''}
        </div>`
    case 'neighborhood_spotlight':
      return `
        <div style="padding:28px 40px;background:#f9f7f2">
          <p style="font:700 10px/1 Arial;letter-spacing:2.5px;color:#c9a96e;text-transform:uppercase;margin:0 0 8px">Neighbourhood Spotlight</p>
          <h2 style="font:700 20px/1.2 Georgia,serif;color:#1a2e1a;margin:0 0 6px">${content.neighbourhood || ''}</h2>
          ${content.tagline ? `<p style="font-style:italic;color:#6b6b5a;margin:0 0 14px">${content.tagline}</p>` : ''}
          ${content.description ? `<p style="font:14px/1.65 Arial;color:#4a4a3a;margin:0">${content.description}</p>` : ''}
        </div>`
    case 'agent_note':
      return `
        <div style="padding:28px 40px;background:#fff">
          <p style="font:700 10px/1 Arial;letter-spacing:2.5px;color:#c9a96e;text-transform:uppercase;margin:0 0 6px">A Note From Your Agent</p>
          <p style="font:15px/1.75 Georgia,serif;color:#4a4a3a;margin:0;font-style:italic">${content.body || ''}</p>
          ${content.sign_off ? `<p style="font:700 14px Arial;color:#1a2e1a;margin:12px 0 0">— ${content.sign_off}</p>` : ''}
        </div>`
    default:
      return `<div style="padding:16px 40px;color:#6b6b5a;font:13px Arial">[${b.type} block]</div>`
  }
}).join('<hr style="border:none;border-top:1px solid #e8e2d5;margin:0">')

const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN">
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${edition.title}</title></head>
<body style="margin:0;padding:0;background:#f0ebe0;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ebe0;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border:1px solid #e8e2d5">
<tr><td>
${blockRows || `<div style="padding:40px;text-align:center;color:#6b6b5a">
  <h2 style="font:700 22px Georgia;color:#1a2e1a">${edition.title}</h2>
  <p>This edition has no blocks yet.</p>
</div>`}
</td></tr>
<tr><td style="background:#1a2e1a;padding:24px 40px;text-align:center">
  <p style="font:700 13px Arial;color:#c9a96e;margin:0 0 4px">Realtors360</p>
  <p style="font:12px Arial;color:#7a8c7a;margin:0"><a href="#" style="color:#7a8c7a">Unsubscribe</a> · Vancouver, BC</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`

console.log('\nSending to:', TEST_EMAIL)

const { data: sendData, error: sendErr } = await resend.emails.send({
  from: 'Realtors360 <onboarding@resend.dev>',
  to: [TEST_EMAIL],
  subject: `[TEST] ${edition.title}`,
  html,
})

if (sendErr) {
  console.error('❌ Send error:', JSON.stringify(sendErr))
  process.exit(1)
} else {
  console.log('✅ Email sent!')
  console.log('   Message ID:', sendData.id)
  console.log('   To:', TEST_EMAIL)
  console.log('   Subject: [TEST]', edition.title)
}
