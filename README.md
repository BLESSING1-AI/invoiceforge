# InvoiceForge

**Turn job notes into paid invoices.**

Built for South African tradespeople — plumbers, electricians, HVAC technicians, handymen, builders and small service businesses.

## Core product loop

```
Job information
  → AI / rule-based extraction
  → Structured job + line items
  → Owner reviews & approves
  → Professional invoice (PDF coming)
  → Customer delivery (email/WhatsApp)
  → Payment tracking
  → Payment chasing
```

## What works today

- Landing page (mobile-first, trades-focused)
- Sign up / Login / Session (cookie-based)
- Multi-tenant business isolation
- Dashboard with outstanding money as the primary metric
- Job intake via free-text notes
- Rule-based job extraction (customer, labour, materials, call-out, prices)
- Missing-field detection (never invents prices)
- Job review + approve flow
- Invoice numbering + status (DRAFT → SENT)
- Price memory per business
- Audit log on every job
- Hybrid storage (filesystem locally, in-memory on Vercel serverless)

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS 4**
- Cookie session auth
- Modular AI extraction layer (ready for real LLM when API key is provided)
- Modular payment-provider architecture (ready for Yoco / PayFast / Paystack)

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Environment variables (optional)

```
AI_PROVIDER=openai|anthropic|grok   # optional
AI_API_KEY=...                      # optional — falls back to rule-based extractor
```

## Current limitations

- PDF generation not yet wired (structure ready)
- Email / WhatsApp delivery mocked (status changes to `sent`)
- Payment links not yet live (provider abstraction ready)
- Photo / voice upload not yet implemented
- Storage is hybrid file/in-memory — designed to migrate cleanly to Supabase/Postgres
- Vercel project creation currently blocked (403) on this account

## Deployment

Once Vercel project creation is permitted:

1. Import `BLESSING1-AI/invoiceforge`
2. Framework: Next.js
3. Deploy

No custom domain required yet.

## Security

- Tenant isolation on every job/business query
- HttpOnly session cookies
- No API keys in client code
- Input validation on auth and job creation routes

## License

Private — all rights reserved.
