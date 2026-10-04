"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function JobActions({
  jobId,
  status,
}: {
  jobId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function approveAndSend() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/jobs/${jobId}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Failed");
        setLoading(false);
        return;
      }
      setMessage("Invoice approved and marked as sent (email delivery mocked)");
      router.refresh();
    } catch {
      setMessage("Network error");
    }
    setLoading(false);
  }

  if (status === "sent" || status === "paid" || status === "overdue") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
        <p className="font-semibold text-green-800">
          Invoice has been {status}
        </p>
        <p className="mt-1 text-sm text-green-700">
          Check the dashboard for payment status.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={approveAndSend}
        disabled={loading}
        className="w-full rounded-xl bg-amber-500 py-4 text-lg font-bold text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600 disabled:opacity-60"
      >
        {loading ? "Processing..." : "Approve & Send Invoice"}
      </button>
      <p className="text-center text-xs text-slate-500">
        Nothing is sent without your approval. Email delivery is currently mocked for the MVP.
      </p>
      {message && (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-center text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
