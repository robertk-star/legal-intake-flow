/**
 * Lead Submission API Route
 * POST /api/submit-lead
 *
 * Accepts form data and tracking parameters, validates, scores, and saves to Supabase.
 *
 * Consent model (Section 4):
 *   - informationalConsent (required) - user acknowledges tool is informational only
 *   - emailReportConsent   (optional) - user requests report copy by email
 *   - attorneyConsent      (optional) - user requests attorney/representative contact
 *   - phoneConsent         (optional, attorney-gated) - phone contact preference
 *   - textConsent          (optional, attorney-gated) - text contact preference
 *   - emailConsent         (optional, attorney-gated) - email contact preference
 *
 * Backend enforcement:
 *   - informationalConsent must be true; requests without it are rejected (400)
 *   - phoneConsent, textConsent, emailConsent are forced to false when attorneyConsent is false
 *   - routeLead() is called ONLY when attorneyConsent === true
 *
 * Section 5 additions:
 *   - Claim-stage fields: applicationStatus, denialDate, appealDeadline, hasAttorney
 *   - Medical evidence fields: hasTreatingDoctor, recentDoctorVisit, doctorVisitRecency,
 *     specialistCare, hospitalOrERVisits, prescribedMedication, medicationSideEffects, assistiveDevices
 *   - Work/earnings fields: lastWorked, reducedHoursDueToCondition, jobDutiesAffected
 *   - Functional limitation fields: sittingLimit, standingLimit, walkingLimit, liftingLimit,
 *     focusMemoryIssues, attendanceIssues, needsRestBreaks, dailyLivingLimitations
 *   - Internal quality fields: readinessStatus, leadQuality, missingInfoFlags
 *
 * Section 12 additions:
 *   - isTestSubmission (optional, default false) - marks test submissions
 *     Test submissions are stored in DB with is_test_submission=true and are
 *     NEVER routed to attorney partners, even if attorneyConsent is true.
 *
 * Section 19 additions:
 *   - leadId is returned in the success response so the client can store it
 *     in sessionStorage. Used by /account to look up the user's saved report.
 *   - user_id is attached to the lead at insert time when the submitter is
 *     already authenticated (valid Supabase session cookie present). This
 *     means the lead is immediately linked to the account without requiring
 *     the post-login claim step. The claim-lead endpoint still handles the
 *     case where the user was not authenticated at submission time.
 *
 * Section 14 additions:
 *   - Report email delivery: if emailReportConsent === true and email is present,
 *     the Readiness Report is emailed to the user after successful DB insert.
 *   - Test submissions skip email by default (skipped_test_submission).
 *   - Email failure does NOT fail the main API response.
 *   - emailReportConsent does NOT trigger routeLead — attorney routing remains
 *     gated exclusively on attorneyConsent === true.
 *   - report_email_status and report_email_sent_at are stored in the DB.
 *
 * ⚠️  COMPLIANCE: leadScore, leadTier, and leadQuality are NEVER returned to the client.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";
import { randomBytes } from "crypto";
import { calculateLeadScore } from "@/lib/leadScoring";
import { computeReadinessFromLead } from "@/lib/internalReadiness";
import { insertLead, updateLead } from "@/lib/supabase";
import { routeLead } from "@/lib/attorneyRouting";
import { sendReportEmail } from "@/lib/email";
import { buildReadinessReportEmail } from "@/lib/reportEmailTemplate";
import { getServerClient } from "@/lib/supabaseAuthServer";
import { normalizeStateCode } from "@/lib/usStates";

// ─── Validation schema ────────────────────────────────────────────────────────

const submitLeadSchema = z.object({
  // Contact Information
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Invalid phone number"),

  // Age & Work Status
  age: z.enum(["18-34", "35-54", "55+"] as const),
  currentlyWorking: z.enum(["yes", "no", "limited", "part_time", "unknown"] as const),

  // Earnings
  monthlyEarnings: z.enum(["0", "1-500", "500-1000", "1000-1500", "1500-2000", "2000+"] as const),

  // Medical Condition
  medicalCondition: z.string().min(1, "Medical condition is required"),
  conditionDuration: z.enum(
    ["less-3-months", "3-6-months", "6-12-months", "1-2-years", "2-5-years", "5-plus-years"] as const
  ),

  // Functional Impact
  dailyWorkImpact: z.enum(["mild", "moderate", "severe"] as const),
  canLiftCarry: z.enum(["yes", "no", "limited"] as const),
  canSitStand: z.enum(["yes", "no", "limited"] as const),

  // Medical Records
  medicalRecordsHistory: z.enum(["extensive", "some", "limited"] as const),
  hasDocumentation: z.enum(["yes", "no", "unsure"] as const),

  // ── Section 5: Claim-stage fields (all optional) ──────────────────────
  applicationStatus: z.enum([
    "not_applied", "applied_waiting", "denied",
    "reconsideration", "hearing_scheduled", "receiving_benefits", "not_sure",
  ] as const).optional().nullable(),
  denialDate: z.string().optional().nullable(),
  appealDeadline: z.string().optional().nullable(),
  hasAttorney: z.enum(["yes", "no", "unknown"] as const).optional().nullable(),

  // ── Section 5: Medical evidence fields (all optional) ────────────────
  hasTreatingDoctor: z.enum(["yes", "no", "unknown"] as const).optional().nullable(),
  recentDoctorVisit: z.enum(["yes", "no", "unknown"] as const).optional().nullable(),
  doctorVisitRecency: z.enum([
    "within_30_days", "within_90_days", "within_6_months",
    "more_than_6_months", "not_sure", "none",
  ] as const).optional().nullable(),
  specialistCare: z.enum(["yes", "no", "unknown"] as const).optional().nullable(),
  hospitalOrERVisits: z.enum(["yes", "no", "unknown"] as const).optional().nullable(),
  prescribedMedication: z.enum(["yes", "no", "unknown"] as const).optional().nullable(),
  medicationSideEffects: z.string().optional().nullable(),
  assistiveDevices: z.string().optional().nullable(),

  // ── Section 5: Work and earnings fields (all optional) ────────────────
  lastWorked: z.string().optional().nullable(),
  reducedHoursDueToCondition: z.enum(["yes", "no", "unknown"] as const).optional().nullable(),
  jobDutiesAffected: z.string().optional().nullable(),

  // ── Section 5: Functional limitation fields (all optional) ───────────
  sittingLimit: z.string().optional().nullable(),
  standingLimit: z.string().optional().nullable(),
  walkingLimit: z.string().optional().nullable(),
  liftingLimit: z.string().optional().nullable(),
  focusMemoryIssues: z.string().optional().nullable(),
  attendanceIssues: z.string().optional().nullable(),
  needsRestBreaks: z.string().optional().nullable(),
  dailyLivingLimitations: z.string().optional().nullable(),

  // ── Consent - new model (Section 4) ──────────────────────────────────
  // informationalConsent is REQUIRED - must be true
  informationalConsent: z.boolean().refine((val) => val === true, {
    message: "Informational consent is required to submit this form.",
  }),
  // All other consent fields are OPTIONAL
  emailReportConsent: z.boolean().optional().default(false),
  attorneyConsent: z.boolean().optional().default(false),
  phoneConsent: z.boolean().optional().default(false),
  textConsent: z.boolean().optional().default(false),
  emailConsent: z.boolean().optional().default(false),

  // Legacy field - accepted for backward compat but not used in enforcement
  disclaimerAccepted: z.boolean().optional(),

  // ── Section 12: Test submission flag (optional) ───────────────────────────
  // When true: stored in DB, attorney routing is suppressed even if
  // attorneyConsent is true. Response is still generic.
  isTestSubmission: z.boolean().optional().default(false),

  // Attribution & Tracking (optional)
  attorney_id: z.string().optional(),
  keyword: z.string().optional(),
  state: z.preprocess((value) => normalizeStateCode(value), z.string().length(2).optional()),
  gclid: z.string().optional(),
  utm_source: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_medium: z.string().optional(),
  landing_page: z.string().optional(),
  captured_at: z.string().optional(),
});

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // TODO: Add production rate limiting by IP/session before scaling traffic.

  try {
    const body = await request.json();
    const validatedData = submitLeadSchema.parse(body);

    // Backend enforcement: force contact prefs to false when attorney consent is not given
    const effectivePhoneConsent = validatedData.attorneyConsent ? validatedData.phoneConsent : false;
    const effectiveTextConsent  = validatedData.attorneyConsent ? validatedData.textConsent  : false;
    const effectiveEmailConsent = validatedData.attorneyConsent ? validatedData.emailConsent : false;

    // ── Calculate lead score, readiness status, quality, and flags ──────
    const {
      leadScore,
      leadTier,
      leadQuality,
      readinessStatus,
      missingInfoFlags,
    } = calculateLeadScore({
      // Core fields
      age: validatedData.age,
      currentlyWorking: validatedData.currentlyWorking,
      monthlyEarnings: validatedData.monthlyEarnings,
      medicalCondition: validatedData.medicalCondition,
      conditionDuration: validatedData.conditionDuration,
      dailyWorkImpact: validatedData.dailyWorkImpact,
      canLiftCarry: validatedData.canLiftCarry,
      canSitStand: validatedData.canSitStand,
      medicalRecordsHistory: validatedData.medicalRecordsHistory,
      hasDocumentation: validatedData.hasDocumentation,
      // Section 5 fields
      applicationStatus: validatedData.applicationStatus,
      denialDate: validatedData.denialDate,
      appealDeadline: validatedData.appealDeadline,
      hasAttorney: validatedData.hasAttorney,
      hasTreatingDoctor: validatedData.hasTreatingDoctor,
      recentDoctorVisit: validatedData.recentDoctorVisit,
      doctorVisitRecency: validatedData.doctorVisitRecency,
      specialistCare: validatedData.specialistCare,
      hospitalOrERVisits: validatedData.hospitalOrERVisits,
      prescribedMedication: validatedData.prescribedMedication,
      medicationSideEffects: validatedData.medicationSideEffects,
      assistiveDevices: validatedData.assistiveDevices,
      lastWorked: validatedData.lastWorked,
      reducedHoursDueToCondition: validatedData.reducedHoursDueToCondition,
      jobDutiesAffected: validatedData.jobDutiesAffected,
      sittingLimit: validatedData.sittingLimit,
      standingLimit: validatedData.standingLimit,
      walkingLimit: validatedData.walkingLimit,
      liftingLimit: validatedData.liftingLimit,
      focusMemoryIssues: validatedData.focusMemoryIssues,
      attendanceIssues: validatedData.attendanceIssues,
      needsRestBreaks: validatedData.needsRestBreaks,
      dailyLivingLimitations: validatedData.dailyLivingLimitations,
      // Consent (for flags)
      attorneyConsent: validatedData.attorneyConsent,
    });

    const userAgent = request.headers.get("user-agent") || "unknown";

    // Generate a secure, URL-safe claim token (32 bytes = 64 hex chars)
    const claimToken = randomBytes(32).toString("hex");

    // ── Attempt to read the authenticated user's id (best-effort) ────────
    // If the submitter already has a valid Supabase session, attach their
    // user_id to the lead record immediately. This avoids the need for the
    // post-login claim step when the user is signed in before submitting.
    // Failure here is non-fatal — the lead is still saved without user_id.
    let authenticatedUserId: string | null = null;
    try {
      const authClient = await getServerClient();
      const { data: { user } } = await authClient.auth.getUser();
      if (user?.id) {
        authenticatedUserId = user.id;
      }
    } catch {
      // Non-fatal: proceed without user_id
    }

    // ── Prepare lead data for database - map camelCase to snake_case ────
    const leadData = {
      // Contact
      first_name: validatedData.firstName,
      last_name: validatedData.lastName,
      email: validatedData.email,
      phone: validatedData.phone,
      // Core screening
      age_range: validatedData.age,
      currently_working: validatedData.currentlyWorking,
      monthly_earnings: validatedData.monthlyEarnings,
      medical_condition: validatedData.medicalCondition,
      condition_duration: validatedData.conditionDuration,
      daily_work_impact: validatedData.dailyWorkImpact,
      can_lift_carry: validatedData.canLiftCarry,
      can_sit_stand: validatedData.canSitStand,
      medical_records_history: validatedData.medicalRecordsHistory,
      has_documentation: validatedData.hasDocumentation,
      // Section 5: Claim-stage
      application_status: validatedData.applicationStatus ?? null,
      denial_date: validatedData.denialDate ?? null,
      appeal_deadline: validatedData.appealDeadline ?? null,
      has_attorney: validatedData.hasAttorney ?? null,
      // Section 5: Medical evidence
      has_treating_doctor: validatedData.hasTreatingDoctor ?? null,
      recent_doctor_visit: validatedData.recentDoctorVisit ?? null,
      doctor_visit_recency: validatedData.doctorVisitRecency ?? null,
      specialist_care: validatedData.specialistCare ?? null,
      hospital_or_er_visits: validatedData.hospitalOrERVisits ?? null,
      prescribed_medication: validatedData.prescribedMedication ?? null,
      medication_side_effects: validatedData.medicationSideEffects ?? null,
      assistive_devices: validatedData.assistiveDevices ?? null,
      // Section 5: Work and earnings
      last_worked: validatedData.lastWorked ?? null,
      reduced_hours_due_to_condition: validatedData.reducedHoursDueToCondition ?? null,
      job_duties_affected: validatedData.jobDutiesAffected ?? null,
      // Section 5: Functional limitations
      sitting_limit: validatedData.sittingLimit ?? null,
      standing_limit: validatedData.standingLimit ?? null,
      walking_limit: validatedData.walkingLimit ?? null,
      lifting_limit: validatedData.liftingLimit ?? null,
      focus_memory_issues: validatedData.focusMemoryIssues ?? null,
      attendance_issues: validatedData.attendanceIssues ?? null,
      needs_rest_breaks: validatedData.needsRestBreaks ?? null,
      daily_living_limitations: validatedData.dailyLivingLimitations ?? null,
      // Consent - new model
      informational_consent: validatedData.informationalConsent,
      email_report_consent: validatedData.emailReportConsent ?? false,
      attorney_consent: validatedData.attorneyConsent ?? false,
      // Claim token
      claim_token: claimToken,
      phone_consent: effectivePhoneConsent ?? false,
      text_consent: effectiveTextConsent ?? false,
      email_consent: effectiveEmailConsent ?? false,
      // Legacy field - kept for backward compat
      disclaimer_accepted: validatedData.informationalConsent,
      // Internal routing (stored in DB, never returned to client)
      lead_score: leadScore,
      lead_tier: leadTier,
      readiness_status: readinessStatus,
      lead_quality: leadQuality,
      missing_info_flags: missingInfoFlags,
      // Attribution
      attorney_id: validatedData.attorney_id,
      keyword: validatedData.keyword,
      state: validatedData.state ?? undefined,
      gclid: validatedData.gclid,
      utm_source: validatedData.utm_source,
      utm_campaign: validatedData.utm_campaign,
      utm_medium: validatedData.utm_medium,
      landing_page: validatedData.landing_page,
      user_agent: userAgent,
      // Section 12: Test submission flag
      is_test_submission: validatedData.isTestSubmission ?? false,
      // Section 19: Link to authenticated user if already signed in
      user_id: authenticatedUserId,
      // Section 14: Email delivery status (will be updated after send attempt)
      report_email_status: null as string | null,
      report_email_sent_at: null as string | null,
      // Section 23: Initial readiness score + tier — derived from submitted lead fields.
      // Uses computeReadinessFromLead which calls mapLeadRecordToReport + deriveChecklistFromReport
      // so checklist items inferred from the answers are reflected in the score.
      // No user-saved checklist exists yet at submission time; the derived checklist is used.
      // @internal — never returned to the client
      ...(() => {
        try {
          const leadFields = {
            first_name: validatedData.firstName,
            last_name: validatedData.lastName,
            email: validatedData.email,
            phone: validatedData.phone,
            medical_condition: validatedData.medicalCondition,
            condition_duration: validatedData.conditionDuration,
            application_status: validatedData.applicationStatus ?? null,
            currently_working: validatedData.currentlyWorking,
            monthly_earnings: validatedData.monthlyEarnings,
            last_worked: validatedData.lastWorked ?? null,
            job_duties_affected: validatedData.jobDutiesAffected ?? null,
            daily_work_impact: validatedData.dailyWorkImpact,
            can_lift_carry: validatedData.canLiftCarry,
            can_sit_stand: validatedData.canSitStand,
            sitting_limit: validatedData.sittingLimit ?? null,
            standing_limit: validatedData.standingLimit ?? null,
            walking_limit: validatedData.walkingLimit ?? null,
            lifting_limit: validatedData.liftingLimit ?? null,
            daily_living_limitations: validatedData.dailyLivingLimitations ?? null,
            focus_memory_issues: validatedData.focusMemoryIssues ?? null,
            attendance_issues: validatedData.attendanceIssues ?? null,
            needs_rest_breaks: validatedData.needsRestBreaks ?? null,
            has_treating_doctor: validatedData.hasTreatingDoctor ?? null,
            recent_doctor_visit: validatedData.recentDoctorVisit ?? null,
            specialist_care: validatedData.specialistCare ?? null,
            hospital_or_er_visits: validatedData.hospitalOrERVisits ?? null,
            prescribed_medication: validatedData.prescribedMedication ?? null,
            medical_records_history: validatedData.medicalRecordsHistory,
          };
          const { readiness_score, readiness_tier } = computeReadinessFromLead(
            leadFields,
            null // no user-saved checklist at submission time; derived checklist is used
          );
          return { readiness_score, readiness_tier };
        } catch {
          return { readiness_score: null, readiness_tier: null };
        }
      })(),
    };

    // Generate claim token expiry (24-hour)
    const claimTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // report_number is intentionally omitted here.
    // The database sequence default (set by sql/section30_account_report_history.sql)
    // generates a collision-safe DBR-XXXXXX value automatically on INSERT.

    // Add claim token to lead data
    const leadDataWithToken = {
      ...leadData,
      claim_token: claimToken,
      claim_token_expires_at: claimTokenExpiresAt,
    };

    // Save lead to database
    const savedLead = await insertLead(leadDataWithToken);

    // Route lead to attorney ONLY if user explicitly opted in AND this is not a test submission.
    // Test submissions are never routed, even when attorneyConsent is true.
    // emailReportConsent does NOT trigger routeLead.
    if (validatedData.attorneyConsent === true && !validatedData.isTestSubmission) {
      void routeLead(savedLead);
    }

    // ── Section 14: Send report email (best-effort, awaited) ────────────────
    // Awaited before returning the success response so the DB status is updated
    // before the response is sent. Email failure never fails report generation.
    // emailReportConsent does NOT trigger routeLead.
    try {
      const emailContent = buildReadinessReportEmail(savedLead);
      // Add the recipient address to form a complete EmailPayload
      const emailPayload = { ...emailContent, to: validatedData.email };
      const emailResult = await sendReportEmail({
        emailReportConsent: validatedData.emailReportConsent ?? false,
        isTestSubmission: validatedData.isTestSubmission ?? false,
        email: validatedData.email,
        payload: emailPayload,
      });

      // Update the DB record with the email delivery status (best-effort)
      try {
        await updateLead(String(savedLead.id), {
          report_email_status: emailResult.status,
          report_email_sent_at: emailResult.sentAt ?? null,
        });
      } catch {
        // Non-fatal: log only the fact that the update failed, not the lead data
        console.error("[submit-lead] Failed to update report_email_status in DB");
      }

      // Log only the status code, never the email address or content
      if (
        emailResult.status !== "sent" &&
        emailResult.status !== "skipped_no_consent" &&
        emailResult.status !== "skipped_test_submission" &&
        emailResult.status !== "skipped_not_configured"
      ) {
        console.warn("[submit-lead] Report email status:", emailResult.status);
      }
    } catch {
      // Non-fatal: email errors must never bubble up to the main response
      console.error("[submit-lead] Unexpected error in report email dispatch");
    }

    // Return success response - no score, no tier, no quality, no bucket.
    // leadId and claimToken are returned so the client can store them in sessionStorage for /account.
    // claimToken is also used in the "Save My Report" link to enable server-side claiming.
    // The client builds its own report from sessionStorage.
    return NextResponse.json(
      {
        success: true,
        message: "Readiness report generated successfully",
        leadId: String(savedLead.id),
        claimToken: claimToken,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Log validation errors server-side for debugging
      console.error(
        "[/api/submit-lead] Validation failed:",
        JSON.stringify(error.issues.map(i => ({ path: i.path, message: i.message })))
      );

      // Return field-level validation errors (safe - no internal details)
      return NextResponse.json(
        {
          success: false,
          error: "Please check your submission and try again.",
          fields: error.issues.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    // Log only the error message - never log the full payload or stack trace
    console.error(
      "[/api/submit-lead] error:",
      error instanceof Error ? error.message : "Unknown error"
    );

    // Return a safe, user-friendly error - no internal details or stack traces
    const isDbError =
      error instanceof Error && error.message === "Database insert failed";
    return NextResponse.json(
      {
        success: false,
        error: isDbError
          ? "We could not save your screening right now. Please try again."
          : "Something went wrong. Please try again.",
      },
      { status: 500 }
    );
  }
}
