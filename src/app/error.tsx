"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-surface flex items-center justify-start p-8">
      <div className="max-w-[480px] space-y-4">
        <h1 className="text-2xl font-semibold text-text">Something went wrong</h1>
        <p className="text-sm text-muted">
          An unexpected error occurred while processing your request.
        </p>
        <div>
          <Button variant="primary" onClick={() => reset()}>
            Try again
          </Button>
        </div>
      </div>
    </main>
  );
}

