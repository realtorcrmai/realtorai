"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Workflow = { id: string; name: string; slug: string; is_active: boolean; trigger_type: string };

export function SettingsTab({ workflows }: { workflows: Workflow[] }) {
  const [aiSending, setAiSending] = useState(true);
  const [frequencyCap, setFrequencyCap] = useState(3);
  const [quietStart, setQuietStart] = useState("20:00");
  const [quietEnd, setQuietEnd] = useState("07:00");
  const [weekendSending, setWeekendSending] = useState(true);
  const [sendMode, setSendMode] = useState<"review" | "auto">("review");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Email Marketing Settings</h3>
        <button
          onClick={handleSave}
          className={`text-xs px-4 py-2 rounded-lg font-medium transition-all ${
            saved ? "bg-emerald-600 text-white" : "bg-primary text-white hover:bg-primary/90"
          }`}
        >
          {saved ? "✓ Saved!" : "Save Changes"}
        </button>
      </div>

      {/* Core Settings */}
      <Card>
        <CardContent className="p-5 space-y-5">
          {/* Master Switch */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">AI Email Sending</p>
              <p className="text-xs text-muted-foreground">Master switch — pause all AI-generated emails</p>
            </div>
            <button
              onClick={() => setAiSending(!aiSending)}
              className={`relative w-12 h-6 rounded-full transition-colors ${aiSending ? "bg-emerald-500" : "bg-gray-300"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${aiSending ? "left-[26px]" : "left-0.5"}`} />
            </button>
          </div>

          {/* Frequency Cap */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div>
              <p className="text-sm font-medium">Global Frequency Cap</p>
              <p className="text-xs text-muted-foreground">Maximum emails per contact per week</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFrequencyCap(Math.max(1, frequencyCap - 1))}
                className="w-7 h-7 rounded border border-border text-sm font-medium hover:bg-muted"
              >−</button>
              <span className="text-sm font-bold w-8 text-center">{frequencyCap}</span>
              <button
                onClick={() => setFrequencyCap(Math.min(7, frequencyCap + 1))}
                className="w-7 h-7 rounded border border-border text-sm font-medium hover:bg-muted"
              >+</button>
              <span className="text-xs text-muted-foreground">/ week</span>
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div>
              <p className="text-sm font-medium">Quiet Hours</p>
              <p className="text-xs text-muted-foreground">No emails sent during this period</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={quietStart}
                onChange={(e) => setQuietStart(e.target.value)}
                className="text-xs border border-border rounded px-2 py-1 bg-background"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="time"
                value={quietEnd}
                onChange={(e) => setQuietEnd(e.target.value)}
                className="text-xs border border-border rounded px-2 py-1 bg-background"
              />
            </div>
          </div>

          {/* Weekend Sending */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div>
              <p className="text-sm font-medium">Weekend Sending</p>
              <p className="text-xs text-muted-foreground">Send emails on Saturday and Sunday</p>
            </div>
            <button
              onClick={() => setWeekendSending(!weekendSending)}
              className={`relative w-12 h-6 rounded-full transition-colors ${weekendSending ? "bg-emerald-500" : "bg-gray-300"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${weekendSending ? "left-[26px]" : "left-0.5"}`} />
            </button>
          </div>

          {/* Default Send Mode */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div>
              <p className="text-sm font-medium">Default Send Mode</p>
              <p className="text-xs text-muted-foreground">For new contacts joining journeys</p>
            </div>
            <div className="flex bg-muted rounded-lg p-0.5">
              <button
                onClick={() => setSendMode("review")}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                  sendMode === "review" ? "bg-background shadow text-foreground" : "text-muted-foreground"
                }`}
              >Review First</button>
              <button
                onClick={() => setSendMode("auto")}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                  sendMode === "auto" ? "bg-background shadow text-foreground" : "text-muted-foreground"
                }`}
              >Auto-Send</button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance */}
      <Card>
        <CardContent className="p-5">
          <h4 className="text-sm font-semibold mb-3">📋 Compliance</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold text-foreground">CASL</div>
              <div className="text-[10px] text-muted-foreground">Canada</div>
              <div className="text-xs text-emerald-600 font-medium mt-1">✓ Compliant</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold text-foreground">CAN-SPAM</div>
              <div className="text-[10px] text-muted-foreground">USA</div>
              <div className="text-xs text-emerald-600 font-medium mt-1">✓ Compliant</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold text-foreground">0</div>
              <div className="text-[10px] text-muted-foreground">Unsubscribes</div>
              <div className="text-xs text-emerald-600 font-medium mt-1">This month</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold text-foreground">0</div>
              <div className="text-[10px] text-muted-foreground">Complaints</div>
              <div className="text-xs text-emerald-600 font-medium mt-1">This month</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflows */}
      <Card>
        <CardContent className="p-5">
          <h4 className="text-sm font-semibold mb-3">Active Workflows ({workflows.length})</h4>
          {workflows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">No workflows configured.</p>
          ) : workflows.map((w) => (
            <div key={w.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium">{w.name}</p>
                <p className="text-xs text-muted-foreground">Trigger: {w.trigger_type?.replace(/_/g, " ")}</p>
              </div>
              <Badge variant={w.is_active ? "default" : "secondary"} className="text-xs cursor-pointer">
                {w.is_active ? "Active" : "Paused"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
