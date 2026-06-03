import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendLeadAssignedNotifications } from "@/lib/emailNotifications";

/**
 * POST /api/admin/leads/[id]/send-assignment-notification
 *
 * Manual resend endpoint for assignment emails. The normal assignment routes also
 * send email automatically after assignment/reassignment. This endpoint lets admin
 * resend the same assignment notification if needed.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  const { data: lead, error } = await supabaseAdmin
    .from("leads")
    .select("id, assigned_partner_account_id")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const partnerAccountId = lead.assigned_partner_account_id as string | null;
  if (!partnerAccountId) {
    return NextResponse.json(
      { error: "Assign this lead to a partner before sending an assignment email." },
      { status: 422 }
    );
  }

  const result = await sendLeadAssignedNotifications({
    origin: (process.env.LIF_APP_URL?.replace(/\/$/, "") || new URL(request.url).origin),
    leadId: id,
    partnerAccountId,
    assignmentType: "manual",
  });

  return NextResponse.json({ success: true, ...result });
}
