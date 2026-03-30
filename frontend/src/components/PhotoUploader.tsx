"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { api } from "@/lib/api";

interface PhotoUploaderProps {
  onUpload: (url: string) => void;
  previewShape?: string;
}

export function PhotoUploader({ onUpload, previewShape = "rectangle" }: PhotoUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;

      // Local preview
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);

      // Upload
      setUploading(true);
      try {
        const result = await api.uploads.photo(file);
        setUploadedUrl(result.url);
        onUpload(result.url);
      } catch {
        console.error("Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
  });

  const shapeClass =
    previewShape === "circle"
      ? "rounded-full"
      : previewShape === "heart"
        ? "clip-heart"
        : "rounded-lg";

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
          isDragActive ? "border-brand-500 bg-brand-50" : "border-slate-300 hover:border-brand-400"
        }`}
      >
        <input {...getInputProps()} />
        <div className="space-y-2">
          <svg className="mx-auto w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-slate-600">
            {isDragActive ? "Drop your photo here" : "Drag & drop a photo, or click to browse"}
          </p>
          <p className="text-xs text-slate-400">JPG, PNG, WebP up to 20MB</p>
        </div>
      </div>

      {preview && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Magnet Preview</p>
          <div className="relative inline-block">
            <div
              className={`overflow-hidden magnet-shadow ${shapeClass}`}
              style={{ width: 200, height: previewShape === "circle" ? 200 : 267 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Magnet preview" className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 border-4 border-white/30 rounded-lg pointer-events-none" />
          </div>
          {uploading && <p className="text-xs text-brand-600 animate-pulse">Uploading...</p>}
          {uploadedUrl && <p className="text-xs text-green-600">✓ Photo uploaded</p>}
        </div>
      )}
    </div>
  );
}
