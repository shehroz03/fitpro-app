import { create } from 'zustand';
import { supabase } from '../api/supabase';

// Fetch the user's profile row (created automatically by a DB trigger on signup)
async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export const useAuthStore = create((set, get) => ({
  user:        null,
  accessToken: null,
  isLoading:   true,
  isLoggedIn:  false,

  // ── Restore session on app start ────────────────────────────
  hydrate: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        set({ user: profile, accessToken: session.access_token, isLoggedIn: true });
      }
    } catch (e) {
      console.log('hydrate error:', e.message);
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Register ────────────────────────────────────────────────
  register: async ({ full_name, email, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name } },
    });
    if (error) throw new Error(error.message);
    if (!data.session) {
      // Happens when "Confirm email" is ON in Supabase. Turn it OFF for instant login.
      throw new Error('Account created. Please disable email confirmation in Supabase, or verify your email.');
    }
    const profile = await fetchProfile(data.user.id);
    set({ user: profile, accessToken: data.session.access_token, isLoggedIn: true });
    return profile;
  },

  // ── Login ───────────────────────────────────────────────────
  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    const profile = await fetchProfile(data.user.id);
    set({ user: profile, accessToken: data.session.access_token, isLoggedIn: true });
    return profile;
  },

  // ── Logout ──────────────────────────────────────────────────
  logout: async () => {
    try { await supabase.auth.signOut(); } catch {}
    set({ user: null, accessToken: null, isLoggedIn: false });
  },

  // ── Update profile fields ───────────────────────────────────
  setUser: async (updates) => {
    const current = get().user;
    if (!current) return;
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', current.id)
      .select()
      .single();
    if (!error && data) set({ user: data });
  },
}));
