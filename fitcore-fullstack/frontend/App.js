import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RootNavigator              from './src/navigation/RootNavigator';
import { useAuthStore }           from './src/store/authStore';
import ThemeTransitionOverlay     from './src/components/ThemeTransitionOverlay';
import { progressAPI, nutritionAPI, goalsAPI } from './src/api/services';

// Exported so external code can access the same instance
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60_000, retry: 1 } },
});

export default function App() {
  const hydrate = useAuthStore(s => s.hydrate);

  useEffect(() => {
    hydrate().then(() => {
      // Warm the cache while splash video is still playing so HomeScreen shows instantly
      if (!useAuthStore.getState().isLoggedIn) return;
      queryClient.prefetchQuery({ queryKey: ['dashboard'],      queryFn: () => progressAPI.getDashboard().then(r => r.data.data) });
      queryClient.prefetchQuery({ queryKey: ['dailyNutrition'], queryFn: () => nutritionAPI.getDailyStats().then(r => r.data.data) });
      queryClient.prefetchQuery({ queryKey: ['goals', 'active'], queryFn: () => goalsAPI.getAll('active').then(r => r.data.data || []) });
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="auto" backgroundColor="transparent" translucent />
        <RootNavigator />
        <ThemeTransitionOverlay />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
