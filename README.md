# InvoiceForge

**Turn job notes into paid invoices.**

Built for South African tradespeople — plumbers, electricians, HVAC, handymen, builders and small service businesses.

## Core product loop

```
Job notes → Extract → Review/Edit → Approve → Invoice PDF → Track payment
```

## What works

- Landing page (mobile-first)
- Sign up / Login / cookie sessions
- Multi-tenant business isolation
- Dashboard with **Money still outstanding** as primary metric
- Natural-language job intake
- Rule-based extraction (customer, labour, materials, call-out, prices)
- Never invents prices or customers
- Full editable review screen (customer + line items + totals)
- Server-side total recalculation
- Approve & mark as sent
- Invoice numbering + price memory per business
- **Real server-side PDF generation** (pure TypeScript, no external deps)
- PDF download + native share
- Audit log
- Hybrid storage (filesystem local / in-memory serverless)

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS 4
- Cookie session auth
- Modular AI extraction (ready for real LLM)
- Pure-TS PDF engine

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Environment variables (optional)

```
AI_PROVIDER=openai|anthropic|grok
AI_API_KEY=...
```

Without an AI key the rule-based extractor is used.

## Current limitations

- Email / WhatsApp delivery mocked (status → `sent`)
- Payment links not yet live
- Photo / voice upload not yet implemented
- Storage is hybrid file/in-memory — designed to migrate to Supabase/Postgres
- Vercel project creation currently blocked (403) on this account

## Security

- Tenant isolation on every job/business/PDF query
- HttpOnly session cookies
- No API keys in client code
- Server-side authorization before PDF generation

## License

Private — all rights reserved.
