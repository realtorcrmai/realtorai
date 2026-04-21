"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, GripVertical, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBrowserClient } from "@supabase/ssr";
import { uploadListingPhoto, deleteListingPhoto, updateListingPhoto } from "@/actions/listing-photos";
import { toast } from "sonner";

const PHOTO_ROLES = [
  { value: "exterior", label: "Exterior" },
  { value: "living", label: "Living Room" },
  { value: "kitchen", label: "Kitchen" },
  { value: "bedroom", label: "Bedroom" },
  { value: "bathroom", label: "Bathroom" },
  { value: "outdoor", label: "Outdoor" },
  { value: "gallery", label: "Gallery" },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface Photo {
  id: string;
  photo_url: string;
  role: string;
  caption: string | null;
  sort_order: number;
}

interface PhotoUploaderProps {
  listingId: string;
  photos: Photo[];
  onRefresh: () => void;
}

export function PhotoUploader({ listingId, photos, onRefresh }: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((f) => {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        toast.error(`${f.name}: Only JPG, PNG, WebP accepted`);
        return false;
      }
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`${f.name}: Max 10MB per file`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;
    setUploading(true);

    for (const file of validFiles) {
      const ext = file.name.split(".").pop() || "jpg";
      const storagePath = `${listingId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("listing-photos")
        .upload(storagePath, file);

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}`);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("listing-photos")
        .getPublicUrl(storagePath);

      const result = await uploadListingPhoto(listingId, publicUrl, storagePath);
      if (result.error) {
        toast.error(`Save failed: ${result.error}`);
      }
    }

    setUploading(false);
    toast.success(`${validFiles.length} photo(s) uploaded`);
    onRefresh();
  }, [listingId, supabase, onRefresh]);

  async function handleDelete(photoId: string) {
    const result = await deleteListingPhoto(photoId, listingId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Photo deleted");
      onRefresh();
    }
  }

  async function handleRoleChange(photoId: string, role: string) {
    await updateListingPhoto(photoId, { role });
    onRefresh();
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragOver
            ? "border-brand bg-brand/5"
            : "border-border/50 hover:border-brand/50 hover:bg-muted/30"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); }}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <>
              <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
              <p className="text-sm font-medium">Uploading...</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">Drop photos here or click to upload</p>
              <p className="text-xs text-muted-foreground">JPG, PNG, WebP — Max 10MB each</p>
            </>
          )}
        </div>
      </div>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((photo, idx) => (
            <div
              key={photo.id}
              className="relative group rounded-lg overflow-hidden border border-border bg-muted/30"
            >
              <img
                src={photo.photo_url}
                alt={photo.caption || `Photo ${idx + 1}`}
                className="w-full h-32 object-cover"
              />

              {/* Overlay controls */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-start justify-between p-1.5 opacity-0 group-hover:opacity-100">
                <div className="flex items-center gap-1">
                  <GripVertical className="h-4 w-4 text-white/70 cursor-grab" />
                  {idx === 0 && (
                    <span className="px-1.5 py-0.5 bg-brand text-white text-[10px] font-bold rounded">HERO</span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(photo.id)}
                  className="p-1 rounded-full bg-black/50 hover:bg-red-600 text-white transition-colors"
                  aria-label="Delete photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Role selector */}
              <div className="p-2">
                <select
                  value={photo.role}
                  onChange={(e) => handleRoleChange(photo.id, e.target.value)}
                  className="w-full text-xs rounded border border-border bg-background px-1.5 py-1"
                >
                  {PHOTO_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && !uploading && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/30">
          <Camera className="h-5 w-5 text-muted-foreground/50" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">No photos yet</p>
            <p className="text-xs text-muted-foreground/60">Upload property photos for MLS submission</p>
          </div>
        </div>
      )}
    </div>
  );
}
