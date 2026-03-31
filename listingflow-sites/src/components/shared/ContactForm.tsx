"use client";

import { useState } from "react";
import { Send, CheckCircle } from "lucide-react";

export function ContactForm({
  siteId,
  sourcePage,
  dark = false,
}: {
  siteId: string;
  sourcePage: string;
  dark?: boolean;
}) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) return;

    setSubmitting(true);
    await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        site_id: siteId,
        lead_type: "contact",
        source_page: sourcePage,
        form_data: form,
      }),
    });

    setSubmitting(false);
    setSubmitted(true);
    setForm({ name: "", email: "", phone: "", message: "" });
  };

  if (submitted) {
    return (
      <div className="text-center py-6 animate-float-in">
        <CheckCircle className={`h-10 w-10 mx-auto mb-3 ${dark ? "text-green-300" : "text-green-500"}`} />
        <p className={`font-semibold text-lg ${dark ? "text-white" : "text-gray-900"}`}>Thank you!</p>
        <p className={`text-sm mt-1 ${dark ? "text-white/70" : "text-gray-500"}`}>
          I&apos;ll get back to you as soon as possible.
        </p>
      </div>
    );
  }

  const inputClass = dark
    ? "w-full px-3 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
    : "input";

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-left max-w-md mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          className={inputClass}
          placeholder="Your Name *"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          required
        />
        <input
          className={inputClass}
          placeholder="Email *"
          type="email"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          required
        />
      </div>
      <input
        className={inputClass}
        placeholder="Phone (optional)"
        type="tel"
        value={form.phone}
        onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
      />
      <textarea
        className={dark
          ? "w-full px-3 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-sm resize-y min-h-[80px] focus:outline-none focus:ring-2 focus:ring-white/30"
          : "textarea"
        }
        rows={3}
        placeholder="How can I help you?"
        value={form.message}
        onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
      />
      <button
        type="submit"
        disabled={submitting || !form.name || !form.email}
        className={`btn w-full ${dark ? "bg-white text-gray-900 hover:bg-gray-100" : "btn-primary"} disabled:opacity-50`}
      >
        {submitting ? "Sending..." : "Send Message"}
        {!submitting && <Send className="h-4 w-4" />}
      </button>
    </form>
  );
}
