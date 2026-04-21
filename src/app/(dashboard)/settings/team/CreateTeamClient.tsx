"use client";

import { useState } from "react";
import { createTeam } from "@/actions/team";
import { PageHeader } from "@/components/layout/PageHeader";

export default function CreateTeamClient() {
  const [teamName, setTeamName] = useState("");
  const [brokerageName, setBrokerageName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!teamName.trim()) return;
    setCreating(true);
    setError(null);

    const result = await createTeam({
      name: teamName.trim(),
      brokerage_name: brokerageName.trim() || undefined,
    });

    if (result.error) {
      setError(result.error);
      setCreating(false);
      return;
    }

    // Hard-navigate to force a full server re-render. The JWT callback
    // auto-detects the new membership when teamId is null, so no session
    // update call is needed — the next server request picks it up.
    window.location.href = "/settings/team";
  };

  return (
    <>
      <PageHeader
        title="Team"
        subtitle="Collaborate with your brokerage team"
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Team" },
        ]}
      />
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-1">Create Your Team</h2>
            <p className="text-sm text-muted-foreground">
              Set up a team to invite agents and assistants. As the owner you can
              manage roles, share listings and contacts, and view team-wide analytics.
              Up to 15 members per team.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-md text-sm bg-destructive/10 text-destructive" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label htmlFor="team-name" className="text-sm font-medium block mb-1">
                Team Name <span className="text-destructive">*</span>
              </label>
              <input
                id="team-name"
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Vancouver West Realty"
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                aria-label="Team name"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="brokerage-name" className="text-sm font-medium block mb-1">
                Brokerage Name <span className="text-muted-foreground text-xs">(optional)</span>
              </label>
              <input
                id="brokerage-name"
                type="text"
                value={brokerageName}
                onChange={(e) => setBrokerageName(e.target.value)}
                placeholder="e.g. RE/MAX Crest Realty"
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                aria-label="Brokerage name"
              />
            </div>

            <button
              type="submit"
              disabled={creating || !teamName.trim()}
              className="w-full px-4 py-2.5 bg-brand text-white rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity font-medium"
              aria-label="Create team"
            >
              {creating ? "Creating..." : "Create Team"}
            </button>
          </form>
        </div>

        <div className="mt-6 bg-card border border-border rounded-lg p-5">
          <h3 className="font-semibold mb-3">What you get with a team</h3>
          <div className="grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
            <div className="flex gap-2">
              <span>👥</span>
              <span>Invite agents &amp; assistants with role-based access</span>
            </div>
            <div className="flex gap-2">
              <span>🏠</span>
              <span>Share listings, contacts, and showings</span>
            </div>
            <div className="flex gap-2">
              <span>📊</span>
              <span>Team-wide pipeline view &amp; activity feed</span>
            </div>
            <div className="flex gap-2">
              <span>🔒</span>
              <span>Fine-grained permissions per role</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
