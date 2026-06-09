const { v4: uuidv4 } = require('uuid');
const { mem } = require('../config/database');
const { ok, err, paginated, wrap } = require('../utils/response');

// ── DAILY SUMMARY ─────────────────────────────────────────────
const getDailySummary = wrap(async (req, res) => {
  const userId = req.user.id;
  const date   = req.query.date || new Date().toISOString().split('T')[0];

  const logs = mem.meal_logs.filter(
    l => l.user_id === userId && l.logged_at === date
  );

  const consumed = logs.reduce(
    (acc, l) => ({
      calories:  +(acc.calories  + (l.calories  || 0)).toFixed(1),
      protein_g: +(acc.protein_g + (l.protein_g || 0)).toFixed(1),
      carbs_g:   +(acc.carbs_g   + (l.carbs_g   || 0)).toFixed(1),
      fat_g:     +(acc.fat_g     + (l.fat_g     || 0)).toFixed(1),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  const mealsByType = logs.reduce((acc, l) => {
    if (!acc[l.meal_type]) acc[l.meal_type] = [];
    acc[l.meal_type].push(l);
    return acc;
  }, {});

  const waterToday = mem.water_logs
    .filter(w => w.user_id === userId && w.logged_at.startsWith(date))
    .reduce((s, w) => s + w.amount_ml, 0);

  const user = mem.users.find(u => u.id === userId);

  ok(res, {
    date, consumed,
    targets: {
      calories:  user.target_calories  || 2200,
      protein_g: user.target_protein   || 150,
      carbs_g:   user.target_carbs     || 220,
      fat_g:     user.target_fat       || 70,
      water_ml:  user.target_water     || 2500,
    },
    remaining: {
      calories:  (user.target_calories  || 2200) - consumed.calories,
      protein_g: (user.target_protein   || 150)  - consumed.protein_g,
      carbs_g:   (user.target_carbs     || 220)  - consumed.carbs_g,
      fat_g:     (user.target_fat       || 70)   - consumed.fat_g,
    },
    meals:    mealsByType,
    water_ml: waterToday,
  });
});

// ── LOG MEAL ──────────────────────────────────────────────────
const logMeal = wrap(async (req, res) => {
  const { food_id, meal_type, quantity_g, logged_at, notes } = req.body;
  if (!food_id || !meal_type || !quantity_g)
    return err(res, 'food_id, meal_type and quantity_g are required', 400);

  const food = mem.foods.find(f => f.id === food_id);
  if (!food) return err(res, 'Food not found', 404);

  const ratio = quantity_g / (food.serving_size_g || 100);
  const log = {
    id: uuidv4(), user_id: req.user.id, food_id,
    food_name: food.name, brand: food.brand || null,
    meal_type, quantity_g,
    logged_at: logged_at || new Date().toISOString().split('T')[0],
    calories:  +(food.calories  * ratio).toFixed(1),
    protein_g: +(food.protein_g * ratio).toFixed(1),
    carbs_g:   +(food.carbs_g   * ratio).toFixed(1),
    fat_g:     +(food.fat_g     * ratio).toFixed(1),
    notes: notes || null,
    created_at: new Date().toISOString(),
  };

  mem.meal_logs.push(log);
  ok(res, log, 'Meal logged', 201);
});

// ── DELETE MEAL LOG ───────────────────────────────────────────
const deleteMealLog = wrap(async (req, res) => {
  const idx = mem.meal_logs.findIndex(
    l => l.id === req.params.id && l.user_id === req.user.id
  );
  if (idx === -1) return err(res, 'Meal log not found', 404);
  mem.meal_logs.splice(idx, 1);
  ok(res, null, 'Meal log deleted');
});

// ── LOG WATER ─────────────────────────────────────────────────
const logWater = wrap(async (req, res) => {
  const { amount_ml } = req.body;
  if (!amount_ml) return err(res, 'amount_ml is required', 400);
  const log = {
    id: uuidv4(), user_id: req.user.id,
    amount_ml: +amount_ml, logged_at: new Date().toISOString(),
  };
  mem.water_logs.push(log);
  ok(res, log, 'Water logged', 201);
});

// ── GET WATER TODAY ───────────────────────────────────────────
const getWaterToday = wrap(async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const logs  = mem.water_logs.filter(
    w => w.user_id === req.user.id && w.logged_at.startsWith(today)
  );
  const total = logs.reduce((s, w) => s + w.amount_ml, 0);
  ok(res, { logs, total_ml: total, date: today });
});

// ── SEARCH FOODS ──────────────────────────────────────────────
const searchFoods = wrap(async (req, res) => {
  const { q = '', page = 1, limit = 50 } = req.query;
  const list = q.trim() === ''
    ? mem.foods
    : mem.foods.filter(
        f => f.name.toLowerCase().includes(q.toLowerCase()) ||
             (f.brand || '').toLowerCase().includes(q.toLowerCase())
      );
  paginated(res, list.slice((page - 1) * limit, page * limit), list.length, page, limit);
});

// ── ADD CUSTOM FOOD ───────────────────────────────────────────
const addCustomFood = wrap(async (req, res) => {
  const { name, brand, serving_size_g = 100, calories, protein_g, carbs_g, fat_g } = req.body;
  if (!name || calories === undefined)
    return err(res, 'name and calories are required', 400);
  const food = {
    id: uuidv4(), name, brand: brand || null,
    serving_size_g: +serving_size_g,
    calories: +calories, protein_g: +(protein_g || 0),
    carbs_g: +(carbs_g || 0), fat_g: +(fat_g || 0),
    created_by: req.user.id, is_verified: false,
  };
  mem.foods.push(food);
  ok(res, food, 'Custom food added', 201);
});

// ── UPDATE TARGETS ────────────────────────────────────────────
const updateTargets = wrap(async (req, res) => {
  const user = mem.users.find(u => u.id === req.user.id);
  const { calories, protein_g, carbs_g, fat_g, water_ml } = req.body;
  if (calories)   user.target_calories  = +calories;
  if (protein_g)  user.target_protein   = +protein_g;
  if (carbs_g)    user.target_carbs     = +carbs_g;
  if (fat_g)      user.target_fat       = +fat_g;
  if (water_ml)   user.target_water     = +water_ml;
  ok(res, {
    calories: user.target_calories, protein_g: user.target_protein,
    carbs_g: user.target_carbs, fat_g: user.target_fat, water_ml: user.target_water,
  }, 'Targets updated');
});

// ── WEEKLY REPORT ─────────────────────────────────────────────
const getWeeklyReport = wrap(async (req, res) => {
  const userId = req.user.id;
  const days   = [];
  for (let i = 6; i >= 0; i--) {
    const d    = new Date(Date.now() - i * 86400000);
    const date = d.toISOString().split('T')[0];
    const logs = mem.meal_logs.filter(l => l.user_id === userId && l.logged_at === date);
    days.push({
      date,
      calories:  +logs.reduce((s, l) => s + (l.calories  || 0), 0).toFixed(0),
      protein_g: +logs.reduce((s, l) => s + (l.protein_g || 0), 0).toFixed(1),
      carbs_g:   +logs.reduce((s, l) => s + (l.carbs_g   || 0), 0).toFixed(1),
      fat_g:     +logs.reduce((s, l) => s + (l.fat_g     || 0), 0).toFixed(1),
    });
  }
  ok(res, days);
});

// ── AI FOOD SCANNER (PREMIUM) ─────────────────────────────────
const analyzeFoodImage = wrap(async (req, res) => {
  const { imageBase64, x, y } = req.body;
  if (!imageBase64) return err(res, 'Image is required for AI scan', 400);

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (OPENAI_API_KEY) {
    // REAL AI INTEGRATION (Using ChatGPT / OpenAI)
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: `The user tapped the image at coordinate (${x}, ${y}). Identify the exact food item at this location. Provide only a strict JSON response with no markdown formatting containing: {"name": string, "calories": number (per 100g), "protein_g": number, "carbs_g": number, "fat_g": number}` },
                { type: 'image_url', image_url: { url: imageBase64 } }
              ]
            }
          ],
          max_tokens: 300
        })
      });

      const data = await response.json();
      
      if (data.error) {
        console.error('OpenAI Error:', data.error);
        return err(res, data.error.message || 'AI Scan Failed', 500);
      }

      const rawText = data.choices[0].message.content;
      const parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());
      
      return ok(res, parsed, 'AI analysis complete');
    } catch (error) {
      console.error('OpenAI API Error:', error);
      return err(res, 'AI Scan Failed', 500);
    }
  }

  // ── MOCK AI FALLBACK (For immediate UI testing) ────────────────
  // Simulate 1.5 second API processing time
  await new Promise(resolve => setTimeout(resolve, 1500));

  const mockFoods = [
    { name: "Grilled Chicken Salad", calories: 340, protein_g: 35, carbs_g: 12, fat_g: 18 },
    { name: "Avocado Toast with Egg", calories: 420, protein_g: 18, carbs_g: 32, fat_g: 24 },
    { name: "Berry Protein Smoothie", calories: 280, protein_g: 25, carbs_g: 35, fat_g: 4 },
    { name: "Steak and Sweet Potato", calories: 550, protein_g: 42, carbs_g: 45, fat_g: 22 },
  ];

  const randomResult = mockFoods[Math.floor(Math.random() * mockFoods.length)];
  return ok(res, randomResult, 'Mock AI analysis complete. Add your Gemini Key to use the real AI!');
});

module.exports = {
  getDailySummary, logMeal, deleteMealLog,
  logWater, getWaterToday,
  searchFoods, addCustomFood,
  updateTargets, getWeeklyReport, analyzeFoodImage
};
