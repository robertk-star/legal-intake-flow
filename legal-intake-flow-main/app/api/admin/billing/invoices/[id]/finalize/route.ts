import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  const { data: invoice, error: invoiceError } = await supabaseAdmin
    .from("partner_billing_invoices")
    .select("*")
    .eq("id", id)
    .single();

  if (invoiceError || !invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const current = invoice as Record<string, unknown>;
  const currentStatus = String(current.status ?? "draft");

  if (currentStatus === "void") {
    return NextResponse.json(
      { error: "Void invoices cannot be finalized." },
      { status: 422 }
    );
  }

  if (current.finalized_at) {
    return NextResponse.json({ success: true, data: current, alreadyFinalized: true });
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    finalized_at: now,
    finalized_by: "admin",
  };

  // Finalizing a draft makes it partner-visible without requiring a separate
  // status change step. Payment processing is still manual/off-platform.
  if (currentStatus === "draft") {
    updates.status = "sent";
    updates.sent_at = current.sent_at ?? now;
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("partner_billing_invoices")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (updateError || !updated) {
    console.error("[POST /api/admin/billing/invoices/[id]/finalize] Update error:", updateError);
    return NextResponse.json({ error: "Failed to finalize invoice." }, { status: 500 });
  }

  await supabaseAdmin.from("partner_billing_invoice_events").insert({
    invoice_id: id,
    event_type: "finalized",
    previous_status: currentStatus,
    next_status: String((updated as Record<string, unknown>).status ?? currentStatus),
    amount_cents: Number(current.total_cents ?? 0),
    notes: currentStatus === "draft"
      ? "Invoice finalized and marked sent."
      : "Invoice finalized.",
    created_by: "admin",
  });

  const { data: items } = await supabaseAdmin
    .from("partner_billing_invoice_items")
    .select("lead_id")
    .eq("invoice_id", id);
  const leadIds = ((items ?? []) as unknown as Array<{ lead_id: string }>).map((item) => item.lead_id);
  if (leadIds.length > 0) {
    await supabaseAdmin
      .from("leads")
      .update({ billable_status: "invoiced" })
      .in("id", leadIds);
  }

  return NextResponse.json({ success: true, data: updated });
}
