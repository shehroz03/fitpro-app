/**
 * Pure progressive overload engine.
 * No side effects, no imports — safe to unit-test in isolation.
 *
 * sessions: array from getExerciseHistory(), index 0 = most recent.
 *   Each session: { workout_log_id, logged_at, sets: [{set_number,reps,weight_kg}] }
 *
 * Returns one of:
 *   { type:'baseline' }
 *   { type:'increase',  suggestedWeight, suggestedReps, lastWeight, lastReps }
 *   { type:'deload',    suggestedWeight, suggestedReps, lastWeight, lastReps }
 *   { type:'maintain',  suggestedWeight, suggestedReps, lastWeight, lastReps }
 */
export function computeProgressionSuggestion(sessions, targetSets, targetReps) {
  if (!sessions || sessions.length === 0) {
    return { type: 'baseline', message: 'Log your first session to start tracking' };
  }

  const tSets = targetSets || 3;
  const tReps = targetReps || 0; // 0 = timed exercise; rep count is irrelevant

  // A session "meets target" when all sets were completed AND every set hit the rep target.
  // For timed exercises (tReps=0) only set count matters — reps are always >=0.
  const meetTarget = (session) => {
    const sets = session?.sets || [];
    if (sets.length < tSets) return false;
    if (tReps === 0) return true;
    return sets.every(s => (s.reps || 0) >= tReps);
  };

  // Distinguish an "incomplete session" (user cut it short — not a failure signal)
  // from a "genuine failure" (enough sets attempted but rep target not met).
  // Rule: if fewer than half the target sets were logged → incomplete, not failure.
  const isGenuineFailure = (session) => {
    const sets = session?.sets || [];
    if (sets.length < Math.ceil(tSets / 2)) return false; // too few sets — incomplete
    return !meetTarget(session);
  };

  const last     = sessions[0];
  const prev     = sessions[1] ?? null;
  const lastSets = last?.sets || [];

  // Bodyweight: every set in the last session logged weight=0 / null
  const isBodyweight = lastSets.length === 0 || lastSets.every(s => !(+s.weight_kg));

  // Average reps across last session's sets
  const lastReps = lastSets.length > 0
    ? Math.round(lastSets.reduce((sum, s) => sum + (s.reps || 0), 0) / lastSets.length)
    : tReps;

  // Use the final set's weight (user may have ramped up within a session)
  const lastWeight = isBodyweight ? 0 : +(lastSets[lastSets.length - 1]?.weight_kg || 0);

  // Guard: inconsistent weight data — some sets have weight, some don't
  if (!isBodyweight) {
    const weights = lastSets.map(s => +(s.weight_kg || 0));
    if (weights.some(w => w === 0)) {
      const best = Math.max(...weights);
      return { type: 'maintain', suggestedWeight: best, suggestedReps: tReps, lastWeight: best, lastReps };
    }
  }

  // ── Rule: Deload ──────────────────────────────────────────────────────────
  // Two consecutive GENUINE failures (not just incomplete sessions).
  if (isGenuineFailure(last) && prev && isGenuineFailure(prev)) {
    if (!isBodyweight && lastWeight > 0) {
      const suggestedWeight = Math.round(lastWeight * 0.9 * 10) / 10;
      return { type: 'deload', suggestedWeight, suggestedReps: tReps, lastWeight, lastReps };
    }
    // Bodyweight: −1 rep, floor of 1.
    // Timed exercises (tReps=0): deloading "−1 rep" makes no sense → maintain instead.
    if (tReps === 0) {
      return { type: 'maintain', suggestedWeight: 0, suggestedReps: 0, lastWeight: 0, lastReps };
    }
    return { type: 'deload', suggestedWeight: 0, suggestedReps: Math.max(1, tReps - 1), lastWeight: 0, lastReps };
  }

  // ── Rule: Increase ───────────────────────────────────────────────────────
  if (meetTarget(last)) {
    if (!isBodyweight && lastWeight > 0) {
      // Weight regression guard: if the user used LESS weight than the previous session
      // (e.g. dropped from 60kg to 40kg but still hit reps), don't reward with an increase —
      // suggest returning to the previous session's weight first.
      if (prev) {
        const prevSets   = prev.sets || [];
        const prevWeight = +(prevSets[prevSets.length - 1]?.weight_kg || 0);
        if (prevWeight > 0 && lastWeight < prevWeight) {
          return { type: 'maintain', suggestedWeight: prevWeight, suggestedReps: tReps, lastWeight, lastReps };
        }
      }
      return { type: 'increase', suggestedWeight: lastWeight + 2.5, suggestedReps: tReps, lastWeight, lastReps };
    }
    // Bodyweight / timed
    if (tReps === 0) {
      return { type: 'increase', suggestedWeight: 0, suggestedReps: 0, lastWeight: 0, lastReps };
    }
    return { type: 'increase', suggestedWeight: 0, suggestedReps: lastReps + 1, lastWeight: 0, lastReps };
  }

  // ── Rule: Maintain (partial completion, one failure, etc.) ───────────────
  return { type: 'maintain', suggestedWeight: lastWeight, suggestedReps: lastReps, lastWeight, lastReps };
}
