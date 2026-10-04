# InvoiceForge

**Turn job notes into paid invoices.**

Built for South African tradespeople (plumbers, electricians, HVAC, handymen).

## Core loop

JOB → AI understands it → Invoice → Owner approves → Customer receives it → Customer pays → System tracks payment → Follow-up if unpaid

## Stack

- Next.js 15 + TypeScript + Tailwind
- File/in-memory hybrid store (ready for Supabase swap)
- Cookie session auth
- Modular AI extraction

## Run locally

```bash
npm install
npm run dev
```

## Deploy

Connected to Vercel from this repository.
