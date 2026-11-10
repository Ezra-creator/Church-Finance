import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-page flex items-center justify-start p-8">
      <div className="max-w-[480px] space-y-4">
        <h1 className="text-heading font-semibold text-text">Page not found</h1>
        <p className="text-body text-muted">
          The requested page could not be found or has been moved.
        </p>
        <div>
          <Link
            href="/today"
            className="inline-flex items-center justify-center h-10 px-4 rounded-control text-body font-medium bg-accent text-on-accent hover:bg-accent-hover transition-colors"
          >
            Return to home
          </Link>
        </div>
      </div>
    </main>
  );
}
