import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getLeadAssignmentSettings } from "@/lib/leadAssignmentEngine";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function bool(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function intInRange(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || !Number.isInteger(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { settings, warning } = await getLeadAssignmentSettings();
  return NextResponse.json({ success: true, data: settings, warning });
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isPlainObject(body)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const current = (await getLeadAssignmentSettings()).settings;
  const updates = {
    auto_assignment_enabled: bool(body.auto_assignment_enabled, current.auto_assignment_enabled),
    auto_assign_new_dbs_leads: bool(body.auto_assign_new_dbs_leads, current.auto_assign_new_dbs_leads),
    notify_partner_on_auto_assignment: bool(body.notify_partner_on_auto_assignment, current.notify_partner_on_auto_assignment),
    require_no_blockers: bool(body.require_no_blockers, current.require_no_blockers),
    minimum_score: intInRange(body.minimum_score, current.minimum_score, 0, 1000),
    notes: typeof body.notes === "string" ? body.notes.trim() || null : current.notes,
    updated_by: "admin",
  };

  const { data, error } = await supabaseAdmin
    .from("lead_assignment_settings")
    .upsert({ id: "default", ...updates }, { onConflict: "id" })
    .select("id, auto_assignment_enabled, auto_assign_new_dbs_leads, notify_partner_on_auto_assignment, require_no_blockers, minimum_score, updated_at, updated_by, notes")
    .single();

  if (error || !data) {
    console.error("[PATCH /api/admin/routing-settings] Update error:", error);
    return NextResponse.json(
      { error: "Failed to save routing settings. Confirm sql/section21_auto_assignment_controls.sql has been run." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
}
