"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Save, Loader2 } from "lucide-react";

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
}

export function ProfileForm({ user }: { user: UserProfile }) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user.name || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [brokerage, setBrokerage] = useState(user.brokerage || "");
  const [licenseNumber, setLicenseNumber] = useState(user.license_number || "");
  const [bio, setBio] = useState(user.bio || "");
  const [timezone, setTimezone] = useState(user.timezone || "America/Vancouver");
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || "");

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

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, brokerage, license_number: licenseNumber, bio, timezone }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Profile saved successfully." });
        await updateSession();
        router.refresh();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save." });
      }
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
                <option value="America/Toronto">Eastern (Toronto)</option>
                <option value="America/Halifax">Atlantic (Halifax)</option>
                <option value="America/Los_Angeles">Pacific (Los Angeles)</option>
                <option value="America/New_York">Eastern (New York)</option>
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
        </CardContent>
      </Card>

      {/* Save button + status message */}
      <div className="flex items-center justify-between">
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
