import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const VALID_STATUSES = ["new", "completed", "dismissed"] as const;

/**
 * PATCH /api/admin/login-requests/[id]
 *
 * Updates the status of a partner login request.
 * Body: { status: "completed" | "dismissed" }
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

  const status = (body.status as string | undefined)?.trim();
  if (!status || !(VALID_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Allowed values: ${VALID_STATUSES.join(", ")}.` },
      { status: 422 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("partner_login_requests")
    .update({ status })
    .eq("id", id)
    .select("id, status")
    .single();

  if (error) {
    console.error("[PATCH /api/admin/login-requests/[id]] Supabase error:", error);
    return NextResponse.json({ error: "Failed to update login request." }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
