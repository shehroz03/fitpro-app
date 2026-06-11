import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'fitcore_theme';

export const useThemeStore = create((set) => ({
  isDark: true,

  hydrate: async () => {
    try {
      const v = await AsyncStorage.getItem(KEY);
      if (v !== null) set({ isDark: v !== 'light' });
    } catch {}
  },

  toggle: () => {
    set((state) => {
      const next = !state.isDark;
      AsyncStorage.setItem(KEY, next ? 'dark' : 'light').catch(() => {});
      return { isDark: next };
    });
  },
}));
