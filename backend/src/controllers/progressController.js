const { v4: uuidv4 } = require('uuid');
const { mem } = require('../config/database');
const { ok, err, wrap } = require('../utils/response');

// ══════════════════════════════════════════
//  PROGRESS / DASHBOARD
// ══════════════════════════════════════════
const getDashboardStats = wrap(async (req, res) => {
  const userId = req.user.id;
  const user   = mem.users.find(u => u.id === userId);

  const myLogs = mem.workout_logs.filter(l => l.user_id === userId);
  const totalWorkouts  = myLogs.length;
  const totalMinutes   = myLogs.reduce((s, l) => s + (l.duration_min || 0), 0);
  const totalCalories  = myLogs.reduce((s, l) => s + (l.calories_burned || 0), 0);

  // Last 7 days
  const weekly = [];
  for (let i = 6; i >= 0; i--) {
    const d    = new Date(Date.now() - i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    const day  = myLogs.filter(l => (l.started_at||'').startsWith(dateStr));
    weekly.push({
      date: dateStr,
      day_name: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()],
      count: day.length,
      calories: day.reduce((s, l) => s + (l.calories_burned || 0), 0),
      duration: day.reduce((s, l) => s + (l.duration_min || 0), 0),
    });
  }

  const lastSleep = mem.sleep_logs
    .filter(l => l.user_id === userId)
    .sort((a, b) => new Date(b.sleep_start) - new Date(a.sleep_start))[0] || null;

  const activeGoals    = mem.goals.filter(g => g.user_id === userId && g.status === 'active').length;
  const completedGoals = mem.goals.filter(g => g.user_id === userId && g.status === 'completed').length;

  const measurements = mem.body_measurements
    .filter(m => m.user_id === userId)
    .sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at));

  const weightChange = measurements.length >= 2
    ? +((measurements[0].weight_kg || 0) - (measurements[1].weight_kg || 0)).toFixed(1)
    : null;

  ok(res, {
    workout_stats: { total_workouts: totalWorkouts, total_minutes: totalMinutes, total_calories: totalCalories },
    streak:        { current_streak: user.current_streak || 0, longest_streak: user.longest_streak || 0 },
    weekly_activity: weekly,
    last_sleep:    lastSleep,
    goals:         { active: activeGoals, completed: completedGoals },
    body:          { latest: measurements[0] || null, weight_change: weightChange },
  });
});

const addMeasurement = wrap(async (req, res) => {
  const { weight_kg, body_fat_pct, muscle_mass_kg, chest_cm, waist_cm, hips_cm, notes } = req.body;
  const user = mem.users.find(u => u.id === req.user.id);

  let bmi = null;
  if (weight_kg && user.height_cm) {
    const h = user.height_cm / 100;
    bmi = +((weight_kg) / (h * h)).toFixed(1);
  }

  const m = {
    id: uuidv4(), user_id: req.user.id,
    weight_kg: weight_kg || null, body_fat_pct: body_fat_pct || null,
    muscle_mass_kg: muscle_mass_kg || null, bmi,
    chest_cm: chest_cm || null, waist_cm: waist_cm || null, hips_cm: hips_cm || null,
    notes: notes || null,
    measured_at: new Date().toISOString().split('T')[0],
    created_at:  new Date().toISOString(),
  };

  mem.body_measurements.push(m);
  if (weight_kg) { user.weight_kg = weight_kg; user.bmi = bmi; }
  ok(res, m, 'Measurement recorded', 201);
});

const getMeasurements = wrap(async (req, res) => {
  const list = mem.body_measurements
    .filter(m => m.user_id === req.user.id)
    .sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at))
    .slice(0, +(req.query.limit || 30));
  ok(res, list);
});

const deleteMeasurement = wrap(async (req, res) => {
  const idx = mem.body_measurements.findIndex(
    m => m.id === req.params.id && m.user_id === req.user.id
  );
  if (idx === -1) return err(res, 'Measurement not found', 404);
  mem.body_measurements.splice(idx, 1);
  ok(res, null, 'Measurement deleted');
});

