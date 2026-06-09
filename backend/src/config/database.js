require('dotenv').config();

// For easy local testing without PostgreSQL, we use an in-memory store
// In production, switch to PostgreSQL by setting USE_POSTGRES=true in .env

const USE_POSTGRES = process.env.USE_POSTGRES === 'true';

let pool = null;
const memStore = {
  users: [],
  refresh_tokens: [],
  workout_logs: [],
  meal_logs: [],
  sleep_logs: [],
  goals: [],
  body_measurements: [],
  water_logs: [],
  exercises: require('../data/exercises.json'),
  workout_plans: require('../data/workoutPlans.json'),
  foods: require('../data/foods.json'),
};

async function connectDB() {
  if (USE_POSTGRES) {
    const { Pool } = require('pg');
    pool = new Pool({
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME     || 'fitcore_db',
      user:     process.env.DB_USER     || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 20,
    });
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected');
    client.release();
  } else {
    console.log('✅ In-memory store active (no DB needed for testing)');
  }
}

async function query(text, params = []) {
  if (USE_POSTGRES && pool) {
    return pool.query(text, params);
  }
  // Return empty for in-memory mode (controllers use memStore directly)
  return { rows: [], rowCount: 0 };
}

module.exports = { connectDB, query, pool: () => pool, mem: memStore };
