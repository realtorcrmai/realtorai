"use client";

import { useState, useTransition, useCallback, useRef, useEffect } from "react";
import type {
  SocialBrandKit,
  SocialAccount,
  SocialPlatform,
  VoiceTone,
  EmojiPreference,
} from "@/lib/social/types";
import { saveBrandKit, disconnectSocialAccount } from "@/actions/social-content";

interface Props {
  brandKit: SocialBrandKit | null;
  accounts: SocialAccount[];
}

const PLATFORM_EMOJI: Record<SocialPlatform, string> = {
  facebook: "📘",
  instagram: "📸",
  tiktok: "🎵",
  youtube: "🎬",
  linkedin: "💼",
  pinterest: "📌",
  google_business: "🏢",
};

const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  google_business: "Google Business",
};

const HEADING_FONTS = [
  "Playfair Display",
  "Cormorant Garamond",
  "Bodoni Moda",
  "Italiana",
  "DM Serif",
  "Merriweather",
];

const BODY_FONTS = [
  "Inter",
  "DM Sans",
  "Source Sans 3",
  "Poppins",
  "Open Sans",
  "Lato",
];

const VOICE_TONES: { value: VoiceTone; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "luxury", label: "Luxury" },
  { value: "bold", label: "Bold" },
  { value: "warm", label: "Warm" },
  { value: "custom", label: "Custom" },
];

const EMOJI_OPTIONS: { value: EmojiPreference; label: string }[] = [
  { value: "none", label: "None" },
  { value: "minimal", label: "Minimal" },
  { value: "moderate", label: "Moderate" },
  { value: "heavy", label: "Heavy" },
];

const CONNECTABLE_PLATFORMS: {
  platform: SocialPlatform;
  comingSoon: boolean;
}[] = [
  { platform: "facebook", comingSoon: false },
  { platform: "instagram", comingSoon: false },
  { platform: "tiktok", comingSoon: true },
  { platform: "youtube", comingSoon: true },
  { platform: "linkedin", comingSoon: true },
];

const ALL_PLATFORMS: SocialPlatform[] = [
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "linkedin",
];

