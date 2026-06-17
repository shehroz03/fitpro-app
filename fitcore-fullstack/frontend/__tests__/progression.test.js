import { computeProgressionSuggestion } from '../src/utils/progression';

// ── helpers ────────────────────────────────────────────────────────────────
const sess  = (sets) => ({ sets });
const wSet  = (reps, weight_kg) => ({ reps, weight_kg, completed: true }); // weighted
const bwSet = (reps)            => ({ reps, weight_kg: 0, completed: true }); // bodyweight

// ── Baseline ───────────────────────────────────────────────────────────────
describe('baseline', () => {
  test('empty array → baseline', () => {
    expect(computeProgressionSuggestion([], 3, 12).type).toBe('baseline');
  });
  test('null → baseline', () => {
    expect(computeProgressionSuggestion(null, 3, 12).type).toBe('baseline');
  });
});

// ── Increase (weighted) ────────────────────────────────────────────────────
describe('increase — weighted', () => {
  test('all sets+reps met at 60kg → suggest 62.5kg', () => {
    const r = computeProgressionSuggestion(
      [sess([wSet(12,60), wSet(12,60), wSet(12,60)])],
      3, 12,
    );
    expect(r.type).toBe('increase');
    expect(r.suggestedWeight).toBe(62.5);
    expect(r.lastWeight).toBe(60);
  });

  test('reps exceeded target (15 vs 12) still triggers increase', () => {
    const r = computeProgressionSuggestion(
      [sess([wSet(15,60), wSet(15,60), wSet(15,60)])],
      3, 12,
    );
    expect(r.type).toBe('increase');
    expect(r.suggestedWeight).toBe(62.5);
  });

  test('weight regression guard: user dropped from 60→40kg but hit reps → maintain at 60kg', () => {
    const r = computeProgressionSuggestion(
      [
        sess([wSet(12,40), wSet(12,40), wSet(12,40)]), // last:  40kg ✓ reps
        sess([wSet(10,60), wSet(10,60), wSet(10,60)]), // prev:  60kg
      ],
      3, 12,
    );
    expect(r.type).toBe('maintain');
    expect(r.suggestedWeight).toBe(60); // return to previous weight
  });

  test('no previous session → no regression guard, increase fires normally', () => {
    const r = computeProgressionSuggestion(
      [sess([wSet(12,60), wSet(12,60), wSet(12,60)])],
      3, 12,
    );
    expect(r.type).toBe('increase');
    expect(r.suggestedWeight).toBe(62.5);
  });
});

// ── Increase (bodyweight) ──────────────────────────────────────────────────
describe('increase — bodyweight', () => {
  test('all sets+reps met → +1 rep, weight stays 0', () => {
    const r = computeProgressionSuggestion(
      [sess([bwSet(12), bwSet(12), bwSet(12)])],
      3, 12,
    );
    expect(r.type).toBe('increase');
    expect(r.suggestedReps).toBe(13);
    expect(r.suggestedWeight).toBe(0);
  });
});

