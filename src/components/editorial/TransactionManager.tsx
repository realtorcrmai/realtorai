'use client'

import React, { useState, useEffect } from 'react'
import { listTransactions, createTransaction, deleteTransaction } from '@/actions/editorial'
import type { EditorialTransaction } from '@/types/editorial'

function formatCents(cents: number | null): string {
  if (!cents) return '—'
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(cents / 100)
}

export function TransactionManager() {
  const [transactions, setTransactions] = useState<EditorialTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    address: '',
    city: 'Vancouver',
    province: 'BC',
    transaction_type: 'just_sold' as 'just_sold' | 'just_listed' | 'coming_soon' | 'price_reduced',
    sale_price: '',
    list_price: '',
    days_on_market: '',
    headline: '',
    story: '',
    sold_at: '',
  })

  useEffect(() => {
    listTransactions().then(r => {
      if (r.data) setTransactions(r.data)
      setLoading(false)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const result = await createTransaction({
      address: form.address,
      city: form.city,
      province: form.province,
      transaction_type: form.transaction_type,
      sale_price: form.sale_price ? Math.round(parseFloat(form.sale_price) * 100) : null,
      list_price: Math.round(parseFloat(form.list_price) * 100),
      days_on_market: form.days_on_market ? parseInt(form.days_on_market) : null,
      headline: form.headline || null,
      story: form.story || null,
      sold_at: form.sold_at || null,
      is_featured: false,
    })
    setSaving(false)
    if (result.error) { setError(result.error); return }
    if (result.data) setTransactions(prev => [result.data!, ...prev])
    setShowForm(false)
    setForm({ address: '', city: 'Vancouver', province: 'BC', transaction_type: 'just_sold', sale_price: '', list_price: '', days_on_market: '', headline: '', story: '', sold_at: '' })
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this transaction?')) return
    await deleteTransaction(id)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }

  if (loading) return <div style={{ padding: 32, textAlign: 'center', color: '#6b6b8d' }}>Loading transactions…</div>

  return (
    <div style={{ padding: '0 0 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1535', margin: 0 }}>🏠 My Transactions</h2>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{ backgroundColor: '#FF7A59', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          {showForm ? 'Cancel' : '+ Add Transaction'}
        </button>
      </div>

      {error && <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 14, marginBottom: 16 }}>{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ backgroundColor: '#f9f9fc', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Address *</label>
              <input required value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                placeholder="142 Maple Drive, Burnaby, BC"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Type</label>
              <select value={form.transaction_type} onChange={e => setForm(p => ({ ...p, transaction_type: e.target.value as typeof form.transaction_type }))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}>
                <option value="just_sold">Just Sold</option>
                <option value="just_listed">Just Listed</option>
                <option value="coming_soon">Coming Soon</option>
                <option value="price_reduced">Price Reduced</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>List Price *</label>
              <input required type="number" value={form.list_price} onChange={e => setForm(p => ({ ...p, list_price: e.target.value }))}
                placeholder="1285000"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Sale Price</label>
              <input type="number" value={form.sale_price} onChange={e => setForm(p => ({ ...p, sale_price: e.target.value }))}
                placeholder="1350000"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Days on Market</label>
              <input type="number" value={form.days_on_market} onChange={e => setForm(p => ({ ...p, days_on_market: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Sold Date</label>
              <input type="date" value={form.sold_at} onChange={e => setForm(p => ({ ...p, sold_at: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Headline (optional, max 120 chars)</label>
              <input value={form.headline} maxLength={120} onChange={e => setForm(p => ({ ...p, headline: e.target.value }))}
                placeholder="Another happy family in their new home!"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Story (optional, max 600 chars)</label>
              <textarea value={form.story} maxLength={600} onChange={e => setForm(p => ({ ...p, story: e.target.value }))}
                rows={3} placeholder="Brief story about this transaction…"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowForm(false)}
              style={{ padding: '8px 20px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, cursor: 'pointer', backgroundColor: '#fff' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ backgroundColor: '#FF7A59', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : 'Add Transaction'}
            </button>
          </div>
        </form>
      )}

      {transactions.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '48px 32px', color: '#6b6b8d' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏘️</div>
          <p style={{ margin: 0 }}>No transactions yet. Add a recent sale to feature it in your just_sold newsletter blocks.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {transactions.map(t => (
          <div key={t.id} style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1535' }}>{t.address}</div>
              <div style={{ fontSize: 13, color: '#6b6b8d', marginTop: 4 }}>
                <span style={{ backgroundColor: t.transaction_type === 'just_sold' ? '#dcfce7' : '#dbeafe', color: t.transaction_type === 'just_sold' ? '#166534' : '#1e40af', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600, marginRight: 8 }}>
                  {t.transaction_type.replace('_', ' ').toUpperCase()}
                </span>
                {t.sale_price && <span>Sold {formatCents(t.sale_price)}</span>}
                {t.days_on_market && <span> · {t.days_on_market} days</span>}
              </div>
              {t.headline && <div style={{ fontSize: 13, color: '#4b5563', marginTop: 6, fontStyle: 'italic' }}>&ldquo;{t.headline}&rdquo;</div>}
            </div>
            <button onClick={() => handleDelete(t.id)}
              style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: '#dc2626', padding: '4px 8px', borderRadius: 6 }}
              aria-label="Delete transaction"
            >🗑</button>
          </div>
        ))}
      </div>
    </div>
  )
}
