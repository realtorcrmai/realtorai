"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  X,
  Upload,
  Loader2,
  FileText,
  FileCheck,
  Pencil,
  CircleDot,
  User,
  Phone,
  Mail,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ListingDocument, Appointment } from "@/types";

// ─── Tab types ───────────────────────────────────────────────────────────────
type TabId = "forms" | "signatures" | "parties" | "mls";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "forms", label: "Forms", icon: "📋" },
  { id: "signatures", label: "Signatures", icon: "✍️" },
  { id: "parties", label: "Parties", icon: "👥" },
  { id: "mls", label: "MLS", icon: "✅" },
];

// ─── Required documents ──────────────────────────────────────────────────────
const REQUIRED_DOCS = [
  { type: "FINTRAC" as const, label: "FINTRAC", desc: "Client Identification & Verification" },
  { type: "DORTS" as const, label: "DORTS", desc: "Disclosure of Representation" },
  { type: "PDS" as const, label: "PDS", desc: "Property Disclosure Statement" },
];

// ─── BC Standard Forms (for Forms tab) ───────────────────────────────────────
const BC_FORMS = [
  { key: "dorts", label: "DORTS", fullName: "Disclosure of Representation in Trading Services" },
  { key: "mlc", label: "MLC", fullName: "Multiple Listing Contract" },
  { key: "pds", label: "PDS", fullName: "Property Disclosure Statement" },
  { key: "fintrac", label: "FINTRAC", fullName: "Client ID Verification" },
  { key: "privacy", label: "Privacy", fullName: "Privacy Notice & Consent" },
  { key: "c3", label: "C3", fullName: "Contract of Purchase & Sale" },
  { key: "drup", label: "DRUP", fullName: "Disclosure of Remuneration" },
  { key: "mls", label: "MLS Input", fullName: "MLS Data Input Sheet" },
  { key: "mktauth", label: "Mktg Auth", fullName: "Marketing Authorization" },
  { key: "agency", label: "Agency", fullName: "Agency Disclosure" },
  { key: "c3conf", label: "C3 Conf", fullName: "C3 Confirmation" },
  { key: "fairhsg", label: "Fair Housing", fullName: "Fair Housing Declaration" },
];

// ─── MLS Checklist items ─────────────────────────────────────────────────────
const MLS_CHECKLIST = [
  { id: "photos", label: "Professional photos uploaded" },
  { id: "description", label: "Property description written" },
  { id: "feature-sheet", label: "Feature sheet created" },
  { id: "virtual-tour", label: "Virtual tour link added" },
  { id: "mls-data", label: "MLS data fields completed" },
  { id: "price-confirmed", label: "List price confirmed" },
  { id: "showing-window", label: "Showing window set" },
  { id: "submitted-board", label: "Submitted to real estate board" },
];

