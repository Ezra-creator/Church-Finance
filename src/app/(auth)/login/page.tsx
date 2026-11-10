import React, { Suspense } from "react";
import { getPublicIdentity } from "@/lib/assembly";
import { LoginForm } from "@/features/auth/components/login-form";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { assemblyName } = await getPublicIdentity();
  return {
    title: `Sign in · ${assemblyName}`,
  };
}

export default async function LoginPage() {
  const { assemblyName, parentBodyName } = await getPublicIdentity();

  return (
    <div className="min-h-screen bg-page flex flex-col lg:flex-row">
      {/* Mobile & Tablet Header Band (< 1024px) */}
      <div className="block lg:hidden h-[120px] bg-brand text-on-brand p-6 flex flex-col justify-center">
        <h1 className="text-[16px] font-semibold text-on-brand leading-[24px]">
          {assemblyName}
        </h1>
        <p className="text-[14px] text-on-brand-soft leading-[20px] truncate">
          {parentBodyName}
        </p>
      </div>

      {/* Desktop Left Brand Column (>= 1024px, 44% width) */}
      <div
        data-brand-context="true"
        className="hidden lg:flex w-[44%] min-h-screen bg-brand text-on-brand p-12 flex-col justify-between select-none"
      >
        <div>
          <h1 className="text-[16px] font-semibold text-on-brand leading-[24px]">
            {assemblyName}
          </h1>
          <p className="text-[14px] text-on-brand-soft leading-[20px] mt-0.5">
            {parentBodyName}
          </p>
        </div>
        <div>
          <p className="text-[16px] text-on-brand-soft leading-[24px]">
            Record, reconcile and report the assembly&apos;s finances.
          </p>
        </div>
      </div>

      {/* Right Form Column (56% width on desktop, 100% on mobile) */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-[360px] text-left">
          <Suspense fallback={<div className="text-[14px] text-muted">Loading...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
