export const dynamic = 'force-dynamic'

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function EditionAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params
  const supabase = createAdminClient()

  const { data: edition } = await supabase
    .from('editorial_editions')
    .select('id, title, status, sent_at, send_count, recipient_count, subject_a, subject_b, active_variant, ab_winner')
    .eq('id', id)
    .eq('realtor_id', session.user.id)
    .single()

  if (!edition) redirect('/newsletters/editorial')

  const { data: analytics } = await supabase
    .from('editorial_analytics')
    .select('*')
    .eq('edition_id', id)
    .single()

  const openRate: number = (analytics as Record<string, unknown> | null)?.open_rate as number ?? 0
  const clickRate: number = (analytics as Record<string, unknown> | null)?.click_rate as number ?? 0
  const recipients: number = (analytics as Record<string, unknown> | null)?.recipients as number ?? edition.recipient_count ?? 0
  const opens: number = (analytics as Record<string, unknown> | null)?.opens as number ?? 0
  const clicks: number = (analytics as Record<string, unknown> | null)?.clicks as number ?? 0
  const bounced: number = (analytics as Record<string, unknown> | null)?.bounced as number ?? 0
  const unsubscribed: number = (analytics as Record<string, unknown> | null)?.unsubscribed as number ?? 0

  const aOpens: number = (analytics as Record<string, unknown> | null)?.variant_a_opens as number ?? 0
  const bOpens: number = (analytics as Record<string, unknown> | null)?.variant_b_opens as number ?? 0
  const hasABTest = edition.subject_a && edition.subject_b && edition.subject_a !== edition.subject_b
  const winner: string | null = edition.ab_winner ?? null

  const blockClicks = (analytics as Record<string, unknown> | null)?.block_clicks as Record<string, number> | null

  const metrics = [
    { label: 'Recipients', value: recipients.toLocaleString(), icon: '👥', highlight: false },
    { label: 'Opens', value: opens.toLocaleString(), icon: '👁', highlight: false },
    { label: 'Open Rate', value: `${openRate.toFixed(1)}%`, icon: '📬', highlight: openRate >= 35 },
    { label: 'Clicks', value: clicks.toLocaleString(), icon: '🖱', highlight: false },
    { label: 'Click Rate', value: `${clickRate.toFixed(1)}%`, icon: '🎯', highlight: clickRate >= 5 },
    { label: 'Bounced', value: bounced.toLocaleString(), icon: '↩️', highlight: false },
    { label: 'Unsubscribed', value: unsubscribed.toLocaleString(), icon: '🚫', highlight: false },
  ]

  return (
    <div style={{ maxWidth: 800, margin: '32px auto', padding: '0 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Link href={`/newsletters/editorial/${id}/edit`} style={{ fontSize: 13, color: '#6b6b8d', textDecoration: 'none' }}>
          ← Back to editor
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1535', margin: '12px 0 4px' }}>
          📊 {edition.title}
        </h1>
        <p style={{ fontSize: 14, color: '#6b6b8d', margin: 0 }}>
          {edition.sent_at
            ? `Sent ${new Date(edition.sent_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}`
            : 'Not yet sent'}
          {recipients > 0 && ` · ${recipients.toLocaleString()} recipients`}
        </p>
      </div>

      {edition.status !== 'sent' && (
        <div style={{ backgroundColor: '#fefce8', border: '1px solid #fde047', borderRadius: 8, padding: '12px 16px', marginBottom: 24, fontSize: 14, color: '#854d0e' }}>
          ⚠️ This edition hasn&apos;t been sent yet. Analytics will appear after sending.
        </div>
      )}

      {/* Core metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
        {metrics.map(m => (
          <div key={m.label} style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{m.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: m.highlight ? '#059669' : '#1a1535' }}>{m.value}</div>
            <div style={{ fontSize: 12, color: '#6b6b8d', marginTop: 4 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* A/B test results */}
      {hasABTest && (
        <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1535', margin: '0 0 16px' }}>🧪 A/B Subject Line Test</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {(['a', 'b'] as const).map(variant => {
              const variantOpens = variant === 'a' ? aOpens : bOpens
              const isWinner = winner === variant
              const subjectLine = variant === 'a' ? edition.subject_a : edition.subject_b
              return (
                <div key={variant} style={{ border: `2px solid ${isWinner ? '#059669' : '#e5e7eb'}`, borderRadius: 8, padding: 16, position: 'relative' }}>
                  {isWinner && (
                    <span style={{ position: 'absolute', top: -10, right: 12, backgroundColor: '#059669', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                      WINNER
                    </span>
                  )}
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#6b6b8d', marginBottom: 8 }}>VARIANT {variant.toUpperCase()}</div>
                  <div style={{ fontSize: 14, color: '#1a1535', marginBottom: 12, fontStyle: 'italic' }}>&ldquo;{subjectLine}&rdquo;</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1535' }}>{variantOpens} opens</div>
                  {recipients > 0 && (
                    <div style={{ fontSize: 12, color: '#6b6b8d' }}>{((variantOpens / recipients) * 100).toFixed(1)}% rate</div>
                  )}
                </div>
              )
            })}
          </div>
          {!winner && (
            <p style={{ fontSize: 13, color: '#6b6b8d', marginTop: 12, textAlign: 'center' }}>
              Winner determined after 4 hours via automated cron job.
            </p>
          )}
        </div>
      )}

      {/* Block-level clicks */}
      {blockClicks && Object.keys(blockClicks).length > 0 && (
        <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1535', margin: '0 0 16px' }}>🖱 Block Performance</h2>
          {Object.entries(blockClicks)
            .sort((a, b) => b[1] - a[1])
            .map(([blockId, count]) => (
              <div key={blockId} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: 14, color: '#374151' }}>{blockId}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1535' }}>{count} clicks</span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