export function FormReadinessPanel({
  listingId,
  documents,
  listing,
  seller,
  formStatuses = {},
  showings = [],
}: {
  listingId: string;
  documents: ListingDocument[];
  listing?: Record<string, unknown>;
  seller?: { id: string; name: string; phone: string; email: string | null };
  formStatuses?: Record<string, "draft" | "completed">;
  showings?: Appointment[];
}) {
  const [activeTab, setActiveTab] = useState<TabId>("forms");
  const [uploading, setUploading] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const uploadedTypes = new Set(documents.map((d) => d.doc_type));
  const requiredComplete = REQUIRED_DOCS.filter((d) =>
    uploadedTypes.has(d.type)
  ).length;
  const totalRequired = REQUIRED_DOCS.length;
  const progressPct = Math.round((requiredComplete / totalRequired) * 100);

  async function handleUpload(docType: string) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.doc,.docx,.jpg,.png";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setUploading(docType);

      const filePath = `${listingId}/${docType}_${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("listing-documents")
        .upload(filePath, file);

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}`);
        setUploading(null);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("listing-documents").getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from("listing_documents")
        .upsert(
          {
            listing_id: listingId,
            doc_type: docType,
            file_name: file.name,
            file_url: publicUrl,
          },
          { onConflict: "listing_id,doc_type" }
        );

      if (dbError) {
        toast.error(`Failed to save document record: ${dbError.message}`);
        setUploading(null);
        return;
      }

      toast.success(`${docType} uploaded`);
      setUploading(null);
      router.refresh();
    };

    input.click();
  }

  function openFormEditor(formKey: string) {
    router.push(`/forms/${listingId}/${formKey}`);
  }

  // Derive form completion percentages
  function getFormPct(formKey: string): number {
    const status = formStatuses[formKey];
    if (status === "completed") return 100;
    if (status === "draft") return 50;
    return 0;
  }

  // Derive MLS checklist status from listing data
  function getMlsChecklist() {
    const hasMls = !!listing?.mls_number;
    const hasPrice = listing?.list_price != null;
    const hasShowingWindow = !!listing?.showing_window_start;

    return MLS_CHECKLIST.map((item) => {
      let done = false;
      switch (item.id) {
        case "price-confirmed":
          done = hasPrice;
          break;
        case "showing-window":
          done = hasShowingWindow;
          break;
        case "mls-data":
        case "photos":
        case "description":
        case "feature-sheet":
        case "virtual-tour":
        case "submitted-board":
          done = hasMls;
          break;
      }
      return { ...item, done };
    });
  }

  // Get unique buyer agents from showings
  function getBuyerAgents() {
    const agents = new Map<string, { name: string; phone: string }>();
    for (const s of showings) {
      if (s.buyer_agent_name && !agents.has(s.buyer_agent_name)) {
        agents.set(s.buyer_agent_name, {
          name: s.buyer_agent_name,
          phone: s.buyer_agent_phone ?? "",
        });
      }
    }
    return Array.from(agents.values());
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b bg-muted/30 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 py-2.5 px-1 text-center text-[11px] font-semibold transition-all border-b-2",
              activeTab === tab.id
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            <span className="text-sm">{tab.icon}</span>
            <span className="block mt-0.5">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content — scrollable */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* ── FORMS TAB ── */}
        {activeTab === "forms" && (
          <div className="space-y-5">
            {/* Document Readiness */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Document Readiness</h3>
                <span className="text-xs font-medium text-muted-foreground">
                  {requiredComplete}/{totalRequired}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    progressPct === 100 ? "bg-green-500" : "bg-green-500/70"
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="space-y-2">
                {REQUIRED_DOCS.map((doc) => {
                  const isUploaded = uploadedTypes.has(doc.type);
                  const isUploading = uploading === doc.type;
                  return (
                    <div
                      key={doc.type}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        {isUploaded ? (
                          <Check className="h-4 w-4 text-green-600 shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-red-500 shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{doc.label}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {doc.desc}
                          </p>
                        </div>
                      </div>
                      {!isUploaded && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] px-2"
                          onClick={() => handleUpload(doc.type)}
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Upload className="h-3 w-3 mr-1" />
                              Upload
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* BC Standard Forms — mini progress bar rows */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <FileText className="h-3.5 w-3.5" />
                BC Standard Forms
              </p>
              <div className="space-y-1.5">
                {BC_FORMS.map((form) => {
                  const pct = getFormPct(form.key);
                  const status = formStatuses[form.key];
                  return (
                    <button
                      key={form.key}
                      onClick={() => openFormEditor(form.key)}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/40 border border-border/50 hover:border-primary/30 hover:bg-muted/60 transition-colors text-left"
                    >
                      <span className="text-sm font-medium flex-1 truncate">
                        {form.label}
                      </span>
                      {/* Mini progress bar */}
                      <div className="w-14 h-1 rounded-full bg-muted overflow-hidden shrink-0">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            pct === 100
                              ? "bg-green-500"
                              : pct > 0
                                ? "bg-gradient-to-r from-primary to-primary/70"
                                : ""
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-muted-foreground w-7 text-right tabular-nums">
                        {pct}%
                      </span>
                      {/* Status indicator */}
                      {status === "completed" ? (
                        <FileCheck className="h-3.5 w-3.5 text-green-600 shrink-0" />
                      ) : status === "draft" ? (
                        <Pencil className="h-3 w-3 text-amber-500 shrink-0" />
                      ) : (
                        <CircleDot className="h-3 w-3 text-muted-foreground/30 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Click any form to open the editor.
              </p>
            </div>
          </div>
        )}

        {/* ── SIGNATURES TAB ── */}
        {activeTab === "signatures" && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              DocuSign Envelopes
            </p>
            {BC_FORMS.filter((f) => formStatuses[f.key] === "completed").length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-12 w-12 rounded-xl bg-muted/60 flex items-center justify-center text-xl mb-3">
                  ✍️
                </div>
                <p className="text-sm text-muted-foreground">
                  No forms ready for signature yet.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Complete forms in the Forms tab first.
                </p>
              </div>
            ) : (
              BC_FORMS.filter((f) => formStatuses[f.key]).map((form) => {
                const isComplete = formStatuses[form.key] === "completed";
                return (
                  <div
                    key={form.key}
                    className="border rounded-lg overflow-hidden"
                  >
                    <div className="flex items-center gap-2 p-3 bg-muted/30">
                      <span className="text-sm font-semibold flex-1">
                        {form.label}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          isComplete
                            ? "bg-amber-50 text-amber-600 border-amber-200"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {isComplete ? "Ready" : "Draft"}
                      </Badge>
                    </div>
                    <div className="p-3 space-y-1.5">
                      {/* Seller signer */}
                      {seller && (
                        <div className="flex items-center gap-2 text-sm">
                          <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold text-primary">
                              {seller.name.charAt(0)}
                            </span>
                          </div>
                          <span className="flex-1 text-sm">{seller.name}</span>
                          <span className="text-[11px] text-muted-foreground">
                            Pending
                          </span>
                        </div>
                      )}
                      {/* Agent signer */}
                      <div className="flex items-center gap-2 text-sm">
                        <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-emerald-600">
                            A
                          </span>
                        </div>
                        <span className="flex-1 text-sm">Agent</span>
                        <span className="text-[11px] text-muted-foreground">
                          Pending
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── PARTIES TAB ── */}
        {activeTab === "parties" && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Stakeholders
            </p>

            {/* Seller card */}
            {seller && (
              <div className="border rounded-lg overflow-hidden">
                <div className="flex items-center gap-2.5 p-3 bg-muted/30">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-white">
                      {seller.name.split(" ").map((n) => n[0]).join("")}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">Seller</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {seller.name}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-emerald-50 text-emerald-600 border-emerald-200"
                  >
                    Active
                  </Badge>
                </div>
                <div className="p-3 space-y-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Phone className="h-3 w-3" /> Phone
                    </span>
                    <span className="font-medium">{seller.phone || "—"}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Mail className="h-3 w-3" /> Email
                    </span>
                    <span className="font-medium truncate ml-2">
                      {seller.email || "—"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Listing Agent card */}
            <div className="border rounded-lg overflow-hidden">
              <div className="flex items-center gap-2.5 p-3 bg-muted/30">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Listing Agent</p>
                  <p className="text-xs text-muted-foreground">You</p>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-emerald-50 text-emerald-600 border-emerald-200"
                >
                  Active
                </Badge>
              </div>
            </div>

            {/* Buyer agents from showings */}
            {getBuyerAgents().length > 0 && (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-2">
                  Buyer Agents
                </p>
                {getBuyerAgents().map((agent, i) => (
                  <div key={i} className="border rounded-lg overflow-hidden">
                    <div className="flex items-center gap-2.5 p-3 bg-muted/30">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-white">
                          {agent.name.split(" ").map((n) => n[0]).join("")}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">Buyer Agent</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {agent.name}
                        </p>
                      </div>
                    </div>
                    {agent.phone && (
                      <div className="p-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Phone className="h-3 w-3" /> Phone
                          </span>
                          <span className="font-medium">{agent.phone}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── MLS TAB ── */}
        {activeTab === "mls" && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              MLS Readiness Checklist
            </p>
            <div className="space-y-1.5">
              {getMlsChecklist().map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/40 text-sm"
                >
                  {item.done ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                  )}
                  <span
                    className={cn(
                      "flex-1",
                      item.done && "line-through text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
            {listing?.mls_number ? (
              <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <p className="text-sm font-semibold text-emerald-700">
                  Listed on MLS
                </p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  MLS# {String(listing.mls_number)}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
