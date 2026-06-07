import { NextResponse } from "next/server";
import { authenticatePartnerApiKey } from "@/lib/partnerIntegrations";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const VALID_PARTNER_RESPONSE_STATUSES = [
  "new",
  "reviewing",
  "contact_attempted",
  "contacted",
  "accepted",
  "declined",
  "retained",
  "closed",
] as const;

const EXTERNAL_LEAD_SELECT =
  "id, created_at, updated_at, source, external_reference_id, dbs_report_number, " +
  "first_name, last_name, phone, email, city, state, zip, benefit_type, application_status, " +
  "medical_summary, additional_notes, status, assigned_at, partner_response_status, " +
  "partner_response_updated_at, partner_viewed_at, partner_notes";

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

export async function GET(request: Request) {
  const rawKey = getBearerToken(request);
  if (!rawKey) {
    return NextResponse.json({ error: "Missing Bearer token." }, { status: 401 });
  }

  const account = await authenticatePartnerApiKey(rawKey);
  if (!account) {
    return NextResponse.json({ error: "Invalid or disabled API key." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("partner_response_status")?.trim() ?? "";
  const since = searchParams.get("since")?.trim() ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10) || 100, 200);

  let query = supabaseAdmin
    .from("leads")
    .select(EXTERNAL_LEAD_SELECT)
    .eq("assigned_partner_account_id", account.id)
    .is("deleted_at", null)
    .order("assigned_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (statusFilter) {
    if (!VALID_PARTNER_RESPONSE_STATUSES.includes(statusFilter as typeof VALID_PARTNER_RESPONSE_STATUSES[number])) {
      return NextResponse.json(
        { error: `Invalid partner_response_status. Allowed values: ${VALID_PARTNER_RESPONSE_STATUSES.join(", ")}.` },
        { status: 422 }
      );
    }
    if (statusFilter === "new") {
      query = query.or("partner_response_status.is.null,partner_response_status.eq.new");
    } else {
      query = query.eq("partner_response_status", statusFilter);
    }
  }

  if (since) {
    const parsed = new Date(since);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "since must be a valid ISO date/time." }, { status: 422 });
    }
    query = query.gte("updated_at", parsed.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("[GET /api/external/partner/leads] Supabase error:", error);
    return NextResponse.json({ error: "Failed to fetch leads." }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}
