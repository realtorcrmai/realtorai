"use client";

import { useState, useRef, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveBrandProfile, uploadBrandAsset, type BrandProfile } from "@/actions/brand-profile";
import { toast } from "sonner";

interface BrandProfileFormProps {
  profile: BrandProfile | null;
}

export function BrandProfileForm({ profile }: BrandProfileFormProps) {
  const [isPending, startTransition] = useTransition();

  // Identity
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [title, setTitle] = useState(profile?.title ?? "REALTOR®");
  const [tagline, setTagline] = useState(profile?.tagline ?? "");
  const [brokerage, setBrokerage] = useState(profile?.brokerage_name ?? "");

  // Photos
  const [headshotUrl, setHeadshotUrl] = useState(profile?.headshot_url ?? "");
  const [logoUrl, setLogoUrl] = useState(profile?.logo_url ?? "");
  const [brokerageLogoUrl, setBrokerageLogoUrl] = useState(profile?.brokerage_logo_url ?? "");

  // Contact
  const [websiteUrl, setWebsiteUrl] = useState(profile?.website_url ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [physicalAddress, setPhysicalAddress] = useState(profile?.physical_address ?? "");

  // Branding
  const [brandColor, setBrandColor] = useState(profile?.brand_color ?? "#4f35d2");

  // Social
  const [instagram, setInstagram] = useState(profile?.instagram_url ?? "");
  const [facebook, setFacebook] = useState(profile?.facebook_url ?? "");
  const [linkedin, setLinkedin] = useState(profile?.linkedin_url ?? "");
  const [twitter, setTwitter] = useState(profile?.twitter_url ?? "");

  // Service areas
  const [serviceAreasRaw, setServiceAreasRaw] = useState(
    (profile?.service_areas ?? []).join(", ")
  );

  // Upload state
  const [uploadingHeadshot, setUploadingHeadshot] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBrokerageLogo, setUploadingBrokerageLogo] = useState(false);

  const headshotRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const brokerageLogoRef = useRef<HTMLInputElement>(null);

  async function handleUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    bucket: "logos" | "headshots",
    setUrl: (url: string) => void,
    setUploading: (v: boolean) => void
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const result = await uploadBrandAsset(fd, bucket);
    if (result.url) {
      setUrl(result.url);
      toast.success("Image uploaded");
    } else {
      toast.error(result.error ?? "Upload failed");
    }
    setUploading(false);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveBrandProfile({
        display_name: displayName || null,
        title: title || null,
        tagline: tagline || null,
        brokerage_name: brokerage || null,
        headshot_url: headshotUrl || null,
        logo_url: logoUrl || null,
        brokerage_logo_url: brokerageLogoUrl || null,
        website_url: websiteUrl || null,
        phone: phone || null,
        email: email || null,
        physical_address: physicalAddress || null,
        brand_color: brandColor || "#4f35d2",
        instagram_url: instagram || null,
        facebook_url: facebook || null,
        linkedin_url: linkedin || null,
        twitter_url: twitter || null,
        service_areas: serviceAreasRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });

      if (result.success) {
        toast.success("Brand profile saved — emails will use these details going forward.");
      } else {
        toast.error(result.error ?? "Save failed");
      }
    });
  }

  return (
    <div className="space-y-6">

      {/* Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">🪪 Identity</CardTitle>
          <p className="text-xs text-muted-foreground">How your name and title appear in every email you send.</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="display_name">Display Name</Label>
            <Input
              id="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Jazz Grewal, PREC*"
            />
            <p className="text-[11px] text-muted-foreground mt-1">Leave blank to use your account name</p>
          </div>
          <div>
            <Label htmlFor="title">Title / Designation</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="REALTOR®"
            />
          </div>
          <div>
            <Label htmlFor="brokerage">Brokerage Name</Label>
            <Input
              id="brokerage"
              value={brokerage}
              onChange={(e) => setBrokerage(e.target.value)}
              placeholder="RE/MAX City Realty"
            />
          </div>
          <div>
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Your trusted Vancouver REALTOR"
            />
          </div>
        </CardContent>
      </Card>

      {/* Photos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">📸 Photos &amp; Logos</CardTitle>
          <p className="text-xs text-muted-foreground">JPG, PNG, WebP, or SVG — max 5 MB each.</p>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Headshot */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full overflow-hidden bg-muted flex-shrink-0 border border-border">
              {headshotUrl ? (
                <img src={headshotUrl} alt="Headshot" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-2xl">👤</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <Label className="text-xs font-medium">Headshot</Label>
              <p className="text-[11px] text-muted-foreground mb-1">Shown in the email footer agent card</p>
              <div className="flex gap-2">
                <Input
                  value={headshotUrl}
                  onChange={(e) => setHeadshotUrl(e.target.value)}
                  placeholder="https://..."
                  className="text-xs h-8"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={uploadingHeadshot}
                  onClick={() => headshotRef.current?.click()}
                >
                  {uploadingHeadshot ? "Uploading…" : "Upload"}
                </Button>
                <input
                  ref={headshotRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUpload(e, "headshots", setHeadshotUrl, setUploadingHeadshot)}
                />
              </div>
            </div>
          </div>

          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border flex items-center justify-center">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
              ) : (
                <div className="text-2xl">🏠</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <Label className="text-xs font-medium">Your Logo</Label>
              <p className="text-[11px] text-muted-foreground mb-1">Shown at the top of every email</p>
              <div className="flex gap-2">
                <Input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://..."
                  className="text-xs h-8"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={uploadingLogo}
                  onClick={() => logoRef.current?.click()}
                >
                  {uploadingLogo ? "Uploading…" : "Upload"}
                </Button>
                <input
                  ref={logoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUpload(e, "logos", setLogoUrl, setUploadingLogo)}
                />
              </div>
            </div>
          </div>

          {/* Brokerage logo */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border flex items-center justify-center">
              {brokerageLogoUrl ? (
                <img src={brokerageLogoUrl} alt="Brokerage Logo" className="h-full w-full object-contain p-1" />
              ) : (
                <div className="text-2xl">🏢</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <Label className="text-xs font-medium">Brokerage Logo <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <p className="text-[11px] text-muted-foreground mb-1">Co-brand with your brokerage</p>
              <div className="flex gap-2">
                <Input
                  value={brokerageLogoUrl}
                  onChange={(e) => setBrokerageLogoUrl(e.target.value)}
                  placeholder="https://..."
                  className="text-xs h-8"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={uploadingBrokerageLogo}
                  onClick={() => brokerageLogoRef.current?.click()}
                >
                  {uploadingBrokerageLogo ? "Uploading…" : "Upload"}
                </Button>
                <input
                  ref={brokerageLogoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUpload(e, "logos", setBrokerageLogoUrl, setUploadingBrokerageLogo)}
                />
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">📞 Contact Details</CardTitle>
          <p className="text-xs text-muted-foreground">Shown in the email footer. Physical address is required by CASL.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://jazzgrewal.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (604) 555-0123"
              />
            </div>
            <div>
              <Label htmlFor="email">Reply-to Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jazz@realty.com"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="address">
              Physical Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="address"
              value={physicalAddress}
              onChange={(e) => setPhysicalAddress(e.target.value)}
              placeholder="123 Main St, Vancouver BC V6B 1A1"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Required by CASL — must appear in every commercial email footer.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Email theme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">🎨 Email Theme</CardTitle>
          <p className="text-xs text-muted-foreground">Accent color used for buttons, links, and section headers in your emails.</p>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <input
            type="color"
            value={brandColor}
            onChange={(e) => setBrandColor(e.target.value)}
            className="h-10 w-16 rounded cursor-pointer border border-border"
          />
          <div>
            <p className="text-sm font-medium" style={{ color: brandColor }}>{brandColor.toUpperCase()}</p>
            <p className="text-[11px] text-muted-foreground">Click the swatch to change</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setBrandColor("#4f35d2")}
            className="ml-auto text-xs"
          >
            Reset to default
          </Button>
        </CardContent>
      </Card>

      {/* Social */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">🔗 Social Links <span className="text-muted-foreground font-normal">(optional)</span></CardTitle>
          <p className="text-xs text-muted-foreground">Shown as icons in the email footer.</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="instagram">Instagram</Label>
            <Input
              id="instagram"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="https://instagram.com/yourhandle"
            />
          </div>
          <div>
            <Label htmlFor="facebook">Facebook</Label>
            <Input
              id="facebook"
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              placeholder="https://facebook.com/yourpage"
            />
          </div>
          <div>
            <Label htmlFor="linkedin">LinkedIn</Label>
            <Input
              id="linkedin"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder="https://linkedin.com/in/yourprofile"
            />
          </div>
          <div>
            <Label htmlFor="twitter">X / Twitter</Label>
            <Input
              id="twitter"
              value={twitter}
              onChange={(e) => setTwitter(e.target.value)}
              placeholder="https://x.com/yourhandle"
            />
          </div>
        </CardContent>
      </Card>

      {/* Service areas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">📍 Service Areas</CardTitle>
          <p className="text-xs text-muted-foreground">Used by the AI to personalise email content. Separate with commas.</p>
        </CardHeader>
        <CardContent>
          <Textarea
            value={serviceAreasRaw}
            onChange={(e) => setServiceAreasRaw(e.target.value)}
            placeholder="Vancouver, Burnaby, Richmond, North Vancouver, Coquitlam"
            rows={2}
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            {serviceAreasRaw.split(",").filter((s) => s.trim()).length} area
            {serviceAreasRaw.split(",").filter((s) => s.trim()).length !== 1 ? "s" : ""} entered
          </p>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isPending}
          className="bg-brand hover:bg-brand/90 gap-2"
        >
          {isPending ? "Saving…" : "💾 Save Brand Profile"}
        </Button>
      </div>

    </div>
  );
}
