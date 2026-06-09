const { v4: uuidv4 } = require('uuid');
const { mem } = require('../config/database');
const { ok, err, paginated, wrap } = require('../utils/response');

// ── GET ALL PLANS ─────────────────────────────────────────────
const getWorkoutPlans = wrap(async (req, res) => {
  const { category, difficulty, search, page = 1, limit = 10 } = req.query;
  let plans = [...mem.workout_plans];
  if (category)   plans = plans.filter(p => p.category === category);
  if (difficulty) plans = plans.filter(p => p.difficulty === difficulty);
  if (search)     plans = plans.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const total = plans.length;
  const data  = plans.slice((page - 1) * limit, page * limit);
  paginated(res, data, total, page, limit);
});

// ── GET SINGLE PLAN ───────────────────────────────────────────
const getWorkoutPlan = wrap(async (req, res) => {
  const plan = mem.workout_plans.find(p => p.id === req.params.id);
  if (!plan) return err(res, 'Workout plan not found', 404);
  const exercises = (plan.exercises || [])
    .map(eid => mem.exercises.find(e => e.id === eid))
    .filter(Boolean);
  ok(res, { ...plan, exercises });
});

// ── GET EXERCISES ─────────────────────────────────────────────
const getExercises = wrap(async (req, res) => {
  const { category, difficulty, search, page = 1, limit = 20 } = req.query;
  let list = [...mem.exercises];
  if (category)   list = list.filter(e => e.category === category);
  if (difficulty) list = list.filter(e => e.difficulty === difficulty);
  if (search)     list = list.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));
  paginated(res, list.slice((page - 1) * limit, page * limit), list.length, page, limit);
});

// ── LOG WORKOUT ───────────────────────────────────────────────
const logWorkout = wrap(async (req, res) => {
  const { plan_id, name, category, started_at, ended_at, duration_min,
          calories_burned, avg_heart_rate, notes, rating, sets } = req.body;
  if (!started_at) return err(res, 'started_at is required', 400);

  const log = {
    id: uuidv4(), user_id: req.user.id,
    plan_id: plan_id || null, name: name || 'Custom Workout',
    category: category || 'strength',
    started_at, ended_at: ended_at || new Date().toISOString(),
    duration_min: duration_min || 0, calories_burned: calories_burned || 0,
    avg_heart_rate: avg_heart_rate || null,
    notes: notes || null, rating: rating || null,
    sets: sets || [], created_at: new Date().toISOString(),
  };

  mem.workout_logs.push(log);

  // Update streak
  const user     = mem.users.find(u => u.id === req.user.id);
  const today    = new Date().toDateString();
  const lastAct  = user.last_activity_date;
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  if (lastAct === today) {
    // already logged today, no change
  } else if (lastAct === yesterday) {
    user.current_streak = (user.current_streak || 0) + 1;
  } else {
    user.current_streak = 1;
  }
  user.last_activity_date = today;
  user.longest_streak = Math.max(user.longest_streak || 0, user.current_streak);

  ok(res, log, 'Workout logged successfully', 201);
});

// ── GET HISTORY ───────────────────────────────────────────────
const getWorkoutHistory = wrap(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const logs = mem.workout_logs
    .filter(l => l.user_id === req.user.id)
    .sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
  paginated(res, logs.slice((page - 1) * limit, page * limit), logs.length, page, limit);
});

// ── GET WORKOUT LOG DETAIL ────────────────────────────────────
const getWorkoutLogDetail = wrap(async (req, res) => {
  const log = mem.workout_logs.find(l => l.id === req.params.id && l.user_id === req.user.id);
  if (!log) return err(res, 'Workout log not found', 404);
  ok(res, log);
});

// ── DELETE LOG ────────────────────────────────────────────────
const deleteWorkoutLog = wrap(async (req, res) => {
  const idx = mem.workout_logs.findIndex(l => l.id === req.params.id && l.user_id === req.user.id);
  if (idx === -1) return err(res, 'Workout log not found', 404);
  mem.workout_logs.splice(idx, 1);
  ok(res, null, 'Workout log deleted');
});

module.exports = { getWorkoutPlans, getWorkoutPlan, getExercises, logWorkout, getWorkoutHistory, getWorkoutLogDetail, deleteWorkoutLog };
