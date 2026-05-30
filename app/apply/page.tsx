"use client";

import type { Metadata } from "next";
import { useState } from "react";
import { useRouter } from "next/navigation";

// ── Note ──────────────────────────────────────────────────────────────────────
// Metadata is defined in app/apply/metadata.ts (cannot export from client component)

// ── Option constants ──────────────────────────────────────────────────────────

const US_STATES = [
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" }, { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" }, { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" }, { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" }, { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" }, { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" }, { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" }, { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" }, { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" }, { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" }, { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" }, { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" }, { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" }, { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" }, { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" }, { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" }, { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" }, { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" }, { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" }, { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" }, { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" }, { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" }, { value: "WY", label: "Wyoming" },
  { value: "DC", label: "Washington, D.C." }, { value: "PR", label: "Puerto Rico" },
];

// ── Form state ────────────────────────────────────────────────────────────────

const INITIAL_FORM = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  city: "",
  state: "",
  zip: "",
  preferred_contact_method: "",
  lives_in_us: "",
  age_range: "",
  benefit_type: "",
  application_status: "",
  medical_summary: "",
  has_attorney: "",
  additional_notes: "",
  consent_given: false,
  website_url: "", // honeypot
};

type FormState = typeof INITIAL_FORM;
type FieldErrors = Partial<Record<keyof FormState, string>>;

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.first_name.trim()) errors.first_name = "First name is required.";
  if (!form.last_name.trim())  errors.last_name  = "Last name is required.";
  if (!form.phone.trim())      errors.phone      = "Phone number is required.";
  if (!form.state)             errors.state      = "State is required.";
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!form.consent_given) errors.consent_given = "You must agree to be contacted to submit this form.";
  return errors;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldLabel({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
      {children}
      {required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

function inputClass(hasError: boolean) {
  return `block w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c] focus:border-transparent transition ${
    hasError ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"
  }`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ApplyPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value, type } = e.target;
    const checked = type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
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
      // Scroll to first error
      const firstErrorEl = document.querySelector("[data-field-error]");
      firstErrorEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/intake/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          lives_in_us: form.lives_in_us === "yes" ? true : form.lives_in_us === "no" ? false : null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.errors && Array.isArray(data.errors)) {
          setApiError(data.errors.join(" "));
        } else {
          setApiError(data.error ?? "Something went wrong. Please try again.");
        }
        return;
      }

      router.push("/apply/success");
    } catch {
      setApiError("A network error occurred. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-[#0d1b2e] py-14 px-4 text-center">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#4a9eff] mb-3">
            Free Consultation
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
            Get Help With Your Disability Benefits Claim
          </h1>
          <p className="mt-4 text-base text-gray-300 leading-relaxed">
            Fill out the form below and a member of our team or a partner representative may reach out to discuss your situation. There is no cost to apply.
          </p>
        </div>
      </section>

      {/* Trust bar */}
      <div className="bg-[#1a3a5c] py-3 px-4">
        <div className="mx-auto max-w-3xl flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-blue-200 font-medium">
          <span>No upfront cost</span>
          <span className="hidden sm:inline text-blue-400">|</span>
          <span>Your information is kept private</span>
          <span className="hidden sm:inline text-blue-400">|</span>
          <span>SSDI &amp; SSI specialists</span>
        </div>
      </div>

      {/* Form card */}
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-5">
            <h2 className="text-lg font-semibold text-[#0d1b2e]">Tell Us About Your Situation</h2>
            <p className="mt-1 text-sm text-gray-500">Fields marked with <span className="text-red-500">*</span> are required.</p>
          </div>

          {apiError && (
            <div className="mx-6 mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-700">{apiError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="px-6 py-6 space-y-6">
            {/* Honeypot — hidden from real users */}
            <input
              type="text"
              name="website_url"
              value={form.website_url}
              onChange={handleChange}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="sr-only"
            />

            {/* ── Contact Information ─────────────────────────────────────── */}
            <fieldset>
              <legend className="text-sm font-semibold text-[#0d1b2e] uppercase tracking-wide mb-4">
                Contact Information
              </legend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="first_name" required>First Name</FieldLabel>
                  <input
                    id="first_name" name="first_name" type="text"
                    autoComplete="given-name"
                    value={form.first_name} onChange={handleChange}
                    className={inputClass(!!errors.first_name)}
                    placeholder="Jane"
                  />
                  <div data-field-error><FieldError message={errors.first_name} /></div>
                </div>
                <div>
                  <FieldLabel htmlFor="last_name" required>Last Name</FieldLabel>
                  <input
                    id="last_name" name="last_name" type="text"
                    autoComplete="family-name"
                    value={form.last_name} onChange={handleChange}
                    className={inputClass(!!errors.last_name)}
                    placeholder="Smith"
                  />
                  <div data-field-error><FieldError message={errors.last_name} /></div>
                </div>
                <div>
                  <FieldLabel htmlFor="phone" required>Phone Number</FieldLabel>
                  <input
                    id="phone" name="phone" type="tel"
                    autoComplete="tel"
                    value={form.phone} onChange={handleChange}
                    className={inputClass(!!errors.phone)}
                    placeholder="(555) 000-0000"
                  />
                  <div data-field-error><FieldError message={errors.phone} /></div>
                </div>
                <div>
                  <FieldLabel htmlFor="email">Email Address</FieldLabel>
                  <input
                    id="email" name="email" type="email"
                    autoComplete="email"
                    value={form.email} onChange={handleChange}
                    className={inputClass(!!errors.email)}
                    placeholder="jane@example.com"
                  />
                  <div data-field-error><FieldError message={errors.email} /></div>
                </div>
                <div>
                  <FieldLabel htmlFor="city">City</FieldLabel>
                  <input
                    id="city" name="city" type="text"
                    autoComplete="address-level2"
                    value={form.city} onChange={handleChange}
                    className={inputClass(false)}
                    placeholder="Chicago"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="state" required>State</FieldLabel>
                  <select
                    id="state" name="state"
                    value={form.state} onChange={handleChange}
                    className={inputClass(!!errors.state)}
                  >
                    <option value="">Select a state…</option>
                    {US_STATES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <div data-field-error><FieldError message={errors.state} /></div>
                </div>
                <div>
                  <FieldLabel htmlFor="zip">ZIP Code</FieldLabel>
                  <input
                    id="zip" name="zip" type="text"
                    autoComplete="postal-code"
                    value={form.zip} onChange={handleChange}
                    className={inputClass(false)}
                    placeholder="60601"
                    maxLength={10}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="preferred_contact_method">Preferred Contact Method</FieldLabel>
                  <select
                    id="preferred_contact_method" name="preferred_contact_method"
                    value={form.preferred_contact_method} onChange={handleChange}
                    className={inputClass(false)}
                  >
                    <option value="">Select…</option>
                    <option value="phone">Phone call</option>
                    <option value="email">Email</option>
                    <option value="text">Text message</option>
                  </select>
                </div>
              </div>
            </fieldset>

            {/* ── Background ──────────────────────────────────────────────── */}
            <fieldset>
              <legend className="text-sm font-semibold text-[#0d1b2e] uppercase tracking-wide mb-4">
                Background
              </legend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="lives_in_us">Do you currently live in the United States?</FieldLabel>
                  <select
                    id="lives_in_us" name="lives_in_us"
                    value={form.lives_in_us} onChange={handleChange}
                    className={inputClass(false)}
                  >
                    <option value="">Select…</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div>
                  <FieldLabel htmlFor="age_range">Age Range</FieldLabel>
                  <select
                    id="age_range" name="age_range"
                    value={form.age_range} onChange={handleChange}
                    className={inputClass(false)}
                  >
                    <option value="">Select…</option>
                    <option value="under 18">Under 18</option>
                    <option value="18–34">18–34</option>
                    <option value="35–49">35–49</option>
                    <option value="50–64">50–64</option>
                    <option value="65+">65+</option>
                  </select>
                </div>
              </div>
            </fieldset>

            {/* ── Benefits & Application ──────────────────────────────────── */}
            <fieldset>
              <legend className="text-sm font-semibold text-[#0d1b2e] uppercase tracking-wide mb-4">
                Benefits &amp; Application
              </legend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="benefit_type">What benefits are you seeking?</FieldLabel>
                  <select
                    id="benefit_type" name="benefit_type"
                    value={form.benefit_type} onChange={handleChange}
                    className={inputClass(false)}
                  >
                    <option value="">Select…</option>
                    <option value="SSDI">SSDI</option>
                    <option value="SSI">SSI</option>
                    <option value="Both">Both</option>
                    <option value="Not Sure">Not Sure</option>
                  </select>
                </div>
                <div>
                  <FieldLabel htmlFor="application_status">Application Status</FieldLabel>
                  <select
                    id="application_status" name="application_status"
                    value={form.application_status} onChange={handleChange}
                    className={inputClass(false)}
                  >
                    <option value="">Select…</option>
                    <option value="Have not applied yet">Have not applied yet</option>
                    <option value="Application pending">Application pending</option>
                    <option value="Denied">Denied</option>
                    <option value="Appeal in progress">Appeal in progress</option>
                    <option value="Hearing scheduled">Hearing scheduled</option>
                    <option value="Not sure">Not sure</option>
                  </select>
                </div>
                <div>
                  <FieldLabel htmlFor="has_attorney">Do you currently have an attorney or representative?</FieldLabel>
                  <select
                    id="has_attorney" name="has_attorney"
                    value={form.has_attorney} onChange={handleChange}
                    className={inputClass(false)}
                  >
                    <option value="">Select…</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                    <option value="not sure">Not sure</option>
                  </select>
                </div>
              </div>
            </fieldset>

            {/* ── Medical Summary ─────────────────────────────────────────── */}
            <fieldset>
              <legend className="text-sm font-semibold text-[#0d1b2e] uppercase tracking-wide mb-4">
                Medical Information
              </legend>
              <div>
                <FieldLabel htmlFor="medical_summary">Medical Condition / Reason Applying</FieldLabel>
                <p className="mb-2 text-xs text-gray-500">
                  Tell us briefly about your medical condition or why you are seeking disability benefits.
                </p>
                <textarea
                  id="medical_summary" name="medical_summary"
                  rows={4}
                  value={form.medical_summary} onChange={handleChange}
                  className={`${inputClass(false)} resize-y`}
                  placeholder="Describe your medical condition or situation…"
                />
              </div>
            </fieldset>

            {/* ── Additional Notes ────────────────────────────────────────── */}
            <div>
              <FieldLabel htmlFor="additional_notes">Anything else you want us to know?</FieldLabel>
              <textarea
                id="additional_notes" name="additional_notes"
                rows={3}
                value={form.additional_notes} onChange={handleChange}
                className={`${inputClass(false)} resize-y`}
                placeholder="Optional — any additional context…"
              />
            </div>

            {/* ── Consent ─────────────────────────────────────────────────── */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="consent_given"
                  checked={form.consent_given}
                  onChange={handleChange}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-[#1a3a5c] focus:ring-[#1a3a5c]"
                />
                <span className="text-sm text-gray-700">
                  <span className="font-medium text-red-500 mr-1">*</span>
                  I agree to be contacted regarding my request for disability representation or benefits assistance.
                </span>
              </label>
              {errors.consent_given && (
                <div data-field-error className="mt-2 ml-7">
                  <FieldError message={errors.consent_given} />
                </div>
              )}
            </div>

            {/* ── Submit ──────────────────────────────────────────────────── */}
            <div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-[#1a3a5c] px-6 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-[#0d1b2e] focus:outline-none focus:ring-2 focus:ring-[#1a3a5c] focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {submitting ? "Submitting…" : "Get Started"}
              </button>
              <p className="mt-3 text-center text-xs text-gray-400">
                By submitting this form you agree to our{" "}
                <a href="/privacy" className="underline hover:text-gray-600">Privacy Policy</a>{" "}
                and{" "}
                <a href="/terms" className="underline hover:text-gray-600">Terms of Service</a>.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
