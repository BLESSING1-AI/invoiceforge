import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth";
import { createJob } from "@/lib/store";
import { extractJobDetails } from "@/lib/ai";
import { Job } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { rawInput, customerName, customerPhone } = body;

    if (!rawInput || typeof rawInput !== "string") {
      return NextResponse.json({ error: "Job description is required" }, { status: 400 });
    }

    const extraction = await extractJobDetails(rawInput, session.business.priceBook);

    const lineItems = extraction.lineItems;
    const subtotal = lineItems.reduce((s, li) => s + li.total, 0);
    const vatRate = session.business.isVatRegistered ? 0.15 : 0;
    const vatAmount = Math.round(subtotal * vatRate * 100) / 100;
    const total = subtotal + vatAmount;

    const now = new Date().toISOString();

    const job: Job = {
      id: randomUUID(),
      businessId: session.business.id,
      customer: {
        id: randomUUID(),
        name: customerName || extraction.customerName || "Unknown",
        phone: customerPhone || extraction.customerPhone || undefined,
        email: extraction.customerEmail || undefined,
        address: extraction.customerAddress || undefined,
      },
      status: "pending_approval",
      rawInput,
      photoUrls: [],
      receiptUrls: [],
      lineItems,
      notes: extraction.notes,
      subtotal,
      vatRate,
      vatAmount,
      total,
      extractionConfidence: extraction.confidence,
      missingFields: extraction.missingFields,
      createdAt: now,
      updatedAt: now,
      auditLog: [
        {
          timestamp: now,
          action: "job_submitted",
          actor: "user",
          details: "Job created from free-text input",
        },
        {
          timestamp: now,
          action: "ai_extraction",
          actor: "ai",
          details: extraction.rawAnalysis,
        },
      ],
    };

    await createJob(job);

    return NextResponse.json({ jobId: job.id, confidence: extraction.confidence });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
