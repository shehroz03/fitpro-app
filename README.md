# 🏋️ FitCore Pro — Full Stack Fitness App

**Frontend:** React Native + Expo  
**Backend:** Supabase (PostgreSQL)  
**Auth:** Supabase Auth

---

## ⚡ Quick Start (5 minutes)

### Step 1 — Start Frontend
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

## 📁 Project Structure

```
fitcore-fullstack/
└── frontend/
    ├── App.js                     ← Entry point
    ├── package.json
    └── src/
        ├── api/
        │   └── client.js          ← Supabase client connection
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

## 🚀 Supabase Setup

1. Create a new Supabase project.
2. Run `supabase-schema.sql` and `supabase-data-schema.sql` in the Supabase SQL Editor.
3. Add your Supabase URL and Anon Key to your frontend environment variables.

---

