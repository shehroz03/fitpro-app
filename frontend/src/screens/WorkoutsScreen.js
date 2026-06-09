import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, FlatList,
  StyleSheet, RefreshControl, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { workoutAPI } from '../api/services';
import { C } from '../utils/theme';

const CATS = ['All','strength','cardio','hiit','flexibility','core','recovery'];
const CAT_LABELS = { All:'All', strength:'Strength', cardio:'Cardio', hiit:'HIIT', flexibility:'Flex', core:'Core', recovery:'Recovery' };
const LEVEL_COLORS = { beginner:C.teal, intermediate:C.blue, advanced:C.red };
const CAT_ICONS    = { strength:'💪', cardio:'🏃', hiit:'🔥', flexibility:'🧘', core:'⚡', recovery:'🌿', yoga:'🧘' };

export default function WorkoutsScreen({ navigation }) {
  const [plans,    setPlans]   = useState([]);
  const [loading,  setLoading] = useState(true);
  const [refresh,  setRefresh] = useState(false);
  const [cat,      setCat]     = useState('All');
  const [search,   setSearch]  = useState('');
  const [logging,  setLogging] = useState(null); // plan.id being logged

  const load = useCallback(async () => {
    try {
      const params = {};
      if (cat !== 'All') params.category = cat;
      if (search)        params.search   = search;
      const res = await workoutAPI.getPlans(params);
      setPlans(res.data.data || []);
    } catch {
      Alert.alert('Error', 'Could not load workouts. Is the backend running?');
    } finally {
      setLoading(false);
      setRefresh(false);
    }
  }, [cat, search]);

  useEffect(() => { load(); }, [load]);

  const handleQuickLog = async (plan) => {
    setLogging(plan.id);
    try {
      await workoutAPI.logWorkout({
        plan_id: plan.id, name: plan.name, category: plan.category,
        started_at:      new Date(Date.now() - plan.duration_min * 60000).toISOString(),
        ended_at:        new Date().toISOString(),
        duration_min:    plan.duration_min,
        calories_burned: plan.calories,
        rating: 4,
      });
      Alert.alert('✅ Logged!', `${plan.name} saved to history!`);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Could not log workout');
    } finally {
      setLogging(null);
    }
  };

  const renderPlan = ({ item }) => {
    const color = LEVEL_COLORS[item.difficulty] || C.blue;
    const isLogging = logging === item.id;
    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => navigation.navigate('WorkoutDetail', { plan: item })}
        activeOpacity={0.82}
      >
        <View style={[s.iconBox, { backgroundColor:`${C.accent}15` }]}>
          <Text style={{ fontSize:24 }}>{CAT_ICONS[item.category] || '🏋️'}</Text>
        </View>
        <View style={{ flex:1 }}>
          <Text style={s.planName}>{item.name}</Text>
          <Text style={s.planMeta}>{item.duration_min} min • {item.calories} kcal</Text>
          <View style={s.badges}>
            <View style={[s.badge, { backgroundColor:`${color}20` }]}>
              <Text style={[s.badgeTxt, { color }]}>{item.difficulty}</Text>
            </View>
            {item.is_featured && (
              <View style={[s.badge, { backgroundColor:`${C.orange}20` }]}>
                <Text style={[s.badgeTxt, { color:C.orange }]}>Featured</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={[s.logBtn, isLogging && { opacity:0.6 }]}
          onPress={() => handleQuickLog(item)}
          disabled={!!logging}
        >
          {isLogging
            ? <ActivityIndicator size="small" color={C.accent} />
            : <Text style={s.logBtnTxt}>▶ Log</Text>
          }
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.topBar}>
        <View>
          <Text style={s.secLabel}>DISCOVER</Text>
          <Text style={s.title}>Workouts 🏋️</Text>
        </View>
      </View>

      {/* Search */}
      <TextInput
        style={s.search}
        placeholder="Search workouts..."
        placeholderTextColor={C.dim}
        value={search}
        onChangeText={setSearch}
      />

      {/* Category pills */}
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

      {/* Trending horizontal strip */}
      {cat === 'All' && plans.length > 0 && (
        <View style={{ marginBottom: 6 }}>
          <View style={s.trendRow}>
            <Text style={s.sectionTitle}>Trending Now 🔥</Text>
            <Text style={s.secLabel}>{plans.length} programs</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal:16, gap:10 }}>
            {plans.slice(0,3).map(p => (
              <TouchableOpacity key={p.id} style={s.trendCard}
                onPress={() => navigation.navigate('WorkoutDetail', { plan: p })}>
                <Text style={{ fontSize:30, marginBottom:8 }}>{CAT_ICONS[p.category]||'🏋️'}</Text>
                <Text style={s.trendName}>{p.name}</Text>
                <Text style={s.trendMeta}>{p.duration_min}m • {p.calories}kcal</Text>
                <View style={[s.badge, { backgroundColor:`${LEVEL_COLORS[p.difficulty]||C.blue}20`, marginTop:6 }]}>
                  <Text style={[s.badgeTxt, { color:LEVEL_COLORS[p.difficulty]||C.blue }]}>{p.difficulty}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
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
              onRefresh={() => { setRefresh(true); load(); }} tintColor={C.accent} />}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={{ fontSize:40, marginBottom:10 }}>😕</Text>
                <Text style={s.emptyTxt}>No workouts found</Text>
              </View>
            }
          />
        )
      }
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex:1, backgroundColor:C.bg },
  topBar:      { paddingHorizontal:16, paddingTop:16, marginBottom:10 },
  secLabel:    { color:C.muted, fontSize:10, fontWeight:'700', letterSpacing:1.2, textTransform:'uppercase' },
  title:       { color:C.text, fontSize:24, fontWeight:'900' },
  search:      { backgroundColor:C.card, borderRadius:12, borderWidth:1, borderColor:C.border,
                 marginHorizontal:16, paddingHorizontal:14, paddingVertical:11,
                 color:C.text, fontSize:14, marginBottom:10 },
  pillScroll:  { maxHeight:44, marginBottom:10 },
  pill:        { borderRadius:20, borderWidth:1, borderColor:C.border, paddingHorizontal:14,
                 paddingVertical:6, backgroundColor:C.card, alignSelf:'flex-start' },
  pillOn:      { backgroundColor:C.accent, borderColor:C.accent },
  pillTxt:     { fontSize:12, fontWeight:'700', color:C.muted },
  pillTxtOn:   { color:'#0A0A0F' },
  trendRow:    { flexDirection:'row', justifyContent:'space-between', alignItems:'center',
                 paddingHorizontal:16, marginBottom:10 },
  sectionTitle:{ color:C.text, fontSize:14, fontWeight:'700' },
  trendCard:   { width:150, backgroundColor:C.card2, borderRadius:16, padding:14,
                 borderWidth:1, borderColor:C.border },
  trendName:   { color:C.text, fontSize:12, fontWeight:'700', marginBottom:3 },
  trendMeta:   { color:C.muted, fontSize:11 },
  card:        { backgroundColor:C.card, borderRadius:16, borderWidth:1, borderColor:C.border,
                 padding:14, marginBottom:10, flexDirection:'row', alignItems:'center', gap:12 },
  iconBox:     { width:50, height:50, borderRadius:13, alignItems:'center', justifyContent:'center' },
  planName:    { color:C.text, fontSize:14, fontWeight:'700', marginBottom:2 },
  planMeta:    { color:C.muted, fontSize:12, marginBottom:6 },
  badges:      { flexDirection:'row', gap:6 },
  badge:       { borderRadius:8, paddingHorizontal:8, paddingVertical:2 },
  badgeTxt:    { fontSize:10, fontWeight:'700', textTransform:'capitalize' },
  logBtn:      { backgroundColor:C.accentDim, borderRadius:10, paddingHorizontal:12,
                 paddingVertical:8, borderWidth:1, borderColor:C.accent, minWidth:60, alignItems:'center' },
  logBtnTxt:   { color:C.accent, fontSize:12, fontWeight:'800' },
  empty:       { alignItems:'center', paddingTop:50 },
  emptyTxt:    { color:C.muted, fontSize:15 },
});
