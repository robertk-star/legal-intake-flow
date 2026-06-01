import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { retrieveStripePaymentIntentDetails, verifyStripeWebhookSignature } from "@/lib/stripePayments";

export const runtime = "nodejs";

type StripeCheckoutSession = {
  id: string;
  object: string;
  amount_total?: number | null;
  amount_subtotal?: number | null;
  currency?: string | null;
  customer_email?: string | null;
  payment_intent?: string | null;
  payment_status?: string | null;
  metadata?: Record<string, string | undefined> | null;
};

type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
};

function asCheckoutSession(value: Record<string, unknown>): StripeCheckoutSession {
  return value as unknown as StripeCheckoutSession;
}

async function markInvoicePaidFromCheckoutSession(event: StripeEvent, session: StripeCheckoutSession) {
  const invoiceId = session.metadata?.invoice_id;
  if (!invoiceId) {
    return { handled: false, reason: "checkout.session.completed missing invoice_id metadata" };
  }

  const { data: invoice, error: invoiceError } = await supabaseAdmin
    .from("partner_billing_invoices")
    .select(
      "id, status, total_cents, amount_paid_cents, balance_due_cents, stripe_checkout_session_id, stripe_payment_status"
    )
    .eq("id", invoiceId)
    .single();

  if (invoiceError || !invoice) {
    console.error("[Stripe webhook] Invoice lookup failed:", invoiceError);
    return { handled: false, reason: "invoice not found" };
  }

  const current = invoice as unknown as {
    id: string;
    status: string;
    total_cents: number;
    amount_paid_cents: number;
    balance_due_cents: number;
    stripe_checkout_session_id: string | null;
    stripe_payment_status: string | null;
  };

  if (current.stripe_checkout_session_id === session.id && current.stripe_payment_status === "paid") {
    return { handled: true, duplicate: true };
  }

  const amountTotal = Number(session.amount_total ?? 0);
  const paymentDetails = session.payment_intent
    ? await retrieveStripePaymentIntentDetails(session.payment_intent)
    : { data: null, error: null };
  const previousPaid = Number(current.amount_paid_cents ?? 0);
  const total = Number(current.total_cents ?? 0);
  const nextPaid = Math.min(total, previousPaid + Math.max(amountTotal, 0));
  const balance = Math.max(total - nextPaid, 0);
  const nextStatus = balance <= 0 ? "paid" : "partially_paid";
  const now = new Date().toISOString();

  const { error: updateError } = await supabaseAdmin
    .from("partner_billing_invoices")
    .update({
      status: nextStatus,
      amount_paid_cents: nextPaid,
      balance_due_cents: balance,
      paid_at: nextStatus === "paid" ? now : null,
      payment_method: "stripe",
      payment_reference: session.payment_intent ?? session.id,
      payment_received_at: now,
      payment_recorded_by: "stripe",
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent ?? null,
      stripe_charge_id: paymentDetails.data?.chargeId ?? null,
      stripe_receipt_url: paymentDetails.data?.receiptUrl ?? null,
      stripe_payment_method_type: paymentDetails.data?.paymentMethodType ?? null,
      stripe_card_last4: paymentDetails.data?.cardLast4 ?? null,
      stripe_payment_status: session.payment_status ?? "paid",
      stripe_customer_email: session.customer_email ?? null,
      stripe_paid_at: now,
      stripe_last_event_at: now,
    })
    .eq("id", invoiceId);

  if (updateError) {
    console.error("[Stripe webhook] Invoice update failed:", updateError);
    return { handled: false, reason: "invoice update failed" };
  }

  await supabaseAdmin.from("partner_billing_invoice_events").insert({
    invoice_id: invoiceId,
    event_type: "stripe_payment_succeeded",
    previous_status: current.status,
    next_status: nextStatus,
    amount_cents: amountTotal,
    notes: `Stripe payment succeeded. Session: ${session.id}. Payment intent: ${session.payment_intent ?? "—"}. Charge: ${paymentDetails.data?.chargeId ?? "—"}. Receipt: ${paymentDetails.data?.receiptUrl ?? "—"}. Event: ${event.id}.`,
    created_by: "stripe",
  });

  const { data: items } = await supabaseAdmin
    .from("partner_billing_invoice_items")
    .select("lead_id")
    .eq("invoice_id", invoiceId);
  const leadIds = ((items ?? []) as unknown as Array<{ lead_id: string }>).map((item) => item.lead_id);
  if (leadIds.length > 0) {
    await supabaseAdmin
      .from("leads")
      .update({ billable_status: "invoiced" })
      .in("id", leadIds);
  }

  return { handled: true, duplicate: false };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("stripe-signature");
  const verified = verifyStripeWebhookSignature({
    rawBody,
    signatureHeader,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  });

  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Invalid Stripe event JSON." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = asCheckoutSession(event.data.object);
    const result = await markInvoicePaidFromCheckoutSession(event, session);
    return NextResponse.json({ received: true, result });
  }

  return NextResponse.json({ received: true, ignored: true, type: event.type });
}
