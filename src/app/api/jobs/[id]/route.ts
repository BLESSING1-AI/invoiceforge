import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { findJobById, updateJob } from "@/lib/store";
import { LineItem } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const job = await findJobById(id);
  if (!job || job.businessId !== session.business.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(job);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const job = await findJobById(id);
    if (!job || job.businessId !== session.business.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.customer) {
      updates.customer = {
        ...job.customer,
        ...body.customer,
      };
    }

    if (Array.isArray(body.lineItems)) {
      const lineItems: LineItem[] = body.lineItems.map((li: LineItem) => ({
        ...li,
        total: Math.round((li.quantity || 0) * (li.unitPrice || 0) * 100) / 100,
      }));
      const subtotal = lineItems.reduce((s, li) => s + li.total, 0);
      const vatRate = session.business.isVatRegistered ? (body.vatRate ?? job.vatRate) : 0;
      const vatAmount = Math.round(subtotal * vatRate * 100) / 100;
      const total = subtotal + vatAmount;
      updates.lineItems = lineItems;
      updates.subtotal = subtotal;
      updates.vatRate = vatRate;
      updates.vatAmount = vatAmount;
      updates.total = total;
    }

    if (typeof body.notes === "string") updates.notes = body.notes;
    if (body.dueDate) updates.dueDate = body.dueDate;

    updates.auditLog = [
      ...job.auditLog,
      {
        timestamp: new Date().toISOString(),
        action: "job_updated",
        actor: "user",
        details: "User edited job details before approval",
      },
    ];

    const updated = await updateJob(id, updates);
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
