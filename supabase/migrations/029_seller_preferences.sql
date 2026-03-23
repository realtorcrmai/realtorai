-- Migration: Add seller_preferences JSONB column to contacts table
-- Stores: motivation, desired_list_price, earliest_list_date, occupancy, has_purchase_plan_after_sale, notes

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS seller_preferences JSONB DEFAULT NULL;

COMMENT ON COLUMN contacts.seller_preferences IS 'Seller-specific preferences: motivation, desired_list_price, earliest_list_date, occupancy, has_purchase_plan_after_sale, notes';
