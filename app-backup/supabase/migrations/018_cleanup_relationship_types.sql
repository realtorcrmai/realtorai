-- Remove 'referral' from relationship_type check constraint
-- Referrals are tracked in the dedicated `referrals` table, not as a relationship type.
ALTER TABLE contact_relationships DROP CONSTRAINT IF EXISTS contact_relationships_relationship_type_check;
ALTER TABLE contact_relationships ADD CONSTRAINT contact_relationships_relationship_type_check
  CHECK (relationship_type IN ('spouse', 'parent', 'child', 'sibling', 'friend', 'colleague', 'neighbour', 'other'));

-- Delete any existing relationships with type 'referral' (these are covered by the referrals table)
DELETE FROM contact_relationships WHERE relationship_type = 'referral';
