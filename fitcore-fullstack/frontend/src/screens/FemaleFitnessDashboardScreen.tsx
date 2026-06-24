import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { format } from 'date-fns';
import { supabase } from '../api/supabase';
import { DesignSystem, spacing, colors, typography } from '../theme/DesignSystem';

// --- MOCK SUPABASE TYPES & DATA ---
interface MacroGoals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface WorkoutStatus {
  completed: boolean;
  title: string;
  duration: number; // in minutes
}

const MOCK_FETCH_DELAY_MS = 2000;

// --- SKELETON LOADER COMPONENT ---
const SkeletonBlock = ({ width, height, borderRadius = 8, style }: any) => {
  const animatedValue = new Animated.Value(0);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: colors.surfaceLight,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

// --- MAIN SCREEN COMPONENT ---
export default function FemaleFitnessDashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [macros, setMacros] = useState<MacroGoals | null>(null);
  const [workout, setWorkout] = useState<WorkoutStatus | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('User not found');

        const todayStr = format(new Date(), 'yyyy-MM-dd');
        
        // Fetch Today's Nutrition (meal_logs)
        const { data: meals, error: mealsError } = await supabase
          .from('meal_logs')
          .select('calories, protein_g, carbs_g, fat_g')
          .eq('user_id', user.id)
          .eq('logged_at', todayStr);
          
        if (mealsError) console.error('Error fetching meals:', mealsError);

        let cals = 0, pro = 0, car = 0, fat = 0;
        if (meals) {
          meals.forEach((m: any) => {
            cals += Number(m.calories || 0);
            pro += Number(m.protein_g || 0);
            car += Number(m.carbs_g || 0);
            fat += Number(m.fat_g || 0);
          });
        }

        // Fetch Today's Workout (workout_logs)
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const { data: workouts, error: workoutsError } = await supabase
          .from('workout_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', startOfDay.toISOString())
          .order('created_at', { ascending: false })
          .limit(1);

        if (workoutsError) console.error('Error fetching workouts:', workoutsError);

        const todayWorkout = workouts?.[0];

        if (isMounted) {
          setMacros({
            calories: Math.round(cals),
            protein: Math.round(pro),
            carbs: Math.round(car),
            fats: Math.round(fat),
          });

          if (todayWorkout) {
            setWorkout({
              completed: true,
              title: todayWorkout.name || 'Custom Workout',
              duration: todayWorkout.duration_min || 0,
            });
          } else {
            // Default placeholder if no workout done today
            setWorkout({
              completed: false,
              title: 'Lower Body Sculpt & Tone',
              duration: 45,
            });
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        if (isMounted) setLoading(false);
      }
    };

    fetchDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  const renderSkeleton = () => (
    <View style={styles.content}>
      <SkeletonBlock width="40%" height={24} style={{ marginBottom: spacing.sm }} />
      <SkeletonBlock width="100%" height={120} borderRadius={16} style={{ marginBottom: spacing.md }} />
      
      <SkeletonBlock width="30%" height={24} style={{ marginBottom: spacing.sm }} />
      <View style={styles.macroContainer}>
        <SkeletonBlock width="48%" height={80} borderRadius={12} style={{ marginBottom: spacing.sm }} />
        <SkeletonBlock width="48%" height={80} borderRadius={12} style={{ marginBottom: spacing.sm }} />
        <SkeletonBlock width="48%" height={80} borderRadius={12} style={{ marginBottom: spacing.sm }} />
        <SkeletonBlock width="48%" height={80} borderRadius={12} style={{ marginBottom: spacing.sm }} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={typography.subheading}>Tuesday, Oct 24</Text>
          <Text style={typography.headerHuge}>Overview</Text>
        </View>

        {loading ? (
          renderSkeleton()
        ) : (
          <View style={styles.content}>
            {/* WORKOUT SECTION */}
            <View style={styles.section}>
              <Text style={typography.subheading}>Today's Plan</Text>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={typography.bodyLarge}>{workout?.title}</Text>
                  <Text style={typography.bodySmall}>{workout?.duration} min</Text>
                </View>
                <TouchableOpacity style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>
                    {workout?.completed ? 'Completed' : 'Start Workout'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* MACROS SECTION */}
            <View style={styles.section}>
              <Text style={typography.subheading}>Daily Nutrition</Text>
              <View style={styles.macroContainer}>
                <View style={styles.macroCard}>
                  <Text style={typography.bodyLarge}>{macros?.calories}</Text>
                  <Text style={typography.bodySmall}>Calories</Text>
                </View>
                <View style={styles.macroCard}>
                  <Text style={typography.bodyLarge}>{macros?.protein}g</Text>
                  <Text style={typography.bodySmall}>Protein</Text>
                </View>
                <View style={styles.macroCard}>
                  <Text style={typography.bodyLarge}>{macros?.carbs}g</Text>
                  <Text style={typography.bodySmall}>Carbs</Text>
                </View>
                <View style={styles.macroCard}>
                  <Text style={typography.bodyLarge}>{macros?.fats}g</Text>
                  <Text style={typography.bodySmall}>Fats</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingVertical: spacing.md,
  },
  header: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  content: {
    paddingHorizontal: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.accentPrimary,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  macroContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  macroCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
});
