# Supabase setup

## 1. Apply the schema

Paste `schema.sql` into the Supabase SQL Editor and run it. It is idempotent —
safe on a fresh project and on the existing one (it backfills missing columns,
de-duplicates `user_profiles`, and adds the constraints/indexes/policies that the
original schema lacked).

Creates:

| Object | Purpose |
| --- | --- |
| `users` | mirror of `auth.users`, plus the demo user |
| `user_profiles` | one row per user (`unique (user_id)`) |
| `skin_scans` | Perfect Corp analysis results + raw responses |
| `daily_habits` | one row per user per day (`unique (user_id, log_date)`) |
| `products` | user's shelf |
| `routines` / `routine_steps` | generated AM/PM routines |
| `insights` | snapshot of generated insights, keyed `unique (user_id, insight_type, title)` |
| `simulations` | generated aging simulations |
| storage bucket `skin-scans` | public bucket for scan images |
| storage bucket `simulations` | public bucket for mirrored simulation results |

RLS is on for every table with owner-only policies. API routes use the
service-role key and bypass RLS; the policies constrain the browser anon key.

## 2. Environment variables

`.env` has no secret key. Without it `getSupabaseAdminClient()` returns `null`
and every API route fails (`"Supabase is not configured"`, 500). Add it from
Project Settings → API keys → secret (`sb_secret_…`):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
```

Server-only — never expose the secret key with a `NEXT_PUBLIC_` prefix.

Both key generations work. `lib/supabase/client.ts` reads
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and falls back to
`NEXT_PUBLIC_SUPABASE_ANON_KEY`; `lib/supabase/admin.ts` reads
`SUPABASE_SECRET_KEY` and falls back to `SUPABASE_SERVICE_ROLE_KEY`.

## 3. Auth

Email/password sign-in must be enabled (Authentication → Providers). For the
demo, turn off email confirmation so a fresh signup gets a session immediately.
