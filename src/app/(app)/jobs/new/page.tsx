"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewJobPage() {
  const router = useRouter();
  const [rawInput, setRawInput] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rawInput.trim()) {
      setError("Please describe the job");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawInput,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create job");
        setLoading(false);
        return;
      }
      router.push(`/jobs/${data.jobId}`);
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <Link href="/dashboard" className="text-sm font-medium text-slate-600">
            ← Dashboard
          </Link>
          <span className="font-bold">New Job</span>
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold">What did you do?</h1>
        <p className="mt-1 text-slate-600">
          Dump the details as you would tell a mate. We&apos;ll extract the invoice info for you to check.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Job notes (required)
            </label>
            <textarea
              required
              rows={7}
              placeholder={`Example:\nJohn came today for leaking kitchen pipe. Address 14 Oak Street. Labour R850. Materials R420. Call-out R150. Send invoice.`}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Customer name (optional)
              </label>
              <input
                type="text"
                placeholder="If not in the notes"
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Phone (optional)
              </label>
              <input
                type="tel"
                placeholder="082 123 4567"
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-amber-500 py-4 text-lg font-bold text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600 disabled:opacity-60"
          >
            {loading ? "Extracting..." : "Extract & Review"}
          </button>
        </form>
      </main>
    </div>
  );
}
