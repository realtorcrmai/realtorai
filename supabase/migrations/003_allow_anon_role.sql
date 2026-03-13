-- ============================================================
-- Allow anon role full access to all tables
-- Needed because the app uses NextAuth (not Supabase Auth),
-- so there is never an authenticated Supabase session.
-- When the service_role key is unavailable, the anon key is
-- used as a fallback.
-- ============================================================

-- contacts
CREATE POLICY "Anon users full access" ON contacts
  FOR ALL USING (auth.role() = 'anon')
  WITH CHECK (auth.role() = 'anon');

-- listings
CREATE POLICY "Anon users full access" ON listings
  FOR ALL USING (auth.role() = 'anon')
  WITH CHECK (auth.role() = 'anon');

-- appointments
CREATE POLICY "Anon users full access" ON appointments
  FOR ALL USING (auth.role() = 'anon')
  WITH CHECK (auth.role() = 'anon');

-- communications
CREATE POLICY "Anon users full access" ON communications
  FOR ALL USING (auth.role() = 'anon')
  WITH CHECK (auth.role() = 'anon');

-- listing_documents
CREATE POLICY "Anon users full access" ON listing_documents
  FOR ALL USING (auth.role() = 'anon')
  WITH CHECK (auth.role() = 'anon');

-- google_tokens
CREATE POLICY "Anon users full access" ON google_tokens
  FOR ALL USING (auth.role() = 'anon')
  WITH CHECK (auth.role() = 'anon');

-- tasks
CREATE POLICY "Anon users full access" ON tasks
  FOR ALL USING (auth.role() = 'anon')
  WITH CHECK (auth.role() = 'anon');
