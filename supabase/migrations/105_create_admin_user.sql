-- Create a dedicated admin user for platform administration
-- Login: admin@realtors360.ai / Admin360!secure

INSERT INTO users (email, name, role, plan, is_active, onboarding_completed, onboarding_step, signup_source, password_hash)
VALUES (
  'admin@realtors360.ai',
  'Platform Admin',
  'admin',
  'admin',
  true,
  true,
  7,
  'admin_created',
  '$2b$10$Z0jfDJ/.5nbS5IhEM7sBe.Rzps99Bqhb.X74LyEMuNql5We/9LbiK'
)
ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  plan = 'admin',
  is_active = true,
  password_hash = '$2b$10$Z0jfDJ/.5nbS5IhEM7sBe.Rzps99Bqhb.X74LyEMuNql5We/9LbiK';
