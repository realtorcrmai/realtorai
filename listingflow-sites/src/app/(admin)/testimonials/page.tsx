"use client";

import { useState, useEffect } from "react";
import { createTestimonial, deleteTestimonial } from "@/actions/testimonials";
import { MessageSquareQuote, Plus, Trash2, Star, X } from "lucide-react";

export default function TestimonialsPage() {
  const [site, setSite] = useState<Record<string, unknown> | null>(null);
  const [testimonials, setTestimonials] = useState<Record<string, unknown>[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ client_name: "", client_location: "", content: "", rating: 5 });

  useEffect(() => {
    fetch("/api/site").then((r) => r.json()).then((d) => {
      setSite(d.site);
      if (d.site) {
        fetch(`/api/testimonials?site_id=${d.site.id}`).then((r) => r.json()).then((t) => setTestimonials(t.testimonials || []));
      }
    });
  }, []);

  const handleAdd = async () => {
    if (!site || !form.client_name || !form.content) return;
    const result = await createTestimonial({
      site_id: site.id as string,
      client_name: form.client_name,
      client_location: form.client_location,
      content: form.content,
      rating: form.rating,
      is_featured: true,
    });
    if (result.success && result.testimonial) {
      setTestimonials((prev) => [result.testimonial!, ...prev]);
      setForm({ client_name: "", client_location: "", content: "", rating: 5 });
      setShowForm(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteTestimonial(id);
    setTestimonials((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Testimonials</h1>
          <p className="text-gray-500 text-sm mt-1">Client reviews displayed on your website</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm">
          <Plus className="h-4 w-4" /> Add Testimonial
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="card card-body space-y-4 animate-float-in">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">New Testimonial</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Client Name *</label>
              <input className="input" placeholder="Emily & David" value={form.client_name} onChange={(e) => setForm((p) => ({ ...p, client_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input" placeholder="Langley, BC" value={form.client_location} onChange={(e) => setForm((p) => ({ ...p, client_location: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Testimonial *</label>
            <textarea className="textarea" rows={3} placeholder="Write what the client said..." value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} />
          </div>
          <div className="flex items-center gap-1">
            <label className="label mr-2 mb-0">Rating:</label>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setForm((p) => ({ ...p, rating: n }))}>
                <Star className={`h-5 w-5 ${n <= form.rating ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="btn btn-outline btn-sm">Cancel</button>
            <button onClick={handleAdd} disabled={!form.client_name || !form.content} className="btn btn-primary btn-sm disabled:opacity-40">Save</button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="card">
        {testimonials.length === 0 ? (
          <div className="card-body text-center py-12">
            <MessageSquareQuote className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No testimonials yet</p>
            <p className="text-sm text-gray-400 mt-1">Add client reviews to build trust on your website.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {testimonials.map((t) => (
              <div key={t.id as string} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-1 mb-1">
                      {Array.from({ length: (t.rating as number) || 5 }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                    <p className="text-sm text-gray-700 italic">&ldquo;{t.content as string}&rdquo;</p>
                    <p className="text-xs text-gray-500 mt-2 font-medium">
                      — {t.client_name as string}{t.client_location ? `, ${t.client_location}` : ""}
                    </p>
                  </div>
                  <button onClick={() => handleDelete(t.id as string)} className="text-gray-300 hover:text-red-500 transition-colors ml-4">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
