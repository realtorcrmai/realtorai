-- ListingFlow Sites — Website Platform Tables
-- Run this in the Supabase SQL editor

-- Site configuration per realtor
CREATE TABLE IF NOT EXISTS realtor_sites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  custom_domain TEXT UNIQUE,
  domain_verified BOOLEAN DEFAULT false,
  template TEXT NOT NULL DEFAULT 'modern',
  colors JSONB DEFAULT '{}',
  fonts JSONB DEFAULT '{}',
  agent_name TEXT NOT NULL,
  agent_title TEXT,
  tagline TEXT,
  headshot_url TEXT,
  logo_url TEXT,
  brokerage_name TEXT,
  brokerage_logo_url TEXT,
  phone TEXT,
  email TEXT,
  office_address TEXT,
  social_links JSONB DEFAULT '{}',
  bio_short TEXT,
  bio_full TEXT,
  service_areas TEXT[] DEFAULT '{}',
  credentials TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  seo_title TEXT,
  seo_description TEXT,
  og_image_url TEXT,
  google_analytics_id TEXT,
  facebook_pixel_id TEXT,
  show_blog BOOLEAN DEFAULT false,
  show_sold BOOLEAN DEFAULT true,
  show_evaluation BOOLEAN DEFAULT true,
  show_mortgage_calc BOOLEAN DEFAULT true,
  enabled_pages TEXT[] DEFAULT ARRAY['home','about','listings','contact'],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Custom pages (blog posts, neighbourhood guides, custom pages)
CREATE TABLE IF NOT EXISTS site_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID REFERENCES realtor_sites(id) ON DELETE CASCADE,
  page_type TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  hero_image_url TEXT,
  seo_title TEXT,
  seo_description TEXT,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, slug)
);

-- Client testimonials
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID REFERENCES realtor_sites(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_location TEXT,
  content TEXT NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  listing_id UUID,
  photo_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Incoming website leads
CREATE TABLE IF NOT EXISTS site_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID REFERENCES realtor_sites(id) ON DELETE CASCADE,
  contact_id UUID,
  lead_type TEXT NOT NULL,
  source_page TEXT,
  form_data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'new',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Gallery / media for website
CREATE TABLE IF NOT EXISTS site_media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID REFERENCES realtor_sites(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT DEFAULT 'image',
  category TEXT DEFAULT 'gallery',
  alt_text TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Lightweight analytics events
CREATE TABLE IF NOT EXISTS site_analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID REFERENCES realtor_sites(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  page_path TEXT,
  listing_id UUID,
  referrer TEXT,
  user_agent TEXT,
  device_type TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_realtor_sites_subdomain ON realtor_sites(subdomain);
CREATE INDEX IF NOT EXISTS idx_realtor_sites_custom_domain ON realtor_sites(custom_domain);
CREATE INDEX IF NOT EXISTS idx_site_pages_site_slug ON site_pages(site_id, slug);
CREATE INDEX IF NOT EXISTS idx_site_leads_site ON site_leads(site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_analytics_site ON site_analytics_events(site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_testimonials_site ON testimonials(site_id, sort_order);

-- RLS policies (same pattern as CRM: authenticated users get full access)
ALTER TABLE realtor_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON realtor_sites FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON site_pages FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON testimonials FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON site_leads FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON site_media FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON site_analytics_events FOR ALL USING (true);
