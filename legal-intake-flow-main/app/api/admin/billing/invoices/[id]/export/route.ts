import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function csvEscape(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function centsToDollars(cents: unknown) {
  return typeof cents === "number" ? (cents / 100).toFixed(2) : "0.00";
}

export async function GET(
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

  const [partnerResult, itemsResult] = await Promise.all([
    supabaseAdmin
      .from("partner_accounts")
      .select("firm_name, email")
      .eq("id", invoice.partner_account_id)
      .single(),
    supabaseAdmin
      .from("partner_billing_invoice_items")
      .select("id, lead_id, description, amount_cents, billing_status_at_creation")
      .eq("invoice_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const partner = partnerResult.data as { firm_name?: string; email?: string } | null;
  const items = (itemsResult.data ?? []) as unknown as Array<{
    lead_id: string;
    description: string;
    amount_cents: number;
    billing_status_at_creation: string | null;
  }>;

  const rows = [
    ["Invoice Number", invoice.invoice_number],
    ["Partner", partner?.firm_name ?? ""],
    ["Partner Email", partner?.email ?? ""],
    ["Status", invoice.status],
    ["Period Start", invoice.period_start],
    ["Period End", invoice.period_end],
    ["Due Date", invoice.due_date ?? ""],
    ["Finalized At", invoice.finalized_at ?? ""],
    ["Payment Method", invoice.payment_method ?? ""],
    ["Payment Reference", invoice.payment_reference ?? ""],
    ["Payment Received At", invoice.payment_received_at ?? ""],
    ["Stripe Payment Status", invoice.stripe_payment_status ?? ""],
    ["Stripe Checkout Session", invoice.stripe_checkout_session_id ?? ""],
    ["Stripe Payment Intent", invoice.stripe_payment_intent_id ?? ""],
    ["Stripe Paid At", invoice.stripe_paid_at ?? ""],
    ["Payment Instructions", invoice.payment_instructions ?? ""],
    ["Total", centsToDollars(invoice.total_cents)],
    ["Amount Paid", centsToDollars(invoice.amount_paid_cents)],
    ["Balance Due", centsToDollars(invoice.balance_due_cents)],
    [],
    ["Lead ID", "Description", "Billing Status At Creation", "Amount"],
    ...items.map((item) => [
      item.lead_id,
      item.description,
      item.billing_status_at_creation ?? "",
      centsToDollars(item.amount_cents),
    ]),
  ];

  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const safeNumber = String(invoice.invoice_number ?? "invoice").replace(/[^a-zA-Z0-9_-]/g, "-");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeNumber}.csv"`,
    },
  });
}
