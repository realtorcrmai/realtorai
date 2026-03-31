'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

/* ------------------------------------------------------------------ */
/*  ListingCard — compact inline card for chat messages                */
/* ------------------------------------------------------------------ */

interface ListingData {
  id: string;
  address: string;
  list_price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  status: string | null;
  current_phase: number | null;
}

export function ListingCard({ listingId }: { listingId: string }) {
  const [data, setData] = useState<ListingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/listings/${listingId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [listingId]);

  if (loading) {
    return (
      <div className="lf-card inline-block p-2 my-1 animate-pulse">
        <div className="h-4 w-40 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!data) {
    return (
      <span className="text-xs text-gray-400 italic">[Listing not found]</span>
    );
  }

  const price = data.list_price
    ? `$${data.list_price.toLocaleString()}`
    : 'Price TBD';

  const details = [
    data.bedrooms != null ? `${data.bedrooms} bed` : null,
    data.bathrooms != null ? `${data.bathrooms} bath` : null,
  ]
    .filter(Boolean)
    .join(' / ');

  const statusColor =
    data.status === 'active'
      ? 'lf-badge-active'
      : data.status === 'sold'
        ? 'lf-badge-done'
        : 'lf-badge-pending';

  return (
    <Link
      href={`/listings/${data.id}`}
      className="lf-card block p-3 my-2 hover:shadow-md transition-shadow no-underline"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">
            🏠 {data.address}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {price} {details && `· ${details}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {data.status && (
            <span className={`lf-badge ${statusColor} text-[10px]`}>
              {data.status}
            </span>
          )}
          {data.current_phase != null && (
            <span className="text-[10px] text-gray-400">
              Phase {data.current_phase}/8
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  ContactCard — compact inline card for chat messages                */
/* ------------------------------------------------------------------ */

interface ContactData {
  id: string;
  name: string;
  type: string | null;
  phone: string | null;
  email: string | null;
  engagement_score: number | null;
}

export function ContactCard({ contactId }: { contactId: string }) {
  const [data, setData] = useState<ContactData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/contacts/${contactId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [contactId]);

  if (loading) {
    return (
      <div className="lf-card inline-block p-2 my-1 animate-pulse">
        <div className="h-4 w-36 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!data) {
    return (
      <span className="text-xs text-gray-400 italic">[Contact not found]</span>
    );
  }

  const typeBadge =
    data.type === 'seller'
      ? 'lf-badge-active'
      : data.type === 'buyer'
        ? 'lf-badge-info'
        : 'lf-badge-pending';

  return (
    <Link
      href={`/contacts/${data.id}`}
      className="lf-card block p-3 my-2 hover:shadow-md transition-shadow no-underline"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">
            👤 {data.name}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {data.phone || data.email || 'No contact info'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {data.type && (
            <span className={`lf-badge ${typeBadge} text-[10px]`}>
              {data.type}
            </span>
          )}
          {data.engagement_score != null && (
            <span className="text-[10px] text-gray-400">
              Score: {data.engagement_score}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  StatsTable — styled table for market stats or comparison data      */
/* ------------------------------------------------------------------ */

interface StatsTableProps {
  headers: string[];
  rows: string[][];
}

export function StatsTable({ headers, rows }: StatsTableProps) {
  return (
    <div className="lf-card overflow-x-auto my-2 p-0">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b">
            {headers.map((h, i) => (
              <th
                key={i}
                className="text-left px-3 py-2 font-semibold text-gray-600"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b last:border-b-0">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-1.5 text-gray-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Markdown table parser                                              */
/* ------------------------------------------------------------------ */

export interface ParsedTable {
  headers: string[];
  rows: string[][];
}

/**
 * Parse a markdown table string into headers and rows.
 */
export function parseMarkdownTable(text: string): ParsedTable | null {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|'));

  if (lines.length < 3) return null;

  const parseLine = (line: string) =>
    line
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

  const headers = parseLine(lines[0]);
  // lines[1] is the separator (|---|---|)
  const rows = lines.slice(2).map(parseLine);

  if (headers.length === 0 || rows.length === 0) return null;
  return { headers, rows };
}
