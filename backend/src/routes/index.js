const router = require('express').Router();
const { protect } = require('../middleware/auth');

const authCtrl      = require('../controllers/authController');
const workoutCtrl   = require('../controllers/workoutController');
const nutritionCtrl = require('../controllers/nutritionController');
const progressCtrl  = require('../controllers/progressController');

// ── AUTH ──────────────────────────────────────────────────────
router.post('/auth/register',         authCtrl.register);
router.post('/auth/login',            authCtrl.login);
router.post('/auth/refresh',          authCtrl.refreshToken);
router.post('/auth/logout',           protect, authCtrl.logout);
router.get( '/auth/me',               protect, authCtrl.getMe);
router.patch('/auth/me',              protect, authCtrl.updateProfile);
router.patch('/auth/change-password', protect, authCtrl.changePassword);

// ── WORKOUTS ──────────────────────────────────────────────────
router.get(   '/workouts/plans',          protect, workoutCtrl.getWorkoutPlans);
router.get(   '/workouts/plans/:id',      protect, workoutCtrl.getWorkoutPlan);
router.get(   '/workouts/exercises',      protect, workoutCtrl.getExercises);
router.post(  '/workouts/logs',           protect, workoutCtrl.logWorkout);
router.get(   '/workouts/logs',           protect, workoutCtrl.getWorkoutHistory);
router.get(   '/workouts/logs/:id',       protect, workoutCtrl.getWorkoutLogDetail);
router.delete('/workouts/logs/:id',       protect, workoutCtrl.deleteWorkoutLog);

// ── NUTRITION ─────────────────────────────────────────────────
router.get(   '/nutrition/daily',         protect, nutritionCtrl.getDailySummary);
router.get(   '/nutrition/weekly',        protect, nutritionCtrl.getWeeklyReport);
router.post(  '/nutrition/meals',         protect, nutritionCtrl.logMeal);
router.delete('/nutrition/meals/:id',     protect, nutritionCtrl.deleteMealLog);
router.post(  '/nutrition/water',         protect, nutritionCtrl.logWater);
router.get(   '/nutrition/water/today',   protect, nutritionCtrl.getWaterToday);
router.get(   '/nutrition/foods',         protect, nutritionCtrl.searchFoods);
router.post(  '/nutrition/foods',         protect, nutritionCtrl.addCustomFood);
router.post(  '/nutrition/ai-scan',       protect, nutritionCtrl.analyzeFoodImage);
router.put(   '/nutrition/targets',       protect, nutritionCtrl.updateTargets);

// ── PROGRESS ──────────────────────────────────────────────────
router.get(   '/progress/dashboard',      protect, progressCtrl.getDashboardStats);
router.get(   '/progress/measurements',   protect, progressCtrl.getMeasurements);
router.post(  '/progress/measurements',   protect, progressCtrl.addMeasurement);
router.delete('/progress/measurements/:id', protect, progressCtrl.deleteMeasurement);

// ── SLEEP ─────────────────────────────────────────────────────
router.get(   '/sleep',                   protect, progressCtrl.getSleepLogs);
router.get(   '/sleep/stats',             protect, progressCtrl.getSleepStats);
router.post(  '/sleep',                   protect, progressCtrl.logSleep);
router.delete('/sleep/:id',               protect, progressCtrl.deleteSleepLog);

// ── GOALS ─────────────────────────────────────────────────────
router.get(   '/goals',                   protect, progressCtrl.getGoals);
router.post(  '/goals',                   protect, progressCtrl.createGoal);
router.patch( '/goals/:id/progress',      protect, progressCtrl.updateGoalProgress);
router.patch( '/goals/:id/status',        protect, progressCtrl.updateGoalStatus);
router.delete('/goals/:id',               protect, progressCtrl.deleteGoal);

module.exports = router;
