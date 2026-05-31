import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { bestEligiblePartner, getPartnerEligibilityForLeadId } from "@/lib/leadRouting";

type CurrentLead = {
  id: string;
  assigned_partner_account_id: string | null;
};

/**
 * POST /api/admin/leads/[id]/assign-best-match
 *
 * Admin-triggered assignment engine. Chooses the highest-scoring eligible
 * partner from the routing evaluator and assigns the lead. This does not run
 * automatically when leads are ingested; an admin must click the button.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  const eligibilityResult = await getPartnerEligibilityForLeadId(id);
  if (!eligibilityResult.data) {
    return NextResponse.json(
      { error: eligibilityResult.error ?? "Failed to evaluate partner matches." },
      { status: eligibilityResult.status }
    );
  }

  const bestMatch = bestEligiblePartner(eligibilityResult.data.evaluated);
  if (!bestMatch) {
    return NextResponse.json(
      {
        error: "No eligible partner found for this lead.",
        candidates: eligibilityResult.data.evaluated.slice(0, 5),
      },
      { status: 422 }
    );
  }

  const { data: currentLead, error: currentLeadError } = await supabaseAdmin
    .from("leads")
    .select("id, assigned_partner_account_id")
    .eq("id", id)
    .single();

  if (currentLeadError || !currentLead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const lead = currentLead as CurrentLead;
  const previousPartnerId = lead.assigned_partner_account_id;
  const bestPartnerId = bestMatch.partner.id;
  const reassigned = Boolean(previousPartnerId && previousPartnerId !== bestPartnerId);
  const samePartner = previousPartnerId === bestPartnerId;
  const assignedAt = samePartner ? undefined : new Date().toISOString();

  const updates: Record<string, unknown> = {
    assigned_partner_account_id: bestPartnerId,
    status: "assigned",
  };

  if (!samePartner) {
    updates.assigned_at = assignedAt;
    updates.partner_response_status = "new";
    updates.partner_response_updated_at = null;
    updates.partner_viewed_at = null;
    updates.partner_notes = null;
  } else {
    updates.partner_response_status = "new";
  }

  const { data: updatedLead, error: updateError } = await supabaseAdmin
    .from("leads")
    .update(updates)
    .eq("id", id)
    .select(
      "id, status, assigned_partner_account_id, assigned_at, partner_response_status, " +
      "partner_response_updated_at, partner_viewed_at, partner_notes, updated_at"
    )
    .single();

  if (updateError || !updatedLead) {
    console.error("[POST /api/admin/leads/[id]/assign-best-match] Update error:", updateError);
    return NextResponse.json({ error: "Failed to assign best match." }, { status: 500 });
  }

  const assignmentType = reassigned ? "reassignment" : "best_match";

  const { error: eventError } = await supabaseAdmin
    .from("lead_assignment_events")
    .insert({
      lead_id: id,
      partner_account_id: bestPartnerId,
      previous_partner_account_id: previousPartnerId,
      assignment_type: assignmentType,
      score: bestMatch.score,
      matched_rules: bestMatch.matchedRules,
      blockers: bestMatch.blockers,
      warnings: bestMatch.warnings,
      assigned_by: "admin",
      notes: samePartner
        ? "Admin-triggered best match selected the currently assigned partner."
        : "Admin-triggered best match assignment.",
    });

  if (eventError) {
    // Assignment succeeded; do not roll it back because audit logging failed.
    console.error("[POST /api/admin/leads/[id]/assign-best-match] Event insert error:", eventError);
  }

  return NextResponse.json({
    success: true,
    data: updatedLead,
    assignment: {
      partner: bestMatch.partner,
      assignmentType,
      score: bestMatch.score,
      matchedRules: bestMatch.matchedRules,
      warnings: bestMatch.warnings,
      eventLogged: !eventError,
    },
  });
}
