import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'fitcore_frame_v1';

export const useFrameStore = create((set, get) => ({
  frameId: 'none',

  hydrate: async () => {
    try {
      const saved = await AsyncStorage.getItem(KEY);
      if (saved) set({ frameId: saved });
    } catch {}
  },

  setFrame: async (id) => {
    set({ frameId: id });
    try { await AsyncStorage.setItem(KEY, id); } catch {}
  },
}));