const WEEKDAYS = [
  { value: "Mon", label: "Mon" },
  { value: "Tue", label: "Tue" },
  { value: "Wed", label: "Wed" },
  { value: "Thu", label: "Thu" },
  { value: "Fri", label: "Fri" },
  { value: "Sat", label: "Sat" },
  { value: "Sun", label: "Sun" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`,
}));

export function SocialSettingsTab({ brandKit, accounts }: Props) {
  const [isPending, startTransition] = useTransition();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // ── Form state ──
  const [agentName, setAgentName] = useState(brandKit?.agent_name ?? "");
  const [brokerageName, setBrokerageName] = useState(brandKit?.brokerage_name ?? "");
  const [licenseNumber, setLicenseNumber] = useState(brandKit?.license_number ?? "");
  const [phone, setPhone] = useState(brandKit?.phone ?? "");
  const [email, setEmail] = useState(brandKit?.email ?? "");
  const [bio, setBio] = useState(brandKit?.bio_text ?? "");
  const [serviceAreas, setServiceAreas] = useState(
    brandKit?.service_areas?.join(", ") ?? ""
  );

  const [logoPreview, setLogoPreview] = useState<string | null>(
    brandKit?.logo_url ?? null
  );
  const [headshotPreview, setHeadshotPreview] = useState<string | null>(
    brandKit?.headshot_url ?? null
  );
  const logoFileRef = useRef<HTMLInputElement>(null);
  const headshotFileRef = useRef<HTMLInputElement>(null);

  const [primaryColour, setPrimaryColour] = useState(
    brandKit?.primary_colour ?? "#4f35d2"
  );
  const [secondaryColour, setSecondaryColour] = useState(
    brandKit?.secondary_colour ?? "#1a1535"
  );
  const [accentColour, setAccentColour] = useState(
    brandKit?.accent_colour ?? "#ff5c3a"
  );
  const [headingFont, setHeadingFont] = useState(
    brandKit?.heading_font ?? "Playfair Display"
  );
  const [bodyFont, setBodyFont] = useState(brandKit?.body_font ?? "Inter");

  const [voiceTone, setVoiceTone] = useState<VoiceTone>(
    brandKit?.voice_tone ?? "professional"
  );
  const [voiceCustomDescription, setVoiceCustomDescription] = useState(
    brandKit?.voice_custom_description ?? ""
  );
  const [emojiPreference, setEmojiPreference] = useState<EmojiPreference>(
    brandKit?.emoji_preference ?? "minimal"
  );
  const [defaultCta, setDefaultCta] = useState(
    brandKit?.default_cta ?? "Book a Showing"
  );
  const [defaultHashtags, setDefaultHashtags] = useState(
    brandKit?.default_hashtags?.join(", ") ?? ""
  );

  const [preferredPlatforms, setPreferredPlatforms] = useState<SocialPlatform[]>(
    brandKit?.preferred_platforms ?? ["facebook", "instagram"]
  );
  const [quietHoursStart, setQuietHoursStart] = useState(
    brandKit?.quiet_hours_start ?? 21
  );
  const [quietHoursEnd, setQuietHoursEnd] = useState(
    brandKit?.quiet_hours_end ?? 7
  );
  const [postingDays, setPostingDays] = useState<string[]>(
    brandKit?.posting_days ?? ["Mon", "Tue", "Wed", "Thu", "Fri"]
  );

  // Clear save message after 3 seconds
  useEffect(() => {
    if (!saveMessage) return;
    const timer = setTimeout(() => setSaveMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [saveMessage]);

  const handleFilePreview = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement>,
      setter: (url: string | null) => void
    ) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      setter(url);
    },
    []
  );

  const togglePlatform = useCallback((platform: SocialPlatform) => {
    setPreferredPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  }, []);

  const toggleDay = useCallback((day: string) => {
    setPostingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }, []);

  // eslint-disable-next-line react-compiler/react-compiler -- complex form state callback
  const handleSave = useCallback(() => {
    startTransition(async () => {
      try {
        await saveBrandKit({
          id: brandKit?.id,
          agent_name: agentName || null,
          brokerage_name: brokerageName || null,
          license_number: licenseNumber || null,
          phone: phone || null,
          email: email || null,
          bio_text: bio || null,
          service_areas: serviceAreas
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          logo_url: logoPreview,
          headshot_url: headshotPreview,
          primary_colour: primaryColour,
          secondary_colour: secondaryColour,
          accent_colour: accentColour,
          heading_font: headingFont,
          body_font: bodyFont,
          voice_tone: voiceTone,
          voice_custom_description:
            voiceTone === "custom" ? voiceCustomDescription || null : null,
          emoji_preference: emojiPreference,
          default_cta: defaultCta,
          default_hashtags: defaultHashtags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          preferred_platforms: preferredPlatforms,
          quiet_hours_start: quietHoursStart,
          quiet_hours_end: quietHoursEnd,
          posting_days: postingDays,
        });
        setSaveMessage("Brand kit saved successfully!");
      } catch {
        setSaveMessage("Failed to save brand kit. Please try again.");
      }
    });
  }, [
    brandKit?.id,
    agentName,
    brokerageName,
    licenseNumber,
    phone,
    email,
    bio,
    serviceAreas,
    logoPreview,
    headshotPreview,
    primaryColour,
    secondaryColour,
    accentColour,
    headingFont,
    bodyFont,
    voiceTone,
    voiceCustomDescription,
    emojiPreference,
    defaultCta,
    defaultHashtags,
    preferredPlatforms,
    quietHoursStart,
    quietHoursEnd,
    postingDays,
    startTransition,
  ]);

  return (
    <div className="space-y-8">
      {/* ════════════════════════════════════════════
          SECTION 1: BRAND KIT
          ════════════════════════════════════════════ */}
      <section>
        <h2 className="text-base font-bold mb-4 flex items-center gap-2">
          🎨 Brand Kit
          <span className="text-xs font-normal text-[var(--lf-text)]/50">
            {brandKit ? "Edit your brand settings" : "Set up your brand for AI content"}
          </span>
        </h2>

        <div className="space-y-6">
          {/* ── Group 1: Agent Profile ── */}
          <div className="lf-card p-5">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              👤 Agent Profile
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--lf-text)]/70">
                  Agent Name
                </label>
                <input
                  type="text"
                  className="lf-input w-full"
                  placeholder="Jane Smith"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--lf-text)]/70">
                  Brokerage Name
                </label>
                <input
                  type="text"
                  className="lf-input w-full"
                  placeholder="RE/MAX Crest Realty"
                  value={brokerageName}
                  onChange={(e) => setBrokerageName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--lf-text)]/70">
                  License Number
                </label>
                <input
                  type="text"
                  className="lf-input w-full"
                  placeholder="123456"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--lf-text)]/70">
                  Phone
                </label>
                <input
                  type="text"
                  className="lf-input w-full"
                  placeholder="+1 604 555 1234"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--lf-text)]/70">
                  Email
                </label>
                <input
                  type="text"
                  className="lf-input w-full"
                  placeholder="jane@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--lf-text)]/70">
                  Service Areas
                  <span className="text-[10px] text-[var(--lf-text)]/40 ml-1">
                    (comma-separated)
                  </span>
                </label>
                <input
                  type="text"
                  className="lf-input w-full"
                  placeholder="Vancouver, Burnaby, Richmond"
                  value={serviceAreas}
                  onChange={(e) => setServiceAreas(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-medium mb-1 text-[var(--lf-text)]/70">
                Bio
              </label>
              <textarea
                className="lf-textarea w-full"
                rows={3}
                placeholder="Award-winning realtor specializing in Vancouver's West Side..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
          </div>

          {/* ── Group 2: Brand Identity ── */}
          <div className="lf-card p-5">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              🖌️ Brand Identity
            </h3>

            {/* File uploads */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--lf-text)]/70">
                  Logo
                </label>
                <div className="flex items-center gap-3">
                  {logoPreview && (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-12 h-12 rounded-lg object-cover border border-[var(--lf-indigo)]/20"
                    />
                  )}
                  <input
                    ref={logoFileRef}
                    type="file"
                    accept="image/*"
                    className="lf-input flex-1 text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-[var(--lf-indigo)]/10 file:text-[var(--lf-indigo)]"
                    onChange={(e) => handleFilePreview(e, setLogoPreview)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--lf-text)]/70">
                  Headshot
                </label>
                <div className="flex items-center gap-3">
                  {headshotPreview && (
                    <img
                      src={headshotPreview}
                      alt="Headshot preview"
                      className="w-12 h-12 rounded-full object-cover border border-[var(--lf-indigo)]/20"
                    />
                  )}
                  <input
                    ref={headshotFileRef}
                    type="file"
                    accept="image/*"
                    className="lf-input flex-1 text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-[var(--lf-indigo)]/10 file:text-[var(--lf-indigo)]"
                    onChange={(e) => handleFilePreview(e, setHeadshotPreview)}
                  />
                </div>
              </div>
            </div>

            {/* Colours */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--lf-text)]/70">
                  Primary Colour
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="w-8 h-8 rounded-lg border-0 cursor-pointer"
                    value={primaryColour}
                    onChange={(e) => setPrimaryColour(e.target.value)}
                  />
                  <span className="text-xs text-[var(--lf-text)]/50 font-mono">
                    {primaryColour}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--lf-text)]/70">
                  Secondary Colour
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="w-8 h-8 rounded-lg border-0 cursor-pointer"
                    value={secondaryColour}
                    onChange={(e) => setSecondaryColour(e.target.value)}
                  />
                  <span className="text-xs text-[var(--lf-text)]/50 font-mono">
                    {secondaryColour}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--lf-text)]/70">
                  Accent Colour
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="w-8 h-8 rounded-lg border-0 cursor-pointer"
                    value={accentColour}
                    onChange={(e) => setAccentColour(e.target.value)}
                  />
                  <span className="text-xs text-[var(--lf-text)]/50 font-mono">
                    {accentColour}
                  </span>
                </div>
              </div>
            </div>

            {/* Fonts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--lf-text)]/70">
                  Heading Font
                </label>
                <select
                  className="lf-select w-full"
                  value={headingFont}
                  onChange={(e) => setHeadingFont(e.target.value)}
                >
                  {HEADING_FONTS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--lf-text)]/70">
                  Body Font
                </label>
                <select
                  className="lf-select w-full"
                  value={bodyFont}
                  onChange={(e) => setBodyFont(e.target.value)}
                >
                  {BODY_FONTS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── Group 3: Voice & Style ── */}
          <div className="lf-card p-5">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              🗣️ Voice & Style
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--lf-text)]/70">
                  Voice Tone
                </label>
                <select
                  className="lf-select w-full"
                  value={voiceTone}
                  onChange={(e) => setVoiceTone(e.target.value as VoiceTone)}
                >
                  {VOICE_TONES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--lf-text)]/70">
                  Emoji Preference
                </label>
                <select
                  className="lf-select w-full"
                  value={emojiPreference}
                  onChange={(e) =>
                    setEmojiPreference(e.target.value as EmojiPreference)
                  }
                >
                  {EMOJI_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {voiceTone === "custom" && (
              <div className="mt-4">
                <label className="block text-xs font-medium mb-1 text-[var(--lf-text)]/70">
                  Custom Voice Description
                </label>
                <textarea
                  className="lf-textarea w-full"
                  rows={3}
                  placeholder="Describe your unique voice: e.g., 'Confident and data-driven, with a touch of Vancouver lifestyle imagery...'"
                  value={voiceCustomDescription}
                  onChange={(e) => setVoiceCustomDescription(e.target.value)}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--lf-text)]/70">
                  Default CTA
                </label>
                <input
                  type="text"
                  className="lf-input w-full"
                  placeholder="Book a Showing"
                  value={defaultCta}
                  onChange={(e) => setDefaultCta(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--lf-text)]/70">
                  Default Hashtags
                  <span className="text-[10px] text-[var(--lf-text)]/40 ml-1">
                    (comma-separated)
                  </span>
                </label>
                <input
                  type="text"
                  className="lf-input w-full"
                  placeholder="#VancouverRealEstate, #BCHomes, #JustListed"
                  value={defaultHashtags}
                  onChange={(e) => setDefaultHashtags(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ── Group 4: Posting Preferences ── */}
          <div className="lf-card p-5">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              📅 Posting Preferences
            </h3>

            {/* Preferred platforms */}
            <div className="mb-4">
              <label className="block text-xs font-medium mb-2 text-[var(--lf-text)]/70">
                Preferred Platforms
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_PLATFORMS.map((platform) => (
                  <label
                    key={platform}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-all ${
                      preferredPlatforms.includes(platform)
                        ? "bg-[var(--lf-indigo)] text-white"
                        : "bg-white/60 text-[var(--lf-text)]/60 hover:bg-white/80"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={preferredPlatforms.includes(platform)}
                      onChange={() => togglePlatform(platform)}
                    />
                    <span>{PLATFORM_EMOJI[platform]}</span>
                    <span>{PLATFORM_LABEL[platform]}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Quiet hours */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--lf-text)]/70">
                  Quiet Hours Start
                </label>
                <select
                  className="lf-select w-full"
                  value={quietHoursStart}
                  onChange={(e) => setQuietHoursStart(Number(e.target.value))}
                >
                  {HOURS.map((h) => (
                    <option key={h.value} value={h.value}>
                      {h.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--lf-text)]/70">
                  Quiet Hours End
                </label>
                <select
                  className="lf-select w-full"
                  value={quietHoursEnd}
                  onChange={(e) => setQuietHoursEnd(Number(e.target.value))}
                >
                  {HOURS.map((h) => (
                    <option key={h.value} value={h.value}>
                      {h.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Posting days */}
            <div>
              <label className="block text-xs font-medium mb-2 text-[var(--lf-text)]/70">
                Posting Days
              </label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => (
                  <label
                    key={day.value}
                    className={`flex items-center justify-center w-12 h-9 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                      postingDays.includes(day.value)
                        ? "bg-[var(--lf-indigo)] text-white"
                        : "bg-white/60 text-[var(--lf-text)]/60 hover:bg-white/80"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={postingDays.includes(day.value)}
                      onChange={() => toggleDay(day.value)}
                    />
                    {day.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* ── Save Button ── */}
          <div className="flex items-center gap-3">
            <button
              className="lf-btn px-6"
              onClick={handleSave}
              disabled={isPending}
            >
              {isPending ? "Saving..." : "💾 Save Brand Kit"}
            </button>
            {saveMessage && (
              <span
                className={`text-sm font-medium ${
                  saveMessage.includes("success")
                    ? "text-[var(--lf-emerald)]"
                    : "text-red-500"
                }`}
              >
                {saveMessage}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          SECTION 2: CONNECTED ACCOUNTS
          ════════════════════════════════════════════ */}
      <section>
        <h2 className="text-base font-bold mb-4 flex items-center gap-2">
          🔗 Connected Accounts
        </h2>

        {/* Existing connections */}
        {accounts.length > 0 && (
          <div className="space-y-3 mb-4">
            {accounts.map((account) => (
              <div key={account.id} className="lf-card p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {PLATFORM_EMOJI[account.platform]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold">
                        {PLATFORM_LABEL[account.platform]}
                      </p>
                      <span
                        className={`lf-badge text-[10px] ${
                          account.connection_status === "connected"
                            ? "lf-badge-done"
                            : account.connection_status === "expiring"
                            ? "lf-badge-pending"
                            : "lf-badge-blocked"
                        }`}
                      >
                        {account.connection_status}
                      </span>
                    </div>
                    {account.account_name && (
                      <p className="text-xs text-[var(--lf-text)]/50">
                        @{account.account_name}
                      </p>
                    )}
                  </div>

                  <div className="text-right text-xs text-[var(--lf-text)]/60 hidden sm:block">
                    <p>{fmt.format(account.followers_count)} followers</p>
                    <p>
                      Connected{" "}
                      {new Date(account.connected_at).toLocaleDateString("en-CA", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <button
                    className="lf-btn-ghost lf-btn-sm text-xs text-red-500 border-red-200 hover:bg-red-50"
                    disabled={isPending}
                    onClick={() => {
                      if (!confirm(`Disconnect ${PLATFORM_LABEL[account.platform]}? You can reconnect later.`)) return;
                      startTransition(async () => {
                        try {
                          await disconnectSocialAccount(account.id);
                          setSaveMessage(`${PLATFORM_LABEL[account.platform]} disconnected.`);
                        } catch {
                          setSaveMessage("Failed to disconnect account.");
                        }
                      });
                    }}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Connect new platforms */}
        <div className="lf-card p-5">
          <h3 className="text-sm font-bold mb-3">Add Platform</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CONNECTABLE_PLATFORMS.map(({ platform, comingSoon }) => {
              const alreadyConnected = accounts.some(
                (a) => a.platform === platform && a.is_active
              );

              return (
                <button
                  key={platform}
                  disabled={comingSoon || alreadyConnected}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    comingSoon || alreadyConnected
                      ? "opacity-50 cursor-not-allowed border-gray-200 bg-gray-50"
                      : "border-[var(--lf-indigo)]/20 hover:border-[var(--lf-indigo)] hover:bg-[var(--lf-indigo)]/5 cursor-pointer"
                  }`}
                  onClick={() => {
                    if (!comingSoon && !alreadyConnected) {
                      if (platform === "facebook" || platform === "instagram") {
                        const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || "";
                        const redirectUri = `${window.location.origin}/api/social/oauth`;
                        const scopes = "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish";
                        window.location.href = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${platform}&response_type=code`;
                      } else {
                        alert(
                          `${PLATFORM_LABEL[platform]} integration is coming soon.`
                        );
                      }
                    }
                  }}
                >
                  <span className="text-2xl">{PLATFORM_EMOJI[platform]}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Connect {PLATFORM_LABEL[platform]}
                    </p>
                    {comingSoon && (
                      <span className="lf-badge lf-badge-info text-[10px]">
                        Coming Soon
                      </span>
                    )}
                    {alreadyConnected && (
                      <span className="lf-badge lf-badge-done text-[10px]">
                        Connected
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

const fmt = new Intl.NumberFormat("en-CA");
