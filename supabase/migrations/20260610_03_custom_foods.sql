-- ============================================================================
-- FitCore Pro — custom_foods table
-- Run in: Supabase Dashboard → SQL Editor → Run
-- ============================================================================

create table if not exists public.custom_foods (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  brand          text,
  serving_size_g numeric default 100,
  calories       numeric default 0,
  protein_g      numeric default 0,
  carbs_g        numeric default 0,
  fat_g          numeric default 0,
  created_at     timestamptz default now()
);

alter table public.custom_foods enable row level security;
drop policy if exists "own rows" on public.custom_foods;
create policy "own rows" on public.custom_foods
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
