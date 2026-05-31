import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const DISPUTE_STATUSES = ["open", "in_review", "resolved", "declined"] as const;
type DisputeStatus = typeof DISPUTE_STATUSES[number];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isPlainObject(body)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if ("status" in body) {
    const status = String(body.status ?? "").trim() as DisputeStatus;
    if (!DISPUTE_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid dispute status. Allowed values: ${DISPUTE_STATUSES.join(", ")}.` },
        { status: 422 }
      );
    }
    updates.status = status;
    if (status === "resolved" || status === "declined") {
      updates.resolved_at = new Date().toISOString();
      updates.resolved_by = "admin";
    } else {
      updates.resolved_at = null;
      updates.resolved_by = null;
    }
  }

  if ("admin_resolution_notes" in body) {
    const notes = String(body.admin_resolution_notes ?? "").trim();
    updates.admin_resolution_notes = notes || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 422 });
  }

  const { data, error } = await supabaseAdmin
    .from("partner_billing_disputes")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[PATCH /api/admin/billing/disputes/[id]] Supabase error:", error);
    return NextResponse.json({ error: "Failed to update dispute." }, { status: 500 });
  }

  await supabaseAdmin.from("partner_billing_invoice_events").insert({
    invoice_id: data.invoice_id,
    event_type: "dispute_updated",
    previous_status: null,
    next_status: data.status,
    amount_cents: null,
    notes: data.admin_resolution_notes ?? `Dispute marked ${data.status}.`,
    created_by: "admin",
  });

  return NextResponse.json({ success: true, data });
}
