import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";

const DATASETS = [
  {
    id: "leads",
    label: "Leads",
    description: "DBS-ingested leads, assignment, response, and billing readiness fields.",
    dateColumn: "created_at",
    supportsPartnerFilter: true,
    supportsStatusFilter: true,
  },
  {
    id: "partners",
    label: "Partner Accounts",
    description: "Firm profiles, partner status, routing preferences, and billing contact details.",
    dateColumn: "created_at",
    supportsPartnerFilter: false,
    supportsStatusFilter: true,
  },
  {
    id: "partner_users",
    label: "Partner Users",
    description: "Partner team members, roles, statuses, and login activity.",
    dateColumn: "created_at",
    supportsPartnerFilter: true,
    supportsStatusFilter: true,
  },
  {
    id: "invoices",
    label: "Invoices",
    description: "Invoice drafts, sent invoices, payment tracking, due dates, and reminder counts.",
    dateColumn: "created_at",
    supportsPartnerFilter: true,
    supportsStatusFilter: true,
  },
  {
    id: "invoice_items",
    label: "Invoice Items",
    description: "Lead-level invoice line items for partner billing review.",
    dateColumn: "created_at",
    supportsPartnerFilter: false,
    supportsStatusFilter: false,
  },
  {
    id: "billing_events",
    label: "Lead Billing Events",
    description: "Audit trail for lead billing review and billing status updates.",
    dateColumn: "created_at",
    supportsPartnerFilter: true,
    supportsStatusFilter: false,
  },
  {
    id: "invoice_events",
    label: "Invoice Events",
    description: "Audit trail for invoice creation, status changes, payments, and email events.",
    dateColumn: "created_at",
    supportsPartnerFilter: false,
    supportsStatusFilter: false,
  },
  {
    id: "disputes",
    label: "Invoice Disputes",
    description: "Partner invoice questions/disputes and admin resolution workflow.",
    dateColumn: "created_at",
    supportsPartnerFilter: true,
    supportsStatusFilter: true,
  },
  {
    id: "notifications",
    label: "Email Notifications",
    description: "Email delivery attempts for login links, lead assignments, invoices, and reminders.",
    dateColumn: "created_at",
    supportsPartnerFilter: true,
    supportsStatusFilter: true,
  },
  {
    id: "profile_events",
    label: "Partner Profile Events",
    description: "Audit trail for partner-maintained firm profile and billing contact changes.",
    dateColumn: "created_at",
    supportsPartnerFilter: true,
    supportsStatusFilter: false,
  },
] as const;

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    generatedAt: new Date().toISOString(),
    datasets: DATASETS,
    limits: {
      default: 1000,
      maximum: 10000,
    },
  });
}
