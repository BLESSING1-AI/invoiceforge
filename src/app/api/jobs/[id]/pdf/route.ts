import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { findJobById } from "@/lib/store";
import { generateInvoicePdf } from "@/lib/pdf";

export async function GET(
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
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!job.invoiceNumber && job.status === "pending_approval") {
      return NextResponse.json(
        { error: "Approve the invoice before generating PDF" },
        { status: 400 }
      );
    }

    const business = session.business;
    const pdfBytes = generateInvoicePdf(business, job);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${job.invoiceNumber || job.id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("PDF generation error:", e);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
