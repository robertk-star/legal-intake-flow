import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Submission Received",
  description: "Your information has been received. A Legal Intake Flow team member or partner may review your submission.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ApplySuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="mx-auto max-w-lg w-full">
        {/* Card */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Top accent */}
          <div className="h-1.5 bg-gradient-to-r from-[#1a3a5c] to-[#4a9eff]" />

          <div className="px-8 py-10 text-center">
            {/* Checkmark icon */}
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-[#0d1b2e]">Thank You</h1>

            <p className="mt-4 text-base text-gray-600 leading-relaxed">
              Your information has been received.
            </p>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              A Legal Intake Flow team member or partner may review your submission and contact you if additional information is needed.
            </p>

            {/* Neutral disclaimer */}
            <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 px-5 py-4 text-left">
              <p className="text-xs text-blue-700 leading-relaxed">
                Submitting this form does not guarantee representation, approval of benefits, or any specific outcome. We will do our best to connect you with the right resources.
              </p>
            </div>

            <div className="mt-8">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl bg-[#1a3a5c] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0d1b2e] transition"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Questions?{" "}
          <a href="/how-it-works" className="underline hover:text-gray-600">
            Learn how Legal Intake Flow works
          </a>
        </p>
      </div>
    </div>
  );
}
