"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";

interface KnowledgeArticle {
  id: string;
  title: string;
  body: string;
  category: string;
  audience_type: string;
  tags: string[];
  created_at: string;
}

const CATEGORIES = ["faq", "playbook", "script", "explainer", "process"] as const;

export default function KnowledgePage() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<string>("faq");
  const [tags, setTags] = useState("");

  useEffect(() => {
    loadArticles();
  }, []);

  async function loadArticles() {
    try {
      const res = await fetch("/api/rag/knowledge");
      const data = await res.json();
      setArticles(data.articles ?? []);
    } catch {
      console.error("Failed to load articles");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/rag/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          category,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });

      if (res.ok) {
        setTitle("");
        setBody("");
        setCategory("faq");
        setTags("");
        setShowForm(false);
        await loadArticles();
      }
    } catch {
      console.error("Failed to create article");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this article? This also removes its embeddings.")) return;

    try {
      const res = await fetch(`/api/rag/knowledge/${id}`, { method: "DELETE" });
      if (res.ok) {
        setArticles((prev) => prev.filter((a) => a.id !== id));
      }
    } catch {
      console.error("Failed to delete article");
    }
  }

  const filtered =
    filter === "all" ? articles : articles.filter((a) => a.category === filter);

  const categoryIcon: Record<string, string> = {
    faq: "❓",
    playbook: "📋",
    script: "🎯",
    explainer: "💡",
    process: "⚙️",
  };

  return (
    <div style={{ marginTop: 100, padding: 18 }}>
      {/* Header */}
      <div className="lf-glass" style={{ padding: "14px 20px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, background: "linear-gradient(135deg, var(--lf-indigo), var(--lf-coral))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          📚 Knowledge Base
        </h1>
        <button className="lf-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ New Article"}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="lf-card" style={{ padding: 20, marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>New Knowledge Article</h2>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              className="lf-input"
              placeholder="Article title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
            <select
              className="lf-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryIcon[c]} {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
            <textarea
              className="lf-textarea"
              placeholder="Article content (FAQ answer, playbook steps, script template...)"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              required
            />
            <input
              className="lf-input"
              placeholder="Tags (comma-separated, e.g. showing, seller, onboarding)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
            <button className="lf-btn" type="submit" disabled={saving}>
              {saving ? "Saving & Embedding..." : "Save Article"}
            </button>
          </form>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button
          className={filter === "all" ? "lf-btn lf-btn-sm" : "lf-btn-ghost lf-btn-sm"}
          onClick={() => setFilter("all")}
        >
          All ({articles.length})
        </button>
        {CATEGORIES.map((c) => {
          const count = articles.filter((a) => a.category === c).length;
          return (
            <button
              key={c}
              className={filter === c ? "lf-btn lf-btn-sm" : "lf-btn-ghost lf-btn-sm"}
              onClick={() => setFilter(c)}
            >
              {categoryIcon[c]} {c} ({count})
            </button>
          );
        })}
      </div>

      {/* Articles List */}
      {loading ? (
        <div className="lf-card" style={{ padding: 40, textAlign: "center" }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="lf-card" style={{ padding: 40, textAlign: "center", color: "#888" }}>
          {articles.length === 0
            ? "No knowledge articles yet. Add FAQs, playbooks, scripts, or process docs to improve your AI assistant."
            : `No ${filter} articles found.`}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((article) => (
            <div key={article.id} className="lf-card" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 18 }}>{categoryIcon[article.category] ?? "📄"}</span>
                    <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{article.title}</h3>
                    <span className="lf-badge lf-badge-info" style={{ fontSize: 11 }}>{article.category}</span>
                  </div>
                  <p style={{ fontSize: 14, color: "#666", margin: "0 0 8px 0", whiteSpace: "pre-wrap" }}>
                    {article.body.length > 200 ? article.body.slice(0, 200) + "..." : article.body}
                  </p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {article.tags?.map((tag) => (
                      <span key={tag} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: "var(--lf-bg)", color: "var(--lf-indigo)" }}>
                        {tag}
                      </span>
                    ))}
                    <span style={{ fontSize: 11, color: "#999" }}>
                      {new Date(article.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button
                  className="lf-btn-ghost lf-btn-sm"
                  onClick={() => handleDelete(article.id)}
                  style={{ color: "#ef4444", marginLeft: 12 }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
