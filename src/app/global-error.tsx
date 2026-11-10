"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-page text-text flex items-center justify-start p-8 font-sans antialiased">
        <div className="max-w-[480px] space-y-4">
          <h1 className="text-heading font-semibold text-text">
            Something went wrong
          </h1>
          <p className="text-body text-muted">
            An unexpected error occurred while loading the application.
          </p>
          <div>
            <button
              onClick={() => reset()}
              className="h-10 px-4 rounded-control bg-accent text-on-accent text-body font-medium hover:bg-accent-hover transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
