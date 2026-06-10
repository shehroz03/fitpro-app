// ============================================================================
// FitCore data layer — fully on Supabase (user data) + bundled JSON (static).
// Every method returns an axios-shaped object: { data: { data, message, pagination } }
// so the screens did not have to change.
// ============================================================================
import { supabase } from './supabase';
import { useAuthStore } from '../store/authStore';

import FOODS from '../data/foods.json';
import EXERCISES from '../data/exercises.json';
import WORKOUT_PLANS from '../data/workoutPlans.json';

// ── helpers ──────────────────────────────────────────────────────────────────
const uid = () => useAuthStore.getState().user?.id;
const resp  = (data, message = 'Success') => ({ data: { success: true, message, data } });
const presp = (data, total, page = 1, limit = 20) => ({
  data: {
    success: true,
    data,
    pagination: { total, page: +page, limit: +limit, totalPages: Math.ceil(total / limit) },
  },
});
const todayStr = () => new Date().toISOString().split('T')[0];
const throwIf = (error) => { if (error) throw new Error(error.message); };

// ══════════════════════════════════════════════════════════════════════════
//  AUTH / PROFILE
// ══════════════════════════════════════════════════════════════════════════
async function fetchProfile() {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', uid()).single();
  throwIf(error);
  return data;
}

export const authAPI = {
  getMe: async () => resp(await fetchProfile()),

  updateProfile: async (payload) => {
    const allowed = ['full_name','gender','date_of_birth','phone','bio','unit_system',
                     'height_cm','weight_kg','body_fat_pct','muscle_mass_kg','fitness_level'];
    const updates = {};
    allowed.forEach(k => { if (payload[k] !== undefined) updates[k] = payload[k]; });

    if (updates.height_cm && updates.weight_kg) {
      const h = updates.height_cm / 100;
      updates.bmi = +(updates.weight_kg / (h * h)).toFixed(1);
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('profiles').update(updates).eq('id', uid()).select().single();
    throwIf(error);
    return resp(data, 'Profile updated');
  },

  changePassword: async ({ current_password, new_password }) => {
    if (current_password) {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: authErr } = await supabase.auth.signInWithPassword({ email: user.email, password: current_password });
      if (authErr) throw new Error('Current password is incorrect');
    }
    const { error } = await supabase.auth.updateUser({ password: new_password });
    throwIf(error);
    return resp(null, 'Password changed');
  },

  // kept for API compatibility (auth flow lives in authStore now)
  register: async () => { throw new Error('Use authStore.register'); },
  login:    async () => { throw new Error('Use authStore.login'); },
  refresh:  async () => resp(null),
  logout:   async () => resp(null),
};

// ══════════════════════════════════════════════════════════════════════════
//  WORKOUTS  (plans + exercises bundled; logs in Supabase)
// ══════════════════════════════════════════════════════════════════════════
export const workoutAPI = {
  getPlans: async (params = {}) => {
    const { category, difficulty, search, page = 1, limit = 10 } = params;
    let plans = [...WORKOUT_PLANS];
    if (category)   plans = plans.filter(p => p.category === category);
    if (difficulty) plans = plans.filter(p => p.difficulty === difficulty);
    if (search)     plans = plans.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    return presp(plans.slice((page - 1) * limit, page * limit), plans.length, page, limit);
  },

  getPlan: async (id) => {
    const plan = WORKOUT_PLANS.find(p => p.id === id);
    if (!plan) throw new Error('Workout plan not found');
    const exercises = (plan.exercises || []).map(eid => EXERCISES.find(e => e.id === eid)).filter(Boolean);
    return resp({ ...plan, exercises });
  },

  getExercises: async (params = {}) => {
    const { category, difficulty, search, page = 1, limit = 20 } = params;
    let list = [...EXERCISES];
    if (category)   list = list.filter(e => e.category === category);
    if (difficulty) list = list.filter(e => e.difficulty === difficulty);
    if (search)     list = list.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));
    return presp(list.slice((page - 1) * limit, page * limit), list.length, page, limit);
  },

  logWorkout: async (payload) => {
    const row = {
      user_id: uid(),
      plan_id: payload.plan_id || null,
      name: payload.name || 'Custom Workout',
      category: payload.category || 'strength',
      started_at: payload.started_at,
      ended_at: payload.ended_at || new Date().toISOString(),
      duration_min: payload.duration_min || 0,
      calories_burned: payload.calories_burned || 0,
      avg_heart_rate: payload.avg_heart_rate || null,
      notes: payload.notes || null,
      rating: payload.rating || null,
      sets: payload.sets || [],
    };
    const { data, error } = await supabase.from('workout_logs').insert(row).select().single();
    throwIf(error);

    // ── update streak on profile ──
    try {
      const profile = await fetchProfile();
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      let cur = profile.current_streak || 0;
      if (profile.last_activity_date === today) { /* already today */ }
      else if (profile.last_activity_date === yesterday) cur += 1;
      else cur = 1;
      const longest = Math.max(profile.longest_streak || 0, cur);
      await supabase.from('profiles')
        .update({ current_streak: cur, longest_streak: longest, last_activity_date: today })
        .eq('id', uid());
    } catch {}

    return resp(data, 'Workout logged successfully');
  },

  getHistory: async (params = {}) => {
    const { page = 1, limit = 10 } = params;
    const { data, error } = await supabase.from('workout_logs')
      .select('*').eq('user_id', uid()).order('started_at', { ascending: false });
    throwIf(error);
    return presp((data || []).slice((page - 1) * limit, page * limit), (data || []).length, page, limit);
  },

  getLogDetail: async (id) => {
    const { data, error } = await supabase.from('workout_logs')
      .select('*').eq('id', id).eq('user_id', uid()).single();
    throwIf(error);
    return resp(data);
  },

  deleteLog: async (id) => {
    const { error } = await supabase.from('workout_logs').delete().eq('id', id).eq('user_id', uid());
    throwIf(error);
    return resp(null, 'Workout log deleted');
  },
};

