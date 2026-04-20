"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Camera, Save, Loader2, Plus, X } from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  brokerage: string | null;
  license_number: string | null;
  avatar_url: string | null;
  bio: string | null;
  timezone: string | null;
  family_info: { spouse_name?: string; kids_count?: number } | null;
}

interface BrandProfile {
  id?: string;
  display_name: string | null;
  title: string | null;
  website_url: string | null;
  phone: string | null;
  email: string | null;
  physical_address: string | null;
  brand_color: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  tagline: string | null;
  service_areas: string[] | null;
  brokerage_name: string | null;
  logo_url: string | null;
  headshot_url: string | null;
}

export function ProfileForm({ user, brandProfile }: { user: UserProfile; brandProfile: BrandProfile | null }) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);

  // Personal info
  const [name, setName] = useState(user.name || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [brokerage, setBrokerage] = useState(user.brokerage || "");
  const [licenseNumber, setLicenseNumber] = useState(user.license_number || "");
  const [bio, setBio] = useState(user.bio || "");
  const [timezone, setTimezone] = useState(user.timezone || "America/Vancouver");
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || "");

  // Family info
  const [spouseName, setSpouseName] = useState(user.family_info?.spouse_name || "");
  const [kidsCount, setKidsCount] = useState(user.family_info?.kids_count?.toString() || "");

  // Brand profile
  const [displayName, setDisplayName] = useState(brandProfile?.display_name || "");
  const [title, setTitle] = useState(brandProfile?.title || "");
  const [websiteUrl, setWebsiteUrl] = useState(brandProfile?.website_url || "");
  const [physicalAddress, setPhysicalAddress] = useState(brandProfile?.physical_address || "");
  const [brandColor, setBrandColor] = useState(brandProfile?.brand_color || "#4f35d2");
  const [tagline, setTagline] = useState(brandProfile?.tagline || "");
  const [serviceAreas, setServiceAreas] = useState<string[]>(brandProfile?.service_areas || []);
  const [newArea, setNewArea] = useState("");

  // Social links
  const [instagramUrl, setInstagramUrl] = useState(brandProfile?.instagram_url || "");
  const [facebookUrl, setFacebookUrl] = useState(brandProfile?.facebook_url || "");
  const [linkedinUrl, setLinkedinUrl] = useState(brandProfile?.linkedin_url || "");
  const [twitterUrl, setTwitterUrl] = useState(brandProfile?.twitter_url || "");

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const initials = name.split(" ").map((w) => w[0]).filter(Boolean).join("").toUpperCase().slice(0, 2) || "?";

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage({ type: "error", text: "Please upload a JPG, PNG, or WebP image." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image must be under 5MB." });
      return;
    }

    setUploading(true);
    setMessage(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/onboarding/upload-avatar", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        setAvatarUrl(data.url);
        setMessage({ type: "success", text: "Photo updated!" });
      } else {
        setMessage({ type: "error", text: data.error || "Upload failed." });
      }
    } catch {
      setMessage({ type: "error", text: "Upload failed. Please try again." });
    } finally {
      setUploading(false);
    }
  }

  function addServiceArea() {
    const trimmed = newArea.trim();
    if (trimmed && !serviceAreas.includes(trimmed)) {
      setServiceAreas([...serviceAreas, trimmed]);
      setNewArea("");
    }
  }

  function removeServiceArea(area: string) {
    setServiceAreas(serviceAreas.filter((a) => a !== area));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      // Save user profile
      const profileRes = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          brokerage,
          license_number: licenseNumber,
          bio,
          timezone,
          family_info: {
            spouse_name: spouseName || undefined,
            kids_count: kidsCount ? parseInt(kidsCount, 10) : undefined,
          },
        }),
      });
      const profileData = await profileRes.json();

      if (!profileData.success) {
        setMessage({ type: "error", text: profileData.error || "Failed to save profile." });
        setSaving(false);
        return;
      }

      // Save brand profile
      const brandRes = await fetch("/api/settings/brand-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName || null,
          title: title || null,
          website_url: websiteUrl || null,
          physical_address: physicalAddress || null,
          brand_color: brandColor || "#4f35d2",
          tagline: tagline || null,
          service_areas: serviceAreas,
          instagram_url: instagramUrl || null,
          facebook_url: facebookUrl || null,
          linkedin_url: linkedinUrl || null,
          twitter_url: twitterUrl || null,
        }),
      });
      const brandData = await brandRes.json();

      if (!brandData.success) {
        setMessage({ type: "error", text: brandData.error || "Failed to save brand profile." });
        setSaving(false);
        return;
      }

      setMessage({ type: "success", text: "Profile saved successfully." });
      await updateSession();
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Failed to save. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Avatar section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile Photo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative group">
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="h-24 w-24 rounded-full object-cover ring-2 ring-border" />
              ) : (
                <div className="h-24 w-24 rounded-full bg-primary/15 text-primary flex items-center justify-center text-2xl font-bold ring-2 ring-border">
                  {initials}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div>
              <p className="text-sm font-medium">Upload a new photo</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, or WebP. Max 5MB.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Choose File"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user.email} disabled className="bg-muted/50" />
              <p className="text-[11px] text-muted-foreground mt-1">Email cannot be changed</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (604) 555-0123" />
            </div>
            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="America/Vancouver">Pacific (Vancouver)</option>
                <option value="America/Edmonton">Mountain (Edmonton)</option>
                <option value="America/Winnipeg">Central (Winnipeg)</option>
                <option value="America/Toronto">Eastern (Toronto)</option>
                <option value="America/Halifax">Atlantic (Halifax)</option>
                <option value="America/Los_Angeles">Pacific (Los Angeles)</option>
                <option value="America/New_York">Eastern (New York)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="spouse">Spouse / Partner</Label>
              <Input id="spouse" value={spouseName} onChange={(e) => setSpouseName(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <Label htmlFor="kids">Number of Kids</Label>
              <select
                id="kids"
                value={kidsCount}
                onChange={(e) => setKidsCount(e.target.value)}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="">Not specified</option>
                <option value="0">No kids</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4+</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Professional Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="brokerage">Brokerage</Label>
              <Input id="brokerage" value={brokerage} onChange={(e) => setBrokerage(e.target.value)} placeholder="RE/MAX City Realty" />
            </div>
            <div>
              <Label htmlFor="license">License Number</Label>
              <Input id="license" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="PREC #12345" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Jazz Grewal, PREC*" />
              <p className="text-[11px] text-muted-foreground mt-1">Shown in emails and newsletters</p>
            </div>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="REALTOR®" />
            </div>
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell clients about your experience, specialties, and what makes you different..."
              rows={4}
            />
            <p className="text-[11px] text-muted-foreground mt-1">Shown on your client-facing profiles and newsletters</p>
          </div>
          <div>
            <Label htmlFor="tagline">Tagline</Label>
            <Input id="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Your trusted Vancouver REALTOR" />
          </div>
        </CardContent>
      </Card>

      {/* Service Areas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Service Areas</CardTitle>
          <CardDescription>Where you work — shown in newsletters and on your website</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {serviceAreas.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {serviceAreas.map((area) => (
                <span key={area} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-sm rounded-full">
                  {area}
                  <button onClick={() => removeServiceArea(area)} className="hover:text-destructive" aria-label={`Remove ${area}`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addServiceArea(); } }}
              placeholder="Add area (e.g. South Surrey)"
              className="flex-1"
            />
            <Button variant="outline" size="sm" onClick={addServiceArea} disabled={!newArea.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Online Presence */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Online Presence</CardTitle>
          <CardDescription>Your website and social media links</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="website">Website</Label>
            <Input id="website" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://yoursite.ca" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="instagram">Instagram</Label>
              <Input id="instagram" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/yourhandle" />
            </div>
            <div>
              <Label htmlFor="facebook">Facebook</Label>
              <Input id="facebook" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/yourpage" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input id="linkedin" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/you" />
            </div>
            <div>
              <Label htmlFor="twitter">X (Twitter)</Label>
              <Input id="twitter" value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} placeholder="https://x.com/yourhandle" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CASL / Email Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email Compliance (CASL)</CardTitle>
          <CardDescription>Required for sending newsletters and marketing emails</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="address">Physical Address</Label>
            <Input id="address" value={physicalAddress} onChange={(e) => setPhysicalAddress(e.target.value)} placeholder="123 Main St, Vancouver BC V6B 1A1" />
            <p className="text-[11px] text-muted-foreground mt-1">Required by CASL in every commercial email footer</p>
          </div>
          <div>
            <Label htmlFor="brandColor">Brand Color</Label>
            <div className="flex items-center gap-3">
              <input
                id="brandColor"
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="h-10 w-14 rounded border border-border cursor-pointer"
              />
              <Input
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="w-32 font-mono text-sm"
                placeholder="#4f35d2"
              />
              <p className="text-xs text-muted-foreground">Used in email templates</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save button + status message */}
      <div className="flex items-center justify-between pb-8">
        <div>
          {message && (
            <p className={`text-sm ${message.type === "success" ? "text-success" : "text-destructive"}`}>
              {message.text}
            </p>
          )}
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2 bg-brand hover:bg-brand/90">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
