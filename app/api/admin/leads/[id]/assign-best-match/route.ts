import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { assignBestMatchToLead, getLeadAssignmentSettings } from "@/lib/leadAssignmentEngine";
import { getPartnerEligibilityForLeadId } from "@/lib/leadRouting";

/**
 * POST /api/admin/leads/[id]/assign-best-match
 *
 * Admin-triggered assignment engine. Chooses the highest-scoring eligible
 * partner from the routing evaluator and assigns the lead. This does not run
 * automatically when leads are ingested unless Phase 31 controls explicitly enable it.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const origin = process.env.LIF_APP_URL?.replace(/\/$/, "") || new URL(request.url).origin;
  const { settings, warning } = await getLeadAssignmentSettings();

  const result = await assignBestMatchToLead({
    leadId: id,
    origin,
    assignmentType: "best_match",
    assignedBy: "admin",
    settings,
    notifyPartner: true,
  });

  if (!result.assigned) {
    const eligibilityResult = await getPartnerEligibilityForLeadId(id);
    return NextResponse.json(
      {
        error: result.reason ?? "No eligible partner found for this lead.",
        candidates: eligibilityResult.data?.evaluated.slice(0, 5) ?? [],
        settingsWarning: warning,
      },
      { status: result.reason === "Lead not found." ? 404 : 422 }
    );
  }

  return NextResponse.json({
    success: true,
    data: result.data,
    assignment: {
      partnerAccountId: result.partnerAccountId,
      previousPartnerAccountId: result.previousPartnerAccountId,
      assignmentType: result.assignmentType,
      score: result.score,
      matchedRules: result.matchedRules,
      warnings: result.warnings,
      eventLogged: result.eventLogged,
      notifications: result.notifications,
    },
    settingsWarning: warning,
  });
}
