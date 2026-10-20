import React, { Suspense } from "react";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata = {
  title: "Sign in — PUCA Finance",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-paper text-ink">
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="text-left space-y-1 pb-6 border-b border-rule">
          <p className="text-xs uppercase tracking-widest font-semibold text-ink-soft">
            Parish Financial System
          </p>
          <h1 className="text-3xl font-serif font-normal text-ink">
            PUCA Finance
          </h1>
          <p className="text-xs text-ink-soft pt-1 leading-relaxed">
            Local church financial ledger replacing paper record books with verifiable accounts.
          </p>
        </div>

        {/* Login Form */}
        <Suspense fallback={<div className="text-xs text-ink-soft font-mono">Loading form...</div>}>
          <LoginForm />
        </Suspense>

        {/* Footer info */}
        <div className="pt-6 border-t border-rule text-center">
          <p className="text-[11px] text-ink-soft font-mono">
            Ghana Cedi (GH₵) • Africa/Accra Timezone
          </p>
        </div>
      </div>
    </div>
  );
}
