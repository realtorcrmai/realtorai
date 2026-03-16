"use client";

import { useState, useEffect } from "react";
import { updateSite } from "@/actions/site";
import { Settings, Check, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const [site, setSite] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/site").then((r) => r.json()).then((d) => setSite(d.site));
  }, []);

  const save = async (updates: Record<string, unknown>) => {
    if (!site) return;
    setSaving(true);
    await updateSite(site.id as string, updates);
    setSite((prev) => (prev ? { ...prev, ...updates } : prev));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!site) return <div className="p-8 text-gray-400">Loading...</div>;

  const social = (site.social_links as Record<string, string>) || {};

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 text-sm mt-1">General website settings</p>
        </div>
        {saved && <span className="badge badge-success"><Check className="h-3 w-3" /> Saved</span>}
        {saving && <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />}
      </div>

      {/* Profile */}
      <div className="card">
        <div className="card-header"><h2 className="font-semibold text-gray-900">Profile</h2></div>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Agent Name</label>
              <input className="input" value={(site.agent_name as string) || ""} onBlur={(e) => save({ agent_name: e.target.value })} onChange={(e) => setSite((p) => p ? { ...p, agent_name: e.target.value } : p)} />
            </div>
            <div>
              <label className="label">Title</label>
              <input className="input" placeholder="REALTOR(R), PREC" value={(site.agent_title as string) || ""} onBlur={(e) => save({ agent_title: e.target.value })} onChange={(e) => setSite((p) => p ? { ...p, agent_title: e.target.value } : p)} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" value={(site.email as string) || ""} onBlur={(e) => save({ email: e.target.value })} onChange={(e) => setSite((p) => p ? { ...p, email: e.target.value } : p)} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={(site.phone as string) || ""} onBlur={(e) => save({ phone: e.target.value })} onChange={(e) => setSite((p) => p ? { ...p, phone: e.target.value } : p)} />
            </div>
          </div>
          <div>
            <label className="label">Tagline</label>
            <input className="input" value={(site.tagline as string) || ""} onBlur={(e) => save({ tagline: e.target.value })} onChange={(e) => setSite((p) => p ? { ...p, tagline: e.target.value } : p)} />
          </div>
          <div>
            <label className="label">Short Bio</label>
            <textarea className="textarea" rows={3} value={(site.bio_short as string) || ""} onBlur={(e) => save({ bio_short: e.target.value })} onChange={(e) => setSite((p) => p ? { ...p, bio_short: e.target.value } : p)} />
          </div>
        </div>
      </div>

      {/* Social Links */}
      <div className="card">
        <div className="card-header"><h2 className="font-semibold text-gray-900">Social Media</h2></div>
        <div className="card-body grid grid-cols-2 gap-4">
          {["instagram", "facebook", "linkedin", "youtube", "tiktok"].map((platform) => (
            <div key={platform}>
              <label className="label capitalize">{platform}</label>
              <input
                className="input"
                placeholder={`https://${platform}.com/yourprofile`}
                value={social[platform] || ""}
                onBlur={(e) => save({ social_links: { ...social, [platform]: e.target.value } })}
                onChange={(e) => {
                  const updated = { ...social, [platform]: e.target.value };
                  setSite((p) => p ? { ...p, social_links: updated } : p);
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
