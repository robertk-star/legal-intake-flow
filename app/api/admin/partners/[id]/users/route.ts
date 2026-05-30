import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Params = { params: Promise<{ id: string }> };

const VALID_ROLES    = ["owner", "admin", "staff", "viewer"] as const;
const VALID_STATUSES = ["active", "inactive", "pending", "suspended"] as const;

/**
 * GET /api/admin/partners/[id]/users
 *
 * Returns all partner users for the given partner account.
 */
export async function GET(_request: Request, { params }: Params) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id: partnerAccountId } = await params;

  // Confirm account exists
  const { data: account, error: accountError } = await supabaseAdmin
    .from("partner_accounts")
    .select("id")
    .eq("id", partnerAccountId)
    .single();

  if (accountError || !account) {
    return NextResponse.json({ error: "Partner account not found." }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("partner_users")
    .select(
      "id, created_at, updated_at, email, first_name, last_name, role, status, " +
      "last_login_at, invited_at, accepted_at"
    )
    .eq("partner_account_id", partnerAccountId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[GET /api/admin/partners/[id]/users] Supabase error:", error);
    return NextResponse.json({ error: "Failed to fetch partner users." }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}

/**
 * POST /api/admin/partners/[id]/users
 *
 * Creates a new partner user for the given partner account.
 *
 * Body: { first_name, last_name, email, role }
 */
export async function POST(request: Request, { params }: Params) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id: partnerAccountId } = await params;

  // Confirm account exists
  const { data: account, error: accountError } = await supabaseAdmin
    .from("partner_accounts")
    .select("id")
    .eq("id", partnerAccountId)
    .single();

  if (accountError || !account) {
    return NextResponse.json({ error: "Partner account not found." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const firstName = (body.first_name as string | undefined)?.trim() ?? "";
  const lastName  = (body.last_name  as string | undefined)?.trim() ?? "";
  const email     = (body.email      as string | undefined)?.trim().toLowerCase() ?? "";
  const role      = (body.role       as string | undefined)?.trim() ?? "staff";

  // Validate required fields
  const fieldErrors: string[] = [];
  if (!firstName) fieldErrors.push("first_name is required.");
  if (!lastName)  fieldErrors.push("last_name is required.");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.push("A valid email address is required.");
  }
  if (!(VALID_ROLES as readonly string[]).includes(role)) {
    fieldErrors.push(`Invalid role. Allowed: ${VALID_ROLES.join(", ")}.`);
  }

  if (fieldErrors.length > 0) {
    return NextResponse.json({ error: fieldErrors.join(" ") }, { status: 422 });
  }

  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("partner_users")
    .insert({
      partner_account_id: partnerAccountId,
      email,
      first_name: firstName,
      last_name:  lastName,
      role,
      status:     "pending",
      invited_at: now,
    })
    .select(
      "id, created_at, email, first_name, last_name, role, status, " +
      "last_login_at, invited_at, accepted_at"
    )
    .single();

  if (error) {
    console.error("[POST /api/admin/partners/[id]/users] Supabase error:", error);

    // Unique constraint violation — duplicate email for this account
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A user with this email already exists for this partner account." },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "Failed to create partner user." }, { status: 500 });
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}

// Keep TypeScript happy — suppress unused import warning
void VALID_STATUSES;
