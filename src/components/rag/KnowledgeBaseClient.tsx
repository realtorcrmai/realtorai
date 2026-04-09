"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Article {
  id: string;
  title: string;
  body: string;
  category: string;
  audience_type: string | null;
  tags: string[] | null;
  is_active: boolean;
  created_at: string;
}

const CATEGORIES = ["faq", "playbook", "script", "process", "explainer"] as const;

const CATEGORY_ICONS: Record<string, string> = {
  faq: "❓",
  playbook: "📋",
  script: "💬",
  process: "⚙️",
  explainer: "📖",
};

interface KnowledgeBaseClientProps {
  initialArticles: Article[];
}

export function KnowledgeBaseClient({ initialArticles }: KnowledgeBaseClientProps) {
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [filter, setFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<string>("faq");
  const [audienceType, setAudienceType] = useState<string>("");
  const [tags, setTags] = useState<string>("");

  const filtered = filter === "all"
    ? articles
    : articles.filter((a) => a.category === filter);

  function resetForm() {
    setTitle("");
    setBody("");
    setCategory("faq");
    setAudienceType("");
    setTags("");
    setEditId(null);
    setShowForm(false);
  }

  function startEdit(article: Article) {
    setTitle(article.title);
    setBody(article.body);
    setCategory(article.category);
    setAudienceType(article.audience_type || "");
    setTags((article.tags || []).join(", "));
    setEditId(article.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);

    const payload = {
      title: title.trim(),
      body: body.trim(),
      category,
      audience_type: audienceType || null,
      tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    };

    try {
      if (editId) {
        const res = await fetch(`/api/rag/knowledge/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated = await res.json();
          setArticles((prev) =>
            prev.map((a) => (a.id === editId ? { ...a, ...updated } : a))
          );
        }
      } else {
        const res = await fetch("/api/rag/knowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const created = await res.json();
          setArticles((prev) => [created, ...prev]);
        }
      }
      resetForm();
    } catch (err) {
      console.error("Failed to save article:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/rag/knowledge/${id}`, { method: "DELETE" });
      if (res.ok) {
        setArticles((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete article:", err);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter + Add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
              filter === "all"
                ? "bg-[#0F7694] text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            All ({articles.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = articles.filter((a) => a.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
                  filter === cat
                    ? "bg-[#0F7694] text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {CATEGORY_ICONS[cat]} {cat} ({count})
              </button>
            );
          })}
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="lf-btn text-xs px-4 py-2"
        >
          + Add Article
        </button>
      </div>

      {/* Create/Edit form */}
      {showForm && (
        <Card className="border-primary/30">
          <CardContent className="p-5 space-y-3">
            <h3 className="text-sm font-bold">
              {editId ? "Edit Article" : "New Article"}
            </h3>
            <input
              className="lf-input w-full"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="lf-textarea w-full min-h-[150px]"
              placeholder="Article body — Markdown supported"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Category
                </label>
                <select
                  className="lf-select w-full"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_ICONS[c]} {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Audience
                </label>
                <select
                  className="lf-select w-full"
                  value={audienceType}
                  onChange={(e) => setAudienceType(e.target.value)}
                >
                  <option value="">All</option>
                  <option value="buyer">Buyer</option>
                  <option value="seller">Seller</option>
                  <option value="agent">Agent</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Tags (comma-separated)
                </label>
                <input
                  className="lf-input w-full"
                  placeholder="bc, fintrac, listing"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving || !title.trim() || !body.trim()}
                className="lf-btn text-xs px-4 py-2 disabled:opacity-50"
              >
                {saving ? "Saving..." : editId ? "Update" : "Create"}
              </button>
              <button
                onClick={resetForm}
                className="lf-btn-ghost text-xs px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Article list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No articles yet. Add FAQs, playbooks, and scripts for the AI to use.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((article) => (
            <Card key={article.id} className="hover:border-primary/20 transition">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">
                        {CATEGORY_ICONS[article.category] || "📄"}
                      </span>
                      <h4 className="text-sm font-semibold truncate">
                        {article.title}
                      </h4>
                      <Badge variant="secondary" className="text-[10px] capitalize shrink-0">
                        {article.category}
                      </Badge>
                      {article.audience_type && (
                        <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                          {article.audience_type}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {article.body.slice(0, 200)}
                    </p>
                    {article.tags && article.tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {article.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => startEdit(article)}
                      className="text-xs px-2.5 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(article.id)}
                      className="text-xs px-2.5 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
