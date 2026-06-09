const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { mem } = require('../config/database');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { ok, err, wrap } = require('../utils/response');

// ── REGISTER ─────────────────────────────────────────────────
const register = wrap(async (req, res) => {
  const { full_name, email, password, gender, date_of_birth } = req.body;

  if (!full_name || !email || !password)
    return err(res, 'full_name, email and password are required', 400);
  if (password.length < 6)
    return err(res, 'Password must be at least 6 characters', 400);
  if (mem.users.find(u => u.email === email.toLowerCase()))
    return err(res, 'An account with this email already exists', 409);

  const id            = uuidv4();
  const password_hash = await bcrypt.hash(password, 12);

  const user = {
    id, email: email.toLowerCase(), password_hash, full_name,
    gender: gender || null, date_of_birth: date_of_birth || null,
    is_active: true, is_premium: false, is_verified: false,
    unit_system: 'metric', timezone: 'Asia/Karachi',
    height_cm: null, weight_kg: null, body_fat_pct: null,
    muscle_mass_kg: null, bmi: null, fitness_level: 'beginner',
    bio: null, avatar_url: null,
    current_streak: 0, longest_streak: 0,
    target_calories: 2200, target_protein: 150,
    target_carbs: 220, target_fat: 70, target_water: 2500,
    created_at: new Date().toISOString(),
  };

  mem.users.push(user);

  const tokenPayload  = { userId: id, email: user.email };
  const access_token  = generateAccessToken(tokenPayload);
  const refresh_token = generateRefreshToken(tokenPayload);

  mem.refresh_tokens.push({
    id: uuidv4(), user_id: id, token: refresh_token,
    expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    revoked: false,
  });

  const { password_hash: _, ...safeUser } = user;
  ok(res, { user: safeUser, access_token, refresh_token, token_type: 'Bearer' },
     'Account created successfully', 201);
});

// ── LOGIN ─────────────────────────────────────────────────────
const login = wrap(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return err(res, 'Email and password are required', 400);

  const user = mem.users.find(u => u.email === email.toLowerCase());
  if (!user)          return err(res, 'Invalid email or password', 401);
  if (!user.is_active) return err(res, 'Account deactivated', 403);

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return err(res, 'Invalid email or password', 401);

  user.last_login_at = new Date().toISOString();

  const tokenPayload  = { userId: user.id, email: user.email };
  const access_token  = generateAccessToken(tokenPayload);
  const refresh_token = generateRefreshToken(tokenPayload);

  // Revoke old tokens for user
  mem.refresh_tokens.forEach(t => { if (t.user_id === user.id) t.revoked = true; });
  mem.refresh_tokens.push({
    id: uuidv4(), user_id: user.id, token: refresh_token,
    expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    revoked: false,
  });

  const { password_hash: _, ...safeUser } = user;
  ok(res, { user: safeUser, access_token, refresh_token, token_type: 'Bearer', expires_in: '15m' },
     'Login successful');
});

// ── REFRESH ───────────────────────────────────────────────────
const refreshToken = wrap(async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return err(res, 'refresh_token is required', 400);

  let decoded;
  try { decoded = verifyRefreshToken(refresh_token); }
  catch { return err(res, 'Invalid or expired refresh token', 401); }

  const stored = mem.refresh_tokens.find(
    t => t.token === refresh_token && !t.revoked && new Date(t.expires_at) > new Date()
  );
  if (!stored) return err(res, 'Refresh token no longer valid', 401);

  stored.revoked = true;

  const tokenPayload      = { userId: decoded.userId, email: decoded.email };
  const new_access_token  = generateAccessToken(tokenPayload);
  const new_refresh_token = generateRefreshToken(tokenPayload);

  mem.refresh_tokens.push({
    id: uuidv4(), user_id: decoded.userId, token: new_refresh_token,
    expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    revoked: false,
  });

  ok(res, { access_token: new_access_token, refresh_token: new_refresh_token, token_type: 'Bearer' },
     'Token refreshed');
});

// ── LOGOUT ────────────────────────────────────────────────────
const logout = wrap(async (req, res) => {
  const { refresh_token } = req.body;
  if (refresh_token) {
    const t = mem.refresh_tokens.find(t => t.token === refresh_token);
    if (t) t.revoked = true;
  }
  ok(res, null, 'Logged out successfully');
});

// ── GET ME ────────────────────────────────────────────────────
const getMe = wrap(async (req, res) => {
  const { password_hash: _, ...safeUser } = req.user;
  ok(res, safeUser);
});

// ── UPDATE PROFILE ────────────────────────────────────────────
const updateProfile = wrap(async (req, res) => {
  const user = mem.users.find(u => u.id === req.user.id);
  const allowed = ['full_name','gender','date_of_birth','phone','bio','unit_system',
                   'height_cm','weight_kg','body_fat_pct','muscle_mass_kg','fitness_level'];
  allowed.forEach(k => { if (req.body[k] !== undefined) user[k] = req.body[k]; });

  if (user.height_cm && user.weight_kg) {
    const h = user.height_cm / 100;
    user.bmi = parseFloat((user.weight_kg / (h * h)).toFixed(1));
  }
  user.updated_at = new Date().toISOString();
  const { password_hash: _, ...safeUser } = user;
  ok(res, safeUser, 'Profile updated');
});

// ── CHANGE PASSWORD ───────────────────────────────────────────
const changePassword = wrap(async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return err(res, 'Both passwords required', 400);
  const user  = mem.users.find(u => u.id === req.user.id);
  const valid = await bcrypt.compare(current_password, user.password_hash);
  if (!valid) return err(res, 'Current password incorrect', 400);
  user.password_hash = await bcrypt.hash(new_password, 12);
  mem.refresh_tokens.forEach(t => { if (t.user_id === user.id) t.revoked = true; });
  ok(res, null, 'Password changed. Please log in again.');
});

module.exports = { register, login, refreshToken, logout, getMe, updateProfile, changePassword };
