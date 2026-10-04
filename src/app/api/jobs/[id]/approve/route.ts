import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { findJobById, updateJob, updateBusiness } from "@/lib/store";

/**
 * Approve invoice: assign number, set status to "approved".
 * Does NOT mark as "sent" — that happens only after real email delivery.
 */
export async function POST(
  _req: NextRequest,
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
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const business = session.business;
    const invoiceNumber = `${business.invoicePrefix}-${String(business.nextInvoiceNumber).padStart(4, "0")}`;

    const now = new Date().toISOString();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + business.defaultPaymentTermsDays);

    await updateJob(id, {
      status: "approved",
      invoiceNumber,
      dueDate: dueDate.toISOString(),
      emailDeliveryStatus: "ready",
      auditLog: [
        ...job.auditLog,
        {
          timestamp: now,
          action: "invoice_approved",
          actor: "user",
          details: `Invoice ${invoiceNumber} approved — ready to email`,
        },
      ],
    });

    const newPriceBook = [...business.priceBook];
    for (const item of job.lineItems) {
      if (item.unitPrice <= 0) continue;
      const key = item.description.toLowerCase().replace(/\s+/g, " ").trim();
      const existing = newPriceBook.find((p) => p.key === key);
      if (existing) {
        existing.unitPrice = item.unitPrice;
        existing.lastUsed = now;
        existing.useCount += 1;
      } else {
        newPriceBook.push({
          key,
          description: item.description,
          unitPrice: item.unitPrice,
          type: item.type,
          lastUsed: now,
          useCount: 1,
        });
      }
    }

    await updateBusiness(business.id, {
      nextInvoiceNumber: business.nextInvoiceNumber + 1,
      priceBook: newPriceBook,
    });

    return NextResponse.json({
      ok: true,
      invoiceNumber,
      message: "Invoice approved — ready to download PDF or email",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
