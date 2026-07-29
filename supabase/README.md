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
| `insights`, `simulations` | currently computed at request time; tables ready for persistence |
| storage bucket `skin-scans` | public bucket for scan images |

RLS is on for every table with owner-only policies. API routes use the
service-role key and bypass RLS; the policies constrain the browser anon key.

## 2. Environment variables

`.env` is missing `SUPABASE_SERVICE_ROLE_KEY`. Without it
`getSupabaseAdminClient()` returns `null` and every API route fails
(`"Supabase is not configured"`, 500). Add it from
Project Settings → API → `service_role`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Server-only — never expose it with a `NEXT_PUBLIC_` prefix.

## 3. Auth

Email/password sign-in must be enabled (Authentication → Providers). For the
demo, turn off email confirmation so a fresh signup gets a session immediately.
