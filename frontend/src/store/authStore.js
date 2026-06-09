import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../api/services';

export const useAuthStore = create((set, get) => ({
  user:         null,
  accessToken:  null,
  isLoading:    true,
  isLoggedIn:   false,

  // ── Hydrate from storage on app start ──────────────────────
  hydrate: async () => {
    try {
      const [token, userStr] = await AsyncStorage.multiGet(['access_token', 'user']);
      if (token[1] && userStr[1]) {
        set({ accessToken: token[1], user: JSON.parse(userStr[1]), isLoggedIn: true });
      }
    } catch {}
    set({ isLoading: false });
  },

  // ── Login ───────────────────────────────────────────────────
  login: async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    const { user, access_token, refresh_token } = data.data;
    await AsyncStorage.multiSet([
      ['access_token',  access_token],
      ['refresh_token', refresh_token],
      ['user',          JSON.stringify(user)],
    ]);
    set({ user, accessToken: access_token, isLoggedIn: true });
    return user;
  },

  // ── Register ────────────────────────────────────────────────
  register: async (payload) => {
    const { data } = await authAPI.register(payload);
    const { user, access_token, refresh_token } = data.data;
    await AsyncStorage.multiSet([
      ['access_token',  access_token],
      ['refresh_token', refresh_token],
      ['user',          JSON.stringify(user)],
    ]);
    set({ user, accessToken: access_token, isLoggedIn: true });
    return user;
  },

  // ── Logout ──────────────────────────────────────────────────
  logout: async () => {
    try {
      const rt = await AsyncStorage.getItem('refresh_token');
      await authAPI.logout(rt);
    } catch {}
    await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
    set({ user: null, accessToken: null, isLoggedIn: false });
  },

  // ── Update user in store ────────────────────────────────────
  setUser: async (user) => {
    set({ user });
    await AsyncStorage.setItem('user', JSON.stringify(user));
  },
}));
