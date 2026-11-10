"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { TextField } from "@/components/ui/text-field";
import { PasswordField } from "@/components/ui/password-field";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/today";

  const [step, setStep] = useState<"credentials" | "otc">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otc, setOtc] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage("Enter your email address and password.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (!res || res.error) {
        setErrorMessage("That email or password isn't right. Check your details and try again.");
        setIsLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setErrorMessage("Could not sign in. Check your connection and try again.");
      setIsLoading(false);
    }
  };

  const handleOtcChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtc(val);

    if (val.length === 6) {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const res = await signIn("credentials", {
          email: email.trim(),
          password,
          otc: val,
          redirect: false,
        });

        if (!res || res.error) {
          setErrorMessage("That code isn't right. Enter the 6-digit code again.");
          setIsLoading(false);
          return;
        }

        router.push(callbackUrl);
        router.refresh();
      } catch {
        setErrorMessage("Could not verify code. Try again.");
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="space-y-5 text-left">
      {errorMessage && (
        <InlineAlert tone="danger">
          {errorMessage}
        </InlineAlert>
      )}

      {step === "credentials" ? (
        <form onSubmit={handleCredentialsSubmit} className="space-y-4">
          <TextField
            label="Email address"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />

          <PasswordField
            label="Password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isLoading}
          >
            Continue
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="otc-input" className="text-label font-medium text-text">
              One-time code
            </label>
            <input
              id="otc-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={6}
              value={otc}
              onChange={handleOtcChange}
              disabled={isLoading}
              className="w-full h-11 sm:h-10 px-3 bg-surface border border-border rounded-control text-center text-title font-medium tnum tabular-nums text-text outline-none focus-visible:ring-2 focus-visible:ring-accent"
              placeholder="000000"
            />
            <p className="text-caption text-muted">
              Enter the 6-digit code sent to your registered device.
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep("credentials")}
            className="w-full"
            disabled={isLoading}
          >
            Back to credentials
          </Button>
        </div>
      )}
    </div>
  );
}
