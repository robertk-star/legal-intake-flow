"use client";

import type { Metadata } from "next";
import { useState } from "react";
import { PRACTICE_AREAS, MONTHLY_CAPACITIES } from "@/lib/validation";

// Note: metadata export is not supported in client components.
// Page-level metadata for this route is defined in a separate metadata.ts file.

const INITIAL_FORM = {
  firstName: "",
  lastName: "",
  firmName: "",
  email: "",
  phone: "",
  statesServed: "",
  practiceArea: "" as string,
  monthlyLeadCapacity: "" as string,
  website: "",
  message: "",
  companyWebsite: "", // honeypot
};

type FormState = typeof INITIAL_FORM;
type FieldErrors = Partial<Record<keyof FormState, string>>;

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.firstName.trim()) errors.firstName = "First name is required.";
  if (!form.lastName.trim()) errors.lastName = "Last name is required.";
  if (!form.firmName.trim()) errors.firmName = "Firm or organization name is required.";
  if (!form.email.trim()) {
    errors.email = "Email address is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!form.phone.trim()) errors.phone = "Phone number is required.";
  if (!form.statesServed.trim()) errors.statesServed = "State(s) served is required.";
  if (!form.practiceArea) errors.practiceArea = "Select a practice area.";
  if (!form.monthlyLeadCapacity) errors.monthlyLeadCapacity = "Select an estimated monthly capacity.";
  return errors;
}

export default function RequestAccessPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (errors[name as keyof FormState]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    const fieldErrors = validate(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/partner-access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = (await res.json()) as { success: boolean; error?: string };

      if (data.success) {
        setSuccess(true);
      } else {
        setApiError(data.error ?? "An error occurred. Please try again.");
      }
    } catch {
      setApiError(
        "Unable to submit your request. Please check your connection and try again, or email us at partners@legalintakeflow.com."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-xl px-4 text-center sm:px-6">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
          </div>
          <h1 className="mb-4 text-3xl font-bold text-gray-900">Request Received</h1>
          <p className="text-lg text-gray-600">
            Thank you. Your request has been received.
          </p>
          <p className="mt-2 text-gray-600">
            Our team will review your information and contact you shortly.
          </p>
        </div>
      </section>
    );
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-[#0d1b2e] py-14 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-400">
            Partner Program
          </p>
          <h1 className="mb-3 text-4xl font-bold text-white sm:text-5xl">
            Request Partner Access
          </h1>
          <p className="text-lg text-gray-300">
            Complete the form below to apply for partner access. Our team will review your information and contact you shortly.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-6 rounded-xl border border-gray-200 bg-white p-8 shadow-sm">

            {/* Name row */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  value={form.firstName}
                  onChange={handleChange}
                  className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.firstName ? "border-red-400" : "border-gray-300"
                  }`}
                />
                {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>}
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  value={form.lastName}
                  onChange={handleChange}
                  className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.lastName ? "border-red-400" : "border-gray-300"
                  }`}
                />
                {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>}
              </div>
            </div>

            {/* Firm name */}
            <div>
              <label htmlFor="firmName" className="block text-sm font-medium text-gray-700 mb-1">
                Firm or Organization Name <span className="text-red-500">*</span>
              </label>
              <input
                id="firmName"
                name="firmName"
                type="text"
                autoComplete="organization"
                value={form.firmName}
                onChange={handleChange}
                className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.firmName ? "border-red-400" : "border-gray-300"
                }`}
              />
              {errors.firmName && <p className="mt-1 text-xs text-red-600">{errors.firmName}</p>}
            </div>

            {/* Email + Phone row */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email ? "border-red-400" : "border-gray-300"
                  }`}
                />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={handleChange}
                  className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.phone ? "border-red-400" : "border-gray-300"
                  }`}
                />
                {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
              </div>
            </div>

            {/* States served */}
            <div>
              <label htmlFor="statesServed" className="block text-sm font-medium text-gray-700 mb-1">
                State(s) Served <span className="text-red-500">*</span>
              </label>
              <input
                id="statesServed"
                name="statesServed"
                type="text"
                placeholder="e.g. California, Texas, Florida"
                value={form.statesServed}
                onChange={handleChange}
                className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.statesServed ? "border-red-400" : "border-gray-300"
                }`}
              />
              {errors.statesServed && <p className="mt-1 text-xs text-red-600">{errors.statesServed}</p>}
            </div>

            {/* Practice area + Monthly capacity row */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="practiceArea" className="block text-sm font-medium text-gray-700 mb-1">
                  Practice Area <span className="text-red-500">*</span>
                </label>
                <select
                  id="practiceArea"
                  name="practiceArea"
                  value={form.practiceArea}
                  onChange={handleChange}
                  className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.practiceArea ? "border-red-400" : "border-gray-300"
                  }`}
                >
                  <option value="">Select practice area</option>
                  {PRACTICE_AREAS.map((area) => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
                {errors.practiceArea && <p className="mt-1 text-xs text-red-600">{errors.practiceArea}</p>}
              </div>
              <div>
                <label htmlFor="monthlyLeadCapacity" className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Monthly Lead Capacity <span className="text-red-500">*</span>
                </label>
                <select
                  id="monthlyLeadCapacity"
                  name="monthlyLeadCapacity"
                  value={form.monthlyLeadCapacity}
                  onChange={handleChange}
                  className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.monthlyLeadCapacity ? "border-red-400" : "border-gray-300"
                  }`}
                >
                  <option value="">Select capacity</option>
                  {MONTHLY_CAPACITIES.map((cap) => (
                    <option key={cap} value={cap}>{cap}</option>
                  ))}
                </select>
                {errors.monthlyLeadCapacity && <p className="mt-1 text-xs text-red-600">{errors.monthlyLeadCapacity}</p>}
              </div>
            </div>

            {/* Website (optional) */}
            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                Website <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="website"
                name="website"
                type="url"
                autoComplete="url"
                placeholder="https://yourfirm.com"
                value={form.website}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Message (optional) */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Message / Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                placeholder="Tell us about your practice and intake needs."
                value={form.message}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
            </div>

            {/* Honeypot — visually hidden from real users */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="companyWebsite">Company Website</label>
              <input
                id="companyWebsite"
                name="companyWebsite"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={form.companyWebsite}
                onChange={handleChange}
              />
            </div>

            {/* API error */}
            {apiError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {apiError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-blue-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting…" : "Request Partner Access"}
            </button>

            <p className="text-center text-xs text-gray-500">
              By submitting this form, you agree to our{" "}
              <a href="/privacy" className="underline hover:text-gray-700">Privacy Policy</a>{" "}
              and{" "}
              <a href="/terms" className="underline hover:text-gray-700">Terms of Use</a>.
            </p>
          </form>
        </div>
      </section>
    </>
  );
}
