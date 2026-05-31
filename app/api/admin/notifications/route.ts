import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const VALID_STATUSES = ["queued", "sent", "failed", "skipped"] as const;
const VALID_TYPES = ["partner_login_link", "lead_assigned", "invoice_sent", "invoice_reminder"] as const;

/**
 * GET /api/admin/notifications
 *
 * Returns recent email notification delivery records for admin review.
 */
export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status")?.trim() ?? "";
  const type = searchParams.get("type")?.trim() ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10) || 100, 200);

  let query = supabaseAdmin
    .from("email_notifications")
    .select(
      "id, created_at, notification_type, recipient_email, recipient_name, subject, " +
      "status, provider, provider_message_id, error_message, sent_at, lead_id, " +
      "partner_account_id, partner_user_id, login_request_id, invoice_id, metadata"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    if (!VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
      return NextResponse.json(
        { error: `Invalid status. Allowed values: ${VALID_STATUSES.join(", ")}.` },
        { status: 422 }
      );
    }
    query = query.eq("status", status);
  }

  if (type) {
    if (!VALID_TYPES.includes(type as typeof VALID_TYPES[number])) {
      return NextResponse.json(
        { error: `Invalid notification type. Allowed values: ${VALID_TYPES.join(", ")}.` },
        { status: 422 }
      );
    }
    query = query.eq("notification_type", type);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[GET /api/admin/notifications] Supabase error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification log. Confirm section12_email_notifications.sql has been run." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}
