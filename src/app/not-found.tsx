import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-surface flex items-center justify-start p-8">
      <div className="max-w-[480px] space-y-4">
        <h1 className="text-2xl font-semibold text-text">Page not found</h1>
        <p className="text-sm text-muted">
          The requested page could not be found or has been moved.
        </p>
        <div>
          <Link href="/today">
            <Button variant="primary">Return to home</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

