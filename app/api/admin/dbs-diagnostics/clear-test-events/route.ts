import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/admin/dbs-diagnostics/clear-test-events
 *
 * Clears dry-run diagnostics records only. This never deletes or modifies leads.
 */
export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { error, count } = await supabaseAdmin
    .from("dbs_ingest_events")
    .delete({ count: "exact" })
    .eq("is_dry_run", true);

  if (error) {
    console.error("[POST /api/admin/dbs-diagnostics/clear-test-events] Supabase error:", error);
    return NextResponse.json(
      { error: "Failed to clear dry-run diagnostics events." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, deletedCount: count ?? 0 });
}
