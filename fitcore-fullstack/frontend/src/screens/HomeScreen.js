import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { progressAPI, nutritionAPI, goalsAPI } from '../api/services';
import { useAuthStore } from '../store/authStore';
import { useC } from '../utils/theme';
import { avatarSource } from '../utils/avatars';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'GOOD MORNING';
  if (h < 17) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
};

const TYPE_ICONS = { weight_loss:'⚖️', muscle_gain:'💪', endurance:'🏃', flexibility:'🧘', maintenance:'🎯' };

export default function HomeScreen({ navigation }) {
  const C = useC();
  const s = useMemo(() => makeStyles(C), [C]);
  const TYPE_COLORS = useMemo(() => ({
    weight_loss: C.orange, muscle_gain: C.blue, endurance: C.teal,
    flexibility: C.purple, maintenance: C.accent,
  }), [C]);

  const user = useAuthStore(st => st.user);
  const [stats,   setStats]   = useState(null);
  const [nutri,   setNutri]   = useState(null);
  const [goals,   setGoals]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [hr,      setHr]      = useState(72);

  const load = useCallback(async () => {
    try {
      const [sRes, nRes, gRes] = await Promise.all([
        progressAPI.getDashboard(),
        nutritionAPI.getDailyStats(),
        goalsAPI.getAll('active'),
      ]);
      setStats(sRes.data.data);
      setNutri(nRes.data.data);
      setGoals(gRes.data.data || []);
    } catch {
      Alert.alert('Connection Error', 'Failed to connect to the database. Please check your connection.');
    } finally {
      setLoading(false);
      setRefresh(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(() => setHr(70 + Math.floor(Math.random() * 12)), 2000);
    return () => clearInterval(t);
  }, []);

  const onRefresh = () => { setRefresh(true); load(); };

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={C.accent} />
      <Text style={s.loadText}>Loading dashboard...</Text>
    </View>
  );

  const streak        = stats?.streak?.current_streak      || 0;
  const totalWorkouts = stats?.workout_stats?.total_workouts || 0;
  const calConsumed   = Math.round(nutri?.consumed?.calories || 0);
  const calTarget     = nutri?.targets?.calories            || 2200;
  const calPct        = Math.min((calConsumed / calTarget) * 100, 100).toFixed(0);
  const weekly        = stats?.weekly_activity || [];
  const maxCal        = weekly.length > 0 ? Math.max(...weekly.map(d => d.calories || 0), 1) : 1;

  return (
    <ScrollView
      style={s.root}
      refreshControl={<RefreshControl refreshing={refresh} onRefresh={onRefresh} tintColor={C.accent} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── HEADER ───────────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>{getGreeting()}</Text>
          <Text style={s.name}>{user?.full_name?.split(' ')[0] || 'Champ'} 👋</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          {avatarSource(user?.avatar_url) ? (
            <Image source={avatarSource(user.avatar_url)} style={s.avatarImg} />
          ) : (
            <View style={s.avatar}>
              <Text style={s.avatarTxt}>
                {(user?.full_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── HERO CARD ─────────────────────────────────── */}
      <View style={s.heroCard}>
        <Text style={s.heroLabel}>TODAY'S GOAL</Text>
        <Text style={s.heroTitle}>Full Body Blast 💪</Text>
        <View style={s.heroRow}>
          {[['42','Minutes'],['420','Calories'],['8','Exercises']].map(([v,l]) => (
            <View key={l}><Text style={s.heroVal}>{v}</Text><Text style={s.heroUnit}>{l}</Text></View>
          ))}
        </View>
        <TouchableOpacity style={s.startBtn} onPress={() => navigation.navigate('Workouts')}>
          <Text style={s.startBtnTxt}>▶  Start Workout</Text>
        </TouchableOpacity>
      </View>

      {/* ── AI COACH ENTRY ────────────────────────────── */}
      <TouchableOpacity style={s.aiCoachCard} onPress={() => navigation.navigate('AICoach')} activeOpacity={0.85}>
        <View style={s.aiCoachLeft}>
          <View style={s.aiCoachIcon}><Text style={{ fontSize: 22 }}>🤖</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.aiCoachTitle}>AI Coach  <Text style={{ fontSize: 10, color:'#9B6DFF', fontWeight:'600' }}>GPT-4o</Text></Text>
            <Text style={s.aiCoachSub}>Wellness score • Daily report • Plans</Text>
          </View>
        </View>
        <View style={s.aiCoachBadge}>
          <Text style={s.aiCoachBadgeTxt}>Open ›</Text>
        </View>
      </TouchableOpacity>

      {/* ── QUICK ACTIONS ─────────────────────────────── */}
      <View style={s.quickRow}>
        {[
          { icon:'🍎', label:'Log Food',  screen:'Nutrition' },
          { icon:'😴', label:'Sleep',     screen:'Sleep'     },
          { icon:'🎯', label:'Goals',     screen:'Goals'     },
          { icon:'🏋️', label:'Workouts',  screen:'Workouts'  },
        ].map(q => (
          <TouchableOpacity key={q.label} style={s.quickBtn}
            onPress={() => navigation.navigate(q.screen)} activeOpacity={0.7}>
            <Text style={s.quickIcon}>{q.icon}</Text>
            <Text style={s.quickLabel}>{q.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── STATS GRID ────────────────────────────────── */}
      <View style={s.statGrid}>
        {[
          { emoji:'🔥', val:streak,        sub:'day streak' },
          { emoji:'❤️', val:hr,            sub:'bpm',        red:true },
          { emoji:'🏋️', val:totalWorkouts, sub:'workouts' },
        ].map(({ emoji, val, sub, red }) => (
          <View key={sub} style={s.statBox}>
            <Text style={s.statEmoji}>{emoji}</Text>
            <Text style={[s.statNum, red && { color:C.red }]}>{val}</Text>
            <Text style={s.statSub}>{sub}</Text>
          </View>
        ))}
      </View>

      {/* ── CALORIES ──────────────────────────────────── */}
      <View style={s.card}>
        <View style={s.row}>
          <Text style={s.cardTitle}>Calories Today</Text>
          <Text style={[s.cardTitle, { color:C.accent }]}>{calConsumed} / {calTarget}</Text>
        </View>
        <View style={s.barBg}>
          <View style={[s.barFill, { width:`${calPct}%` }]} />
        </View>
        <Text style={s.barSub}>{calPct}% of daily goal</Text>
      </View>

      {/* ── WEEKLY ACTIVITY ───────────────────────────── */}
      <View style={s.card}>
        <View style={s.row}>
          <Text style={s.cardTitle}>Weekly Activity</Text>
          <Text style={s.greenBadge}>
            {weekly.filter(d=>d.count>0).length} / 7 days
          </Text>
        </View>
        <View style={s.weekChart}>
          {weekly.length > 0
            ? weekly.map((d, i) => {
                const h   = Math.max(((d.calories||0)/maxCal)*52, 4);
                const isT = i === weekly.length - 1;
                const lbl = d.day_name ? d.day_name[0] : ['S','M','T','W','T','F','S'][new Date(d.date).getDay()];
                return (
                  <View key={d.date} style={s.barCol}>
                    <View style={[s.weekBar, { height:h, backgroundColor: isT ? C.accent : C.accentDim }]} />
                    <Text style={[s.dayLbl, isT && s.dayLblActive]}>{lbl}</Text>
                  </View>
                );
              })
            : ['M','T','W','T','F','S','S'].map((day,i) => (
                <View key={`${day}${i}`} style={s.barCol}>
                  <View style={[s.weekBar, { height:4, backgroundColor:C.border }]} />
                  <Text style={s.dayLbl}>{day}</Text>
                </View>
              ))
          }
        </View>
      </View>

      {/* ── ACTIVE GOALS ──────────────────────────────── */}
      <View style={s.card}>
        <View style={s.row}>
          <Text style={s.cardTitle}>Active Goals 🎯</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Goals')}>
            <Text style={s.seeAll}>See all ›</Text>
          </TouchableOpacity>
        </View>

        {goals.length === 0 ? (
          <TouchableOpacity style={s.emptyGoal} onPress={() => navigation.navigate('Goals')}>
            <Text style={{ fontSize: 28, marginBottom: 6 }}>🎯</Text>
            <Text style={s.emptyGoalTitle}>No active goals</Text>
            <Text style={s.emptyGoalSub}>Tap to set your first fitness goal!</Text>
          </TouchableOpacity>
        ) : (
          goals.slice(0, 3).map(goal => {
            const pct   = goal.target_value
              ? Math.min(((goal.current_value||0) / goal.target_value) * 100, 100)
              : 0;
            const color = TYPE_COLORS[goal.type] || C.accent;
            const daysLeft = goal.target_date
              ? Math.max(0, Math.ceil((new Date(goal.target_date) - new Date()) / 86400000))
              : null;
            return (
              <TouchableOpacity
                key={goal.id}
                style={s.goalRow}
                onPress={() => navigation.navigate('Goals')}
                activeOpacity={0.75}
              >
                <View style={[s.goalIconBox, { backgroundColor:`${color}18` }]}>
                  <Text style={{ fontSize:18 }}>{TYPE_ICONS[goal.type] || '🎯'}</Text>
                </View>
                <View style={{ flex:1 }}>
                  <View style={s.goalTopRow}>
                    <Text style={s.goalTitle} numberOfLines={1}>{goal.title}</Text>
                    {daysLeft !== null && (
                      <Text style={[s.daysLeft, daysLeft <= 7 && { color:C.red }]}>
                        {daysLeft === 0 ? 'Today!' : `${daysLeft}d`}
                      </Text>
                    )}
                  </View>
                  {goal.target_value ? (
                    <>
                      <View style={s.goalBarBg}>
                        <View style={[s.goalBarFill, { width:`${pct}%`, backgroundColor:color }]} />
                      </View>
                      <View style={s.goalBottomRow}>
                        <Text style={[s.goalPct, { color }]}>{pct.toFixed(0)}%</Text>
                        <Text style={s.goalVals}>
                          {goal.current_value||0} / {goal.target_value} {goal.unit||''}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <Text style={s.goalInProgress}>In progress</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {goals.length > 0 && (
          <TouchableOpacity style={s.addGoalBtn} onPress={() => navigation.navigate('Goals')}>
            <Text style={s.addGoalTxt}>+ Add New Goal</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── AI COACH ──────────────────────────────────── */}
      <View style={s.aiCard}>
        <View style={s.aiIcon}><Text style={{ fontSize:18 }}>🤖</Text></View>
        <View style={{ flex:1 }}>
          <Text style={s.aiLabel}>AI COACH SAYS</Text>
          <Text style={s.aiText}>
            {goals.length > 0 && goals[0].target_value
              ? `Goal "${goals[0].title}" is ${Math.min(Math.round(((goals[0].current_value||0)/goals[0].target_value)*100),100)}% done. Keep pushing! 🔥`
              : streak >= 3
                ? `${streak}-day streak! 🔥 You're on fire! Keep it up!`
                : 'Set goals and log workouts to get personalized coaching tips!'}
          </Text>
        </View>
      </View>

      {/* ── SLEEP ─────────────────────────────────────── */}
      {stats?.last_sleep && (
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.cardTitle}>Last Night's Sleep 😴</Text>
            <View style={[s.badge, { backgroundColor:`${C.teal}22` }]}>
              <Text style={[s.badgeTxt, { color:C.teal }]}>
                {(stats.last_sleep.quality_score||0) >= 70 ? 'Good' : 'Fair'}
              </Text>
            </View>
          </View>
          <Text style={s.sleepDur}>
            {Math.floor((stats.last_sleep.duration_min||0)/60)}
            <Text style={s.sleepUnit}>h </Text>
            {(stats.last_sleep.duration_min||0)%60}
            <Text style={s.sleepUnit}>m</Text>
          </Text>
        </View>
      )}

      {!stats?.last_sleep && (
        <TouchableOpacity style={s.card} onPress={() => navigation.navigate('Sleep')}>
          <Text style={s.cardTitle}>Sleep 😴</Text>
          <Text style={s.emptyGoalSub}>Tap to log last night's sleep</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  root:          { flex:1, backgroundColor:C.bg, paddingHorizontal:16 },
  center:        { flex:1, backgroundColor:C.bg, alignItems:'center', justifyContent:'center' },
  loadText:      { color:C.muted, marginTop:12 },
  header:        { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingTop:16, marginBottom:18 },
  greeting:      { color:C.muted, fontSize:11, fontWeight:'700', letterSpacing:1.2 },
  name:          { color:C.text, fontSize:24, fontWeight:'900' },
  avatar:        { width:42, height:42, borderRadius:21, backgroundColor:C.accent, alignItems:'center', justifyContent:'center' },
  avatarImg:     { width:42, height:42, borderRadius:21, borderWidth:2, borderColor:C.accent },
  avatarTxt:     { fontSize:14, fontWeight:'900', color:'#0A0A0F' },
  aiCoachCard:     { backgroundColor:`${C.purple}18`, borderRadius:18, borderWidth:1,
                     borderColor:`${C.purple}50`, padding:14, marginBottom:12,
                     flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  aiCoachLeft:     { flexDirection:'row', alignItems:'center', gap:12 },
  aiCoachIcon:     { width:44, height:44, borderRadius:14, backgroundColor:`${C.purple}25`,
                     alignItems:'center', justifyContent:'center' },
  aiCoachTitle:    { color:C.text, fontSize:15, fontWeight:'800' },
  aiCoachSub:      { color:C.muted, fontSize:11, marginTop:1 },
  aiCoachBadge:    { backgroundColor:C.purple, borderRadius:10, paddingHorizontal:12, paddingVertical:6 },
  aiCoachBadgeTxt: { color:'#fff', fontSize:12, fontWeight:'800' },
  quickRow:        { flexDirection:'row', gap:8, marginBottom:12 },
  quickBtn:      { flex:1, backgroundColor:C.card, borderRadius:14, borderWidth:1,
                   borderColor:C.border, paddingVertical:11, alignItems:'center', gap:3 },
  quickIcon:     { fontSize:20 },
  quickLabel:    { color:C.muted, fontSize:9, fontWeight:'700' },
  heroCard:      { backgroundColor:C.accent, borderRadius:22, padding:20, marginBottom:12, overflow:'hidden' },
  heroLabel:     { fontSize:10, fontWeight:'700', color:'rgba(0,0,0,0.5)', letterSpacing:1, marginBottom:4 },
  heroTitle:     { fontSize:20, fontWeight:'900', color:'#0A0A0F', marginBottom:14 },
  heroRow:       { flexDirection:'row', gap:20, marginBottom:16 },
  heroVal:       { fontSize:20, fontWeight:'900', color:'#0A0A0F' },
  heroUnit:      { fontSize:10, color:'rgba(0,0,0,0.5)' },
  startBtn:      { backgroundColor:'rgba(0,0,0,0.14)', borderRadius:11, paddingVertical:10, paddingHorizontal:16, alignSelf:'flex-start' },
  startBtnTxt:   { fontSize:13, fontWeight:'800', color:'#0A0A0F' },
  statGrid:      { flexDirection:'row', gap:8, marginBottom:12 },
  statBox:       { flex:1, backgroundColor:C.card, borderRadius:14, borderWidth:1, borderColor:C.border, paddingVertical:14, alignItems:'center' },
  statEmoji:     { fontSize:18, marginBottom:4 },
  statNum:       { fontSize:20, fontWeight:'900', color:C.text },
  statSub:       { fontSize:9, color:C.dim, marginTop:2 },
  card:          { backgroundColor:C.card, borderRadius:18, borderWidth:1, borderColor:C.border, padding:16, marginBottom:12 },
  row:           { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:10 },
  cardTitle:     { fontSize:14, fontWeight:'700', color:C.text },
  seeAll:        { color:C.accent, fontSize:13, fontWeight:'700' },
  greenBadge:    { color:C.accent, fontSize:12, fontWeight:'700', backgroundColor:C.accentDim, paddingHorizontal:8, paddingVertical:3, borderRadius:10 },
  badge:         { borderRadius:10, paddingHorizontal:10, paddingVertical:3 },
  badgeTxt:      { fontSize:11, fontWeight:'700' },
  barBg:         { height:8, backgroundColor:C.border, borderRadius:4, marginBottom:6, overflow:'hidden' },
  barFill:       { height:'100%', backgroundColor:C.accent, borderRadius:4 },
  barSub:        { color:C.muted, fontSize:12 },
  weekChart:     { flexDirection:'row', alignItems:'flex-end', gap:5, height:72, marginTop:10 },
  barCol:        { flex:1, alignItems:'center', gap:4 },
  weekBar:       { width:'100%', borderRadius:3 },
  dayLbl:        { fontSize:10, color:C.dim },
  dayLblActive:  { color:C.accent, fontWeight:'700' },
  goalRow:       { flexDirection:'row', alignItems:'center', gap:12, paddingVertical:10, borderBottomWidth:0.5, borderColor:C.border },
  goalIconBox:   { width:40, height:40, borderRadius:12, alignItems:'center', justifyContent:'center', flexShrink:0 },
  goalTopRow:    { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:6 },
  goalTitle:     { color:C.text, fontSize:13, fontWeight:'700', flex:1, marginRight:6 },
  daysLeft:      { color:C.muted, fontSize:11, fontWeight:'600' },
  goalBarBg:     { height:5, backgroundColor:C.border, borderRadius:3, overflow:'hidden', marginBottom:4 },
  goalBarFill:   { height:'100%', borderRadius:3 },
  goalBottomRow: { flexDirection:'row', justifyContent:'space-between' },
  goalPct:       { fontSize:11, fontWeight:'800' },
  goalVals:      { color:C.dim, fontSize:11 },
  goalInProgress:{ color:C.muted, fontSize:11 },
  emptyGoal:     { alignItems:'center', paddingVertical:20 },
  emptyGoalTitle:{ color:C.text, fontSize:15, fontWeight:'700', marginBottom:4 },
  emptyGoalSub:  { color:C.muted, fontSize:13, textAlign:'center' },
  addGoalBtn:    { backgroundColor:C.accentDim, borderRadius:12, paddingVertical:10, alignItems:'center', borderWidth:1, borderColor:C.accent, marginTop:8 },
  addGoalTxt:    { color:C.accent, fontSize:13, fontWeight:'800' },
  aiCard:        { backgroundColor:`${C.purple}18`, borderRadius:18, borderWidth:1, borderColor:`${C.purple}40`, padding:14, marginBottom:12, flexDirection:'row', gap:12, alignItems:'flex-start' },
  aiIcon:        { width:36, height:36, borderRadius:11, backgroundColor:`${C.purple}30`, alignItems:'center', justifyContent:'center' },
  aiLabel:       { color:C.purple, fontSize:10, fontWeight:'700', letterSpacing:1, marginBottom:3 },
  aiText:        { color:C.text, fontSize:13, lineHeight:19 },
  sleepDur:      { fontSize:26, fontWeight:'900', color:C.text, marginTop:6 },
  sleepUnit:     { color:C.muted, fontSize:14, fontWeight:'400' },
});
