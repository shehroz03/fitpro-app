-- ============================================================================
-- FitCore Pro — Phase 2 data tables (workouts, nutrition, sleep, goals, body)
-- Run AFTER supabase-schema.sql, in: Supabase Dashboard → SQL Editor → Run
-- ============================================================================

-- Streak bookkeeping lives on the profile
alter table public.profiles add column if not exists last_activity_date text;

-- ── WORKOUT LOGS ────────────────────────────────────────────────────────────
create table if not exists public.workout_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  plan_id         text,
  name            text,
  category        text,
  started_at      timestamptz,
  ended_at        timestamptz,
  duration_min    int     default 0,
  calories_burned int     default 0,
  avg_heart_rate  int,
  notes           text,
  rating          int,
  sets            jsonb   default '[]'::jsonb,
  created_at      timestamptz default now()
);

-- ── MEAL LOGS ───────────────────────────────────────────────────────────────
create table if not exists public.meal_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  food_id     text,
  food_name   text,
  brand       text,
  meal_type   text,
  quantity_g  numeric,
  logged_at   text,            -- 'YYYY-MM-DD'
  calories    numeric,
  protein_g   numeric,
  carbs_g     numeric,
  fat_g       numeric,
  notes       text,
  created_at  timestamptz default now()
);

-- ── WATER LOGS ──────────────────────────────────────────────────────────────
create table if not exists public.water_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  amount_ml  int,
  logged_at  timestamptz default now()
);

-- ── SLEEP LOGS ──────────────────────────────────────────────────────────────
create table if not exists public.sleep_logs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  sleep_start    timestamptz,
  sleep_end      timestamptz,
  duration_min   int,
  deep_sleep_min int,
  rem_sleep_min  int,
  quality_score  int,
  notes          text,
  created_at     timestamptz default now()
);

-- ── GOALS ───────────────────────────────────────────────────────────────────
create table if not exists public.goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  type          text,
  title         text,
  description   text,
  target_value  numeric,
  current_value numeric default 0,
  unit          text,
  target_date   text,
  status        text default 'active',
  completed_at  timestamptz,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── BODY MEASUREMENTS ───────────────────────────────────────────────────────
create table if not exists public.body_measurements (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  weight_kg      numeric,
  body_fat_pct   numeric,
  muscle_mass_kg numeric,
  bmi            numeric,
  chest_cm       numeric,
  waist_cm       numeric,
  hips_cm        numeric,
  notes          text,
  measured_at    text,
  created_at     timestamptz default now()
);

-- ── Row Level Security: each user sees only their own rows ───────────────────
do $$
declare t text;
begin
  foreach t in array array['workout_logs','meal_logs','water_logs','sleep_logs','goals','body_measurements']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;
