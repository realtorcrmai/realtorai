-- Migration 054: Add "customer" and "agent" contact types
-- customer = unqualified lead (hasn't declared buyer/seller intent)
-- agent = cooperating agents from other brokerages (receive listing blasts only)

-- Expand the type CHECK constraint
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_type_check;
ALTER TABLE contacts ADD CONSTRAINT contacts_type_check
  CHECK (type IN ('buyer', 'seller', 'partner', 'other', 'customer', 'agent'));

-- Expand workflow contact_type to match
ALTER TABLE workflows DROP CONSTRAINT IF EXISTS workflows_contact_type_check;
ALTER TABLE workflows ADD CONSTRAINT workflows_contact_type_check
  CHECK (contact_type IS NULL OR contact_type IN ('buyer', 'seller', 'partner', 'any', 'customer', 'agent'));
