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
  nav: { logo_url?: string; links: string[] };
  hero: { images: string[]; headline: string; subheadline: string };
  about: {
    headshot_url?: string;
    name: string;
    title?: string;
    bio: string;
    credentials: string[];
  };
  stats: { items: { number: string; label: string }[] };
  testimonials: { items: { quote: string; name: string; role: string }[] };
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
  cta: { headline: string; button_text: string; button_link: string };
  contact: { lead_endpoint: string };
  footer: {
    phone?: string;
    email?: string;
    address?: string;
    areas: string[];
    social_links?: Record<string, string>;
  };
}

export interface RealtorProfile {
  id: string;
  agent_name: string;
  agent_title: string | null;
  tagline: string | null;
  headshot_url: string | null;
  logo_url: string | null;
  brokerage_name: string | null;
  phone: string | null;
  email: string | null;
  office_address: string | null;
  social_links: Record<string, string>;
  bio_short: string | null;
  bio_full: string | null;
  service_areas: string[];
  credentials: string[];
}

export interface CRMData {
  profile: RealtorProfile;
  listings: {
    id: string;
    address: string;
    list_price: number | null;
    hero_image_url: string | null;
    status: string;
    mls_number: string | null;
  }[];
  testimonials: {
    client_name: string;
    content: string;
    client_location: string | null;
    rating: number | null;
  }[];
  media: { file_url: string; category: string }[];
}

export interface DesignPatterns {
  colors: string[];
  fonts: string[];
  layout_sections: string[];
  style_notes: string;
}

export interface GenerationRequest {
  site_id: string;
  listing_ids?: string[];
  testimonial_ids?: string[];
  reference_url?: string; // User-provided favorite website URL
  design_prompt?: string; // Realtor's description of desired website style/tone
}

export type GenerationStatus =
  | "started"
  | "researching"
  | "generating"
  | "previewing"
  | "completed"
  | "failed";
