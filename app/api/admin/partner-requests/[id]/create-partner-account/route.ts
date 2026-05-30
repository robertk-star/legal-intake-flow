import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/admin/partner-requests/[id]/create-partner-account
 *
 * Creates a partner_accounts row from an approved partner_access_requests row.
 *
 * Returns the real Supabase error detail (code + message) in the JSON response
 * so the admin UI can display actionable failure information instead of a
 * generic "Failed to create partner account." message.
 *
 * Secrets (service role key, JWT secret, etc.) are never included in the
 * response — only the Supabase error code and message, which are safe to
 * surface to an authenticated admin.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── Auth ──────────────────────────────────────────────────────────────────────
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id: requestId } = await params;

  // ── Fetch the partner access request ─────────────────────────────────────────
  const { data: req, error: reqError } = await supabaseAdmin
    .from("partner_access_requests")
    .select("id, status, first_name, last_name, firm_name, email, phone, website, states_served, practice_area, monthly_lead_capacity")
    .eq("id", requestId)
    .single();

  if (reqError || !req) {
    console.error("[create-partner-account] Request lookup error:", reqError);
    return NextResponse.json(
      {
        success: false,
        error: "Partner access request not found.",
        detail: reqError?.message ?? null,
        code: reqError?.code ?? null,
      },
      { status: 404 }
    );
  }

  // ── Hard block: must be approved ─────────────────────────────────────────────
  if (req.status !== "approved") {
    return NextResponse.json(
      {
        success: false,
        error: `Partner account cannot be created until the request status is set to "approved". Current status: "${req.status}".`,
      },
      { status: 422 }
    );
  }

  // ── Validate required source fields ──────────────────────────────────────────
  const missingFields: string[] = [];
  if (!req.first_name?.trim())            missingFields.push("first_name");
  if (!req.last_name?.trim())             missingFields.push("last_name");
  if (!req.firm_name?.trim())             missingFields.push("firm_name");
  if (!req.email?.trim())                 missingFields.push("email");
  if (!req.phone?.trim())                 missingFields.push("phone");
  if (!req.states_served?.trim())         missingFields.push("states_served");
  if (!req.practice_area?.trim())         missingFields.push("practice_area");
  if (!req.monthly_lead_capacity?.trim()) missingFields.push("monthly_lead_capacity");

  if (missingFields.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `Cannot create partner account — the following required fields are missing or empty on the access request: ${missingFields.join(", ")}.`,
      },
      { status: 422 }
    );
  }

  const normalizedEmail = (req.email as string).toLowerCase().trim();

  // ── Check for existing account (by partner_request_id first, then email) ─────
  const { data: existingById } = await supabaseAdmin
    .from("partner_accounts")
    .select("id, firm_name, contact_first_name, contact_last_name, email, status, created_at")
    .eq("partner_request_id", requestId)
    .maybeSingle();

  if (existingById) {
    return NextResponse.json({
      success: true,
      alreadyExists: true,
      data: existingById,
    });
  }

  const { data: existingByEmail } = await supabaseAdmin
    .from("partner_accounts")
    .select("id, firm_name, contact_first_name, contact_last_name, email, status, created_at")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existingByEmail) {
    return NextResponse.json({
      success: true,
      alreadyExists: true,
      data: existingByEmail,
    });
  }

  // ── Insert the partner account ────────────────────────────────────────────────
  const { data: account, error: insertError } = await supabaseAdmin
    .from("partner_accounts")
    .insert({
      partner_request_id: requestId,          // uuid — matches partner_access_requests.id
      firm_name:             (req.firm_name as string).trim(),
      contact_first_name:    (req.first_name as string).trim(),
      contact_last_name:     (req.last_name as string).trim(),
      email:                 normalizedEmail,
      phone:                 (req.phone as string).trim(),
      website:               req.website ? (req.website as string).trim() : null,
      states_served:         (req.states_served as string).trim(),
      practice_area:         (req.practice_area as string).trim(),
      monthly_lead_capacity: (req.monthly_lead_capacity as string).trim(),
      status:                "active",
    })
    .select("id, firm_name, contact_first_name, contact_last_name, email, status, created_at")
    .single();

  if (insertError || !account) {
    // Log the full error server-side for debugging
    console.error("[create-partner-account] Insert error:", insertError);

    // Return a structured error response with the real Supabase error detail.
    // This is safe to show to an authenticated admin — it contains no secrets.
    const errorMessage = buildUserFacingError(insertError);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        // Additional debug fields for the admin UI
        supabaseCode:    insertError?.code    ?? null,
        supabaseMessage: insertError?.message ?? null,
        hint:            insertError?.hint    ?? null,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    alreadyExists: false,
    data: account,
  });
}

// ── Error message builder ─────────────────────────────────────────────────────

function buildUserFacingError(err: { code?: string; message?: string } | null): string {
  if (!err) return "Failed to create partner account. No error details returned from database.";

  // Postgres/Supabase error codes — map common ones to actionable messages
  switch (err.code) {
    case "23505":
      return "A partner account with this email address already exists. Use the existing account or change the email on the access request.";
    case "23502":
      return `A required column is missing a value. Database detail: ${err.message ?? "unknown column"}`;
    case "42P01":
      return "The partner_accounts table does not exist. Please run sql/section03_partner_accounts.sql in your Supabase project first.";
    case "42703":
      return `An unrecognised column was referenced. Database detail: ${err.message ?? "unknown column"}`;
    case "PGRST116":
      return "Supabase PostgREST error: no rows returned after insert. The table may have a trigger or constraint blocking the insert.";
    default:
      return `Failed to create partner account. Database error [${err.code ?? "unknown"}]: ${err.message ?? "no message returned"}.`;
  }
}
