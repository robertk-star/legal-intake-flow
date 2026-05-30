"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Suspense } from "react";

/**
 * /partner/login
 *
 * Three modes:
 *
 * 1. token= present  → forward to /api/partner/login?token=... (Route Handler handles auth)
 * 2. error= present  → show error message + login request form
 * 3. no params       → show login request form (email → request new link)
 */

const ERROR_MESSAGES: Record<string, string> = {
  missing:  "No login token was provided. Please use the full link sent to you, or request a new one below.",
  invalid:  "This login link is invalid. Please request a new link below.",
  used:     "This login link has already been used. For security, each link can only be used once. Please request a new link below.",
  expired:  "This login link has expired. Links are valid for 7 days. Please request a new link below.",
  inactive: "Your partner account is not currently active. Please contact your Legal Intake Flow administrator.",
};

function PartnerLoginInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const error = searchParams.get("error");

  // ── State for the login request form ──────────────────────────────────────
  const [email, setEmail]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [formError, setFormError]   = useState<string | null>(null);

  // ── Token forwarding ──────────────────────────────────────────────────────
  useEffect(() => {
    if (token) {
      window.location.replace(`/api/partner/login?token=${encodeURIComponent(token)}`);
    }
  }, [token]);

  if (token) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <Image
              src="/images/lif-name-logo.png"
              alt="Legal Intake Flow"
              width={220}
              height={44}
              className="h-10 w-auto object-contain"
              priority
            />
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-8 shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
              <svg className="h-6 w-6 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">Verifying your login link…</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Form submit ───────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFormError("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/partner/request-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFormError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setFormError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Error message (from Route Handler redirect) ───────────────────────────
  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? "This login link is invalid or expired. Please request a new link below.")
    : null;

  // ── Success state ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <Image
              src="/images/lif-name-logo.png"
              alt="Legal Intake Flow"
              width={220}
              height={44}
              className="h-10 w-auto object-contain"
              priority
            />
          </div>
          <div className="rounded-xl border border-green-200 bg-white px-6 py-8 shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-[#0d1b2e]">Request Received</h1>
            <p className="mt-2 text-sm text-gray-600">
              Your Legal Intake Flow administrator can generate a new login link for you.
            </p>
          </div>
          <p className="text-xs text-gray-400">
            Need help?{" "}
            <a href="mailto:support@legalintakeflow.com" className="text-blue-600 hover:underline">
              Contact support
            </a>
          </p>
        </div>
      </div>
    );
  }

  // ── Login request form (default + after error) ────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <Image
            src="/images/lif-name-logo.png"
            alt="Legal Intake Flow"
            width={220}
            height={44}
            className="h-10 w-auto object-contain"
            priority
          />
        </div>

        {/* Error notice (from expired/used/invalid token) */}
        {errorMessage && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-sm text-amber-800">{errorMessage}</p>
          </div>
        )}

        {/* Login request form */}
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-8 shadow-sm">
          <h1 className="text-xl font-bold text-[#0d1b2e]">Partner Login</h1>
          <p className="mt-1 text-sm text-gray-500">
            Enter your email address to request a new login link from your administrator.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                placeholder="you@yourfirm.com"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>

            {formError && (
              <p className="text-sm text-red-600">{formError}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-[#1a3a5c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0d1b2e] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Request Login Link"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400">
          Need help?{" "}
          <a href="mailto:support@legalintakeflow.com" className="text-blue-600 hover:underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}

export default function PartnerLoginPage() {
  return (
    <Suspense>
      <PartnerLoginInner />
    </Suspense>
  );
}
