import React, { Suspense } from "react";
import { LoginForm } from "@/features/auth/components/login-form";
import { getChurchSettings } from "@/features/auth/service";

export const metadata = {
  title: "Sign in · PUCA Finance",
};

export default async function LoginPage() {
  const settings = await getChurchSettings();
  const churchName = settings?.churchName || "PUCA Finance";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-surface text-text text-left">
      {/* Left Column: 44% width on desktop, page background color */}
      <div className="w-full lg:w-[44%] bg-page p-8 lg:p-16 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-border">
        <div className="space-y-4">
          <div className="text-lead font-semibold text-text">
            {churchName}
          </div>
          <p className="text-body text-muted max-w-sm">
            Custody and financial records for Sunday collections, mobile money and bank deposits.
          </p>
        </div>
        <div className="hidden lg:block text-caption text-muted">
          Authorized church finance officers only.
        </div>
      </div>

      {/* Right Column: 56% width on desktop, surface background, form max-width 360px */}
      <div className="w-full lg:w-[56%] bg-surface p-8 lg:p-16 flex items-center justify-center">
        <div className="w-full max-w-form space-y-6">
          <div className="space-y-1">
            <h1 className="text-heading font-semibold text-text leading-tight">
              Sign in
            </h1>
            <p className="text-body text-muted">
              Enter your credentials to access the accounts.
            </p>
          </div>

          <Suspense fallback={<div className="text-body text-muted">Loading...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
