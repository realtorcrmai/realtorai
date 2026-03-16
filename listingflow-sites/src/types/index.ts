export interface RealtorSite {
  id: string;
  user_email: string;
  subdomain: string;
  custom_domain: string | null;
  domain_verified: boolean;
  template: "classic" | "modern" | "luxury" | "minimal" | "bold";
  colors: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
  };
  fonts: {
    heading?: string;
    body?: string;
  };
  agent_name: string;
  agent_title: string | null;
  tagline: string | null;
  headshot_url: string | null;
  logo_url: string | null;
  brokerage_name: string | null;
  brokerage_logo_url: string | null;
  phone: string | null;
  email: string | null;
  office_address: string | null;
  social_links: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    youtube?: string;
    tiktok?: string;
  };
  bio_short: string | null;
  bio_full: string | null;
  service_areas: string[];
  credentials: string[];
  is_published: boolean;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  google_analytics_id: string | null;
  facebook_pixel_id: string | null;
  show_blog: boolean;
  show_sold: boolean;
  show_evaluation: boolean;
  show_mortgage_calc: boolean;
  enabled_pages: string[];
  created_at: string;
  updated_at: string;
}

export interface Testimonial {
  id: string;
  site_id: string;
  client_name: string;
  client_location: string | null;
  content: string;
  rating: number | null;
  listing_id: string | null;
  photo_url: string | null;
  is_featured: boolean;
  sort_order: number;
  source: string;
  created_at: string;
}

export interface SiteLead {
  id: string;
  site_id: string;
  contact_id: string | null;
  lead_type: "contact" | "showing" | "evaluation" | "newsletter" | "chat";
  source_page: string | null;
  form_data: Record<string, unknown>;
  status: "new" | "contacted" | "qualified" | "converted" | "closed";
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  created_at: string;
}

export interface SitePage {
  id: string;
  site_id: string;
  page_type: "blog" | "neighbourhood" | "custom";
  slug: string;
  title: string;
  content: string | null;
  hero_image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  is_published: boolean;
  published_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SiteMedia {
  id: string;
  site_id: string;
  file_name: string;
  file_url: string;
  file_type: "image" | "video";
  category: "gallery" | "hero" | "headshot" | "logo" | "blog";
  alt_text: string | null;
  sort_order: number;
  created_at: string;
}

// CRM shared types (read-only from website platform)
export interface Listing {
  id: string;
  address: string;
  seller_id: string | null;
  status: "active" | "pending" | "sold";
  list_price: number | null;
  hero_image_url: string | null;
  mls_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  type: "buyer" | "seller";
  notes: string | null;
  created_at: string;
}

export interface Prompt {
  id: string;
  listing_id: string;
  mls_public: string | null;
  mls_realtor: string | null;
  ig_caption: string | null;
  video_prompt: string | null;
  image_prompt: string | null;
}

export interface MediaAsset {
  id: string;
  listing_id: string;
  asset_type: "video" | "image";
  status: "pending" | "processing" | "completed" | "failed";
  output_url: string | null;
}

// ── AI Website Generation ──

export interface SiteTheme {
  colors: {
    bg: string;
    text: string;
    accent: string;
    muted: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
}

export interface SiteConfig {
  theme: SiteTheme;
  nav: {
    logo_url?: string;
    links: string[];
  };
  hero: {
    images: string[];
    headline: string;
    subheadline: string;
  };
  about: {
    headshot_url?: string;
    name: string;
    title?: string;
    bio: string;
    credentials: string[];
  };
  stats: {
    items: { number: string; label: string }[];
  };
  testimonials: {
    items: { quote: string; name: string; role: string }[];
  };
  listings: {
    items: {
      photo?: string;
      address: string;
      price: string;
      beds: number;
      baths: number;
      sqft?: string;
      status?: string;
    }[];
  };
  cta: {
    headline: string;
    button_text: string;
    button_link: string;
  };
  contact: {
    lead_endpoint: string;
  };
  footer: {
    phone?: string;
    email?: string;
    address?: string;
    areas: string[];
    social_links?: {
      instagram?: string;
      facebook?: string;
      linkedin?: string;
      youtube?: string;
    };
  };
}

export interface SiteGeneration {
  id: string;
  site_id: string;
  status: "started" | "researching" | "generating" | "previewing" | "completed" | "failed";
  reference_scrapes: { url: string; design_patterns: Record<string, unknown> }[] | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteVariant {
  id: string;
  generation_id: string;
  style_name: string;
  site_config: SiteConfig;
  preview_url: string | null;
  screenshots: { desktop: string; mobile: string } | null;
  is_selected: boolean;
  cloudflare_project_name: string | null;
  live_url: string | null;
  created_at: string;
}
