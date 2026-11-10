"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/today";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // 2FA state
  const [is2FA, setIs2FA] = useState(false);
  const [code, setCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setHasError(true);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    try {
      const res = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (!res || res.error) {
        setHasError(true);
        setIsLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setHasError(true);
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) return;
    setIsLoading(true);
    // In current Auth.js setup, redirect to callback
    router.push(callbackUrl);
    router.refresh();
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(val);
    if (val.length === 6) {
      // Auto-submit on sixth digit
      setIsLoading(true);
      setTimeout(() => {
        router.push(callbackUrl);
        router.refresh();
      }, 300);
    }
  };

  if (is2FA) {
    return (
      <form onSubmit={handleVerify2FA} className="space-y-4">
        <h1 className="text-[24px] font-semibold text-text leading-[32px]">
          Enter your code
        </h1>
        <div>
          <label htmlFor="2fa-code" className="block text-[13px] font-medium text-text mb-1">
            Verification code
          </label>
          <input
            id="2fa-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={handleCodeChange}
            placeholder="000000"
            className="w-full h-[40px] px-3 bg-surface border border-border-strong rounded-control text-text text-[20px] text-center tracking-[6px] num focus:border-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          disabled={code.length < 6}
          className="w-full"
        >
          Verify
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h1 className="text-[24px] font-semibold text-text leading-[32px] mb-6">
        Sign in
      </h1>

      {/* Email Field */}
      <div>
        <label htmlFor="login-email" className="block text-[13px] font-medium text-text mb-1">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@puca.local"
          disabled={isLoading}
          className="w-full h-[40px] px-3 bg-surface border border-border-strong rounded-control text-text text-[16px] md:text-[14px] placeholder:text-muted focus:border-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 touch-target"
        />
      </div>

      {/* Password Field */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="login-password" className="text-[13px] font-medium text-text">
            Password
          </label>
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-[13px] text-brand hover:underline cursor-pointer bg-transparent border-0 p-0"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <input
          id="login-password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          disabled={isLoading}
          className="w-full h-[40px] px-3 bg-surface border border-border-strong rounded-control text-text text-[16px] md:text-[14px] placeholder:text-muted focus:border-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 touch-target"
        />
      </div>

      {/* Credential Error Box */}
      {hasError && (
        <div
          role="alert"
          className="p-3 bg-bad-tint border border-bad rounded-control text-[14px] text-bad-ink leading-[20px]"
        >
          That email or password isn&apos;t right. Try again.
        </div>
      )}

      {/* Sign In Primary Button */}
      <Button
        type="submit"
        variant="primary"
        isLoading={isLoading}
        className="w-full mt-2"
      >
        Sign in
      </Button>
    </form>
  );
}
