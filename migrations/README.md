# Database migrations

## Apply initial schema

```bash
# Supabase: SQL Editor → paste 001_init.sql → Run
# Or CLI:
psql "$DATABASE_URL" -f migrations/001_init.sql
```

## Enable Postgres mode

Set in `.env.local` or Vercel env:

```
DATABASE_URL=postgresql://...
DATABASE_SSL=true
```

Without `DATABASE_URL`, the app uses the hybrid file/memory store.

## Verify

After migrate + restart:

1. Sign up a new user
2. Create a job
3. Restart the server (or wait for new serverless instance)
4. Log in again — data must still be present
