// ============================================================
// A25: Instant Search — deterministic Supabase queries (no AI)
// Returns results within ~100ms for Cmd+K CommandPalette
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { escapeIlike } from '@/lib/escape-ilike';

export interface InstantResult {
  id: string;
  type: 'contact' | 'listing' | 'showing';
  title: string;
  subtitle: string;
  href: string;
  icon: string;
}

/**
 * Instant deterministic search across contacts, listings, and appointments.
 * No AI, no embeddings — just ilike queries in parallel.
 * Target: <100ms response time.
 */
export async function instantSearch(db: SupabaseClient, query: string): Promise<InstantResult[]> {
  if (!query || query.trim().length < 2) return [];

  const q = escapeIlike(query.trim());

  // Run all three queries in parallel
  const [contactsRes, listingsRes, appointmentsRes] = await Promise.all([
    db
      .from('contacts')
      .select('id, name, email, phone, type')
      .or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
      .order('name')
      .limit(5),
    db
      .from('listings')
      .select('id, address, status, list_price')
      .ilike('address', `%${q}%`)
      .order('created_at', { ascending: false })
      .limit(5),
    db
      .from('appointments')
      .select('id, listing_id, start_time, status, buyer_agent_name, listings(address)')
      .or(`buyer_agent_name.ilike.%${q}%`)
      .order('start_time', { ascending: false })
      .limit(5),
  ]);

  const results: InstantResult[] = [];

  // Map contacts
  if (contactsRes.data) {
    for (const c of contactsRes.data) {
      results.push({
        id: c.id,
        type: 'contact',
        title: c.name ?? 'Unknown',
        subtitle: [c.type, c.email, c.phone].filter(Boolean).join(' - '),
        href: `/contacts/${c.id}`,
        icon: c.type === 'seller' ? '🏠' : '👤',
      });
    }
  }

  // Map listings
  if (listingsRes.data) {
    for (const l of listingsRes.data) {
      const price = l.list_price
        ? `$${Number(l.list_price).toLocaleString()}`
        : 'No price';
      results.push({
        id: l.id,
        type: 'listing',
        title: l.address ?? 'Unknown address',
        subtitle: `${l.status ?? 'draft'} - ${price}`,
        href: `/listings/${l.id}`,
        icon: '🏡',
      });
    }
  }

  // Map appointments/showings
  if (appointmentsRes.data) {
    for (const a of appointmentsRes.data) {
      const addr =
        a.listings && typeof a.listings === 'object' && 'address' in a.listings
          ? (a.listings as { address: string }).address
          : 'Unknown';
      const time = a.start_time
        ? new Date(a.start_time).toLocaleDateString()
        : '';
      results.push({
        id: a.id,
        type: 'showing',
        title: `Showing: ${addr}`,
        subtitle: `${a.buyer_agent_name ?? 'Unknown agent'} - ${a.status ?? ''} ${time}`,
        href: `/showings/${a.id}`,
        icon: '🔑',
      });
    }
  }

  return results;
}
