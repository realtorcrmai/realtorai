"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TEMPLATE_VARIABLES,
  TEMPLATE_CATEGORIES,
  TEMPLATE_CATEGORY_LABELS,
} from "@/lib/constants";
import {
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
} from "@/actions/workflows";
import type { MessageTemplate } from "@/types";

const CHANNEL_CONFIG: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  sms: {
    label: "SMS",
    icon: "📱",
    color: "bg-brand-muted text-brand-dark",
  },
  whatsapp: {
    label: "WhatsApp",
    icon: "💬",
    color: "bg-brand-muted text-brand-dark",
  },
  email: {
    label: "Email",
    icon: "📧",
    color: "bg-brand-muted text-brand-dark",
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-gray-100 text-gray-800",
  nurture: "bg-brand-muted-strong text-brand-dark",
  post_close: "bg-brand-muted text-brand-dark",
  follow_up: "bg-amber-100 text-amber-800",
  reengagement: "bg-orange-100 text-orange-800",
  speed_to_contact: "bg-red-100 text-red-800",
  referral: "bg-brand-muted text-brand-dark",
  showing: "bg-brand-muted text-foreground",
};

type FormData = {
  name: string;
  channel: "sms" | "whatsapp" | "email";
  subject: string;
  body: string;
  category: string;
};

const EMPTY_FORM: FormData = {
  name: "",
  channel: "sms",
  subject: "",
  body: "",
  category: "general",
};

const ALL_FILTER_TABS = ["all", ...TEMPLATE_CATEGORIES] as const;

