"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Suspense } from "react";

/**
 * /partner/login
 *
 * Public-facing login entry point. Admin-generated links point here:
 *   /partner/login?token=<raw_token>
 *
 * If a `token` param is present, this page immediately redirects the browser
 * to the Route Handler at /api/partner/login?token=<raw_token>, which handles
 * all validation, cookie setting, and the final redirect to /partner/account.
 *
 * Cookie mutation must happen in a Route Handler (not a Server Component or
 * Client Component), so this page acts only as a transparent forwarding layer.
 *
 * If no token is present, or if the Route Handler redirects back here with an
 * `error` param, this page shows the appropriate error message.
 *
 * Error codes (set by /api/partner/login on failure):
 *   missing  — no token in URL
 *   invalid  — token not found in DB
 *   used     — token already consumed
 *   expired  — token past 7-day expiry
 *   inactive — partner account not active or pending
 */

const ERROR_MESSAGES: Record<string, string> = {
  missing:  "No login token was provided. Please use the full link sent to you.",
  invalid:  "This login link is invalid. Please request a new link from your Legal Intake Flow contact.",
  used:     "This login link has already been used. For security, each link can only be used once. Please request a new link.",
  expired:  "This login link has expired. Links are valid for 7 days. Please request a new link from your Legal Intake Flow contact.",
  inactive: "Your partner account is not currently active. Please contact support.",
};

function PartnerLoginInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const error = searchParams.get("error");

  // If a token is present, forward to the Route Handler immediately.
  // The Route Handler handles validation, cookie setting, and redirect.
  useEffect(() => {
    if (token) {
      window.location.replace(`/api/partner/login?token=${encodeURIComponent(token)}`);
    }
  }, [token]);

  // While forwarding, show a brief loading state
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
              <svg
                className="h-6 w-6 animate-spin text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-600">Verifying your login link…</p>
          </div>
        </div>
      </div>
    );
  }

  // No token — show error state
  const message = error
    ? (ERROR_MESSAGES[error] ?? "This login link is invalid or expired. Please request a new link from your Legal Intake Flow contact.")
    : "This login link is invalid or expired. Please request a new link from your Legal Intake Flow contact.";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-6">
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

        {/* Error card */}
        <div className="rounded-xl border border-red-200 bg-white px-6 py-8 shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-[#0d1b2e]">Invalid or Expired Link</h1>
          <p className="mt-2 text-sm text-gray-600">{message}</p>
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

export default function PartnerLoginPage() {
  return (
    <Suspense>
      <PartnerLoginInner />
    </Suspense>
  );
}
