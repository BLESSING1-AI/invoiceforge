import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { findJobsByBusinessId } from "@/lib/store";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const jobs = await findJobsByBusinessId(session.business.id);

  const outstanding = jobs.filter((j) =>
    ["sent", "viewed", "overdue", "partially_paid"].includes(j.status)
  );
  const overdue = jobs.filter((j) => j.status === "overdue");
  const paid = jobs.filter((j) => j.status === "paid");
  const outstandingAmount = outstanding.reduce((sum, j) => sum + j.total, 0);
  const paidAmount = paid.reduce((sum, j) => sum + j.total, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-sm font-bold text-white">
              IF
            </div>
            <span className="font-bold">{session.business.name}</span>
          </div>
          <Link
            href="/jobs/new"
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600"
          >
            + New Job
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>

        <div className="mt-6 rounded-2xl border-2 border-amber-400 bg-amber-50 p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
            Money still outstanding
          </p>
          <p className="mt-1 text-4xl font-extrabold text-slate-900">
            R {outstandingAmount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {outstanding.length} invoice{outstanding.length !== 1 ? "s" : ""} waiting
            {overdue.length > 0 && (
              <span className="ml-2 font-semibold text-red-600">
                · {overdue.length} overdue
              </span>
            )}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase text-slate-500">Paid</p>
            <p className="mt-1 text-xl font-bold">
              R {paidAmount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase text-slate-500">Sent</p>
            <p className="mt-1 text-xl font-bold">{outstanding.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase text-slate-500">Total jobs</p>
            <p className="mt-1 text-xl font-bold">{jobs.length}</p>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Recent jobs</h2>
            <Link href="/jobs/new" className="text-sm font-semibold text-amber-600">
              New job →
            </Link>
          </div>

          {jobs.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-slate-500">No jobs yet</p>
              <Link
                href="/jobs/new"
                className="mt-4 inline-block rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-600"
              >
                Submit your first job
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {jobs.slice(0, 10).map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:border-amber-300"
                >
                  <div>
                    <p className="font-semibold">
                      {job.customer.name || "Unknown customer"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {job.lineItems.map((li) => li.description).join(", ").slice(0, 60) ||
                        job.rawInput.slice(0, 60)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      R {job.total.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                    </p>
                    <StatusBadge status={job.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    extracted: "bg-blue-100 text-blue-700",
    pending_approval: "bg-yellow-100 text-yellow-800",
    approved: "bg-indigo-100 text-indigo-700",
    sent: "bg-sky-100 text-sky-700",
    viewed: "bg-sky-100 text-sky-700",
    partially_paid: "bg-orange-100 text-orange-700",
    paid: "bg-green-100 text-green-700",
    overdue: "bg-red-100 text-red-700",
    cancelled: "bg-slate-100 text-slate-500",
  };
  return (
    <span
      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        colors[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
