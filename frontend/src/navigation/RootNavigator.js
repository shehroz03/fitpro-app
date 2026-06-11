import React, { useEffect, useState, useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuthStore }        from '../store/authStore';
import { useThemeStore }       from '../store/themeStore';
import { useC }                from '../utils/theme';
import HomeScreen              from '../screens/HomeScreen';
import WorkoutsScreen          from '../screens/WorkoutsScreen';
import NutritionScreen         from '../screens/NutritionScreen';
import ProfileScreen           from '../screens/ProfileScreen';
import GoalsScreen             from '../screens/GoalsScreen';
import SleepScreen             from '../screens/SleepScreen';
import WorkoutDetailScreen     from '../screens/WorkoutDetailScreen';
import LoginScreen             from '../screens/LoginScreen';
import RegisterScreen          from '../screens/RegisterScreen';
import OnboardingScreen, { onboardedKey } from '../screens/OnboardingScreen';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabIcon = ({ emoji, label, focused }) => {
  const C = useC();
  return (
    <View style={{ alignItems:'center', gap:2 }}>
      <View style={focused ? { backgroundColor:C.accentDim, borderRadius:12, paddingHorizontal:10, paddingVertical:4 } : { paddingHorizontal:10, paddingVertical:4 }}>
        <Text style={{ fontSize:20, opacity: focused ? 1 : 0.38 }}>{emoji}</Text>
      </View>
      <Text style={{ fontSize:9, fontWeight:'700', color: focused ? C.accent : C.dim }}>{label}</Text>
    </View>
  );
};

function MainTabs() {
  const C = useC();
  const isDark = useThemeStore(s => s.isDark);
  const tabBarStyle = useMemo(() => ({
    backgroundColor: isDark ? 'rgba(10,10,15,0.97)' : 'rgba(255,255,255,0.97)',
    borderTopColor: C.border,
    height: 72,
    paddingBottom: 10,
  }), [isDark, C.border]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen name="Home"      component={HomeScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Home"      focused={focused} /> }} />
      <Tab.Screen name="Workouts"  component={WorkoutsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏋️" label="Workouts" focused={focused} /> }} />
      <Tab.Screen name="Nutrition" component={NutritionScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🥗" label="Nutrition" focused={focused} /> }} />
      <Tab.Screen name="Sleep"     component={SleepScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="😴" label="Sleep"     focused={focused} /> }} />
      <Tab.Screen name="Profile"   component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profile"   focused={focused} /> }} />
    </Tab.Navigator>
  );
}

function AppStack() {
  const C = useC();
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle:         { backgroundColor: C.bg },
        headerTintColor:     C.text,
        headerTitleStyle:    { fontWeight: '700', color: C.text },
        headerShadowVisible: false,
        headerLeft: () => (
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingLeft: 4 }}>
            <Text style={{ color: C.accent, fontSize: 28, lineHeight: 32 }}>‹</Text>
          </TouchableOpacity>
        ),
      })}
    >
      <Stack.Screen name="Main"          component={MainTabs}           options={{ headerShown: false }} />
      <Stack.Screen name="Goals"         component={GoalsScreen}        options={{ title: 'My Goals' }} />
      <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} options={{ title: 'Workout', headerTransparent: false }} />
    </Stack.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login"    component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { isLoggedIn, isLoading, user } = useAuthStore();
  const C = useC();
  const hydrateTheme = useThemeStore(s => s.hydrate);
  const [needsOnboarding, setNeedsOnboarding] = useState(null);

  // Hydrate theme preference on first load
  useEffect(() => { hydrateTheme(); }, []);

  useEffect(() => {
    if (!isLoggedIn || !user?.id) { setNeedsOnboarding(null); return; }
    let alive = true;
    (async () => {
      const hasData = !!(user.gender && user.height_cm && user.weight_kg);
      let seen = false;
      try { seen = (await AsyncStorage.getItem(onboardedKey(user.id))) === '1'; } catch {}
      if (alive) setNeedsOnboarding(!hasData && !seen);
    })();
    return () => { alive = false; };
  }, [isLoggedIn, user?.id]);

  const loadingView = (
    <View style={{ flex:1, backgroundColor:C.bg, alignItems:'center', justifyContent:'center', gap:12 }}>
      <Text style={{ fontSize:56, fontWeight:'900', color:C.accent, letterSpacing:-2 }}>FC</Text>
      <Text style={{ color:C.text, fontSize:18, fontWeight:'800', letterSpacing:4 }}>FITCORE</Text>
      <ActivityIndicator color={C.accent} style={{ marginTop:8 }} />
      <Text style={{ color:C.muted, fontSize:12, position:'absolute', bottom:40 }}>FitCore Pro v1.0.0</Text>
    </View>
  );

  if (isLoading) return loadingView;
  if (isLoggedIn && needsOnboarding === null) return loadingView;

  return (
    <NavigationContainer>
      {!isLoggedIn
        ? <AuthStack />
        : needsOnboarding
          ? <OnboardingScreen onComplete={() => setNeedsOnboarding(false)} />
          : <AppStack />}
    </NavigationContainer>
  );
}
