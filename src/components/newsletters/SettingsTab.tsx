"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { updateRealtorSettings } from "@/actions/config";

type Config = {
  sending_enabled: boolean;
  skip_weekends: boolean;
  quiet_hours: { start: string; end: string };
  frequency_caps: Record<string, any>;
  default_send_hour: number;
  brand_config?: { default_send_mode?: string };
};

export function SettingsTab({ config }: { config: Config | null }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [aiSending, setAiSending] = useState(config?.sending_enabled ?? true);
  const [frequencyCap, setFrequencyCap] = useState(config?.frequency_caps?.lead?.per_week ?? 3);
  const [quietStart, setQuietStart] = useState(config?.quiet_hours?.start ?? "20:00");
  const [quietEnd, setQuietEnd] = useState(config?.quiet_hours?.end ?? "07:00");
  const [weekendSending, setWeekendSending] = useState(!(config?.skip_weekends ?? false));
  const [sendMode, setSendMode] = useState<"review" | "auto">(
    (config?.brand_config?.default_send_mode as "review" | "auto") || "review"
  );

  function handleSave() {
    startTransition(async () => {
      const result = await updateRealtorSettings({
        sending_enabled: aiSending,
        skip_weekends: !weekendSending,
        quiet_hours: { start: quietStart, end: quietEnd },
        frequency_caps: {
          ...config?.frequency_caps,
          lead: { ...config?.frequency_caps?.lead, per_week: frequencyCap },
          active: { ...config?.frequency_caps?.active, per_week: frequencyCap },
        },
        default_send_mode: sendMode,
      });
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Email Marketing Settings</h3>
        <button
          onClick={handleSave}
          disabled={isPending}
          className={`text-xs px-4 py-2 rounded-lg font-medium transition-all ${
            saved ? "bg-emerald-600 text-white" : isPending ? "bg-gray-400 text-white" : "bg-primary text-white hover:bg-primary/90"
          }`}
        >
          {saved ? "Saved!" : isPending ? "Saving..." : "Save Changes"}
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
              <button onClick={() => setFrequencyCap(Math.max(1, frequencyCap - 1))} className="w-7 h-7 rounded border border-border text-sm font-medium hover:bg-muted">-</button>
              <span className="text-sm font-bold w-8 text-center">{frequencyCap}</span>
              <button onClick={() => setFrequencyCap(Math.min(7, frequencyCap + 1))} className="w-7 h-7 rounded border border-border text-sm font-medium hover:bg-muted">+</button>
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
              <input type="time" value={quietStart} onChange={(e) => setQuietStart(e.target.value)} className="text-xs border border-border rounded px-2 py-1 bg-background" />
              <span className="text-xs text-muted-foreground">to</span>
              <input type="time" value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)} className="text-xs border border-border rounded px-2 py-1 bg-background" />
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
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${sendMode === "review" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
              >Review First</button>
              <button
                onClick={() => setSendMode("auto")}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${sendMode === "auto" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
              >Auto-Send</button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance */}
      <Card>
        <CardContent className="p-5">
          <h4 className="text-sm font-semibold mb-3">Compliance</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold text-foreground">CASL</div>
              <div className="text-[10px] text-muted-foreground">Canada</div>
              <div className="text-xs text-emerald-600 font-medium mt-1">Compliant</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold text-foreground">CAN-SPAM</div>
              <div className="text-[10px] text-muted-foreground">USA</div>
              <div className="text-xs text-emerald-600 font-medium mt-1">Compliant</div>
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
    </div>
  );
}