// ══════════════════════════════════════════
//  SLEEP
// ══════════════════════════════════════════
const logSleep = wrap(async (req, res) => {
  const { sleep_start, sleep_end, quality_score, deep_sleep_min, rem_sleep_min, notes } = req.body;
  if (!sleep_start || !sleep_end) return err(res, 'sleep_start and sleep_end required', 400);

  const duration_min = Math.round((new Date(sleep_end) - new Date(sleep_start)) / 60000);
  const log = {
    id: uuidv4(), user_id: req.user.id,
    sleep_start, sleep_end, duration_min,
    deep_sleep_min: deep_sleep_min || null,
    rem_sleep_min:  rem_sleep_min  || null,
    quality_score:  quality_score  || null,
    notes: notes || null, created_at: new Date().toISOString(),
  };
  mem.sleep_logs.push(log);
  ok(res, log, 'Sleep logged', 201);
});

const getSleepLogs = wrap(async (req, res) => {
  const logs = mem.sleep_logs
    .filter(l => l.user_id === req.user.id)
    .sort((a, b) => new Date(b.sleep_start) - new Date(a.sleep_start))
    .slice(0, +(req.query.limit || 14));
  ok(res, logs);
});

const getSleepStats = wrap(async (req, res) => {
  const logs = mem.sleep_logs.filter(l => l.user_id === req.user.id);
  if (!logs.length) return ok(res, { avg_duration_min: 0, avg_quality_score: 0, total_logged: 0 });
  const avgDur = Math.round(logs.reduce((s, l) => s + (l.duration_min || 0), 0) / logs.length);
  const avgQ   = Math.round(logs.reduce((s, l) => s + (l.quality_score || 0), 0) / logs.filter(l => l.quality_score).length || 0);
  ok(res, { avg_duration_min: avgDur, avg_quality_score: avgQ, total_logged: logs.length });
});

const deleteSleepLog = wrap(async (req, res) => {
  const idx = mem.sleep_logs.findIndex(l => l.id === req.params.id && l.user_id === req.user.id);
  if (idx === -1) return err(res, 'Sleep log not found', 404);
  mem.sleep_logs.splice(idx, 1);
  ok(res, null, 'Sleep log deleted');
});

// ══════════════════════════════════════════
//  GOALS
// ══════════════════════════════════════════
const getGoals = wrap(async (req, res) => {
  const { status } = req.query;
  let list = mem.goals.filter(g => g.user_id === req.user.id);
  if (status) list = list.filter(g => g.status === status);
  list = list.map(g => ({
    ...g,
    progress_pct: g.target_value
      ? +((g.current_value / g.target_value) * 100).toFixed(1)
      : 0,
  }));
  ok(res, list);
});

const createGoal = wrap(async (req, res) => {
  const { type, title, description, target_value, unit, target_date } = req.body;
  if (!type || !title) return err(res, 'type and title are required', 400);
  const goal = {
    id: uuidv4(), user_id: req.user.id,
    type, title, description: description || null,
    target_value: target_value || null, current_value: 0,
    unit: unit || null, target_date: target_date || null,
    status: 'active', completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  mem.goals.push(goal);
  ok(res, goal, 'Goal created', 201);
});

const updateGoalProgress = wrap(async (req, res) => {
  const goal = mem.goals.find(g => g.id === req.params.id && g.user_id === req.user.id);
  if (!goal) return err(res, 'Goal not found', 404);
  goal.current_value = +(req.body.current_value || 0);
  const completed = goal.target_value && goal.current_value >= goal.target_value;
  if (completed) { goal.status = 'completed'; goal.completed_at = new Date().toISOString(); }
  goal.updated_at = new Date().toISOString();
  ok(res, { ...goal, progress_pct: goal.target_value ? +((goal.current_value / goal.target_value) * 100).toFixed(1) : 0 },
     completed ? '🎉 Goal completed!' : 'Progress updated');
});

const updateGoalStatus = wrap(async (req, res) => {
  const goal = mem.goals.find(g => g.id === req.params.id && g.user_id === req.user.id);
  if (!goal) return err(res, 'Goal not found', 404);
  goal.status     = req.body.status;
  goal.updated_at = new Date().toISOString();
  ok(res, goal, 'Goal status updated');
});

const deleteGoal = wrap(async (req, res) => {
  const idx = mem.goals.findIndex(g => g.id === req.params.id && g.user_id === req.user.id);
  if (idx === -1) return err(res, 'Goal not found', 404);
  mem.goals.splice(idx, 1);
  ok(res, null, 'Goal deleted');
});

module.exports = {
  getDashboardStats, addMeasurement, getMeasurements, deleteMeasurement,
  logSleep, getSleepLogs, getSleepStats, deleteSleepLog,
  getGoals, createGoal, updateGoalProgress, updateGoalStatus, deleteGoal,
};
