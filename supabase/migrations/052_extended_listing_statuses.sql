-- Migration 052: Extend listing status enum to include real-world lifecycle statuses
-- Adds: conditional, cancelled, expired, withdrawn
-- These allow manual override of listing status independent of the workflow phases.

ALTER TABLE listings
  DROP CONSTRAINT IF EXISTS listings_status_check;

ALTER TABLE listings
  ADD CONSTRAINT listings_status_check
    CHECK (status IN ('active', 'pending', 'conditional', 'sold', 'cancelled', 'expired', 'withdrawn'));
