"use client";

import { useState, useEffect } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ExternalLink, Download, FileText, Loader2 } from "lucide-react";
import { getAttachmentViewUrlAction } from "../actions";

export interface AttachmentViewerModalProps {
  attachmentId: string | null;
  title?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AttachmentViewerModal({
  attachmentId,
  title = "Document Evidence",
  isOpen,
  onClose,
}: AttachmentViewerModalProps) {
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !attachmentId) {
      setViewUrl(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getAttachmentViewUrlAction(attachmentId)
      .then((res) => {
        if (!isMounted) return;
        if (res.success) {
          setViewUrl(res.data.viewUrl);
          setContentType(res.data.contentType);
        } else {
          setError(res.error.message);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || "Failed to load document.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, attachmentId]);

  const isPdf = contentType === "application/pdf";

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        {isLoading && (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-ink-soft">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p className="text-xs font-mono">Generating secure viewing link...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-variance/10 border border-variance text-variance rounded-[2px] text-xs font-mono">
            {error}
          </div>
        )}

        {!isLoading && !error && viewUrl && (
          <div className="space-y-3">
            {isPdf ? (
              <div className="p-8 border border-rule rounded-[2px] flex flex-col items-center justify-center gap-4 bg-paper">
                <FileText className="w-12 h-12 text-ink-soft" />
                <p className="text-xs font-mono text-ink">PDF Document Attached</p>
                <div className="flex gap-2">
                  <a
                    href={viewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-ink text-paper rounded-[2px]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open PDF in new tab
                  </a>
                </div>
              </div>
            ) : (
              <div className="max-h-[65vh] overflow-auto border border-rule rounded-[2px] bg-ink/[0.02] flex items-center justify-center p-2">
                <img
                  src={viewUrl}
                  alt="Receipt Document"
                  className="max-h-[60vh] object-contain rounded-[1px]"
                />
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <a
                href={viewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-ink-soft hover:text-ink inline-flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open original in full size
              </a>
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
