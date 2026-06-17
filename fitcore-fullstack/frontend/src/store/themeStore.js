import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'fitcore_theme';

export const useThemeStore = create((set) => ({
  isDark: true,

  hydrate: async () => {
    try {
      const v = await AsyncStorage.getItem(KEY);
      // Default is always dark — only switch to light if user explicitly saved 'light'
      set({ isDark: v !== 'light' });
    } catch {}
  },

  setDark: (dark) => {
    AsyncStorage.setItem(KEY, dark ? 'dark' : 'light').catch(() => {});
    set({ isDark: dark });
  },

  toggle: () => {
    set((state) => {
      const next = !state.isDark;
      AsyncStorage.setItem(KEY, next ? 'dark' : 'light').catch(() => {});
      return { isDark: next };
    });
  },
}));
