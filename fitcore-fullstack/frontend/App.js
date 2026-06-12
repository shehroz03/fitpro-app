import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator   from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/authStore';

export default function App() {
  const hydrate = useAuthStore(s => s.hydrate);
  useEffect(() => { hydrate(); }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#0A0A0F" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
