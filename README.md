# InvoiceForge

**Turn job notes into paid invoices.**

Built for South African tradespeople — plumbers, electricians, HVAC, handymen, builders and small service businesses.

## Core product loop

```
Job notes → Extract → Review/Edit → Approve → PDF → Email customer → Track payment
```

## What works

- Landing, signup, login, dashboard
- Multi-tenant isolation (server-side `business_id` checks)
- Natural-language job intake + rule-based extraction
- Editable review, invoice numbering, price memory
- Real server-side PDF generation
- Email Invoice via Resend (no fake success)
- **Postgres persistence** when `DATABASE_URL` is set
  - Schema: `migrations/001_init.sql`
  - Fallback: hybrid file/memory store without `DATABASE_URL`

## Stack

- Next.js 15 + TypeScript + Tailwind 4
- `pg` + store facade (`store.ts` → memory | postgres)
- EmailProvider (Resend)

## Database setup

1. Create a Supabase (or any Postgres) project
2. Run `migrations/001_init.sql` in the SQL editor
3. Set:

```bash
DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres
DATABASE_SSL=true
```

See `migrations/README.md`.

## Local development

```bash
npm install
npm run dev
```

Without `DATABASE_URL`, data is local-only (not multi-instance safe).

## Environment variables

```bash
DATABASE_URL=
DATABASE_SSL=true
RESEND_API_KEY=
EMAIL_FROM="InvoiceForge <onboarding@resend.dev>"
AI_PROVIDER=
AI_API_KEY=
```

## Limitations

- Postgres path not live-tested without your credentials
- Vercel deploy requires project-create permission + env vars
- Payment links / WhatsApp not built yet

## License

Private — all rights reserved.
