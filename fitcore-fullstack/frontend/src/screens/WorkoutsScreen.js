import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  View, Text, ScrollView, TouchableOpacity, FlatList,
  StyleSheet, RefreshControl, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import Reanimated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { workoutAPI } from '../api/services';
import { useC } from '../utils/theme';
import { rf, rs, rw } from '../utils/responsive';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEntrance, useSpringPress } from '../utils/animations';

const CATS      = ['All','strength','cardio','hiit','flexibility','core','recovery'];
const CAT_LABELS = { All:'All', strength:'Strength', cardio:'Cardio', hiit:'HIIT', flexibility:'Flex', core:'Core', recovery:'Recovery' };
const CAT_MC_ICONS = {
  strength:    'dumbbell',
  cardio:      'run',
  hiit:        'lightning-bolt',
  flexibility: 'yoga',
  core:        'human-handsup',
  recovery:    'leaf',
  yoga:        'yoga',
};
const CatIcon = ({ category, size, color }) => (
  <MaterialCommunityIcons name={CAT_MC_ICONS[category] || 'weight-lifter'} size={size} color={color} />
);

export default function WorkoutsScreen({ navigation }) {
  const C = useC();
  const s = useMemo(() => makeStyles(C), [C]);
  const [cat,     setCat]     = useState('All');
  const [search,  setSearch]  = useState('');
  const [logging, setLogging] = useState(null);
  const queryClient = useQueryClient();

  const { data: plans = [], isLoading: loading, isRefetching: refresh, refetch } = useQuery({
    queryKey: ['workouts', cat, search],
    queryFn: () => {
      const params = {};
      if (cat !== 'All') params.category = cat;
      if (search)        params.search   = search;
      return workoutAPI.getPlans(params).then(r => r.data.data || []);
    },
  });

  const { mutateAsync: quickLog } = useMutation({
    mutationFn: (plan) => workoutAPI.logWorkout({
      plan_id: plan.id, name: plan.name, category: plan.category,
      started_at:      new Date(Date.now() - plan.duration_min * 60000).toISOString(),
      ended_at:        new Date().toISOString(),
      duration_min:    plan.duration_min,
      calories_burned: plan.calories,
      rating: 4,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  });

  const handleQuickLog = async (plan) => {
    setLogging(plan.id);
    try {
      await quickLog(plan);
      Alert.alert('Logged', `${plan.name} saved to history.`);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Could not log workout');
    } finally {
      setLogging(null);
    }
  };

  const renderPlan = ({ item }) => {
    const isLogging = logging === item.id;
    return (
      <WorkoutPlanCard item={item} isLogging={isLogging} s={s} C={C}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('WorkoutDetail', { plan: item }); }}
        onLog={() => handleQuickLog(item)} logging={logging} />
    );
  };

  const e0 = useEntrance(0);
  const e1 = useEntrance(1);
  const e2 = useEntrance(2);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <Reanimated.View style={e0}>
      <View style={s.topBar}>
        <View>
          <Text style={s.secLabel}>DISCOVER</Text>
          <Text style={s.title}>Workouts</Text>
        </View>
      </View>
      </Reanimated.View>

      {/* Search */}
      <Reanimated.View style={e1}>
      <TextInput
        style={s.search}
        placeholder="Search workouts..."
        placeholderTextColor={C.dim}
        value={search}
        onChangeText={setSearch}
      />
      </Reanimated.View>

      {/* Category pills */}
      <Reanimated.View style={e1}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={s.pillScroll} contentContainerStyle={{ paddingHorizontal:16, gap:8 }}>
        {CATS.map(c => (
          <TouchableOpacity key={c}
            style={[s.pill, cat===c && s.pillOn]}
            onPress={() => setCat(c)}
          >
            <Text style={[s.pillTxt, cat===c && s.pillTxtOn]}>{CAT_LABELS[c]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      </Reanimated.View>

      {/* Trending horizontal strip */}
      {cat === 'All' && plans.length > 0 && (
        <Reanimated.View style={e2}>
        <View style={{ marginBottom: 6 }}>
          <View style={s.trendRow}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
              <Ionicons name="flame" size={rf(14)} color={C.accent} />
              <Text style={s.sectionTitle}>Trending Now</Text>
            </View>
            <Text style={s.secLabel}>{plans.length} programs</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal:rs(16), gap:rs(10) }}>
            {plans.slice(0,3).map(p => (
              <TouchableOpacity key={p.id} style={s.trendCard}
                onPress={() => navigation.navigate('WorkoutDetail', { plan: p })}>
                <View style={[s.trendIconBox, { backgroundColor:C.accentDim }]}>
                  <CatIcon category={p.category} size={rf(22)} color={C.accent} />
                </View>
                <Text style={s.trendName}>{p.name}</Text>
                <Text style={s.trendMeta}>{p.duration_min}m • {p.calories}kcal</Text>
                <View style={[s.badge, { marginTop:6 }]}>
                  <Text style={s.badgeTxt}>{p.difficulty}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        </Reanimated.View>
      )}

      {/* All list */}
      <View style={s.trendRow}>
        <Text style={s.sectionTitle}>All Workouts</Text>
        <Text style={s.secLabel}>{plans.length} total</Text>
      </View>

      {loading
        ? <ActivityIndicator color={C.accent} style={{ marginTop:40 }} />
        : (
          <FlatList
            data={plans}
            keyExtractor={p => p.id}
            renderItem={renderPlan}
            contentContainerStyle={{ paddingHorizontal:16, paddingBottom:90 }}
            refreshControl={<RefreshControl refreshing={refresh}
              onRefresh={() => refetch()} tintColor={C.accent} />}
            ListEmptyComponent={
              <View style={s.empty}>
                <Ionicons name="search-outline" size={rf(40)} color={C.dim} style={{ marginBottom:10 }} />
                <Text style={s.emptyTxt}>No workouts found</Text>
              </View>
            }
          />
        )
      }
    </SafeAreaView>
  );
}

// ── Workout plan card with spring press ───────────────────────
function WorkoutPlanCard({ item, isLogging, s, C, onPress, onLog, logging }) {
  const { animStyle, onPressIn, onPressOut } = useSpringPress(0.97);
  return (
    <Reanimated.View style={animStyle}>
      <TouchableOpacity style={s.card} onPress={onPress}
        onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={1}>
        <View style={[s.iconBox, { backgroundColor:C.accentDim }]}>
          <CatIcon category={item.category} size={rf(24)} color={C.accent} />
        </View>
        <View style={{ flex:1 }}>
          <Text style={s.planName}>{item.name}</Text>
          <Text style={s.planMeta}>{item.duration_min} min • {item.calories} kcal</Text>
          <View style={s.badges}>
            <View style={s.badge}>
              <Text style={s.badgeTxt}>{item.difficulty}</Text>
            </View>
            {item.is_featured && (
              <View style={[s.badge, { backgroundColor:C.accentDim, borderColor:C.accent }]}>
                <Text style={[s.badgeTxt, { color:C.accent }]}>Featured</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity style={[s.logBtn, isLogging && { opacity:0.6 }]}
          onPress={onLog} disabled={!!logging}>
          {isLogging
            ? <ActivityIndicator size="small" color={C.accent} />
            : (
              <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                <Ionicons name="play" size={rf(11)} color={C.accent} />
                <Text style={s.logBtnTxt}>Log</Text>
              </View>
            )
          }
        </TouchableOpacity>
      </TouchableOpacity>
    </Reanimated.View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  root:        { flex:1, backgroundColor:C.bg },
  topBar:      { paddingHorizontal:rs(16), paddingTop:rs(12), marginBottom:rs(10) },
  secLabel:    { color:C.muted, fontSize:rf(10), fontWeight:'700', letterSpacing:1.2, textTransform:'uppercase' },
  title:       { color:C.text, fontSize:rf(24), fontWeight:'900' },
  search:      { backgroundColor:C.card, borderRadius:rw(12), borderWidth:1, borderColor:C.border,
                 marginHorizontal:rs(16), paddingHorizontal:rs(14), paddingVertical:rs(11),
                 color:C.text, fontSize:rf(14), marginBottom:rs(10) },
  pillScroll:  { maxHeight:rs(44), marginBottom:rs(10) },
  pill:        { borderRadius:20, borderWidth:1, borderColor:C.border, paddingHorizontal:rs(14),
                 paddingVertical:rs(6), backgroundColor:C.card, alignSelf:'flex-start' },
  pillOn:      { backgroundColor:C.accent, borderColor:C.accent },
  pillTxt:     { fontSize:rf(12), fontWeight:'700', color:C.muted },
  pillTxtOn:   { color:C.accentText },
  trendRow:    { flexDirection:'row', justifyContent:'space-between', alignItems:'center',
                 paddingHorizontal:rs(16), marginBottom:rs(10) },
  sectionTitle:{ color:C.text, fontSize:rf(14), fontWeight:'700' },
  trendCard:   { width:rw(150), backgroundColor:C.card2, borderRadius:rw(16), padding:rs(14),
                 borderWidth:1, borderColor:C.border },
  trendIconBox:{ width:rw(40), height:rw(40), borderRadius:rw(11), alignItems:'center',
                 justifyContent:'center', marginBottom:rs(8) },
  trendName:   { color:C.text, fontSize:rf(12), fontWeight:'700', marginBottom:rs(3) },
  trendMeta:   { color:C.muted, fontSize:rf(11) },
  card:        { backgroundColor:C.card, borderRadius:rw(16), borderWidth:1, borderColor:C.border,
                 padding:rs(14), marginBottom:rs(10), flexDirection:'row', alignItems:'center', gap:rs(12) },
  iconBox:     { width:rw(50), height:rw(50), borderRadius:rw(13), alignItems:'center', justifyContent:'center' },
  planName:    { color:C.text, fontSize:rf(14), fontWeight:'700', marginBottom:2 },
  planMeta:    { color:C.muted, fontSize:rf(12), marginBottom:rs(6) },
  badges:      { flexDirection:'row', gap:rs(6) },
  badge:       { borderRadius:8, paddingHorizontal:rs(8), paddingVertical:2,
                 backgroundColor:C.surfaceAlt ?? C.card2, borderWidth:1, borderColor:C.border },
  badgeTxt:    { fontSize:rf(10), fontWeight:'700', textTransform:'capitalize', color:C.muted },
  logBtn:      { backgroundColor:C.accentDim, borderRadius:rw(10), paddingHorizontal:rs(12),
                 paddingVertical:rs(8), borderWidth:1, borderColor:C.accent, minWidth:rw(60), alignItems:'center' },
  logBtnTxt:   { color:C.accent, fontSize:rf(12), fontWeight:'800' },
  empty:       { alignItems:'center', paddingTop:rs(50) },
  emptyTxt:    { color:C.muted, fontSize:rf(15) },
});
