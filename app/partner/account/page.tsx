import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAuthenticatedPartnerId } from "@/lib/partnerAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Image from "next/image";
import PartnerLogoutButton from "./LogoutButton";

interface PartnerAccount {
  id: string;
  firm_name: string;
  contact_first_name: string;
  contact_last_name: string;
  email: string;
  phone: string;
  website: string | null;
  states_served: string;
  practice_area: string;
  monthly_lead_capacity: string;
  status: string;
  last_login_at: string | null;
  created_at: string;
}

export default async function PartnerAccountPage() {
  // Auth check
  const partnerId = await getAuthenticatedPartnerId();

  if (!partnerId) {
    redirect("/partner/login");
  }

  // Fetch partner account details
  const { data: account, error } = await supabaseAdmin
    .from("partner_accounts")
    .select("*")
    .eq("id", partnerId)
    .single();

  if (error || !account) {
    redirect("/partner/login");
  }

  const partner = account as PartnerAccount;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-[#0d1b2e]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Image
            src="/images/lif-name-logo.png"
            alt="Legal Intake Flow"
            width={180}
            height={36}
            className="h-8 w-auto object-contain brightness-0 invert"
            priority
          />
          <PartnerLogoutButton />
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#0d1b2e]">Partner Account</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, {partner.contact_first_name}.
          </p>
        </div>

        {/* Coming soon notice */}
        <div className="mb-8 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
          <p className="text-sm text-blue-800">
            <strong>Lead dashboard is coming soon.</strong>{" "}
            This account is currently used to confirm partner access and profile information.
          </p>
        </div>

        {/* Profile card */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-base font-semibold text-[#0d1b2e]">Profile Information</h2>
          </div>

          <div className="px-6 py-5">
            <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              <ProfileField label="Firm Name" value={partner.firm_name} />
              <ProfileField
                label="Contact Name"
                value={`${partner.contact_first_name} ${partner.contact_last_name}`}
              />
              <ProfileField label="Email" value={partner.email} />
              <ProfileField label="Phone" value={partner.phone} />
              {partner.website && (
                <ProfileField
                  label="Website"
                  value={
                    <a
                      href={partner.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all"
                    >
                      {partner.website}
                    </a>
                  }
                />
              )}
              <ProfileField label="States Served" value={partner.states_served} />
              <ProfileField label="Practice Area" value={partner.practice_area} />
              <ProfileField label="Monthly Lead Capacity" value={partner.monthly_lead_capacity} />
              <ProfileField
                label="Account Status"
                value={
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                      partner.status === "active"
                        ? "bg-green-100 text-green-800"
                        : partner.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {partner.status}
                  </span>
                }
              />
              {partner.last_login_at && (
                <ProfileField
                  label="Last Login"
                  value={new Date(partner.last_login_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                />
              )}
            </dl>
          </div>
        </div>
      </main>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm text-gray-800">
        {value ?? <span className="italic text-gray-400">—</span>}
      </dd>
    </div>
  );
}
