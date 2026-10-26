"use client";

import React, { useState, useRef } from "react";
import { Camera, UploadCloud, X, RefreshCw, FileText, CheckCircle2 } from "lucide-react";
import { AttachmentEntityType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { compressImageFile } from "@/lib/image-compressor";
import { requestUploadUrlAction } from "../actions";

export interface AttachmentUploaderProps {
  entityType: AttachmentEntityType;
  label: string;
  required?: boolean;
  onAttachmentUploaded: (attachmentId: string | null) => void;
}

export function AttachmentUploader({
  entityType,
  label,
  required = false,
  onAttachmentUploaded,
}: AttachmentUploaderProps) {
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [attachmentId, setAttachmentId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastSelectedFileRef = useRef<File | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    lastSelectedFileRef.current = file;
    await processAndUpload(file);
  };

  const processAndUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(10);

    try {
      setSelectedFileName(file.name);
      setIsPdf(file.type === "application/pdf");

      // Step 1: Compress image client-side to max 1600px
      setUploadProgress(30);
      const compressed = await compressImageFile(file, 1600, 0.85);
      if (compressed.previewUrl) {
        setPreviewUrl(compressed.previewUrl);
      }

      setUploadProgress(50);

      // Step 2: Request presigned upload URL from server
      const urlRes = await requestUploadUrlAction({
        entityType,
        contentType: compressed.contentType as any,
        sizeBytes: compressed.sizeBytes,
        fileName: file.name,
      });

      if (!urlRes.success) {
        throw new Error(urlRes.error.message);
      }

      setUploadProgress(70);

      // Step 3: Direct PUT upload to Cloudflare R2
      const putRes = await fetch(urlRes.data.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": compressed.contentType,
        },
        body: compressed.file,
      });

      if (!putRes.ok) {
        throw new Error(`Upload failed with status ${putRes.status}`);
      }

      setUploadProgress(100);
      setAttachmentId(urlRes.data.attachmentId);
      onAttachmentUploaded(urlRes.data.attachmentId);
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadError(err.message || "Failed to upload document. Please retry.");
      onAttachmentUploaded(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRetry = () => {
    if (lastSelectedFileRef.current) {
      processAndUpload(lastSelectedFileRef.current);
    }
  };

  const handleClear = () => {
    setSelectedFileName(null);
    setPreviewUrl(null);
    setIsPdf(false);
    setUploadProgress(null);
    setUploadError(null);
    setAttachmentId(null);
    lastSelectedFileRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onAttachmentUploaded(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-mono uppercase tracking-wider text-ink-soft">
          {label} {required && <span className="text-variance">*</span>}
        </label>
        {selectedFileName && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-mono text-ink-soft hover:text-variance flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            Remove
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {!selectedFileName ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="p-4 border-2 border-dashed border-rule hover:border-ink cursor-pointer rounded-[2px] transition-colors flex flex-col items-center justify-center gap-2 text-center select-none bg-ink/[0.01]"
        >
          <div className="flex items-center gap-2 text-ink-soft">
            <Camera className="w-5 h-5" />
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-ink">
              Tap to take photo or choose receipt / slip
            </p>
            <p className="text-[11px] font-mono text-ink-soft">
              JPEG, PNG, WebP or PDF (up to 8 MB)
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3 border border-rule rounded-[2px] space-y-2 bg-paper">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {isPdf ? (
                <FileText className="w-5 h-5 text-ink-soft flex-shrink-0" />
              ) : previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Receipt Preview"
                  className="w-10 h-10 object-cover rounded-[1px] border border-rule flex-shrink-0"
                />
              ) : (
                <Camera className="w-5 h-5 text-ink-soft flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink truncate">
                  {selectedFileName}
                </p>
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  {isUploading && (
                    <span className="text-ink-soft">Compressing & uploading...</span>
                  )}
                  {!isUploading && !uploadError && attachmentId && (
                    <span className="text-balanced flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> Ready & attached
                    </span>
                  )}
                  {uploadError && (
                    <span className="text-variance font-semibold">Upload failed</span>
                  )}
                </div>
              </div>
            </div>

            {uploadError && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleRetry}
                className="text-xs font-mono"
              >
                <RefreshCw className="w-3 h-3 mr-1" /> Retry
              </Button>
            )}
          </div>

          {/* Progress bar line */}
          {isUploading && uploadProgress !== null && (
            <div className="w-full bg-rule h-1 rounded-full overflow-hidden">
              <div
                className="bg-ink h-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          {uploadError && (
            <p className="text-xs text-variance font-mono">{uploadError}</p>
          )}
        </div>
      )}
    </div>
  );
}
