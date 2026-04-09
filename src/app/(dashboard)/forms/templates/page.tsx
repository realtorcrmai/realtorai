"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { TemplateUploadDialog } from "@/components/forms/TemplateUploadDialog";
import { FieldMappingEditor } from "@/components/forms/FieldMappingEditor";
import Link from "next/link";
import type { FormTemplate } from "@/types";

export default function FormTemplatesPage() {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  async function fetchTemplates() {
    try {
      const res = await fetch("/api/forms/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch {
      console.error("Failed to fetch templates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTemplates();
  }, []);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 md:pb-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/forms">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </Link>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Settings
              </p>
              <h1 className="text-2xl font-bold tracking-tight">
                Form Templates
              </h1>
            </div>
          </div>
          <TemplateUploadDialog />
        </div>

        {/* Info */}
        <div className="p-4 bg-[#0F7694]/5 border border-[#0F7694]/20 rounded-xl text-sm text-[#0A6880]">
          Upload official PDF form templates here. The system extracts fillable
          fields automatically. Map PDF fields to CRM data (listing address,
          seller name, etc.) so forms are pre-filled when opened.
        </div>

        {/* Templates list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 bg-muted animate-pulse rounded-lg"
              />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">
                No templates uploaded yet
              </p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Upload official BCREA PDF forms or other BC real estate
                documents. The system will detect fillable fields and let you
                map them to your CRM data.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => {
              const isExpanded = expandedKey === template.form_key;
              const fieldNames = (template.field_names ?? []) as string[];
              const mappingCount = Object.keys(
                (template.field_mapping ?? {}) as Record<string, string>
              ).length;

              return (
                <Card key={template.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <FileText className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {template.form_name}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px]">
                              {template.organization}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              v{template.version}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {fieldNames.length} fields
                            </span>
                            {mappingCount > 0 && (
                              <span className="text-xs text-[#0F7694]">
                                {mappingCount} mapped
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={template.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                        {fieldNames.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setExpandedKey(isExpanded ? null : template.form_key)
                            }
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 mr-1" />
                            ) : (
                              <ChevronDown className="h-4 w-4 mr-1" />
                            )}
                            Map Fields
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Expanded field mapping editor */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t">
                        <FieldMappingEditor
                          formKey={template.form_key}
                          fieldNames={fieldNames}
                          initialMapping={
                            (template.field_mapping ?? {}) as Record<
                              string,
                              string
                            >
                          }
                          onSaved={fetchTemplates}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