// ══════════════════════════════════════════════════════════════════════════
//  NUTRITION  (foods bundled; meal/water logs + targets in Supabase)
// ══════════════════════════════════════════════════════════════════════════
export const nutritionAPI = {
  getDailyStats: async (date) => {
    const d = date || todayStr();
    const [{ data: meals, error: e1 }, { data: water, error: e2 }, profile] = await Promise.all([
      supabase.from('meal_logs').select('*').eq('user_id', uid()).eq('logged_at', d),
      supabase.from('water_logs').select('*').eq('user_id', uid()),
      fetchProfile(),
    ]);
    throwIf(e1); throwIf(e2);

    const consumed = (meals || []).reduce((a, l) => ({
      calories:  +(a.calories  + (l.calories  || 0)).toFixed(1),
      protein_g: +(a.protein_g + (l.protein_g || 0)).toFixed(1),
      carbs_g:   +(a.carbs_g   + (l.carbs_g   || 0)).toFixed(1),
      fat_g:     +(a.fat_g     + (l.fat_g     || 0)).toFixed(1),
    }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

    const mealsByType = (meals || []).reduce((a, l) => {
      (a[l.meal_type] = a[l.meal_type] || []).push(l); return a;
    }, {});

    const waterToday = (water || [])
      .filter(w => (w.logged_at || '').startsWith(d))
      .reduce((s, w) => s + (w.amount_ml || 0), 0);

    const targets = {
      calories:  profile.target_calories || 2200,
      protein_g: profile.target_protein  || 150,
      carbs_g:   profile.target_carbs    || 220,
      fat_g:     profile.target_fat      || 70,
      water_ml:  profile.target_water    || 2500,
    };

    return resp({
      date: d, consumed, targets,
      remaining: {
        calories:  targets.calories  - consumed.calories,
        protein_g: targets.protein_g - consumed.protein_g,
        carbs_g:   targets.carbs_g   - consumed.carbs_g,
        fat_g:     targets.fat_g     - consumed.fat_g,
      },
      meals: mealsByType,
      water_ml: waterToday,
    });
  },

  getWeekly: async () => {
    const { data: meals, error } = await supabase.from('meal_logs').select('*').eq('user_id', uid());
    throwIf(error);
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      const logs = (meals || []).filter(l => l.logged_at === date);
      days.push({
        date,
        calories:  +logs.reduce((s, l) => s + (l.calories  || 0), 0).toFixed(0),
        protein_g: +logs.reduce((s, l) => s + (l.protein_g || 0), 0).toFixed(1),
        carbs_g:   +logs.reduce((s, l) => s + (l.carbs_g   || 0), 0).toFixed(1),
        fat_g:     +logs.reduce((s, l) => s + (l.fat_g     || 0), 0).toFixed(1),
      });
    }
    return resp(days);
  },

  logMeal: async (payload) => {
    const { food_id, meal_type, quantity_g } = payload;
    let row;
    const food = FOODS.find(f => f.id === food_id);
    if (food) {
      const ratio = quantity_g / (food.serving_size_g || 100);
      row = {
        food_id, food_name: food.name, brand: food.brand || null,
        calories:  +(food.calories  * ratio).toFixed(1),
        protein_g: +(food.protein_g * ratio).toFixed(1),
        carbs_g:   +(food.carbs_g   * ratio).toFixed(1),
        fat_g:     +(food.fat_g     * ratio).toFixed(1),
      };
    } else {
      // custom / AI food — nutrition passed inline by the caller
      const ratio = quantity_g / (payload.serving_size_g || 100);
      row = {
        food_id: food_id || null, food_name: payload.food_name || 'Custom Food', brand: null,
        calories:  +(((payload.calories  || 0)) * ratio).toFixed(1),
        protein_g: +(((payload.protein_g || 0)) * ratio).toFixed(1),
        carbs_g:   +(((payload.carbs_g   || 0)) * ratio).toFixed(1),
        fat_g:     +(((payload.fat_g     || 0)) * ratio).toFixed(1),
      };
    }
    const { data, error } = await supabase.from('meal_logs').insert({
      user_id: uid(), meal_type, quantity_g,
      logged_at: payload.logged_at || todayStr(),
      notes: payload.notes || null, ...row,
    }).select().single();
    throwIf(error);
    return resp(data, 'Meal logged');
  },

  deleteMeal: async (id) => {
    const { error } = await supabase.from('meal_logs').delete().eq('id', id).eq('user_id', uid());
    throwIf(error);
    return resp(null, 'Meal log deleted');
  },

  logWater: async (ml) => {
    const { data, error } = await supabase.from('water_logs')
      .insert({ user_id: uid(), amount_ml: +ml }).select().single();
    throwIf(error);
    return resp(data, 'Water logged');
  },

  getWaterToday: async () => {
    const { data, error } = await supabase.from('water_logs').select('*').eq('user_id', uid());
    throwIf(error);
    const today = todayStr();
    const logs = (data || []).filter(w => (w.logged_at || '').startsWith(today));
    return resp({ logs, total_ml: logs.reduce((s, w) => s + (w.amount_ml || 0), 0), date: today });
  },

  searchFoods: async (q = '') => {
    const query = (q || '').trim().toLowerCase();
    const staticList = query === ''
      ? FOODS
      : FOODS.filter(f => f.name.toLowerCase().includes(query) || (f.brand || '').toLowerCase().includes(query));

    // also fetch user's saved custom foods
    let customList = [];
    try {
      let cq = supabase.from('custom_foods').select('*').eq('user_id', uid());
      if (query) cq = cq.ilike('name', `%${query}%`);
      const { data } = await cq;
      customList = (data || []).map(cf => ({ ...cf, id: `custom-${cf.id}`, is_custom: true }));
    } catch {}

    const list = [...customList, ...staticList];
    return presp(list, list.length, 1, list.length || 1);
  },

  addFood: async (payload) => {
    const { data, error } = await supabase.from('custom_foods').insert({
      user_id: uid(),
      name: payload.name,
      brand: payload.brand || null,
      serving_size_g: payload.serving_size_g || 100,
      calories:  payload.calories  || 0,
      protein_g: payload.protein_g || 0,
      carbs_g:   payload.carbs_g   || 0,
      fat_g:     payload.fat_g     || 0,
    }).select().single();
    throwIf(error);
    return resp({ ...data, id: `custom-${data.id}`, is_custom: true }, 'Custom food saved');
  },

  analyzeImage: async () => {
    // Client-side mock (real AI needs a Supabase Edge Function to keep the key server-side)
    await new Promise(r => setTimeout(r, 1200));
    const mock = [
      { name: 'Grilled Chicken Salad', calories: 340, protein_g: 35, carbs_g: 12, fat_g: 18 },
      { name: 'Avocado Toast with Egg', calories: 420, protein_g: 18, carbs_g: 32, fat_g: 24 },
      { name: 'Berry Protein Smoothie', calories: 280, protein_g: 25, carbs_g: 35, fat_g: 4 },
      { name: 'Steak and Sweet Potato', calories: 550, protein_g: 42, carbs_g: 45, fat_g: 22 },
    ];
    return resp(mock[Math.floor(Math.random() * mock.length)], 'AI analysis complete');
  },

  updateTargets: async (payload) => {
    const map = { calories: 'target_calories', protein_g: 'target_protein', carbs_g: 'target_carbs',
                  fat_g: 'target_fat', water_ml: 'target_water' };
    const updates = {};
    Object.entries(map).forEach(([k, col]) => { if (payload[k]) updates[col] = +payload[k]; });
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', uid()).select().single();
    throwIf(error);
    return resp({
      calories: data.target_calories, protein_g: data.target_protein,
      carbs_g: data.target_carbs, fat_g: data.target_fat, water_ml: data.target_water,
    }, 'Targets updated');
  },
};

// ══════════════════════════════════════════════════════════════════════════
//  PROGRESS  (dashboard aggregation + body measurements)
// ══════════════════════════════════════════════════════════════════════════
export const progressAPI = {
  getDashboard: async () => {
    const [
      { data: logs, error: e1 },
      { data: sleeps, error: e2 },
      { data: goals, error: e3 },
      { data: meas, error: e4 },
      profile,
    ] = await Promise.all([
      supabase.from('workout_logs').select('*').eq('user_id', uid()),
      supabase.from('sleep_logs').select('*').eq('user_id', uid()),
      supabase.from('goals').select('*').eq('user_id', uid()),
      supabase.from('body_measurements').select('*').eq('user_id', uid()),
      fetchProfile(),
    ]);
    throwIf(e1); throwIf(e2); throwIf(e3); throwIf(e4);

    const myLogs = logs || [];
    const weekly = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(Date.now() - i * 86400000);
      const dateStr = dt.toISOString().split('T')[0];
      const day = myLogs.filter(l => (l.started_at || '').startsWith(dateStr));
      weekly.push({
        date: dateStr,
        day_name: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dt.getDay()],
        count: day.length,
        calories: day.reduce((s, l) => s + (l.calories_burned || 0), 0),
        duration: day.reduce((s, l) => s + (l.duration_min || 0), 0),
      });
    }

    const lastSleep = (sleeps || [])
      .slice().sort((a, b) => new Date(b.sleep_start) - new Date(a.sleep_start))[0] || null;

    const measurements = (meas || [])
      .slice().sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at));
    const weightChange = measurements.length >= 2
      ? +((measurements[0].weight_kg || 0) - (measurements[1].weight_kg || 0)).toFixed(1) : null;

    return resp({
      workout_stats: {
        total_workouts: myLogs.length,
        total_minutes:  myLogs.reduce((s, l) => s + (l.duration_min || 0), 0),
        total_calories: myLogs.reduce((s, l) => s + (l.calories_burned || 0), 0),
      },
      streak: { current_streak: profile.current_streak || 0, longest_streak: profile.longest_streak || 0 },
      weekly_activity: weekly,
      last_sleep: lastSleep,
      goals: {
        active:    (goals || []).filter(g => g.status === 'active').length,
        completed: (goals || []).filter(g => g.status === 'completed').length,
      },
      body: { latest: measurements[0] || null, weight_change: weightChange },
    });
  },

  getMeasurements: async () => {
    const { data, error } = await supabase.from('body_measurements')
      .select('*').eq('user_id', uid()).order('measured_at', { ascending: false });
    throwIf(error);
    return resp(data || []);
  },

  addMeasurement: async (payload) => {
    const profile = await fetchProfile();
    let bmi = null;
    if (payload.weight_kg && profile.height_cm) {
      const h = profile.height_cm / 100;
      bmi = +(payload.weight_kg / (h * h)).toFixed(1);
    }
    const { data, error } = await supabase.from('body_measurements').insert({
      user_id: uid(),
      weight_kg: payload.weight_kg || null, body_fat_pct: payload.body_fat_pct || null,
      muscle_mass_kg: payload.muscle_mass_kg || null, bmi,
      chest_cm: payload.chest_cm || null, waist_cm: payload.waist_cm || null, hips_cm: payload.hips_cm || null,
      notes: payload.notes || null, measured_at: todayStr(),
    }).select().single();
    throwIf(error);
    if (payload.weight_kg) await supabase.from('profiles').update({ weight_kg: payload.weight_kg, bmi }).eq('id', uid());
    return resp(data, 'Measurement recorded');
  },

  deleteMeasurement: async (id) => {
    const { error } = await supabase.from('body_measurements').delete().eq('id', id).eq('user_id', uid());
    throwIf(error);
    return resp(null, 'Measurement deleted');
  },
};

