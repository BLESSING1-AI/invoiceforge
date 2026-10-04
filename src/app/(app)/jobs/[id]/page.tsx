import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { findJobById } from "@/lib/store";
import { JobReview } from "./JobReview";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const job = await findJobById(id);

  if (!job || job.businessId !== session.business.id) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <Link href="/dashboard" className="text-sm font-medium text-slate-600">
            ← Dashboard
          </Link>
          <span className="font-bold">
            {job.invoiceNumber || "Review Job"}
          </span>
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <JobReview
          job={job}
          isVatRegistered={session.business.isVatRegistered}
          businessName={session.business.name}
        />
      </main>
    </div>
  );
}
