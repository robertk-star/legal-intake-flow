import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const VALID_ROLES    = ["owner", "admin", "staff", "viewer"] as const;
const VALID_STATUSES = ["active", "inactive", "pending", "suspended"] as const;

/**
 * PATCH /api/admin/partner-users/[id]
 *
 * Updates a partner user's role, status, first_name, and/or last_name.
 * Body: { role?, status?, first_name?, last_name? }
 */
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

  const updates: Record<string, string> = {};
  const errors: string[] = [];

  if (body.role !== undefined) {
    const role = (body.role as string).trim();
    if (!(VALID_ROLES as readonly string[]).includes(role)) {
      errors.push(`Invalid role. Allowed: ${VALID_ROLES.join(", ")}.`);
    } else {
      updates.role = role;
    }
  }

  if (body.status !== undefined) {
    const status = (body.status as string).trim();
    if (!(VALID_STATUSES as readonly string[]).includes(status)) {
      errors.push(`Invalid status. Allowed: ${VALID_STATUSES.join(", ")}.`);
    } else {
      updates.status = status;
    }
  }

  if (body.first_name !== undefined) {
    const firstName = (body.first_name as string).trim();
    if (!firstName) {
      errors.push("first_name cannot be empty.");
    } else {
      updates.first_name = firstName;
    }
  }

  if (body.last_name !== undefined) {
    const lastName = (body.last_name as string).trim();
    if (!lastName) {
      errors.push("last_name cannot be empty.");
    } else {
      updates.last_name = lastName;
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 422 });
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 422 });
  }

  const { data, error } = await supabaseAdmin
    .from("partner_users")
    .update(updates)
    .eq("id", id)
    .select("id, email, first_name, last_name, role, status, updated_at")
    .single();

  if (error) {
    console.error("[PATCH /api/admin/partner-users/[id]] Supabase error:", error);
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Partner user not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update partner user." }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
