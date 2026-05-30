import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id: requestId } = await params;

  // Fetch the partner access request
  const { data: req, error: reqError } = await supabaseAdmin
    .from("partner_access_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (reqError || !req) {
    return NextResponse.json(
      { success: false, error: "Partner access request not found." },
      { status: 404 }
    );
  }

  // Hard block: request must be approved before a partner account can be created
  if (req.status !== "approved") {
    return NextResponse.json(
      {
        success: false,
        error: `Partner account cannot be created until the request status is set to "approved". Current status: "${req.status}".`,
      },
      { status: 422 }
    );
  }

  // Check for existing account with the same email
  const { data: existing } = await supabaseAdmin
    .from("partner_accounts")
    .select("*")
    .eq("email", (req.email as string).toLowerCase().trim())
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      success: true,
      alreadyExists: true,
      data: existing,
    });
  }

  // Create the partner account
  const { data: account, error: insertError } = await supabaseAdmin
    .from("partner_accounts")
    .insert({
      partner_request_id: requestId,
      firm_name: req.firm_name,
      contact_first_name: req.first_name,
      contact_last_name: req.last_name,
      email: (req.email as string).toLowerCase().trim(),
      phone: req.phone,
      website: req.website ?? null,
      states_served: req.states_served,
      practice_area: req.practice_area,
      monthly_lead_capacity: req.monthly_lead_capacity,
      status: "active",
    })
    .select()
    .single();

  if (insertError || !account) {
    console.error("[create-partner-account] Insert error:", insertError);
    return NextResponse.json(
      { success: false, error: "Failed to create partner account." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    alreadyExists: false,
    data: account,
  });
}
