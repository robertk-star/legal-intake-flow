import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * GET /api/admin/leads/[id]/lead-emails
 *
 * Returns email outreach history for a single lead.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  const { data: lead, error: leadError } = await supabaseAdmin
    .from("leads")
    .select("id")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("lead_outreach_emails")
    .select(
      "id, created_at, updated_at, recipient_email, recipient_name, sender_email, sender_name, " +
      "subject, body_text, status, provider, provider_message_id, sent_at, error_message, sent_by"
    )
    .eq("lead_id", id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[GET /api/admin/leads/[id]/lead-emails] Supabase error:", error);
    return NextResponse.json({ error: "Failed to fetch lead email history." }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}
