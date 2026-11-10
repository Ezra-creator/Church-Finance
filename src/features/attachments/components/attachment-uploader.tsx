"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { Camera, UploadCloud, X, RefreshCw, FileText, Check } from "lucide-react";
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

      setUploadProgress(30);
      const compressed = await compressImageFile(file, 1600, 0.85);
      if (compressed.previewUrl) {
        setPreviewUrl(compressed.previewUrl);
      }

      setUploadProgress(50);

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
        <label className="text-caption text-muted">
          {label} {required && <span className="text-bad-ink">*</span>}
        </label>
        {selectedFileName && (
          <button
            type="button"
            onClick={handleClear}
            className="text-caption text-muted hover:text-bad-ink flex items-center gap-1 min-h-[44px]"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.75} />
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
          className="p-4 border-2 border-dashed border-border hover:border-accent cursor-pointer rounded-panel transition-colors flex flex-col items-center justify-center gap-2 text-center select-none bg-surface"
        >
          <div className="flex items-center gap-2 text-muted">
            <Camera className="w-5 h-5" strokeWidth={1.75} />
            <UploadCloud className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-caption font-medium text-text">
              Tap to take photo or choose receipt or slip
            </p>
            <p className="text-caption text-muted">
              JPEG, PNG, WebP or PDF (up to 8 MB)
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3 border border-border rounded-panel space-y-2 bg-page">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {isPdf ? (
                <FileText className="w-5 h-5 text-muted flex-shrink-0" strokeWidth={1.75} />
              ) : previewUrl ? (
                <Image
                  src={previewUrl}
                  alt="Receipt preview"
                  width={40}
                  height={40}
                  unoptimized
                  className="w-10 h-10 object-cover rounded-control border border-border flex-shrink-0"
                />
              ) : (
                <Camera className="w-5 h-5 text-muted flex-shrink-0" strokeWidth={1.75} />
              )}
              <div className="min-w-0">
                <p className="text-caption font-medium text-text truncate">
                  {selectedFileName}
                </p>
                <div className="flex items-center gap-2 text-caption">
                  {isUploading && (
                    <span className="text-muted">Compressing and uploading...</span>
                  )}
                  {!isUploading && !uploadError && attachmentId && (
                    <span className="text-ok-ink flex items-center gap-1 font-medium">
                      <Check className="w-3.5 h-3.5" strokeWidth={1.75} /> Ready and attached
                    </span>
                  )}
                  {uploadError && (
                    <span className="text-bad-ink font-medium">Upload failed</span>
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
              >
                <RefreshCw className="w-3 h-3 mr-1" strokeWidth={1.75} /> Retry
              </Button>
            )}
          </div>

          {isUploading && uploadProgress !== null && (
            <div className="w-full bg-border h-1 rounded-full overflow-hidden">
              <div
                className="bg-accent h-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          {uploadError && (
            <p className="text-caption text-bad-ink">{uploadError}</p>
          )}
        </div>
      )}
    </div>
  );
}
