import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { sendInvoiceReminderNotifications } from "@/lib/emailNotifications";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const origin = new URL(request.url).origin;

  const result = await sendInvoiceReminderNotifications({
    origin,
    invoiceId: id,
  });

  if (result.attempted === 0) {
    return NextResponse.json(
      {
        success: false,
        error: result.errors[0] ?? "No eligible invoice reminder recipients were found.",
        result,
      },
      { status: 422 }
    );
  }

  if (result.sent === 0 && result.failed > 0) {
    return NextResponse.json(
      {
        success: false,
        error: result.errors[0] ?? "Invoice reminder delivery failed.",
        result,
      },
      { status: 502 }
    );
  }

  if (result.sent === 0 && result.skipped > 0) {
    return NextResponse.json(
      {
        success: false,
        error: result.errors[0] ?? "Invoice reminder was skipped because email is not configured.",
        result,
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ success: true, data: result });
}
