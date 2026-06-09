# 🏋️ FitCore Pro — Full Stack Fitness App

**Backend:** Node.js + Express (In-Memory, no DB setup needed for testing!)  
**Frontend:** React Native + Expo  
**Auth:** JWT (Access + Refresh Token Rotation)

---

## ⚡ Quick Start (5 minutes)

### Step 1 — Start Backend
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```
✅ Server starts at **http://localhost:5000**  
✅ Test: open http://localhost:5000/health in browser

> **No PostgreSQL needed!** Backend uses in-memory store by default.
> To use PostgreSQL: set `USE_POSTGRES=true` in `.env` and run `schema.sql`

---

### Step 2 — Start Frontend
```bash
cd frontend
npm install
npx expo start
```
Then press:
- `a` for Android Emulator
- `i` for iOS Simulator
- `w` for Web browser

---

### Step 3 — Set API URL

Open `frontend/src/api/client.js` and set your IP:

```js
// Android Emulator
export const BASE_URL = 'http://10.0.2.2:5000/api/v1';

// iOS Simulator
export const BASE_URL = 'http://localhost:5000/api/v1';

// Physical Device (use your WiFi IP)
export const BASE_URL = 'http://192.168.1.XXX:5000/api/v1';
```

---

## 📁 Project Structure

```
fitcore-fullstack/
├── backend/
│   ├── server.js                  ← Entry point
│   ├── .env.example               ← Copy to .env
│   ├── package.json
│   └── src/
│       ├── config/
│       │   └── database.js        ← In-memory store / PostgreSQL switch
│       ├── controllers/
│       │   ├── authController.js      ← Register, Login, Refresh, Logout
│       │   ├── workoutController.js   ← Plans, Exercises, Logs
│       │   ├── nutritionController.js ← Meals, Water, Foods, Targets
│       │   └── progressController.js  ← Dashboard, Sleep, Goals, Body
│       ├── data/
│       │   ├── exercises.json     ← 12 exercises seed
│       │   ├── workoutPlans.json  ← 6 workout plans seed
│       │   └── foods.json         ← 12 foods seed
│       ├── middleware/
│       │   ├── auth.js            ← JWT protect middleware
│       │   └── errorHandler.js    ← Global error handler
│       ├── routes/
│       │   └── index.js           ← All routes in one file
│       └── utils/
│           ├── jwt.js             ← Token helpers
│           └── response.js        ← ok/err/paginated helpers
│
└── frontend/
    ├── App.js                     ← Entry point
    ├── package.json
    └── src/
        ├── api/
        │   ├── client.js          ← Axios instance + interceptors
        │   └── services.js        ← All API functions
        ├── screens/
        │   ├── LoginScreen.js
        │   ├── RegisterScreen.js
        │   ├── HomeScreen.js      ← Dashboard with live data
        │   ├── WorkoutsScreen.js  ← Browse & log workouts
        │   ├── NutritionScreen.js ← Log meals & water
        │   └── ProfileScreen.js   ← Profile + settings
        ├── navigation/
        │   └── RootNavigator.js   ← Tab + Stack navigation
        ├── store/
        │   └── authStore.js       ← Zustand auth state
        └── utils/
            └── theme.js           ← Colors & fonts
```

---

## 🔑 API Endpoints

| Method | Endpoint                    | Auth | Description            |
|--------|-----------------------------|------|------------------------|
| POST   | /api/v1/auth/register       | ✗    | Create account         |
| POST   | /api/v1/auth/login          | ✗    | Login → tokens         |
| POST   | /api/v1/auth/refresh        | ✗    | Rotate tokens          |
| POST   | /api/v1/auth/logout         | ✓    | Invalidate token       |
| GET    | /api/v1/auth/me             | ✓    | Get my profile         |
| PATCH  | /api/v1/auth/me             | ✓    | Update profile         |
| GET    | /api/v1/workouts/plans      | ✓    | Browse workout plans   |
| GET    | /api/v1/workouts/exercises  | ✓    | Exercise library       |
| POST   | /api/v1/workouts/logs       | ✓    | Log a workout          |
| GET    | /api/v1/workouts/logs       | ✓    | Workout history        |
| GET    | /api/v1/nutrition/daily     | ✓    | Today's nutrition      |
| POST   | /api/v1/nutrition/meals     | ✓    | Log a meal             |
| GET    | /api/v1/nutrition/foods     | ✓    | Search food DB         |
| POST   | /api/v1/nutrition/water     | ✓    | Log water              |
| GET    | /api/v1/progress/dashboard  | ✓    | Stats dashboard        |
| POST   | /api/v1/progress/measurements | ✓  | Body measurement       |
| POST   | /api/v1/sleep               | ✓    | Log sleep              |
| GET    | /api/v1/goals               | ✓    | My goals               |
| POST   | /api/v1/goals               | ✓    | Create goal            |

---

## 🧪 Quick API Test (curl)

```bash
# Register
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Ahmed Raza","email":"ahmed@test.com","password":"test123"}'

# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ahmed@test.com","password":"test123"}'

# Get workouts (use token from login)
curl http://localhost:5000/api/v1/workouts/plans \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔐 Auth Flow

```
1. Register/Login  →  access_token (15min) + refresh_token (30d)
2. All requests    →  Authorization: Bearer <access_token>
3. Token expired?  →  Auto-refresh via Axios interceptor
4. Logout          →  Token revoked in memory
```

---

## 🚀 Production (PostgreSQL)

1. Set `USE_POSTGRES=true` in `.env`
2. Fill in DB credentials
3. Run: `psql -U postgres -d fitcore_db -f ../../schema.sql`
4. Restart server

---

## 🛡️ Security Features
- JWT access + refresh token rotation
- bcrypt password hashing (cost 12)
- CORS, Helmet, Rate limiting
- Auto-logout on token expiry (frontend interceptor)
