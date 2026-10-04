"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Job, LineItem } from "@/lib/types";

function formatR(n: number) {
  return "R " + n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function JobReview({
  job: initialJob,
  isVatRegistered,
  businessName,
}: {
  job: Job;
  isVatRegistered: boolean;
  businessName: string;
}) {
  const router = useRouter();
  const [job, setJob] = useState(initialJob);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(
    initialJob.status === "pending_approval" || initialJob.status === "draft"
  );
  const [showEmail, setShowEmail] = useState(false);
  const [emailTo, setEmailTo] = useState(initialJob.customer.email || "");
  const [emailMsg, setEmailMsg] = useState("");
  const [emailing, setEmailing] = useState(false);
  const [emailConfigured, setEmailConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`/api/jobs/${initialJob.id}/email`)
      .then((r) => r.json())
      .then((d) => setEmailConfigured(Boolean(d.configured)))
      .catch(() => setEmailConfigured(false));
  }, [initialJob.id]);

  const canDownload = ["approved", "sent", "viewed", "partially_paid", "paid", "overdue"].includes(job.status);
  const isSent = ["sent", "viewed", "partially_paid", "paid", "overdue"].includes(job.status);

  function updateCustomer(field: string, value: string) {
    setJob((j) => ({ ...j, customer: { ...j.customer, [field]: value } }));
  }

  function updateLineItem(id: string, field: keyof LineItem, value: string | number) {
    setJob((j) => {
      const lineItems = j.lineItems.map((li) => {
        if (li.id !== id) return li;
        const updated = { ...li, [field]: value };
        if (field === "quantity" || field === "unitPrice") {
          updated.total = Math.round(Number(updated.quantity) * Number(updated.unitPrice) * 100) / 100;
        }
        return updated;
      });
      const subtotal = lineItems.reduce((s, li) => s + li.total, 0);
      const vatRate = isVatRegistered ? j.vatRate : 0;
      const vatAmount = Math.round(subtotal * vatRate * 100) / 100;
      return { ...j, lineItems, subtotal, vatAmount, total: subtotal + vatAmount };
    });
  }

  function addLineItem() {
    setJob((j) => ({
      ...j,
      lineItems: [...j.lineItems, { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0, total: 0, type: "other" as const }],
    }));
  }

  function removeLineItem(id: string) {
    setJob((j) => {
      const lineItems = j.lineItems.filter((li) => li.id !== id);
      const subtotal = lineItems.reduce((s, li) => s + li.total, 0);
      const vatRate = isVatRegistered ? j.vatRate : 0;
      const vatAmount = Math.round(subtotal * vatRate * 100) / 100;
      return { ...j, lineItems, subtotal, vatAmount, total: subtotal + vatAmount };
    });
  }

  async function saveChanges() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer: job.customer, lineItems: job.lineItems, notes: job.notes }),
      });
      const data = await res.json();
      if (!res.ok) setMessage(data.error || "Save failed");
      else { setJob(data); setMessage("Saved"); setTimeout(() => setMessage(""), 2000); }
    } catch { setMessage("Network error"); }
    setSaving(false);
  }

  async function approveInvoice() {
    setApproving(true);
    setMessage("");
    await saveChanges();
    try {
      const res = await fetch(`/api/jobs/${job.id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setMessage(data.error || "Approve failed"); setApproving(false); return; }
      setMessage(`Invoice ${data.invoiceNumber} approved — ready to email or download`);
      const refreshed = await fetch(`/api/jobs/${job.id}`);
      if (refreshed.ok) setJob(await refreshed.json());
      setEditing(false);
      router.refresh();
    } catch { setMessage("Network error"); }
    setApproving(false);
  }

  function downloadPdf() { window.open(`/api/jobs/${job.id}/pdf`, "_blank"); }

  async function sharePdf() {
    const url = `${window.location.origin}/api/jobs/${job.id}/pdf`;
    if (navigator.share) {
      try { await navigator.share({ title: `Invoice ${job.invoiceNumber}`, text: `Invoice from ${businessName}`, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      setMessage("PDF link copied to clipboard");
      setTimeout(() => setMessage(""), 2000);
    }
  }

  async function sendEmail() {
    setEmailing(true);
    setMessage("");
    try {
      const res = await fetch(`/api/jobs/${job.id}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: emailTo, message: emailMsg || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.configured === false
          ? "Email not configured — set RESEND_API_KEY on the server"
          : (data.error || "Email failed — try again"));
        setEmailing(false);
        return;
      }
      setMessage(`Invoice sent successfully to ${data.to}`);
      setShowEmail(false);
      const refreshed = await fetch(`/api/jobs/${job.id}`);
      if (refreshed.ok) setJob(await refreshed.json());
      router.refresh();
    } catch { setMessage("Network error"); }
    setEmailing(false);
  }

  return (
    <div className="space-y-5">
      {job.missingFields.length > 0 && editing && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Review needed:</strong> {job.missingFields.join(", ").replace(/_/g, " ")}
        </div>
      )}

      {canDownload && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-center">
          <p className="font-semibold text-sky-800">
            Invoice {job.invoiceNumber} · {job.status.replace("_", " ")}
            {job.emailDeliveryStatus === "sent" && job.lastEmailTo ? ` · emailed to ${job.lastEmailTo}` : ""}
          </p>
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Customer</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(["name", "phone", "email", "address"] as const).map((field) => (
            <div key={field}>
              <label className="text-xs text-slate-500">{field.charAt(0).toUpperCase() + field.slice(1)}</label>
              {editing ? (
                <input className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={(job.customer as Record<string, string | undefined>)[field] || ""}
                  onChange={(e) => updateCustomer(field, e.target.value)} />
              ) : (
                <p className="font-medium">{(job.customer as Record<string, string | undefined>)[field] || "—"}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Line items</h2>
          {editing && (
            <button type="button" onClick={addLineItem} className="text-sm font-semibold text-amber-600">+ Add item</button>
          )}
        </div>
        <div className="mt-3 space-y-4">
          {job.lineItems.length === 0 && <p className="text-sm text-slate-500">No items yet</p>}
          {job.lineItems.map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-100 p-3">
              {editing ? (
                <div className="space-y-2">
                  <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Description"
                    value={item.description} onChange={(e) => updateLineItem(item.id, "description", e.target.value)} />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-slate-500">Qty</label>
                      <input type="number" min="0" step="0.5" className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        value={item.quantity} onChange={(e) => updateLineItem(item.id, "quantity", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Unit price</label>
                      <input type="number" min="0" step="0.01" className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        value={item.unitPrice} onChange={(e) => updateLineItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Total</label>
                      <p className="mt-1 font-bold">{formatR(item.total)}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => removeLineItem(item.id)} className="text-xs text-red-600">Remove</button>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-xs text-slate-500">{item.quantity} × {formatR(item.unitPrice)}</p>
                  </div>
                  <p className="font-bold">{formatR(item.total)}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1 border-t border-slate-200 pt-4 text-sm">
          <div className="flex justify-between"><span className="text-slate-600">Subtotal</span><span>{formatR(job.subtotal)}</span></div>
          {job.vatRate > 0 && (
            <div className="flex justify-between"><span className="text-slate-600">VAT ({(job.vatRate * 100).toFixed(0)}%)</span><span>{formatR(job.vatAmount)}</span></div>
          )}
          <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{formatR(job.total)}</span></div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Original notes</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{job.rawInput}</p>
      </section>

      <div className="space-y-3 pb-10">
        {editing && (
          <>
            <button onClick={saveChanges} disabled={saving}
              className="w-full rounded-xl border border-slate-300 bg-white py-3 font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60">
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button onClick={approveInvoice} disabled={approving || job.lineItems.length === 0}
              className="w-full rounded-xl bg-amber-500 py-4 text-lg font-bold text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600 disabled:opacity-60">
              {approving ? "Processing..." : "Approve Invoice"}
            </button>
            <p className="text-center text-xs text-slate-500">
              Approval assigns an invoice number. Email only sends when you choose Email Invoice.
            </p>
          </>
        )}

        {canDownload && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={downloadPdf} className="flex-1 rounded-xl bg-amber-500 py-3.5 font-bold text-white hover:bg-amber-600">Download PDF</button>
              <button onClick={sharePdf} className="flex-1 rounded-xl border border-slate-300 bg-white py-3.5 font-semibold text-slate-800 hover:bg-slate-50">Share</button>
            </div>
            <button onClick={() => { setEmailTo(job.customer.email || job.lastEmailTo || ""); setShowEmail(true); }}
              className="w-full rounded-xl border-2 border-amber-400 bg-amber-50 py-3.5 font-bold text-amber-800 hover:bg-amber-100">
              Email Invoice
            </button>
            {emailConfigured === false && (
              <p className="text-center text-xs text-slate-500">Email not configured on server (RESEND_API_KEY required)</p>
            )}
            {isSent && job.lastEmailTo && (
              <p className="text-center text-xs text-green-700">
                Last emailed to {job.lastEmailTo}
                {job.lastEmailAt ? ` · ${new Date(job.lastEmailAt).toLocaleString("en-ZA")}` : ""}
              </p>
            )}
          </div>
        )}

        {message && <p className="rounded-lg bg-slate-100 px-3 py-2 text-center text-sm">{message}</p>}
      </div>

      {showEmail && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold">Email Invoice</h3>
            <p className="mt-1 text-sm text-slate-500">{job.invoiceNumber} · {formatR(job.total)}</p>
            {emailConfigured === false ? (
              <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                <strong>Email not configured.</strong>
                <p className="mt-1">Set <code className="rounded bg-amber-100 px-1">RESEND_API_KEY</code> on the server, then try again.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Customer email</label>
                  <input type="email" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                    value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="customer@email.com" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Message (optional)</label>
                  <textarea rows={3} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={emailMsg} onChange={(e) => setEmailMsg(e.target.value)} placeholder="Thank you for your business..." />
                </div>
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowEmail(false)} className="flex-1 rounded-xl border border-slate-300 py-3 font-semibold text-slate-700">Cancel</button>
              {emailConfigured !== false && (
                <button onClick={sendEmail} disabled={emailing || !emailTo.includes("@")}
                  className="flex-1 rounded-xl bg-amber-500 py-3 font-bold text-white hover:bg-amber-600 disabled:opacity-60">
                  {emailing ? "Sending..." : "Send"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
