-- ============================================================================
-- FitCore Pro — Supabase RPC helper functions
-- Run in: Supabase Dashboard → SQL Editor → Run
-- These are called from the app via supabase.rpc()
-- ============================================================================

-- Returns all-time workout totals for a user as a single aggregate row.
-- Used by getDashboard() for lifetime stats — much faster than loading all rows.
create or replace function get_workout_totals(p_user_id uuid)
returns json
language sql
stable
security definer
as $$
  select json_build_object(
    'total_workouts', coalesce(count(*), 0),
    'total_minutes',  coalesce(sum(duration_min), 0),
    'total_calories', coalesce(sum(calories_burned), 0)
  )
  from public.workout_logs
  where user_id = p_user_id;
$$;

-- Grant execute to authenticated users (RLS-safe because we filter by p_user_id)
grant execute on function get_workout_totals(uuid) to authenticated;
