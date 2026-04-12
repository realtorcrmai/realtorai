"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Code2, Eye, Copy, Save } from "lucide-react";
import { LogoSpinner } from "@/components/brand/Logo";
import { toast } from "sonner";
import type { StepFieldConfig } from "@/lib/constants/workflow-fields";

type FormPreviewDialogProps = {
  stepId: string;
  stepName: string;
  fieldConfigs: StepFieldConfig[];
  formValues: Record<string, unknown>;
  onSave?: (data: Record<string, string>) => Promise<void>;
};

function generateHtml(
  stepName: string,
  fieldConfigs: StepFieldConfig[],
  formValues: Record<string, unknown>
): string {
  let html = `<div class="form-preview">\n`;
  html += `  <h2>${stepName}</h2>\n`;

  for (const section of fieldConfigs) {
    html += `  <section>\n`;
    html += `    <h3>${section.sectionTitle}</h3>\n`;
    html += `    <table>\n`;
    html += `      <tbody>\n`;
    for (const field of section.fields) {
      const value = formValues[field.key];
      const display = value != null && value !== "" ? String(value) : "—";
      html += `        <tr>\n`;
      html += `          <td class="label">${field.label}</td>\n`;
      html += `          <td class="value">${escapeHtml(display)}</td>\n`;
      html += `        </tr>\n`;
    }
    html += `      </tbody>\n`;
    html += `    </table>\n`;
    html += `  </section>\n`;
  }

  html += `</div>`;
  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseHtmlToData(html: string): Record<string, string> | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const rows = doc.querySelectorAll("tr");
    const data: Record<string, string> = {};

    rows.forEach((row) => {
      const label = row.querySelector(".label")?.textContent?.trim();
      const value = row.querySelector(".value")?.textContent?.trim();
      if (label && value && value !== "—") {
        // Convert label back to field key (lowercase, replace spaces with underscores)
        const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/_$/, "");
        data[key] = value;
      }
    });

    return data;
  } catch {
    return null;
  }
}

export function FormPreviewDialog({
  stepId,
  stepName,
  fieldConfigs,
  formValues,
  onSave,
}: FormPreviewDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const initialHtml = useMemo(
    () => generateHtml(stepName, fieldConfigs, formValues),
    [stepName, fieldConfigs, formValues]
  );

  const [editedHtml, setEditedHtml] = useState(initialHtml);

  // Reset edited HTML when dialog opens
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setEditedHtml(generateHtml(stepName, fieldConfigs, formValues));
    }
    setOpen(nextOpen);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editedHtml);
    toast.success("HTML copied to clipboard");
  };

  const handleSave = async () => {
    if (!onSave) return;

    const data = parseHtmlToData(editedHtml);
    if (!data) {
      toast.error("Could not parse HTML — check format");
      return;
    }

    setSaving(true);
    try {
      await onSave(data);
      toast.success("Data saved from HTML");
      setOpen(false);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs px-2.5 gap-1.5"
          >
            <Code2 className="h-3 w-3" />
            Preview HTML
          </Button>
        }
      />
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Form Preview — {stepName}</DialogTitle>
          <DialogDescription>
            View form data as structured HTML. Edit the source and save changes.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="visual" className="flex-1 min-h-0">
          <TabsList>
            <TabsTrigger value="visual">
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Visual
            </TabsTrigger>
            <TabsTrigger value="source">
              <Code2 className="h-3.5 w-3.5 mr-1.5" />
              Source
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="flex-1 overflow-auto mt-3">
            <div className="border rounded-lg p-4 bg-white dark:bg-gray-950">
              {fieldConfigs.map((section) => (
                <div key={section.sectionTitle} className="mb-5 last:mb-0">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 border-b pb-1">
                    {section.sectionTitle}
                  </h4>
                  <table className="w-full text-sm">
                    <tbody>
                      {section.fields.map((field) => {
                        const value = formValues[field.key];
                        const display =
                          value != null && value !== "" ? String(value) : "—";
                        return (
                          <tr key={field.key} className="border-b border-border/30 last:border-0">
                            <td className="py-1.5 pr-4 text-muted-foreground font-medium w-1/3">
                              {field.label}
                            </td>
                            <td className="py-1.5 text-foreground">{display}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="source" className="flex-1 min-h-0 mt-3">
            <textarea
              value={editedHtml}
              onChange={(e) => setEditedHtml(e.target.value)}
              className="w-full h-[400px] font-mono text-xs p-4 border rounded-lg bg-gray-50 dark:bg-gray-950 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              spellCheck={false}
            />
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-2 pt-3 border-t">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={handleCopy}
          >
            <Copy className="h-3.5 w-3.5" />
            Copy HTML
          </Button>
          {onSave && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <LogoSpinner size={14} />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save from HTML
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
