import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import SecurityDashboard from "./SecurityDashboard";

export default async function AdminSecurityPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-6">
            <span className="text-sm font-bold text-[#0d1b2e]">Legal Intake Flow Admin</span>
            <a href="/admin" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Dashboard</a>
            <a href="/admin/leads" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Lead Queue</a>
            <a href="/admin/partners" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Partners</a>
            <a href="/admin/routing" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Routing</a>
            <a href="/admin/billing/invoices" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Invoices</a>
            <a href="/admin/reports" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Reports</a>
            <a href="/admin/system-check" className="text-sm text-gray-500 hover:text-[#0d1b2e]">System Check</a>
            <a href="/admin/security" className="text-sm font-semibold text-[#1a3a5c]">Security</a>
          </div>
          <form action="/api/admin/logout" method="POST">
            <button type="submit" className="text-xs text-gray-400 hover:text-gray-600">Sign Out</button>
          </form>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0d1b2e]">Security & Compliance Hardening</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review production security posture, sensitive environment setup, and route protection assumptions.
          </p>
        </div>
        <SecurityDashboard />
      </main>
    </div>
  );
}