// ══════════════════════════════════════════════════════════════════════════
//  SLEEP
// ══════════════════════════════════════════════════════════════════════════
export const sleepAPI = {
  getLogs: async () => {
    const { data, error } = await supabase.from('sleep_logs')
      .select('*').eq('user_id', uid()).order('sleep_start', { ascending: false }).limit(14);
    throwIf(error);
    return resp(data || []);
  },

  getStats: async () => {
    const { data, error } = await supabase.from('sleep_logs').select('*').eq('user_id', uid());
    throwIf(error);
    const logs = data || [];
    if (!logs.length) return resp({ avg_duration_min: 0, avg_quality_score: 0, total_logged: 0 });
    const avg = (arr) => arr.length ? Math.round(arr.reduce((s, n) => s + n, 0) / arr.length) : 0;
    const durations = logs.map(l => l.duration_min || 0);
    const qScores = logs.filter(l => l.quality_score).map(l => l.quality_score);
    const deep = logs.filter(l => l.deep_sleep_min).map(l => l.deep_sleep_min);
    const rem = logs.filter(l => l.rem_sleep_min).map(l => l.rem_sleep_min);
    return resp({
      avg_duration_min: avg(durations),
      avg_quality_score: avg(qScores),
      avg_deep_sleep_min: avg(deep),
      avg_rem_sleep_min: avg(rem),
      best_duration_min: Math.max(0, ...durations),
      total_logged: logs.length,
    });
  },

  logSleep: async (payload) => {
    const duration_min = Math.round((new Date(payload.sleep_end) - new Date(payload.sleep_start)) / 60000);
    const { data, error } = await supabase.from('sleep_logs').insert({
      user_id: uid(),
      sleep_start: payload.sleep_start, sleep_end: payload.sleep_end, duration_min,
      deep_sleep_min: payload.deep_sleep_min || null,
      rem_sleep_min:  payload.rem_sleep_min  || null,
      quality_score:  payload.quality_score  || null,
      notes: payload.notes || null,
    }).select().single();
    throwIf(error);
    return resp(data, 'Sleep logged');
  },

  deleteLog: async (id) => {
    const { error } = await supabase.from('sleep_logs').delete().eq('id', id).eq('user_id', uid());
    throwIf(error);
    return resp(null, 'Sleep log deleted');
  },
};

