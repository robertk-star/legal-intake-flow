import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status")?.trim() ?? "";
  const partnerId = searchParams.get("partner_id")?.trim() ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10) || 100, 200);

  let query = supabaseAdmin
    .from("partner_billing_disputes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) query = query.eq("status", status);
  if (partnerId) query = query.eq("partner_account_id", partnerId);

  const [disputesResult, partnersResult, invoicesResult] = await Promise.all([
    query,
    supabaseAdmin.from("partner_accounts").select("id, firm_name, email, status").order("firm_name", { ascending: true }),
    supabaseAdmin.from("partner_billing_invoices").select("id, invoice_number, total_cents, balance_due_cents, status"),
  ]);

  if (disputesResult.error) {
    console.error("[GET /api/admin/billing/disputes] Disputes error:", disputesResult.error);
    return NextResponse.json({ error: "Failed to load billing disputes. Confirm section17 SQL has been run." }, { status: 500 });
  }

  if (partnersResult.error) {
    return NextResponse.json({ error: "Failed to load partners." }, { status: 500 });
  }

  if (invoicesResult.error) {
    return NextResponse.json({ error: "Failed to load invoices." }, { status: 500 });
  }

  const disputes = (disputesResult.data ?? []) as unknown as Array<Record<string, unknown>>;
  const partners = (partnersResult.data ?? []) as unknown as Array<Record<string, unknown>>;
  const invoices = (invoicesResult.data ?? []) as unknown as Array<Record<string, unknown>>;
  const partnerMap = new Map(partners.map((partner) => [partner.id, partner]));
  const invoiceMap = new Map(invoices.map((invoice) => [invoice.id, invoice]));

  const enriched = disputes.map((dispute) => ({
    ...dispute,
    partner: partnerMap.get(dispute.partner_account_id) ?? null,
    invoice: invoiceMap.get(dispute.invoice_id) ?? null,
  }));

  return NextResponse.json({ success: true, data: { disputes: enriched, partners } });
}
