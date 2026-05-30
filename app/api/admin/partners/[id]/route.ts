import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const VALID_STATUSES = ["active", "inactive", "pending", "suspended"] as const;

/**
 * GET /api/admin/partners/[id]
 * Returns full partner account detail.
 *
 * PATCH /api/admin/partners/[id]
 * Updates account status and/or internal notes.
 * Body: { status?: string, internal_notes?: string }
 */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("partner_accounts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { success: false, error: "Partner account not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if ("status" in body) {
    const status = (body.status as string | undefined)?.trim();
    if (!status || !(VALID_STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed values: ${VALID_STATUSES.join(", ")}.` },
        { status: 422 }
      );
    }
    updates.status = status;
  }

  if ("internal_notes" in body) {
    updates.internal_notes =
      typeof body.internal_notes === "string"
        ? body.internal_notes.trim() || null
        : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields provided." }, { status: 422 });
  }

  const { data, error } = await supabaseAdmin
    .from("partner_accounts")
    .update(updates)
    .eq("id", id)
    .select("id, status, internal_notes, updated_at")
    .single();

  if (error) {
    console.error("[PATCH /api/admin/partners/[id]] Supabase error:", error);
    return NextResponse.json({ error: "Failed to update partner account." }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