// ══════════════════════════════════════════════════════════════════════════
//  GOALS
// ══════════════════════════════════════════════════════════════════════════
const withPct = (g) => ({
  ...g,
  progress_pct: g.target_value ? +((g.current_value / g.target_value) * 100).toFixed(1) : 0,
});

export const goalsAPI = {
  getAll: async (status) => {
    let q = supabase.from('goals').select('*').eq('user_id', uid()).order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    throwIf(error);
    return resp((data || []).map(withPct));
  },

  create: async (payload) => {
    const { data, error } = await supabase.from('goals').insert({
      user_id: uid(),
      type: payload.type, title: payload.title, description: payload.description || null,
      target_value: payload.target_value || null, current_value: 0,
      unit: payload.unit || null, target_date: payload.target_date || null,
      status: 'active',
    }).select().single();
    throwIf(error);
    return resp(data, 'Goal created');
  },

  updateProgress: async (id, v) => {
    const current = +(v || 0);
    const { data: goal, error: e1 } = await supabase.from('goals')
      .select('*').eq('id', id).eq('user_id', uid()).single();
    throwIf(e1);
    const completed = goal.target_value && current >= goal.target_value;
    const { data, error } = await supabase.from('goals').update({
      current_value: current,
      status: completed ? 'completed' : goal.status,
      completed_at: completed ? new Date().toISOString() : goal.completed_at,
      updated_at: new Date().toISOString(),
    }).eq('id', id).select().single();
    throwIf(error);
    return resp(withPct(data), completed ? '🎉 Goal completed!' : 'Progress updated');
  },

  updateStatus: async (id, status) => {
    const { data, error } = await supabase.from('goals')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id).eq('user_id', uid()).select().single();
    throwIf(error);
    return resp(data, 'Goal status updated');
  },

  delete: async (id) => {
    const { error } = await supabase.from('goals').delete().eq('id', id).eq('user_id', uid());
    throwIf(error);
    return resp(null, 'Goal deleted');
  },
};
