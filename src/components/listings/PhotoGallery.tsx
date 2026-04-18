"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Camera } from "lucide-react";

interface Photo {
  id: string;
  photo_url: string;
  role: string;
  caption: string | null;
  sort_order: number;
}

interface PhotoGalleryProps {
  photos: Photo[];
  address: string;
}

// ── Lightbox (fullscreen overlay) ──────────────
function Lightbox({
  photos,
  startIndex,
  onClose,
}: {
  photos: Photo[];
  startIndex: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(startIndex);
  const photo = photos[current];

  const goNext = useCallback(() => setCurrent((c) => (c + 1) % photos.length), [photos.length]);
  const goPrev = useCallback(() => setCurrent((c) => (c - 1 + photos.length) % photos.length), [photos.length]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, goNext, goPrev]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
      onClick={onClose}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0" onClick={(e) => e.stopPropagation()}>
        <div className="text-white/80 text-sm">
          <span className="font-semibold text-white">{current + 1}</span>
          <span> / {photos.length}</span>
          {photo.caption && (
            <span className="ml-3 text-white/60">— {photo.caption}</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          aria-label="Close gallery"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main image area */}
      <div className="flex-1 flex items-center justify-center relative min-h-0 px-4 pb-4" onClick={(e) => e.stopPropagation()}>
        {/* Prev button */}
        <button
          onClick={goPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white/80 hover:text-white transition-all z-10"
          aria-label="Previous photo"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        {/* Photo */}
        <img
          src={`${photo.photo_url}&w=1600&q=90`}
          alt={photo.caption || "Property photo"}
          className="max-h-full max-w-full object-contain rounded-lg select-none"
          draggable={false}
        />

        {/* Next button */}
        <button
          onClick={goNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white/80 hover:text-white transition-all z-10"
          aria-label="Next photo"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      {/* Thumbnail strip */}
      <div className="shrink-0 px-4 pb-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-center gap-2 overflow-x-auto py-2">
          {photos.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setCurrent(i)}
              className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                i === current
                  ? "border-white ring-1 ring-white/30 scale-105"
                  : "border-transparent opacity-50 hover:opacity-80"
              }`}
            >
              <img
                src={`${p.photo_url}&w=100&h=75&fit=crop`}
                alt={p.caption || ""}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Photo Gallery Grid ──────────────
export function PhotoGallery({ photos, address }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!photos.length) return null;

  return (
    <>
      <div className="animate-float-in rounded-xl overflow-hidden border border-border/60 shadow-md relative group">
        <div className="grid grid-cols-4 grid-rows-2 gap-1 h-[280px] md:h-[360px]">
          {/* Main photo — 2×2 */}
          <button
            type="button"
            onClick={() => setLightboxIndex(0)}
            className="col-span-2 row-span-2 relative overflow-hidden cursor-pointer focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          >
            <img
              src={`${photos[0].photo_url}&w=800&h=600&fit=crop`}
              alt={photos[0].caption || address}
              className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-500"
            />
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-xs">
              {photos[0].caption}
            </div>
          </button>

          {/* 4 smaller photos */}
          {photos.slice(1, 5).map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setLightboxIndex(i + 1)}
              className="relative overflow-hidden cursor-pointer focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              <img
                src={`${photo.photo_url}&w=400&h=300&fit=crop`}
                alt={photo.caption || "Property photo"}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px]">
                {photo.caption}
              </div>
            </button>
          ))}
        </div>

        {/* "View all photos" button */}
        <button
          type="button"
          onClick={() => setLightboxIndex(0)}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 dark:bg-zinc-900/90 text-sm font-medium shadow-md hover:bg-white dark:hover:bg-zinc-800 transition-colors border border-border/50"
        >
          <Camera className="h-4 w-4" />
          View all {photos.length} photos
        </button>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
