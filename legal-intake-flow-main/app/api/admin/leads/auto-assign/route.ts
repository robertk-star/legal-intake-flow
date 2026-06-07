import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assignBestMatchToLead, getLeadAssignmentSettings } from "@/lib/leadAssignmentEngine";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (!isPlainObject(body)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const limit = Math.min(Math.max(Number(body.limit ?? 25) || 25, 1), 50);
  const notifyPartner = typeof body.notify_partner === "boolean" ? body.notify_partner : undefined;
  const { settings, warning } = await getLeadAssignmentSettings();

  if (!settings.auto_assignment_enabled) {
    return NextResponse.json(
      { error: "Auto-assignment is disabled. Enable it in Routing Controls before running batch assignment.", settings, warning },
      { status: 422 }
    );
  }

  const { data: leads, error } = await supabaseAdmin
    .from("leads")
    .select("id, created_at, state, benefit_type, application_status")
    .is("assigned_partner_account_id", null)
    .is("deleted_at", null)
    .in("status", ["new", "reviewing", "ready_to_assign"])
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[POST /api/admin/leads/auto-assign] Lead query error:", error);
    return NextResponse.json({ error: "Failed to load unassigned leads." }, { status: 500 });
  }

  const origin = process.env.LIF_APP_URL?.replace(/\/$/, "") || new URL(request.url).origin;
  const results = [];

  for (const lead of (leads ?? []) as Array<{ id: string }>) {
    const result = await assignBestMatchToLead({
      leadId: lead.id,
      origin,
      assignmentType: "auto_batch",
      assignedBy: "admin:auto_batch",
      settings,
      notifyPartner,
    });
    results.push(result);
  }

  const assigned = results.filter((result) => result.assigned).length;
  const skipped = results.length - assigned;

  return NextResponse.json({
    success: true,
    scanned: results.length,
    assigned,
    skipped,
    settings,
    warning,
    results,
  });
}
