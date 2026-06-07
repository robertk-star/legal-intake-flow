import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { getPartnerEligibilityForLeadId } from "@/lib/leadRouting";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const result = await getPartnerEligibilityForLeadId(id);

  if (!result.data) {
    return NextResponse.json({ error: result.error ?? "Failed to fetch partner eligibility." }, { status: result.status });
  }

  return NextResponse.json({
    success: true,
    data: result.data.evaluated,
    summary: {
      eligibleCount: result.data.eligible.length,
      totalCount: result.data.evaluated.length,
    },
  });
}