export default function TemplateList({
  templates,
}: {
  templates: MessageTemplate[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const filtered =
    activeCategory === "all"
      ? templates
      : templates.filter((t) => t.category === activeCategory);

  function openCreate() {
    setEditingTemplate(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(template: MessageTemplate) {
    setEditingTemplate(template);
    setForm({
      name: template.name,
      channel: template.channel,
      subject: template.subject || "",
      body: template.body,
      category: template.category,
    });
    setDialogOpen(true);
  }

  function insertVariable(key: string) {
    const textarea = bodyRef.current;
    if (!textarea) {
      setForm((prev) => ({
        ...prev,
        body: prev.body + `{{${key}}}`,
      }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = form.body;
    const insert = `{{${key}}}`;
    const newBody = text.substring(0, start) + insert + text.substring(end);

    setForm((prev) => ({ ...prev, body: newBody }));

    requestAnimationFrame(() => {
      textarea.focus();
      const pos = start + insert.length;
      textarea.setSelectionRange(pos, pos);
    });
  }

  function handleSave() {
    if (!form.name.trim() || !form.body.trim()) return;

    startTransition(async () => {
      if (editingTemplate) {
        await updateMessageTemplate(editingTemplate.id, {
          name: form.name,
          channel: form.channel,
          subject: form.channel === "email" ? form.subject || null : null,
          body: form.body,
          category: form.category,
        });
      } else {
        await createMessageTemplate({
          name: form.name,
          channel: form.channel,
          subject: form.channel === "email" ? form.subject : undefined,
          body: form.body,
          category: form.category,
        });
      }
      setDialogOpen(false);
      setEditingTemplate(null);
      setForm(EMPTY_FORM);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteMessageTemplate(id);
      setDeleteConfirmId(null);
      router.refresh();
    });
  }

  function handleToggleActive(template: MessageTemplate) {
    startTransition(async () => {
      await updateMessageTemplate(template.id, {
        is_active: !template.is_active,
      });
      router.refresh();
    });
  }

  function extractVariables(body: string): string[] {
    const matches = body.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))];
  }

  function truncateBody(body: string, maxLen = 120): string {
    const clean = body.replace(/\{\{(\w+)\}\}/g, (_, v) => `[${v}]`);
    if (clean.length <= maxLen) return clean;
    return clean.substring(0, maxLen) + "...";
  }

  return (
    <>
      {/* Filter Tabs + New Button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {ALL_FILTER_TABS.map((cat) => {
            const label =
              cat === "all"
                ? "All"
                : TEMPLATE_CATEGORY_LABELS[
                    cat as keyof typeof TEMPLATE_CATEGORY_LABELS
                  ] || cat;
            const count =
              cat === "all"
                ? templates.length
                : templates.filter((t) => t.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeCategory === cat
                    ? "bg-[var(--lf-indigo)] text-white shadow-sm"
                    : "bg-white/60 text-muted-foreground hover:bg-white/80"
                }`}
              >
                {label}
                {count > 0 && (
                  <span className="ml-1.5 opacity-70">({count})</span>
                )}
              </button>
            );
          })}
        </div>
        <Button onClick={openCreate} className="lf-btn text-sm">
          + New Template
        </Button>
      </div>

      {/* Template Cards */}
      {filtered.length === 0 ? (
        <Card className="lf-card">
          <CardContent className="py-12 text-center">
            <p className="text-4xl mb-3">📝</p>
            <h3 className="text-base font-semibold text-foreground mb-1">
              No Templates Found
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {activeCategory === "all"
                ? "Create your first message template to get started."
                : `No templates in the "${TEMPLATE_CATEGORY_LABELS[activeCategory as keyof typeof TEMPLATE_CATEGORY_LABELS] || activeCategory}" category.`}
            </p>
            <Button onClick={openCreate} className="lf-btn text-sm">
              + Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((template) => {
            const channel = CHANNEL_CONFIG[template.channel] || CHANNEL_CONFIG.sms;
            const categoryColor =
              CATEGORY_COLORS[template.category] || CATEGORY_COLORS.general;
            const variables = extractVariables(template.body);

            return (
              <Card
                key={template.id}
                className={`lf-card transition-all hover:shadow-md ${
                  !template.is_active ? "opacity-60" : ""
                }`}
              >
                <CardContent className="py-4 px-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Header Row */}
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <h3 className="font-semibold text-sm text-foreground truncate">
                          {template.name}
                        </h3>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0 ${channel.color}`}
                        >
                          {channel.icon} {channel.label}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0 ${categoryColor}`}
                        >
                          {TEMPLATE_CATEGORY_LABELS[
                            template.category as keyof typeof TEMPLATE_CATEGORY_LABELS
                          ] || template.category}
                        </Badge>
                        {!template.is_active && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 bg-gray-200 text-gray-600"
                          >
                            Inactive
                          </Badge>
                        )}
                      </div>

                      {/* Subject line for email */}
                      {template.channel === "email" && template.subject && (
                        <p className="text-xs text-muted-foreground mb-1">
                          <span className="font-medium">Subject:</span>{" "}
                          {template.subject}
                        </p>
                      )}

                      {/* Body Preview */}
                      <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                        {truncateBody(template.body)}
                      </p>

                      {/* Variable Pills */}
                      {variables.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {variables.map((v) => (
                            <span
                              key={v}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--lf-indigo)]/10 text-[var(--lf-indigo)]"
                            >
                              {`{{${v}}}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleToggleActive(template)}
                        disabled={isPending}
                      >
                        {template.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => openEdit(template)}
                      >
                        Edit
                      </Button>
                      {deleteConfirmId === template.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(template.id)}
                            disabled={isPending}
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setDeleteConfirmId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteConfirmId(template.id)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "New Message Template"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                placeholder="e.g. Welcome Text for Buyers"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="lf-input"
              />
            </div>

            {/* Channel + Category Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Channel</Label>
                <Select
                  value={form.channel}
                  onValueChange={(v) =>
                    setForm((prev) => ({
                      ...prev,
                      channel: v as "sms" | "whatsapp" | "email",
                    }))
                  }
                >
                  <SelectTrigger className="lf-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">📱 SMS</SelectItem>
                    <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                    <SelectItem value="email">📧 Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm((prev) => ({ ...prev, category: v || "general" }))
                  }
                >
                  <SelectTrigger className="lf-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {TEMPLATE_CATEGORY_LABELS[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Subject (email only) */}
            {form.channel === "email" && (
              <div className="space-y-1.5">
                <Label htmlFor="template-subject">Email Subject</Label>
                <Input
                  id="template-subject"
                  placeholder="e.g. Welcome to your home search, {{contact_first_name}}!"
                  value={form.subject}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, subject: e.target.value }))
                  }
                  className="lf-input"
                />
              </div>
            )}

            {/* Body */}
            <div className="space-y-1.5">
              <Label htmlFor="template-body">Message Body</Label>
              <Textarea
                ref={bodyRef}
                id="template-body"
                placeholder="Write your message here. Use the variable buttons below to insert dynamic fields..."
                value={form.body}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, body: e.target.value }))
                }
                className="lf-textarea min-h-[140px] font-mono text-sm"
                rows={6}
              />
              <p className="text-[10px] text-muted-foreground">
                {form.body.length} characters
                {form.channel === "sms" && form.body.length > 160 && (
                  <span className="text-amber-600 ml-1">
                    (SMS over 160 chars may split into multiple messages)
                  </span>
                )}
              </p>
            </div>

            {/* Variable Pills */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Insert Variable
              </Label>
              <div className="flex gap-1.5 flex-wrap">
                {TEMPLATE_VARIABLES.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVariable(v.key)}
                    className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-[var(--lf-indigo)]/10 text-[var(--lf-indigo)] hover:bg-[var(--lf-indigo)]/20 transition-colors cursor-pointer"
                    title={`Example: ${v.example}`}
                  >
                    {`{{${v.key}}}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {form.body.trim() && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Preview
                </Label>
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                  {form.body.replace(
                    /\{\{(\w+)\}\}/g,
                    (_, key) => {
                      const variable = TEMPLATE_VARIABLES.find(
                        (v) => v.key === key
                      );
                      return variable ? variable.example : `[${key}]`;
                    }
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                className="lf-btn-ghost"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isPending || !form.name.trim() || !form.body.trim()}
                className="lf-btn"
              >
                {isPending
                  ? "Saving..."
                  : editingTemplate
                    ? "Update Template"
                    : "Create Template"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
