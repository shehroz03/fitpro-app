import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, TouchableOpacity } from 'react-native';

import { useAuthStore }        from '../store/authStore';
import HomeScreen              from '../screens/HomeScreen';
import WorkoutsScreen          from '../screens/WorkoutsScreen';
import NutritionScreen         from '../screens/NutritionScreen';
import ProfileScreen           from '../screens/ProfileScreen';
import GoalsScreen             from '../screens/GoalsScreen';
import SleepScreen             from '../screens/SleepScreen';
import WorkoutDetailScreen     from '../screens/WorkoutDetailScreen';
import LoginScreen             from '../screens/LoginScreen';
import RegisterScreen          from '../screens/RegisterScreen';
import { C }                   from '../utils/theme';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabIcon = ({ emoji, label, focused }) => (
  <View style={{ alignItems:'center', gap:2 }}>
    <Text style={{ fontSize:20, opacity: focused ? 1 : 0.38 }}>{emoji}</Text>
    <Text style={{ fontSize:9, fontWeight:'700', color: focused ? C.accent : C.dim }}>{label}</Text>
    {focused && <View style={{ width:4, height:4, borderRadius:2, backgroundColor:C.accent }} />}
  </View>
);

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(10,10,15,0.97)',
          borderTopColor: C.border,
          height: 72,
          paddingBottom: 10,
        },
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
  const { isLoggedIn, isLoading } = useAuthStore();

  if (isLoading) return (
    <View style={{ flex:1, backgroundColor:C.bg, alignItems:'center', justifyContent:'center' }}>
      <Text style={{ fontSize:52, fontWeight:'900', color:C.accent }}>FC</Text>
      <Text style={{ color:C.muted, marginTop:8, fontSize:13 }}>Loading FitCore Pro...</Text>
    </View>
  );

  return (
    <NavigationContainer>
      {isLoggedIn ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
