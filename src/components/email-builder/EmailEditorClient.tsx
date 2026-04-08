"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { updateTemplate, previewTemplate } from "@/actions/templates";

const AVAILABLE_VARIABLES = [
  { key: "contact_name", label: "Full Name" },
  { key: "contact_first_name", label: "First Name" },
  { key: "contact_email", label: "Email" },
  { key: "contact_phone", label: "Phone" },
  { key: "agent_name", label: "Agent Name" },
  { key: "agent_phone", label: "Agent Phone" },
  { key: "listing_address", label: "Listing Address" },
  { key: "listing_price", label: "Listing Price" },
  { key: "area", label: "Area/Neighbourhood" },
  { key: "address", label: "Address" },
  { key: "today_date", label: "Today's Date" },
];

interface Template {
  id: string;
  name: string;
  subject: string | null;
  body: string;
  category: string | null;
  is_ai_template: boolean | null;
  builder_json: Record<string, unknown> | null;
}

export function EmailEditorClient({ template }: { template: Template }) {
  const [name, setName] = useState(template.name);
  const [subject, setSubject] = useState(template.subject || "");
  const [body, setBody] = useState(template.body);
  const [previewHtml, setPreviewHtml] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateTemplate(template.id, { name, subject, body });
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  };

  const handlePreview = () => {
    startTransition(async () => {
      const result = await previewTemplate(template.id);
      if (result.html) {
        setPreviewHtml(result.html);
        setShowPreview(true);
      }
    });
  };

  const insertVariable = useCallback((varKey: string) => {
    const textarea = document.getElementById("email-body") as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newBody = body.slice(0, start) + `{{${varKey}}}` + body.slice(end);
      setBody(newBody);
      setTimeout(() => {
        textarea.focus();
        const pos = start + varKey.length + 4;
        textarea.setSelectionRange(pos, pos);
      }, 0);
    } else {
      setBody(body + `{{${varKey}}}`);
    }
  }, [body]);

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Editor Panel */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Name */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Template Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="mt-1 w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Subject */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subject Line</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="e.g., New Homes in {{area}}"
            className="mt-1 w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Body */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email Body</label>
            {template.is_ai_template && (
              <span className="text-[10px] text-[#0F7694] bg-[#0F7694]/5 dark:bg-[#1a1535]/30 px-2 py-0.5 rounded-full font-medium">
                AI-generated at send time
              </span>
            )}
          </div>
          <textarea
            id="email-body"
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={16}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
            placeholder="Write your email body here. Use {{variable}} for dynamic content."
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={pending}
            className="px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saved ? "\u2713 Saved" : pending ? "Saving..." : "Save Template"}
          </button>
          <button
            onClick={handlePreview}
            disabled={pending}
            className="px-5 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            Preview
          </button>
          <button
            onClick={() => router.push("/automations/templates")}
            className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Right Sidebar — Variables + Preview */}
      <div className="w-72 border-l bg-muted/20 overflow-y-auto">
        {/* Variables */}
        <div className="p-4 border-b">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Insert Variable
          </h3>
          <div className="space-y-1">
            {AVAILABLE_VARIABLES.map(v => (
              <button
                key={v.key}
                onClick={() => insertVariable(v.key)}
                className="w-full text-left px-2.5 py-1.5 rounded-md text-xs hover:bg-primary/5 transition-colors group"
              >
                <span className="font-mono text-primary group-hover:text-primary/80">
                  {`{{${v.key}}}`}
                </span>
                <span className="text-muted-foreground ml-2">{v.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        {showPreview && previewHtml && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Preview</h3>
              <button onClick={() => setShowPreview(false)} className="text-xs text-muted-foreground">{"\u2715"}</button>
            </div>
            <div className="border rounded-lg overflow-hidden bg-white">
              <iframe
                srcDoc={`<html><body style="font-family:sans-serif;font-size:14px;padding:16px;color:#1a1535;">${previewHtml}</body></html>`}
                className="w-full h-64 border-none"
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
