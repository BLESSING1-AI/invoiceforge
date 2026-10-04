# InvoiceForge

**Turn job notes into paid invoices.**

Built for South African tradespeople — plumbers, electricians, HVAC, handymen, builders and small service businesses.

## Core product loop

```
Job notes → Extract → Review/Edit → Approve → PDF → Email customer → Track payment
```

## What works

- Landing, signup, login, dashboard
- Multi-tenant isolation
- Natural-language job intake + rule-based extraction
- Editable review (customer, line items, totals)
- Approve assigns invoice number (does **not** fake email)
- Real server-side PDF generation
- **Email Invoice** via Resend provider abstraction
  - Never reports "sent" unless provider accepts the message
  - Email event audit log
  - Clear "Email not configured" when `RESEND_API_KEY` is missing
- Price memory per business

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind 4
- Cookie sessions
- Modular AI extraction + EmailProvider (Resend first)
- Hybrid storage (local FS / serverless memory) — ready for Supabase

## Local development

```bash
npm install
npm run dev
```

## Environment variables

```bash
# Email (required for real delivery)
RESEND_API_KEY=re_...
EMAIL_FROM="Your Business <billing@yourdomain.com>"

# Optional AI
AI_PROVIDER=openai
AI_API_KEY=

# Future Postgres/Supabase
# DATABASE_URL=
# NEXT_PUBLIC_SUPABASE_URL=
# SUPABASE_SERVICE_ROLE_KEY=
```

See `.env.example`.

## Limitations

- Without `RESEND_API_KEY`, email UI shows "Email not configured"
- Payment links / WhatsApp not built yet
- Storage is not multi-instance persistent until Supabase is wired
- Vercel project creation may require account permission

## Security

- Tenant checks on job/PDF/email routes
- No secrets in client bundles
- Email only after ownership + validation

## License

Private — all rights reserved.
