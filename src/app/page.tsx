import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-lg font-bold text-white">
              IF
            </div>
            <span className="text-xl font-bold tracking-tight">InvoiceForge</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium sm:flex">
            <a href="#how" className="text-slate-600 hover:text-slate-900">How it works</a>
            <Link href="/login" className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800">Log in</Link>
          </nav>
          <Link href="/signup" className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 sm:hidden">
            Get Started
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-16 text-center sm:py-24">
        <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-amber-600">
          Built for South African trades
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Turn Job Notes Into <span className="text-amber-500">Paid Invoices</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          Send your voice note, photos or job details. InvoiceForge turns the mess
          into a professional invoice and helps you follow up until you're paid.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="w-full rounded-xl bg-amber-500 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-amber-500/30 hover:bg-amber-600 sm:w-auto"
          >
            Start free
          </Link>
          <Link
            href="/login"
            className="w-full rounded-xl border border-slate-300 bg-white px-8 py-4 text-lg font-semibold text-slate-800 hover:bg-slate-50 sm:w-auto"
          >
            Log in
          </Link>
        </div>
      </section>

      <section id="how" className="border-t border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">How it works</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              { step: "1", title: "Dump the job", desc: "Type notes or paste what happened. Labour, materials, call-out — as you would tell a mate." },
              { step: "2", title: "Review & approve", desc: "We extract the line items. You check, edit, and approve. Nothing goes out without your say-so." },
              { step: "3", title: "Get paid", desc: "Professional PDF invoice. Track status. Follow up when payment is late." },
            ].map((item) => (
              <div key={item.step} className="rounded-2xl border border-slate-200 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-lg font-bold text-amber-700">
                  {item.step}
                </div>
                <h3 className="mt-4 text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-900 py-16 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Stop leaving cash on the table</h2>
          <p className="mt-4 text-slate-300">Get your next job invoiced before you drive home.</p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-xl bg-amber-500 px-10 py-4 text-lg font-bold text-white hover:bg-amber-600"
          >
            Create free account
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
        <p>© {new Date().getFullYear()} InvoiceForge · Built for South African tradespeople</p>
      </footer>
    </div>
  );
}
