-- set_logs: per-set reps/weight records linked to workout_logs
create table if not exists public.set_logs (
  id               uuid          primary key default gen_random_uuid(),
  user_id          uuid          not null references auth.users(id) on delete cascade,
  workout_log_id   uuid          not null references public.workout_logs(id) on delete cascade,
  exercise_id      text          not null,
  exercise_name    text          not null,
  set_number       int           not null check (set_number >= 1),
  reps             int           not null check (reps >= 0),
  weight_kg        numeric(6,2)  not null default 0 check (weight_kg >= 0),
  completed        boolean       not null default true,
  logged_at        timestamptz   not null default now()
);

alter table public.set_logs enable row level security;

create policy "Users manage own set_logs"
  on public.set_logs
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Fast per-exercise history lookups
create index if not exists set_logs_user_exercise_idx
  on public.set_logs (user_id, exercise_id, logged_at desc);