// ── Deload ─────────────────────────────────────────────────────────────────
describe('deload', () => {
  test('2 consecutive genuine failures → deload ×0.9', () => {
    const r = computeProgressionSuggestion(
      [
        sess([wSet(8,60), wSet(8,60), wSet(8,60)]),  // last: 8 reps (target 12) ✗
        sess([wSet(9,60), wSet(9,60), wSet(9,60)]),  // prev: 9 reps             ✗
      ],
      3, 12,
    );
    expect(r.type).toBe('deload');
    expect(r.suggestedWeight).toBe(54); // 60 × 0.9
  });

  test('1 failure then 1 success → maintain (NOT deload)', () => {
    const r = computeProgressionSuggestion(
      [
        sess([wSet(8,60), wSet(8,60), wSet(8,60)]),   // last: failed
        sess([wSet(12,60), wSet(12,60), wSet(12,60)]),// prev: succeeded ✓
      ],
      3, 12,
    );
    expect(r.type).toBe('maintain');
  });

  test('1 success then 1 failure → maintain (NOT deload)', () => {
    const r = computeProgressionSuggestion(
      [
        sess([wSet(12,60), wSet(12,60), wSet(12,60)]),// last: succeeded ✓
        sess([wSet(8,60), wSet(8,60), wSet(8,60)]),   // prev: failed
      ],
      3, 12,
    );
    // last session met target → increase (with weight check since prev=60=last=60 → ok)
    expect(r.type).toBe('increase');
  });

  test('bodyweight: 2 genuine failures → deload −1 rep', () => {
    const r = computeProgressionSuggestion(
      [
        sess([bwSet(8), bwSet(8), bwSet(8)]),
        sess([bwSet(9), bwSet(9), bwSet(9)]),
      ],
      3, 12,
    );
    expect(r.type).toBe('deload');
    expect(r.suggestedReps).toBe(11); // 12 - 1
  });

  test('bodyweight deload floor: suggestedReps never below 1', () => {
    const r = computeProgressionSuggestion(
      [
        sess([bwSet(1), bwSet(1), bwSet(1)]),
        sess([bwSet(1), bwSet(1), bwSet(1)]),
      ],
      3, 2, // target is 2 reps
    );
    expect(r.type).toBe('deload');
    expect(r.suggestedReps).toBeGreaterThanOrEqual(1);
    expect(r.suggestedReps).toBe(1); // 2-1=1, floor holds
  });
});

// ── Incomplete session is NOT a failure ────────────────────────────────────
describe('incomplete vs failed', () => {
  test('session with <50% of target sets is incomplete, not failure → no deload', () => {
    const r = computeProgressionSuggestion(
      [
        sess([wSet(12,60)]),                          // last: 1/3 sets (incomplete < 50%)
        sess([wSet(8,60), wSet(8,60), wSet(8,60)]),  // prev: genuine failure
      ],
      3, 12,
    );
    // last is incomplete → not a genuine failure → deload condition not met
    expect(r.type).not.toBe('deload');
  });

  test('session with exactly 50% sets (ceil(3/2)=2) counts as genuine failure', () => {
    const r = computeProgressionSuggestion(
      [
        sess([wSet(8,60), wSet(8,60)]),              // last: 2/3 sets, reps failed ← ceil(3/2)=2
        sess([wSet(8,60), wSet(8,60), wSet(8,60)]), // prev: 3/3 sets, reps failed
      ],
      3, 12,
    );
    expect(r.type).toBe('deload');
  });
});

// ── Timed exercises (targetReps = 0) ──────────────────────────────────────
describe('timed exercises', () => {
  test('completed all sets → increase', () => {
    const r = computeProgressionSuggestion(
      [sess([bwSet(0), bwSet(0), bwSet(0)])],
      3, 0,
    );
    expect(r.type).toBe('increase');
  });

  test('2 consecutive incomplete timed sessions → maintain (not deload with reps=-1)', () => {
    const r = computeProgressionSuggestion(
      [
        sess([bwSet(0), bwSet(0)]),  // 2/3 sets (genuine failure — 2 >= ceil(3/2)=2)
        sess([bwSet(0), bwSet(0)]),
      ],
      3, 0,
    );
    // timed deload → maintain (not "try −1 reps")
    expect(r.type).toBe('maintain');
    expect(r.suggestedReps).toBe(0);
  });
});

// ── Inconsistent weight data ───────────────────────────────────────────────
describe('inconsistent weight data', () => {
  test('some sets weight=0 in a weighted session → maintain with best weight', () => {
    const r = computeProgressionSuggestion(
      [sess([wSet(12,60), wSet(12,0), wSet(12,60)])],
      3, 12,
    );
    expect(r.type).toBe('maintain');
    expect(r.suggestedWeight).toBe(60);
  });
});

// ── Maintain ───────────────────────────────────────────────────────────────
describe('maintain', () => {
  test('partial reps (hit some but not all sets) → maintain', () => {
    const r = computeProgressionSuggestion(
      [sess([wSet(12,60), wSet(8,60), wSet(8,60)])], // last set failed target
      3, 12,
    );
    expect(r.type).toBe('maintain');
    expect(r.lastWeight).toBe(60);
  });
});
