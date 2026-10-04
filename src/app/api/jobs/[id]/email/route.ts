import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth";
import { findJobById, updateJob, createEmailEvent } from "@/lib/store";
import { getEmailProvider, isEmailConfigured } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/jobs/[id]/email
 * Body: { to: string, message?: string }
 *
 * Sends the invoice PDF via the configured EmailProvider (Resend).
 * Never reports success unless the provider confirms submission.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const job = await findJobById(id);
    if (!job || job.businessId !== session.business.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!job.invoiceNumber) {
      return NextResponse.json(
        { error: "Approve the invoice before emailing" },
        { status: 400 }
      );
    }

    if (!isEmailConfigured()) {
      return NextResponse.json(
        {
          error: "Email not configured",
          configured: false,
          hint: "Set RESEND_API_KEY and optionally EMAIL_FROM in environment variables",
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const to = typeof body.to === "string" ? body.to.trim() : "";
    const optionalMessage =
      typeof body.message === "string" ? body.message.trim() : undefined;

    if (!to || !EMAIL_RE.test(to)) {
      return NextResponse.json(
        { error: "Valid recipient email is required" },
        { status: 400 }
      );
    }

    await updateJob(id, { emailDeliveryStatus: "sending" });

    const provider = getEmailProvider();
    const result = await provider.sendInvoiceEmail({
      to,
      business: session.business,
      job,
      optionalMessage,
    });

    const now = new Date().toISOString();

    await createEmailEvent({
      id: randomUUID(),
      jobId: id,
      businessId: session.business.id,
      recipientEmail: to,
      timestamp: now,
      provider: result.provider,
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    });

    if (!result.success) {
      await updateJob(id, {
        emailDeliveryStatus: "failed",
        auditLog: [
          ...job.auditLog,
          {
            timestamp: now,
            action: "email_failed",
            actor: "system",
            details: result.error || "Unknown error",
          },
        ],
      });
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Email failed",
          configured: result.configured,
        },
        { status: 502 }
      );
    }

    await updateJob(id, {
      status: "sent",
      sentAt: now,
      emailDeliveryStatus: "sent",
      lastEmailAt: now,
      lastEmailTo: to,
      customer: job.customer.email
        ? job.customer
        : { ...job.customer, email: to },
      auditLog: [
        ...job.auditLog,
        {
          timestamp: now,
          action: "email_sent",
          actor: "system",
          details: `Sent to ${to} via ${result.provider}${result.messageId ? ` (${result.messageId})` : ""}`,
        },
      ],
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      to,
      provider: result.provider,
    });
  } catch (e) {
    console.error("Email route error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** GET — check if email is configured (no secrets exposed). */
export async function GET() {
  return NextResponse.json({ configured: isEmailConfigured() });
}
