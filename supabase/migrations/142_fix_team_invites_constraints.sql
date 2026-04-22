-- Fix CHECK constraints discovered during team functionality testing (2026-04-21)
-- BUG-1: team_invites.role CHECK missing 'admin' (UI allows it, DB rejects it)
-- BUG-2: team_invites.status CHECK missing 'cancelled' (types define it, DB rejects it)
-- BUG-3: appointments.status CHECK missing 'completed' (action code uses it, DB rejects it)

-- 1. Fix team_invites role constraint
ALTER TABLE team_invites DROP CONSTRAINT IF EXISTS team_invites_role_check;
ALTER TABLE team_invites ADD CONSTRAINT team_invites_role_check
  CHECK (role IN ('admin', 'agent', 'assistant'));

-- 2. Fix team_invites status constraint
ALTER TABLE team_invites DROP CONSTRAINT IF EXISTS team_invites_status_check;
ALTER TABLE team_invites ADD CONSTRAINT team_invites_status_check
  CHECK (status IN ('pending', 'sent', 'accepted', 'expired', 'cancelled'));

-- 3. Fix appointments status constraint (add 'completed')
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('requested', 'confirmed', 'denied', 'cancelled', 'completed'));
