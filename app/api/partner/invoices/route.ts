import { NextResponse } from "next/server";
import { getAuthenticatedPartnerSession } from "@/lib/partnerAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const VISIBLE_STATUSES = ["sent", "partially_paid", "paid"];

export async function GET(request: Request) {
  const session = await getAuthenticatedPartnerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const includeDrafts = searchParams.get("include_drafts") === "true";

  let query = supabaseAdmin
    .from("partner_billing_invoices")
    .select(
      "id, created_at, updated_at, invoice_number, status, period_start, period_end, " +
      "subtotal_cents, total_cents, amount_paid_cents, balance_due_cents, notes, sent_at, paid_at, due_date, reminder_sent_at, reminder_count, overdue_marked_at, " +
      "finalized_at, payment_instructions, payment_method, payment_reference, payment_received_at"
    )
    .eq("partner_account_id", session.partnerAccountId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!includeDrafts) query = query.in("status", VISIBLE_STATUSES);

  const [{ data: invoices, error: invoiceError }, { data: partnerData, error: partnerError }] = await Promise.all([
    query,
    supabaseAdmin
      .from("partner_accounts")
      .select("id, firm_name, email")
      .eq("id", session.partnerAccountId)
      .single(),
  ]);

  if (invoiceError) {
    console.error("[GET /api/partner/invoices] Invoice error:", invoiceError);
    return NextResponse.json(
      { error: "Failed to load invoices. Confirm section14 SQL has been run." },
      { status: 500 }
    );
  }

  if (partnerError || !partnerData) {
    return NextResponse.json({ error: "Partner account not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: { partner: partnerData, invoices: invoices ?? [] } });
}
