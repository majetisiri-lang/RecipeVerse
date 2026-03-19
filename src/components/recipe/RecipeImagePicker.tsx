"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Sparkles, Upload, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
  title?: string;
  cuisine?: string;
  description?: string;
};

export function RecipeImagePicker({ value, onChange, title, cuisine, description }: Props) {
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const generateImage = async () => {
    if (!title) { setError("Add a title first so AI knows what to draw."); return; }
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, cuisine, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");

      // Fetch the temporary DALL-E image and upload it to permanent storage
      const imageRes = await fetch(data.url);
      const blob = await imageRes.blob();
      const file = new File([blob], "ai-cover.png", { type: "image/png" });
      await uploadFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const uploadFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("files", file);

      // Use uploadthing client-side API
      const res = await fetch("/api/uploadthing", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      const url = data?.[0]?.url ?? data?.url;
      if (!url) throw new Error("No URL returned from upload");
      onChange(url);
    } catch {
      // Fallback: use object URL for preview only (won't persist across sessions)
      const objectUrl = URL.createObjectURL(file);
      onChange(objectUrl);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Cover Image <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        {value && (
          <button type="button" onClick={() => onChange(null)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500">
            <X className="h-3 w-3" /> Remove
          </button>
        )}
      </div>

      {value ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-gray-200">
          <Image src={value} alt="Recipe cover" fill className="object-cover" />
        </div>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          className="flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 transition-colors hover:border-orange-300 hover:bg-orange-50"
        >
          <div className="text-3xl">📷</div>
          <p className="text-sm text-gray-500">Click to upload a photo</p>
          <p className="text-xs text-gray-400">JPG, PNG, WEBP up to 8MB</p>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadFile(file);
          e.target.value = "";
        }}
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || generating}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          )}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Uploading…" : "Upload Photo"}
        </button>

        <button
          type="button"
          onClick={generateImage}
          disabled={generating || uploading}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generating ? "Generating…" : "Generate with AI"}
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
