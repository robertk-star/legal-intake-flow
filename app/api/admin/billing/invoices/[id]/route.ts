import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const INVOICE_STATUSES = ["draft", "sent", "partially_paid", "paid", "void"] as const;
type InvoiceStatus = typeof INVOICE_STATUSES[number];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseCents(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return NaN;
  return Math.round(numeric * 100);
}

async function loadInvoice(id: string) {
  const { data: invoice, error } = await supabaseAdmin
    .from("partner_billing_invoices")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !invoice) return { invoice: null, error };

  const [partnerResult, itemsResult, eventsResult] = await Promise.all([
    supabaseAdmin
      .from("partner_accounts")
      .select("id, firm_name, email, status")
      .eq("id", invoice.partner_account_id)
      .single(),
    supabaseAdmin
      .from("partner_billing_invoice_items")
      .select("id, created_at, lead_id, description, amount_cents, billing_status_at_creation")
      .eq("invoice_id", id)
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("partner_billing_invoice_events")
      .select("id, created_at, event_type, previous_status, next_status, amount_cents, notes, created_by")
      .eq("invoice_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return {
    invoice: {
      ...invoice,
      partner: partnerResult.data ?? null,
      items: itemsResult.data ?? [],
      events: eventsResult.data ?? [],
    },
    error: null,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const { invoice } = await loadInvoice(id);
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: invoice });
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

  const { invoice: currentInvoice } = await loadInvoice(id);
  if (!currentInvoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  const currentStatus = String(currentInvoice.status);
  let eventType: "status_changed" | "payment_recorded" | "payment_adjusted" | "voided" | "note_updated" = "note_updated";
  let nextStatus: InvoiceStatus | null = null;
  let paymentCents: number | null = null;

  if ("status" in body) {
    const status = String(body.status ?? "").trim() as InvoiceStatus;
    if (!INVOICE_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid invoice status. Allowed values: ${INVOICE_STATUSES.join(", ")}.` },
        { status: 422 }
      );
    }
    updates.status = status;
    nextStatus = status;
    eventType = status === "void" ? "voided" : "status_changed";

    if (status === "sent" && !currentInvoice.sent_at) updates.sent_at = new Date().toISOString();
    if (status === "paid" && !currentInvoice.paid_at) updates.paid_at = new Date().toISOString();
    if (status === "void" && !currentInvoice.voided_at) updates.voided_at = new Date().toISOString();
  }

  if ("amount_paid" in body) {
    const cents = parseCents(body.amount_paid);
    if (Number.isNaN(cents)) {
      return NextResponse.json({ error: "Payment amount must be a non-negative number." }, { status: 422 });
    }
    paymentCents = cents ?? 0;
    updates.amount_paid_cents = paymentCents;
    const total = Number(currentInvoice.total_cents ?? 0);
    updates.balance_due_cents = Math.max(total - paymentCents, 0);

    if (!("status" in body)) {
      if (paymentCents <= 0) {
        updates.status = "sent";
        nextStatus = "sent";
      } else if (paymentCents >= total) {
        updates.status = "paid";
        updates.paid_at = new Date().toISOString();
        nextStatus = "paid";
      } else {
        updates.status = "partially_paid";
        nextStatus = "partially_paid";
      }
    }

    eventType = "payment_recorded";
  }

  if ("notes" in body) {
    const notes = String(body.notes ?? "").trim();
    updates.notes = notes || null;
    if (eventType === "note_updated") nextStatus = currentStatus as InvoiceStatus;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 422 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("partner_billing_invoices")
    .update(updates)
    .eq("id", id);

  if (updateError) {
    console.error("[PATCH /api/admin/billing/invoices/[id]] Update error:", updateError);
    return NextResponse.json({ error: "Failed to update invoice." }, { status: 500 });
  }

  const resolvedNextStatus = String(updates.status ?? currentStatus);

  await supabaseAdmin.from("partner_billing_invoice_events").insert({
    invoice_id: id,
    event_type: eventType,
    previous_status: currentStatus,
    next_status: resolvedNextStatus,
    amount_cents: paymentCents,
    notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
    created_by: "admin",
  });

  if (resolvedNextStatus === "sent" || resolvedNextStatus === "paid" || resolvedNextStatus === "partially_paid") {
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
  }

  const { invoice } = await loadInvoice(id);
  return NextResponse.json({ success: true, data: invoice });
}
