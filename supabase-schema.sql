-- ============================================================================
-- FitCore Pro — Supabase schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → paste → Run
-- ============================================================================

-- ── PROFILES (mirrors auth.users, holds all extra fitness fields) ───────────
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text,
  full_name       text,
  gender          text,
  date_of_birth   date,
  phone           text,
  is_active       boolean default true,
  is_premium      boolean default false,
  is_verified     boolean default false,
  unit_system     text default 'metric',
  timezone        text default 'Asia/Karachi',
  height_cm       numeric,
  weight_kg       numeric,
  body_fat_pct    numeric,
  muscle_mass_kg  numeric,
  bmi             numeric,
  fitness_level   text default 'beginner',
  bio             text,
  avatar_url      text,
  current_streak  int default 0,
  longest_streak  int default 0,
  target_calories int default 2200,
  target_protein  int default 150,
  target_carbs    int default 220,
  target_fat      int default 70,
  target_water    int default 2500,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── Auto-create a profile row whenever a new auth user signs up ─────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Row Level Security: each user can only see/edit their own profile ────────
alter table public.profiles enable row level security;

drop policy if exists "own profile select" on public.profiles;
create policy "own profile select" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles
  for insert with check (auth.uid() = id);
