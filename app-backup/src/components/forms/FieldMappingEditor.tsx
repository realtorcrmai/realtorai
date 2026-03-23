"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { CRM_FIELD_OPTIONS } from "@/lib/forms/constants";

interface FieldMappingEditorProps {
  formKey: string;
  fieldNames: string[];
  initialMapping: Record<string, string>;
  onSaved?: () => void;
}

export function FieldMappingEditor({
  formKey,
  fieldNames,
  initialMapping,
  onSaved,
}: FieldMappingEditorProps) {
  const [mapping, setMapping] = useState<Record<string, string>>(
    initialMapping
  );
  const [saving, setSaving] = useState(false);

  function updateMapping(pdfField: string, crmPath: string) {
    setMapping((prev) => {
      const next = { ...prev };
      if (crmPath === "__none__") {
        delete next[pdfField];
      } else {
        next[pdfField] = crmPath;
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/forms/templates/${formKey}/mapping`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field_mapping: mapping }),
      });

      if (!res.ok) throw new Error("Save failed");

      toast.success("Field mapping saved");
      onSaved?.();
    } catch {
      toast.error("Failed to save mapping");
    } finally {
      setSaving(false);
    }
  }

  if (fieldNames.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No fillable fields found in this PDF template.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Map PDF fields to CRM data ({fieldNames.length} fields)
        </p>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Save className="h-4 w-4 mr-1" />
          )}
          Save Mapping
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-2 gap-0 bg-muted px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>PDF Field Name</span>
          <span>CRM Data Source</span>
        </div>

        <div className="divide-y max-h-[400px] overflow-y-auto">
          {fieldNames.map((fieldName) => (
            <div
              key={fieldName}
              className="grid grid-cols-2 gap-4 items-center px-4 py-2.5"
            >
              <span className="text-sm font-mono truncate" title={fieldName}>
                {fieldName}
              </span>
              <Select
                value={mapping[fieldName] ?? "__none__"}
                onValueChange={(v) => updateMapping(fieldName, v ?? "__none__")}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Not mapped" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    <span className="text-muted-foreground">Not mapped</span>
                  </SelectItem>
                  {CRM_FIELD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.path} value={opt.path}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
