-- Backfill: existing users who completed onboarding should not be forced
-- through the personalization flow (added in migration 095).
UPDATE users
SET personalization_completed = true
WHERE onboarding_completed = true
  AND personalization_completed = false;
