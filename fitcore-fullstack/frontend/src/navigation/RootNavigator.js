import React, { useEffect, useState, useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore }        from '../store/authStore';
import { useThemeStore }       from '../store/themeStore';
import { useFrameStore }       from '../store/frameStore';
import { useC }                from '../utils/theme';
import HomeScreen              from '../screens/HomeScreen';
import WorkoutsScreen          from '../screens/WorkoutsScreen';
import NutritionScreen         from '../screens/NutritionScreen';
import ProfileScreen           from '../screens/ProfileScreen';
import GoalsScreen             from '../screens/GoalsScreen';
import WorkoutDetailScreen     from '../screens/WorkoutDetailScreen';
import AICoachScreen           from '../screens/AICoachScreen';
import LoginScreen             from '../screens/LoginScreen';
import RegisterScreen          from '../screens/RegisterScreen';
import OnboardingScreen, { onboardedKey } from '../screens/OnboardingScreen';
import QuizOnboarding from '../onboarding/QuizOnboarding';
import SplashVideoScreen from '../screens/SplashVideoScreen';
import SleepScreen             from '../screens/SleepScreen';
import FitnessTrackerScreen   from '../screens/FitnessTrackerScreen';
import YogaScreen             from '../screens/YogaScreen';
import YogaPoseDetailScreen   from '../screens/YogaPoseDetailScreen';
import DietDoctorScreen       from '../screens/DietDoctorScreen';
import VideoLibraryScreen    from '../screens/VideoLibraryScreen';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabIcon = ({ name, mcName, label, focused }) => {
  const C = useC();
  const color = focused ? C.accent : C.dim;
  const icon = mcName
    ? <MaterialCommunityIcons name={mcName} size={22} color={color} />
    : <Ionicons name={focused ? name : `${name}-outline`} size={22} color={color} />;
  return (
    <View style={{ alignItems:'center', gap:2 }}>
      <View style={focused
        ? { backgroundColor:C.accentDim, borderRadius:12, paddingHorizontal:12, paddingVertical:5 }
        : { paddingHorizontal:12, paddingVertical:5 }
      }>
        {icon}
      </View>
      <Text style={{ fontSize:9, fontWeight:'700', color }}>{label}</Text>
    </View>
  );
};

function MainTabs() {
  const C = useC();
  const isDark = useThemeStore(s => s.isDark);
  const insets = useSafeAreaInsets();
  const user = useAuthStore(s => s.user);
  const isFemale = user?.gender === 'female';
  const tabBarStyle = useMemo(() => ({
    backgroundColor: isDark ? 'rgba(10,10,15,0.97)' : 'rgba(255,255,255,0.97)',
    borderTopColor: C.border,
    height: 64 + insets.bottom,
    paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
    paddingTop: 8,
  }), [isDark, C.border, insets.bottom]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen name="Home"      component={HomeScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="home"       label="Home"      focused={focused} /> }} />
      <Tab.Screen name="Workouts"  component={WorkoutsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="barbell"    label="Workouts"  focused={focused} /> }} />
      <Tab.Screen name="Nutrition" component={NutritionScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="restaurant" label="Nutrition" focused={focused} /> }} />
      {isFemale && (
        <Tab.Screen name="Yoga" component={YogaScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon name="leaf" label="Yoga" focused={focused} /> }} />
      )}
      <Tab.Screen name="Profile"   component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="person"     label="Profile"   focused={focused} /> }} />
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
            <Text style={{ color: C.accent, fontSize: 28, lineHeight: 32 }}>&#8249;</Text>
          </TouchableOpacity>
        ),
      })}
    >
      <Stack.Screen name="Main"          component={MainTabs}            options={{ headerShown: false }} />
      <Stack.Screen name="Goals"         component={GoalsScreen}         options={{ headerShown: false }} />
      <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AICoach"       component={AICoachScreen}       options={{ headerShown: false }} />
      <Stack.Screen name="Sleep"         component={SleepScreen}         options={{ headerShown: false }} />
      <Stack.Screen name="Tracker"       component={FitnessTrackerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="YogaPoseDetail" component={YogaPoseDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DietDoctor"    component={DietDoctorScreen}    options={{ headerShown: false }} />
      <Stack.Screen name="VideoLibrary" component={VideoLibraryScreen}  options={{ headerShown: false }} />
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
  const hydrateTheme = useThemeStore(s => s.hydrate);
  const hydrateFrame = useFrameStore(s => s.hydrate);
  const [needsOnboarding, setNeedsOnboarding] = useState(null);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => { hydrateTheme(); hydrateFrame(); }, []);

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

  // isReady: splash holds until BOTH auth and onboarding check are done.
  // This runs concurrently with the video — no spinner after video ends.
  const isReady = !isLoading && (needsOnboarding !== null || !isLoggedIn);

  if (showSplash) {
    return (
      <SplashVideoScreen
        isReady={isReady}
        onDone={() => setShowSplash(false)}
      />
    );
  }

  // By the time showSplash becomes false, isReady is guaranteed true.
  // No loading gates needed here.
  return (
    <NavigationContainer>
      {!isLoggedIn
        ? <AuthStack />
        : needsOnboarding
          ? <QuizOnboarding onComplete={() => setNeedsOnboarding(false)} />
          : <AppStack />}
    </NavigationContainer>
  );
}
