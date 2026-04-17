// Magnate Social — Type Definitions

// ============================================================
// Database Types
// ============================================================

export interface SocialBrandKit {
  id: string;
  user_email: string;
  logo_url: string | null;
  headshot_url: string | null;
  primary_colour: string;
  secondary_colour: string;
  accent_colour: string;
  heading_font: string;
  body_font: string;
  voice_tone: VoiceTone;
  voice_rules: VoiceRule[];
  voice_custom_description: string | null;
  agent_name: string | null;
  brokerage_name: string | null;
  brokerage_logo_url: string | null;
  license_number: string | null;
  bio_text: string | null;
  service_areas: string[];
  phone: string | null;
  email: string | null;
  website_url: string | null;
  default_hashtags: string[];
  default_cta: string;
  emoji_preference: EmojiPreference;
  preferred_platforms: SocialPlatform[];
  quiet_hours_start: number;
  quiet_hours_end: number;
  posting_days: string[];
  api_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface SocialAccount {
  id: string;
  brand_kit_id: string;
  platform: SocialPlatform;
  platform_account_id: string;
  account_name: string | null;
  account_type: string | null;
  profile_url: string | null;
  profile_image_url: string | null;
  followers_count: number;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  token_scopes: string[];
  is_active: boolean;
  last_used_at: string | null;
  last_error: string | null;
  connection_status: ConnectionStatus;
  connected_at: string;
  updated_at: string;
}

export interface SocialPost {
  id: string;
  brand_kit_id: string;
  content_type: ContentType;
  caption: string | null;
  caption_original: string | null;
  hashtags: string[];
  media_urls: string[];
  media_type: MediaType;
  template_id: string | null;
  source_type: SourceType | null;
  source_id: string | null;
  source_data: Record<string, unknown>;
  target_platforms: SocialPlatform[];
  platform_variants: Record<string, PlatformVariant>;
  status: PostStatus;
  scheduled_at: string | null;
  published_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  ai_generated: boolean;
  ai_model: string | null;
  ai_prompt: string | null;
  ai_reasoning: string | null;
  content_score: number | null;
  content_score_breakdown: ContentScoreBreakdown;
  total_impressions: number;
  total_engagement: number;
  total_clicks: number;
  total_leads: number;
  utm_source: string | null;
  utm_medium: string;
  utm_campaign: string | null;
  includes_brokerage: boolean;
  compliance_checked: boolean;
  compliance_notes: string | null;
  retry_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface SocialPostPublish {
  id: string;
  post_id: string;
  account_id: string;
  platform: SocialPlatform;
  platform_post_id: string | null;
  platform_url: string | null;
  status: PublishStatus;
  error_message: string | null;
  error_code: string | null;
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  video_views: number;
  engagement_rate: number;
  last_synced_at: string | null;
  created_at: string;
}

export interface SocialTemplate {
  id: string;
  brand_kit_id: string | null;
  name: string;
  category: ContentType;
  description: string | null;
  media_type: MediaType;
  supported_platforms: SocialPlatform[];
  caption_template: string;
  hashtag_suggestions: string[];
  layout_config: Record<string, unknown>;
  thumbnail_url: string | null;
  is_system: boolean;
  is_active: boolean;
  usage_count: number;
  avg_engagement: number;
  created_at: string;
  updated_at: string;
}

export interface SocialAnalyticsDaily {
  id: string;
  brand_kit_id: string;
  platform: SocialPlatform;
  date: string;
  followers: number;
  followers_change: number;
  impressions: number;
  reach: number;
  engagement: number;
  clicks: number;
  leads: number;
  posts_count: number;
  top_post_id: string | null;
  engagement_by_type: Record<string, number>;
  content_type_performance: Record<string, { impressions: number; engagement: number }>;
  metadata: Record<string, unknown>;
}

// ============================================================
// Enums
// ============================================================

export type SocialPlatform =
  | "facebook"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "linkedin"
  | "pinterest"
  | "google_business";

export type VoiceTone = "professional" | "friendly" | "luxury" | "bold" | "warm" | "custom";

export interface VoiceRule {
  rule: string;
  source: string;
  created_at: string;
}

export type EmojiPreference = "none" | "minimal" | "moderate" | "heavy";

export type ConnectionStatus = "connected" | "expiring" | "disconnected" | "error";

export type ContentType =
  | "just_listed"
  | "just_sold"
  | "open_house"
  | "price_reduced"
  | "coming_soon"
  | "market_update"
  | "neighbourhood"
  | "testimonial"
  | "tips"
  | "holiday"
  | "milestone"
  | "custom";

export type MediaType = "image" | "carousel" | "video" | "reel" | "story";

export type SourceType = "listing" | "contact" | "testimonial" | "market_data" | "manual" | "ai_suggestion" | "trigger";

export type PostStatus = "draft" | "approved" | "scheduled" | "publishing" | "published" | "failed" | "cancelled" | "skipped";

export type PublishStatus = "pending" | "publishing" | "published" | "failed" | "deleted";

// ============================================================
// Content Generation Types
// ============================================================

export interface PlatformVariant {
  caption: string;
  hashtags: string[];
  media_urls?: string[];
  cta?: string;
}

export interface ContentScoreBreakdown {
  relevance?: number;
  creativity?: number;
  cta_clarity?: number;
  brand_match?: number;
  engagement_potential?: number;
  compliance?: number;
  overall?: number;
}

export interface GeneratedContent {
  facebook: PlatformVariant;
  instagram: PlatformVariant;
  instagram_carousel?: {
    slides: { caption: string; overlay_text?: string }[];
    main_caption: string;
    hashtags: string[];
  };
  tiktok?: PlatformVariant;
  youtube?: PlatformVariant;
  linkedin?: PlatformVariant;
}

export interface ContentGenerationRequest {
  brand_kit: SocialBrandKit;
  content_type: ContentType;
  listing?: {
    id: string;
    address: string;
    price: number;
    beds: number;
    baths: number;
    sqft: number;
    property_type: string;
    description: string;
    features: string[];
    neighbourhood: string;
    hero_image_url: string;
    images: string[];
    status: string;
  };
  testimonial?: {
    quote: string;
    author: string;
    detail: string;
  };
  market_data?: {
    avg_price: number;
    price_change_pct: number;
    avg_dom: number;
    active_listings: number;
    area: string;
  };
  custom_prompt?: string;
  target_platforms: SocialPlatform[];
}

// ============================================================
// Analytics Types
// ============================================================

export interface SocialAnalyticsSummary {
  total_posts_30d: number;
  total_impressions: number;
  total_engagement: number;
  total_clicks: number;
  total_leads: number;
  engagement_rate: number;
  by_platform: Record<SocialPlatform, {
    posts: number;
    impressions: number;
    engagement: number;
    clicks: number;
    followers: number;
  }>;
  by_content_type: Record<ContentType, {
    posts: number;
    avg_engagement: number;
    total_leads: number;
  }>;
  top_posts: SocialPost[];
  daily_data: { date: string; posts: number; engagement: number; impressions: number }[];
}

// ============================================================
// Facebook / Meta API Types
// ============================================================

export interface MetaPageInfo {
  id: string;
  name: string;
  access_token: string;
  category: string;
  picture?: { data: { url: string } };
  instagram_business_account?: { id: string };
}

export interface MetaPublishResult {
  id: string;
  post_id?: string;
  permalink_url?: string;
}

export interface MetaInsights {
  impressions: number;
  reach: number;
  engagement: number;
  clicks: number;
}

// ============================================================
// UI State Types
// ============================================================

export type SocialTab = "overview" | "calendar" | "studio" | "templates" | "analytics" | "settings";

export interface CalendarPost {
  id: string;
  date: string;
  time: string;
  platform: SocialPlatform;
  content_type: ContentType;
  caption_preview: string;
  media_preview?: string;
  status: PostStatus;
}
