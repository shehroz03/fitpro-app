import api from './client';

// ── AUTH ──────────────────────────────────────────────────────
export const authAPI = {
  register:       (data)  => api.post('/auth/register', data),
  login:          (data)  => api.post('/auth/login', data),
  refresh:        (token) => api.post('/auth/refresh', { refresh_token: token }),
  logout:         (token) => api.post('/auth/logout',  { refresh_token: token }),
  getMe:          ()      => api.get('/auth/me'),
  updateProfile:  (data)  => api.patch('/auth/me', data),
  changePassword: (data)  => api.patch('/auth/change-password', data),
};

// ── WORKOUTS ──────────────────────────────────────────────────
export const workoutAPI = {
  getPlans:     (params) => api.get('/workouts/plans', { params }),
  getPlan:      (id)     => api.get(`/workouts/plans/${id}`),
  getExercises: (params) => api.get('/workouts/exercises', { params }),
  logWorkout:   (data)   => api.post('/workouts/logs', data),
  getHistory:   (params) => api.get('/workouts/logs', { params }),
  getLogDetail: (id)     => api.get(`/workouts/logs/${id}`),
  deleteLog:    (id)     => api.delete(`/workouts/logs/${id}`),
};

// ── NUTRITION ─────────────────────────────────────────────────
export const nutritionAPI = {
  getDailyStats: (date)  => api.get('/nutrition/daily', { params: { date } }),
  getWeekly:     ()      => api.get('/nutrition/weekly'),
  logMeal:       (data)  => api.post('/nutrition/meals', data),
  deleteMeal:    (id)    => api.delete(`/nutrition/meals/${id}`),
  logWater:      (ml)    => api.post('/nutrition/water', { amount_ml: ml }),
  getWaterToday: ()      => api.get('/nutrition/water/today'),
  searchFoods:   (q)     => api.get('/nutrition/foods', { params: { q } }),
  addFood:       (data)  => api.post('/nutrition/foods', data),
  analyzeImage:  (data)  => api.post('/nutrition/ai-scan', data),
  updateTargets: (data)  => api.put('/nutrition/targets', data),
};

// ── PROGRESS ──────────────────────────────────────────────────
export const progressAPI = {
  getDashboard:      ()     => api.get('/progress/dashboard'),
  getMeasurements:   ()     => api.get('/progress/measurements'),
  addMeasurement:    (data) => api.post('/progress/measurements', data),
  deleteMeasurement: (id)   => api.delete(`/progress/measurements/${id}`),
};

// ── SLEEP ─────────────────────────────────────────────────────
export const sleepAPI = {
  getLogs:   ()     => api.get('/sleep'),
  getStats:  ()     => api.get('/sleep/stats'),
  logSleep:  (data) => api.post('/sleep', data),
  deleteLog: (id)   => api.delete(`/sleep/${id}`),
};

// ── GOALS ─────────────────────────────────────────────────────
export const goalsAPI = {
  getAll:         (status) => api.get('/goals', { params: status ? { status } : {} }),
  create:         (data)   => api.post('/goals', data),
  updateProgress: (id, v)  => api.patch(`/goals/${id}/progress`, { current_value: v }),
  updateStatus:   (id, s)  => api.patch(`/goals/${id}/status`,   { status: s }),
  delete:         (id)     => api.delete(`/goals/${id}`),
};
