-- SkinTwin database schema.
-- Idempotent: safe to run on a fresh project or an existing one.
-- Run in Supabase SQL Editor, or: psql "$DATABASE_URL" -f supabase/schema.sql

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Mirror of auth.users. Not FK-constrained to auth.users so the demo user
-- (lib/demoUser.ts DEMO_USER_ID) can exist without a real auth identity.
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  skin_type text,
  sensitivity_level text,
  routine_experience text,
  budget_level text,
  primary_goals jsonb not null default '[]'::jsonb,
  water_goal_ml integer default 2000,
  sleep_goal_hours numeric default 7.5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.skin_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  image_url text not null,
  scan_date date not null default current_date,
  overall_score numeric,
  hydration_score numeric,
  redness_score numeric,
  acne_score numeric,
  pore_score numeric,
  texture_score numeric,
  wrinkle_score numeric,
  dark_circle_score numeric,
  pigmentation_score numeric,
  radiance_score numeric,
  oiliness_score numeric,
  top_concerns jsonb not null default '[]'::jsonb,
  facial_tone_data jsonb,
  raw_skin_analysis_response jsonb,
  raw_color_tone_response jsonb,
  is_mock boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  log_date date not null default current_date,
  water_intake_ml integer,
  sleep_hours numeric,
  used_spf boolean,
  stress_level integer check (stress_level between 1 and 5),
  exercise_minutes integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  brand text,
  category text not null,
  active_ingredients jsonb not null default '[]'::jsonb,
  usage_time text,
  frequency text,
  date_started date,
  date_stopped date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  routine_type text not null,
  version integer not null default 1,
  generated_from_scan_id uuid references public.skin_scans(id) on delete set null,
  rationale text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.routine_steps (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  step_order integer not null,
  category text not null,
  product_id uuid references public.products(id) on delete set null,
  instruction text not null,
  rationale text,
  frequency text,
  created_at timestamptz not null default now()
);

create table if not exists public.insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  insight_type text not null,
  title text not null,
  description text not null,
  evidence jsonb not null default '{}'::jsonb,
  recommended_action text,
  confidence text,
  severity text,
  related_scan_id uuid references public.skin_scans(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists public.simulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  source_scan_id uuid references public.skin_scans(id) on delete set null,
  scenario_type text not null,
  source_image_url text not null,
  simulated_image_url text not null,
  simulation_years integer not null default 20,
  scenario_description text,
  raw_api_response jsonb,
  is_mock boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Backfill for databases created from the original schema
-- ---------------------------------------------------------------------------

alter table public.skin_scans add column if not exists top_concerns jsonb default '[]'::jsonb;
alter table public.skin_scans add column if not exists facial_tone_data jsonb;
alter table public.skin_scans add column if not exists raw_skin_analysis_response jsonb;
alter table public.skin_scans add column if not exists raw_color_tone_response jsonb;
alter table public.user_profiles add column if not exists water_goal_ml integer default 2000;
alter table public.user_profiles add column if not exists sleep_goal_hours numeric default 7.5;

-- One profile row per user. GET /api/profile uses maybeSingle(), which errors
-- on duplicates; de-duplicate before adding the constraint.
delete from public.user_profiles p
using public.user_profiles keep
where p.user_id = keep.user_id
  and p.ctid <> keep.ctid
  and (keep.updated_at, keep.ctid) > (p.updated_at, p.ctid);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_profiles_user_id_key'
  ) then
    alter table public.user_profiles add constraint user_profiles_user_id_key unique (user_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Indexes (mirror the filters/orders used by app/api/*)
-- ---------------------------------------------------------------------------

create index if not exists idx_skin_scans_user_scan_date on public.skin_scans (user_id, scan_date);
create index if not exists idx_skin_scans_user_created_at on public.skin_scans (user_id, created_at desc);
create index if not exists idx_daily_habits_user_log_date on public.daily_habits (user_id, log_date);
create index if not exists idx_products_user_created_at on public.products (user_id, created_at desc);
create index if not exists idx_routines_user_active on public.routines (user_id, is_active, routine_type);
create index if not exists idx_routine_steps_routine_order on public.routine_steps (routine_id, step_order);
create index if not exists idx_insights_user_created_at on public.insights (user_id, created_at desc);
create index if not exists idx_simulations_user_created_at on public.simulations (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['users', 'user_profiles', 'daily_habits', 'products'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- All API routes go through the service-role key (lib/supabase/admin.ts), which
-- bypasses RLS. These policies exist so the browser anon key (lib/supabase/client.ts)
-- can only ever reach the signed-in user's own rows.
-- ---------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.user_profiles enable row level security;
alter table public.skin_scans enable row level security;
alter table public.daily_habits enable row level security;
alter table public.products enable row level security;
alter table public.routines enable row level security;
alter table public.routine_steps enable row level security;
alter table public.insights enable row level security;
alter table public.simulations enable row level security;

drop policy if exists "own row" on public.users;
create policy "own row" on public.users
  for all to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

do $$
declare t text;
begin
  foreach t in array array[
    'user_profiles', 'skin_scans', 'daily_habits', 'products',
    'routines', 'insights', 'simulations'
  ] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I
         for all to authenticated
         using (auth.uid() = user_id)
         with check (auth.uid() = user_id)', t);
  end loop;
end $$;

-- routine_steps has no user_id; ownership comes through its parent routine.
drop policy if exists "own rows via routine" on public.routine_steps;
create policy "own rows via routine" on public.routine_steps
  for all to authenticated
  using (exists (
    select 1 from public.routines r
    where r.id = routine_steps.routine_id and r.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.routines r
    where r.id = routine_steps.routine_id and r.user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- Storage: scan images (BUCKET in app/api/scans/route.ts)
--
-- Public bucket — POST /api/scans stores getPublicUrl() results in
-- skin_scans.image_url and the dashboard renders them without a signed URL.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('skin-scans', 'skin-scans', true)
on conflict (id) do update set public = true;

drop policy if exists "skin-scans public read" on storage.objects;
create policy "skin-scans public read" on storage.objects
  for select to public
  using (bucket_id = 'skin-scans');

-- Uploads are written by the service role at "<user_id>/scans/<file>";
-- this lets a signed-in user write their own prefix directly too.
drop policy if exists "skin-scans own folder write" on storage.objects;
create policy "skin-scans own folder write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'skin-scans'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "skin-scans own folder delete" on storage.objects;
create policy "skin-scans own folder delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'skin-scans'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Demo user seed (FK-safe inserts for the demo flow; lib/demoUser.ts)
-- ---------------------------------------------------------------------------

insert into public.users (id, email, full_name)
values ('00000000-0000-0000-0000-000000000001', 'demo@skintwin.local', 'Demo User')
on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      updated_at = now();
