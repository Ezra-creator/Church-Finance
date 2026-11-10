"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { ExternalLink, FileText, Loader2 } from "lucide-react";
import { getAttachmentViewUrlAction } from "../actions";

export interface AttachmentViewerModalProps {
  attachmentId: string | null;
  title?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AttachmentViewerModal({
  attachmentId,
  title = "Document evidence",
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
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted">
            <Loader2 className="w-6 h-6 animate-spin" strokeWidth={1.75} />
            <p className="text-caption text-muted">Generating secure viewing link...</p>
          </div>
        )}

        {error && (
          <InlineAlert variant="danger" title={error} />
        )}

        {!isLoading && !error && viewUrl && (
          <div className="space-y-3">
            {isPdf ? (
              <div className="p-8 border border-border rounded-panel flex flex-col items-center justify-center gap-4 bg-page">
                <FileText className="w-12 h-12 text-muted" strokeWidth={1.75} />
                <p className="text-body font-medium text-text">PDF document attached</p>
                <div className="flex gap-2">
                  <a
                    href={viewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-body font-medium bg-accent text-on-accent rounded-control hover:bg-accent-hover transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.75} />
                    Open PDF in new tab
                  </a>
                </div>
              </div>
            ) : (
              <div className="max-h-[65vh] overflow-auto border border-border rounded-panel bg-surface flex items-center justify-center p-2">
                <Image
                  src={viewUrl}
                  alt="Receipt document"
                  width={600}
                  height={600}
                  unoptimized
                  className="max-h-[60vh] w-auto object-contain rounded-control"
                />
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <a
                href={viewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-caption text-muted hover:text-text inline-flex items-center gap-1 min-h-[44px]"
              >
                <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.75} />
                Open original in full size
              </a>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
