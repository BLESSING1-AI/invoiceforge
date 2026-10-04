"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    businessName: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-xl font-bold text-white">
            IF
          </div>
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">
            Start turning job notes into paid invoices
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Your name</label>
            <input
              required
              type="text"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Business name</label>
            <input
              required
              type="text"
              placeholder="e.g. Mokoena Plumbing"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              required
              type="email"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input
              required
              type="password"
              minLength={6}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-amber-500 py-3 font-bold text-white hover:bg-amber-600 disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create free account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-amber-600 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
