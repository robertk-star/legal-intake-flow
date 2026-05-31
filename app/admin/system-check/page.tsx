import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import SystemCheckClient from "./SystemCheckClient";

export default async function AdminSystemCheckPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-6">
            <span className="text-sm font-bold text-[#0d1b2e]">Legal Intake Flow Admin</span>
            <a href="/admin/partner-requests" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Partner Requests</a>
            <a href="/admin/partners" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Partner Accounts</a>
            <a href="/admin/leads" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Lead Queue</a>
            <a href="/admin/notifications" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Notifications</a>
            <a href="/admin/billing/invoices" className="text-gray-600 hover:text-[#0d1b2e]">Invoices</a><a href="/admin/reports" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Reports</a>
            <a href="/admin/billing" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Billing</a>
            <a href="/admin/billing/disputes" className="text-gray-600 hover:text-[#0d1b2e]">Disputes</a><a href="/admin/billing/statements" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Statements</a>
            <a href="/admin/system-check" className="text-sm font-semibold text-[#1a3a5c]">System Check</a>
          </div>
          <form action="/api/admin/logout" method="POST">
            <button type="submit" className="text-xs text-gray-400 hover:text-gray-600">Sign Out</button>
          </form>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0d1b2e]">System Check</h1>
          <p className="mt-1 text-sm text-gray-500">
            Quick production readiness review for environment variables, database migrations, and safety assumptions.
          </p>
        </div>

        <SystemCheckClient />
      </main>
    </div>
  );
}
