import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type LeadRecord = {
  id: string;
  state: string | null;
  benefit_type: string | null;
  application_status: string | null;
};

type PartnerRecord = {
  id: string;
  firm_name: string;
  email: string;
  status: string | null;
  accepting_leads: boolean | null;
  lead_status: string | null;
  monthly_lead_capacity: string | null;
  states_served: string | null;
  routing_states: string[] | null;
  accepted_case_types: string[] | null;
  accepts_initial_filings: boolean | null;
  accepts_appeals: boolean | null;
  accepts_hearings: boolean | null;
  accepts_child_cases: boolean | null;
  accepted_languages: string[] | null;
  lead_notes: string | null;
};

type AssignedLeadCountRow = {
  assigned_partner_account_id: string | null;
};

const BENEFIT_VALUES = ["SSDI", "SSI"] as const;

function normalizeState(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

function parseStates(statesServed: string | null | undefined, routingStates: string[] | null | undefined): string[] {
  const source = routingStates && routingStates.length > 0
    ? routingStates
    : (statesServed ?? "").split(/[,;\n|/\s]+/);

  return Array.from(
    new Set(
      source
        .map((state) => normalizeState(state))
        .filter((state): state is string => Boolean(state))
    )
  );
}

function requiredBenefits(benefitType: string | null | undefined): string[] {
  const value = (benefitType ?? "").toLowerCase();
  if (!value || value.includes("not sure") || value.includes("unknown")) return [];
  if (value.includes("both")) return ["SSDI", "SSI"];
  return BENEFIT_VALUES.filter((benefit) => value.includes(benefit.toLowerCase()));
}

function requiredStage(applicationStatus: string | null | undefined):
  | "initial"
  | "appeals"
  | "hearings"
  | null {
  const value = (applicationStatus ?? "").toLowerCase();
  if (!value || value.includes("not sure") || value.includes("unknown")) return null;
  if (value.includes("hearing")) return "hearings";
  if (value.includes("denied") || value.includes("appeal")) return "appeals";
  if (value.includes("not applied") || value.includes("pending") || value.includes("initial")) return "initial";
  return null;
}

function parseCapacity(value: string | null | undefined): number | null {
  if (!value) return null;
  const numbers = value.match(/\d+/g)?.map(Number) ?? [];
  if (numbers.length === 0) return null;
  return Math.max(...numbers);
}

function evaluatePartner(lead: LeadRecord, partner: PartnerRecord, monthlyAssignedCount: number) {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const matchedRules: string[] = [];
  let score = 0;

  if (partner.status !== "active") {
    blockers.push("Account is not active.");
  } else {
    matchedRules.push("Account active");
    score += 20;
  }

  if (partner.accepting_leads === false) {
    blockers.push("Partner is not accepting leads.");
  } else {
    matchedRules.push("Accepting leads");
    score += 20;
  }

  if (partner.lead_status && partner.lead_status !== "active") {
    blockers.push(`Lead status is ${partner.lead_status.replace(/_/g, " ")}.`);
  } else {
    matchedRules.push("Lead status active");
    score += 15;
  }

  const leadState = normalizeState(lead.state);
  const partnerStates = parseStates(partner.states_served, partner.routing_states);
  if (leadState) {
    if (partnerStates.length === 0) {
      blockers.push("No routing states configured.");
    } else if (!partnerStates.includes(leadState)) {
      blockers.push(`Does not serve ${leadState}.`);
    } else {
      matchedRules.push(`Serves ${leadState}`);
      score += 25;
    }
  } else {
    warnings.push("Lead state is missing or not a two-letter state abbreviation.");
  }

  const benefits = requiredBenefits(lead.benefit_type);
  const partnerBenefits = partner.accepted_case_types ?? [];
  if (benefits.length > 0) {
    if (partnerBenefits.length === 0) {
      blockers.push("No accepted benefit programs configured.");
    } else {
      const missing = benefits.filter((benefit) => !partnerBenefits.includes(benefit));
      if (missing.length > 0) {
        blockers.push(`Does not accept ${missing.join("/")} leads.`);
      } else {
        matchedRules.push(`Accepts ${benefits.join("/")}`);
        score += 20;
      }
    }
  } else {
    warnings.push("Benefit type is missing or not specific.");
  }

  const stage = requiredStage(lead.application_status);
  if (stage === "initial") {
    if (!partner.accepts_initial_filings) blockers.push("Does not accept initial filings.");
    else { matchedRules.push("Accepts initial filings"); score += 10; }
  } else if (stage === "appeals") {
    if (!partner.accepts_appeals) blockers.push("Does not accept appeals/denials.");
    else { matchedRules.push("Accepts appeals/denials"); score += 10; }
  } else if (stage === "hearings") {
    if (!partner.accepts_hearings) blockers.push("Does not accept hearings.");
    else { matchedRules.push("Accepts hearings"); score += 10; }
  } else {
    warnings.push("Application stage is missing or not specific.");
  }

  const capacity = parseCapacity(partner.monthly_lead_capacity);
  if (capacity !== null) {
    if (monthlyAssignedCount >= capacity) {
      blockers.push(`Monthly capacity reached (${monthlyAssignedCount}/${capacity}).`);
    } else {
      matchedRules.push(`Capacity available (${monthlyAssignedCount}/${capacity})`);
      score += 10;
    }
  } else {
    warnings.push("Monthly capacity is not numeric.");
  }

  return {
    partner: {
      id: partner.id,
      firm_name: partner.firm_name,
      email: partner.email,
      status: partner.status,
      accepting_leads: partner.accepting_leads,
      lead_status: partner.lead_status,
      routing_states: partnerStates,
      accepted_case_types: partner.accepted_case_types ?? [],
      monthly_lead_capacity: partner.monthly_lead_capacity,
      monthly_assigned_count: monthlyAssignedCount,
      lead_notes: partner.lead_notes,
    },
    eligible: blockers.length === 0,
    score,
    matchedRules,
    blockers,
    warnings,
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

  const { data: lead, error: leadError } = await supabaseAdmin
    .from("leads")
    .select("id, state, benefit_type, application_status")
    .eq("id", id)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const { data: partners, error: partnersError } = await supabaseAdmin
    .from("partner_accounts")
    .select(
      "id, firm_name, email, status, accepting_leads, lead_status, monthly_lead_capacity, " +
      "states_served, routing_states, accepted_case_types, accepts_initial_filings, " +
      "accepts_appeals, accepts_hearings, accepts_child_cases, accepted_languages, lead_notes"
    )
    .order("firm_name", { ascending: true });

  if (partnersError) {
    console.error("[GET /api/admin/leads/[id]/eligible-partners] Partner query error:", partnersError);
    return NextResponse.json({ error: "Failed to fetch partner eligibility." }, { status: 500 });
  }

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { data: assignedRows } = await supabaseAdmin
    .from("leads")
    .select("assigned_partner_account_id")
    .not("assigned_partner_account_id", "is", null)
    .gte("assigned_at", monthStart.toISOString())
    .in("status", ["assigned", "reviewing", "ready_to_assign", "new"]);

  const counts = new Map<string, number>();
  for (const row of (assignedRows ?? []) as AssignedLeadCountRow[]) {
    if (!row.assigned_partner_account_id) continue;
    counts.set(row.assigned_partner_account_id, (counts.get(row.assigned_partner_account_id) ?? 0) + 1);
  }

  const evaluated = ((partners ?? []) as unknown as PartnerRecord[])
    .map((partner) => evaluatePartner(lead as LeadRecord, partner, counts.get(partner.id) ?? 0))
    .sort((a, b) => {
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      if (b.score !== a.score) return b.score - a.score;
      return a.partner.firm_name.localeCompare(b.partner.firm_name);
    });

  return NextResponse.json({
    success: true,
    data: evaluated,
    summary: {
      eligibleCount: evaluated.filter((item) => item.eligible).length,
      totalCount: evaluated.length,
    },
  });
}
