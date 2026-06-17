import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
  RefreshControl,
} from 'react-native';
import { nutritionAPI, progressAPI, sleepAPI, goalsAPI, aiCoachAPI } from '../api/services';
import { useAuthStore } from '../store/authStore';
import { useC } from '../utils/theme';
import { rf, rs, rw, SCREEN_W } from '../utils/responsive';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── helpers ──────────────────────────────────────────────────────────────────
const scoreColor = (score, C) =>
  score >= 80 ? C.teal : score >= 60 ? C.accent : score >= 40 ? C.orange : C.red;
const scoreLabel = (score) =>
  score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Work';

const METRICS = [
  { key: 'nutrition', ion: 'restaurant-outline', label: 'Nutrition'  },
  { key: 'workout',   ion: 'barbell-outline',    label: 'Workout'    },
  { key: 'sleep',     ion: 'moon-outline',       label: 'Sleep'      },
  { key: 'goals',     ion: 'flag-outline',       label: 'Goals'      },
];

const QUICK = [
  { label: 'Tomorrow Plan',   text: 'Create a detailed plan for tomorrow: exact meals with portions, workout with sets/reps, sleep schedule. Be specific.' },
  { label: 'Week Plan',       text: 'Create a complete 7-day fitness and nutrition plan for next week. Include daily workout types and calorie/macro targets for each day.' },
  { label: 'Meal Ideas',      text: 'Suggest 3 specific healthy meal ideas for tomorrow with approximate calories and macros. Keep them practical.' },
  { label: 'Workout Advice',  text: 'Based on my workout history and fitness level, what should I do tomorrow? Give me a full workout plan with sets, reps, and rest times.' },
  { label: 'Goal Strategy',   text: 'Analyze my goal progress in detail. Am I on track? What is the most important change I can make right now to reach my goals faster?' },
  { label: 'Sleep Improve',   text: 'Analyze my sleep data and give me 5 specific, actionable tips to improve my sleep quality for better recovery and performance.' },
  { label: 'Burn More Fat',   text: 'Based on my current data, give me a specific strategy to maximize fat burning this week. Include diet and training adjustments.' },
  { label: 'Coach Tip',       text: 'Give me one powerful, personalized coaching tip based on my data that will have the biggest impact on my fitness progress right now.' },
];

// ── ScoreRing ─────────────────────────────────────────────────────────────────
const ScoreRing = ({ score, color, mutedColor = '#888' }) => {
  const size = rw(110); // scales with screen width
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      borderWidth: rw(9), borderColor: color,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: color, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
      elevation: 6,
    }}>
      <Text style={{ fontSize: rf(28), fontWeight: '900', color }}>{score}</Text>
      <Text style={{ fontSize: rf(10), color: mutedColor, marginTop: -2 }}>/ 100</Text>
    </View>
  );
};

// ── MetricCard ────────────────────────────────────────────────────────────────
const MetricCard = ({ data, ion, label, C, s }) => {
  if (!data) return null;
  const color = scoreColor(data.score, C);
  const pct   = `${data.score}%`;
  return (
    <View style={s.metricCard}>
      <View style={s.metricTop}>
        <Ionicons name={ion} size={19} color={color} />
        <View style={[s.metricBadge, { backgroundColor: `${color}22` }]}>
          <Text style={[s.metricBadgeTxt, { color }]}>{scoreLabel(data.score)}</Text>
        </View>
      </View>
      <Text style={s.metricLabel}>{label}</Text>
      <View style={s.metricBarBg}>
        <View style={[s.metricBarFill, { width: pct, backgroundColor: color }]} />
      </View>
      <Text style={s.metricScore}>{data.score}<Text style={s.metricScoreOf}>/100</Text></Text>
      <Text style={s.metricSummary}>{data.summary}</Text>
    </View>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
export default function AICoachScreen({ navigation }) {
  const C = useC();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(C), [C]);
  const user = useAuthStore(st => st.user);

  const [tab,        setTab]        = useState('report');   // 'report' | 'chat'
  const [report,     setReport]     = useState(null);
  const [reportErr,  setReportErr]  = useState(null);
  const [reportLoad, setReportLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState('');
  const [chatLoad,   setChatLoad]   = useState(false);

  const scrollRef     = useRef(null);
  const msgId         = useRef(0);
  const inFlight      = useRef(false);   // guard against concurrent AI calls
  const hasLoadedRef  = useRef(false);   // ensure loadReport fires only once on mount
  const nextId        = () => ++msgId.current;

  // Max messages kept in chat — prevents unbounded memory growth in long sessions
  const MAX_MSGS = 40;

  // ── shared React Query cache — reuses data already fetched by other screens ──
  const { data: dashData, isLoading: dashLoading, isError: dashError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => progressAPI.getDashboard().then(r => r.data.data),
  });
  const { data: nutriData, isLoading: nutriLoading } = useQuery({
    queryKey: ['dailyNutrition'],
    queryFn: () => nutritionAPI.getDailyStats().then(r => r.data.data),
  });
  const { data: sleepLogsData = [], isLoading: sleepLoading } = useQuery({
    queryKey: ['sleepLogs'],
    queryFn: () => sleepAPI.getLogs().then(r => r.data.data || []),
  });
  const { data: activeGoals = [], isLoading: goalsLoading } = useQuery({
    queryKey: ['goals', 'active'],
    queryFn: () => goalsAPI.getAll('active').then(r => r.data.data || []),
  });

  const dataLoading = dashLoading || nutriLoading || sleepLoading || goalsLoading;

  const appData = useMemo(() => dashData ? {
    profile: {
      name:          user?.full_name   || 'User',
      age:           user?.age,
      gender:        user?.gender,
      height_cm:     user?.height_cm,
      weight_kg:     user?.weight_kg,
      bmi:           user?.bmi,
      fitness_level: user?.fitness_level || 'beginner',
    },
    todayNutrition: nutriData || null,
    dashboard:      dashData,
    recentSleep:    sleepLogsData.slice(0, 3),
    goals:          activeGoals,
  } : null, [dashData, nutriData, sleepLogsData, activeGoals, user]);

  // ── load daily report ────────────────────────────────────────────────────
  const loadReport = useCallback(async (data) => {
    setReportLoad(true);
    setReportErr(null);
    try {
      const res = await aiCoachAPI.analyze({
        mode: 'report',
        question: 'Generate my daily wellness report in the required JSON format.',
        appData: data,
      });
      if (res.report) {
        setReport(res.report);
      } else {
        setReportErr('Could not parse report. Try refreshing.');
      }
    } catch (e) {
      setReportErr(e.message?.includes('ANTHROPIC_API_KEY')
        ? 'ANTHROPIC_API_KEY not set in Supabase secrets.\n\nGo to: Dashboard → Settings → Edge Functions → Secrets\n\nAdd ANTHROPIC_API_KEY = sk-ant-...'
        : e.message || 'Failed to load report');
    } finally {
      setReportLoad(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (appData) loadReport(appData);
  }, [appData, loadReport]);

  // Trigger report once data is ready on initial mount
  useEffect(() => {
    if (appData && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadReport(appData);
    }
  }, [appData]);

  // If queries all failed, stop the spinner and show an error
  useEffect(() => {
    if (dashError && !hasLoadedRef.current) {
      setReportErr('Could not load fitness data. Check connection.');
      setReportLoad(false);
    }
  }, [dashError]);

  // ── chat ──────────────────────────────────────────────────────────────────
  const sendChat = useCallback(async (text) => {
    const trimmed = text.trim();
    // in-flight guard: reject if another AI call is already running
    if (!trimmed || chatLoad || inFlight.current) return;
    inFlight.current = true;
    setInput('');
    setChatLoad(true);
    // cap messages at MAX_MSGS to prevent unbounded memory growth
    setMessages(prev => {
      const trimmedList = prev.length >= MAX_MSGS ? prev.slice(prev.length - MAX_MSGS + 1) : prev;
      return [...trimmedList, { role: 'user', text: trimmed, id: nextId() }];
    });
    try {
      const res = await aiCoachAPI.analyze({ mode: 'chat', question: trimmed, appData });
      setMessages(prev => [...prev, { role: 'ai', text: res.response, id: nextId() }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: e.message, id: nextId() }]);
    } finally {
      setChatLoad(false);
      inFlight.current = false;
    }
  }, [chatLoad, appData]);

  useEffect(() => {
    if (scrollRef.current && tab === 'chat') {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    }
  }, [messages, chatLoad]);

  // ── Render Report Tab ─────────────────────────────────────────────────────
  const renderReport = () => {
    if (reportLoad) return (
      <View style={s.centerWrap}>
        <ActivityIndicator color={C.purple} size="large" />
        <Text style={s.centerTxt}>Analyzing your fitness data...</Text>
        <Text style={[s.centerTxt, { fontSize: 12, marginTop: 4 }]}>This may take 5–10 seconds</Text>
      </View>
    );
    if (reportErr) return (
      <View style={s.centerWrap}>
        <Ionicons name="alert-circle-outline" size={40} color={C.red} style={{ marginBottom: 12 }} />
        <Text style={[s.centerTxt, { color: C.red, textAlign: 'center', marginHorizontal: 24 }]}>{reportErr}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => appData && loadReport(appData)}>
          <Text style={s.retryBtnTxt}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
    if (!report) return null;

    const overall = report.overall_score ?? 0;
    const overallColor = scoreColor(overall, C);

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: rs(16), paddingBottom: rs(100) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />}
      >
        {/* ── Overall Score ── */}
        <View style={s.overallCard}>
          <View style={s.overallLeft}>
            <Text style={s.overallTitle}>Today's Wellness Score</Text>
            <Text style={s.overallDate}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
            <View style={[s.overallBadge, { backgroundColor: `${overallColor}22` }]}>
              <Text style={[s.overallBadgeTxt, { color: overallColor }]}>
                {scoreLabel(overall)} Overall
              </Text>
            </View>
          </View>
          <ScoreRing score={overall} color={overallColor} mutedColor={C.muted} />
        </View>

        {/* ── 4 Metric Cards ── */}
        <View style={s.metricsGrid}>
          {METRICS.map(m => (
            <MetricCard
              key={m.key}
              data={report[m.key]}
              ion={m.ion}
              label={m.label}
              C={C}
              s={s}
            />
          ))}
        </View>

        {/* ── Coach Message ── */}
        {report.coach_message && (
          <View style={s.coachMsgCard}>
            <View style={s.coachMsgHeader}>
              <View style={s.coachMsgIcon}>
                <MaterialCommunityIcons name="robot-outline" size={18} color={C.purple} />
              </View>
              <Text style={s.coachMsgTitle}>Coach Says</Text>
            </View>
            <Text style={s.coachMsgTxt}>{report.coach_message}</Text>
          </View>
        )}

        {/* ── Next Steps ── */}
        {report.next_steps?.length > 0 && (
          <View style={s.nextStepsCard}>
            <Text style={s.nextStepsTitle}>Action Plan for Tomorrow</Text>
            {report.next_steps.map((step, i) => (
              <View key={i} style={s.stepRow}>
                <View style={[s.stepNum, { backgroundColor: C.accent }]}>
                  <Text style={s.stepNumTxt}>{i + 1}</Text>
                </View>
                <Text style={s.stepTxt}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Per-metric tips ── */}
        <View style={s.tipsCard}>
          <Text style={s.tipsTitle}>Personalized Tips</Text>
          {METRICS.map(m => {
            const d = report[m.key];
            if (!d?.tip) return null;
            return (
              <View key={m.key} style={s.tipRow}>
                <View style={{ width: 28 }}>
                  <Ionicons name={m.ion} size={16} color={C.purple} />
                </View>
                <Text style={s.tipTxt}>{d.tip}</Text>
              </View>
            );
          })}
        </View>

        {/* ── Ask AI button ── */}
        <TouchableOpacity style={[s.askAiBtn, { flexDirection:'row', justifyContent:'center', alignItems:'center', gap:8 }]} onPress={() => setTab('chat')} activeOpacity={0.85}>
          <Ionicons name="chatbubble-ellipses-outline" size={17} color="#fff" />
          <Text style={s.askAiTxt}>Ask AI Coach a Question</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // ── Render Chat Tab ───────────────────────────────────────────────────────
  const renderChat = () => (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 10}
    >
      <ScrollView
        ref={scrollRef}
        style={s.msgList}
        contentContainerStyle={{ padding: rs(16), paddingBottom: rs(8) }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && (
          <View style={s.chatEmpty}>
            <MaterialCommunityIcons name="robot-outline" size={44} color={C.purple} style={{ marginBottom: 12 }} />
            <Text style={s.chatEmptyTitle}>Ask Me Anything</Text>
            <Text style={s.chatEmptyTxt}>I have your complete fitness data. Ask about your diet, workouts, sleep, goals, or request a personalized plan.</Text>
          </View>
        )}
        {messages.map(msg => (
          <View key={msg.id} style={[s.msgRow, msg.role === 'user' && s.msgRowUser]}>
            {msg.role === 'ai' && (
              <View style={s.botAvatarSmall}>
                <MaterialCommunityIcons name="robot-outline" size={13} color={C.purple} />
              </View>
            )}
            <View style={[s.bubble, msg.role === 'user' ? s.bubbleUser : s.bubbleBot]}>
              <Text style={[s.bubbleTxt, msg.role === 'user' ? s.bubbleTxtUser : s.bubbleTxtBot]}>
                {msg.text}
              </Text>
            </View>
          </View>
        ))}
        {chatLoad && (
          <View style={s.msgRow}>
            <View style={s.botAvatarSmall}>
              <MaterialCommunityIcons name="robot-outline" size={13} color={C.purple} />
            </View>
            <View style={[s.bubble, s.bubbleBot, { paddingVertical: 14, paddingHorizontal: 16 }]}>
              <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <View key={i} style={[s.typingDot, { opacity: 0.4 + i * 0.3 }]} />
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Quick chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={s.chipScroll} contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingVertical: 7 }}>
        {QUICK.map(q => (
          <TouchableOpacity key={q.label} style={[s.chip, chatLoad && s.chipOff]}
            onPress={() => sendChat(q.text)} disabled={chatLoad} activeOpacity={0.7}>
            <Text style={s.chipTxt}>{q.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Input bar */}
      <View style={s.inputBar}>
        <TextInput
          style={s.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask your AI coach..."
          placeholderTextColor={C.dim}
          multiline
          maxLength={500}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!input.trim() || chatLoad) && s.sendBtnOff]}
          onPress={() => sendChat(input)}
          disabled={!input.trim() || chatLoad}
        >
          <Ionicons name="send" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      {/* ── HEADER ── */}
      <View style={[s.header, { paddingTop: insets.top + rs(10) }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backTxt}>‹</Text>
        </TouchableOpacity>
        <View style={s.headerAiIcon}>
          <MaterialCommunityIcons name="robot-outline" size={20} color={C.purple} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>AI Coach</Text>
          <View style={s.onlineRow}>
            <View style={s.onlineDot} />
            <Text style={s.onlineTxt}>GPT-4o • Personal Trainer AI</Text>
          </View>
        </View>
        <View style={s.modelBadge}>
          <Text style={s.modelBadgeTxt}>AI</Text>
        </View>
      </View>

      {/* ── TABS ── */}
      <View style={s.tabs}>
        {[
          { key: 'report', label: 'Daily Report', ion: 'stats-chart-outline' },
          { key: 'chat',   label: 'Chat',         ion: 'chatbubble-outline' },
        ].map(t => (
          <TouchableOpacity key={t.key} style={[s.tab, tab === t.key && s.tabOn, { flexDirection:'row', gap:6 }]}
            onPress={() => setTab(t.key)}>
            <Ionicons name={t.ion} size={14} color={tab === t.key ? C.purple : C.muted} />
            <Text style={[s.tabTxt, tab === t.key && s.tabTxtOn]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── CONTENT ── */}
      <View style={{ flex: 1 }}>
        {tab === 'report' ? renderReport() : renderChat()}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const makeStyles = (C) => StyleSheet.create({
  root:            { flex: 1, backgroundColor: C.bg },

  // Header
  header:          { flexDirection: 'row', alignItems: 'center',
                     paddingHorizontal: rs(14), paddingTop: rs(14), paddingBottom: rs(12),
                     borderBottomWidth: 1, borderColor: C.border, backgroundColor: C.card, gap: rs(10) },
  backBtn:         { width: rs(32), justifyContent: 'center' },
  backTxt:         { color: C.accent, fontSize: rf(30), lineHeight: rf(36) },
  headerAiIcon:    { width: rw(40), height: rw(40), borderRadius: rw(20),
                     backgroundColor: `${C.purple}22`, alignItems: 'center', justifyContent: 'center',
                     borderWidth: 1, borderColor: `${C.purple}40` },
  headerTitle:     { color: C.text, fontSize: rf(16), fontWeight: '800' },
  onlineRow:       { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  onlineDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: C.teal },
  onlineTxt:       { color: C.muted, fontSize: rf(10) },
  modelBadge:      { backgroundColor: `${C.purple}22`, borderRadius: 8,
                     paddingHorizontal: rs(8), paddingVertical: rs(4),
                     borderWidth: 1, borderColor: `${C.purple}40` },
  modelBadgeTxt:   { color: C.purple, fontSize: rf(10), fontWeight: '800' },

  // Tabs
  tabs:            { flexDirection: 'row', backgroundColor: C.card,
                     borderBottomWidth: 1, borderColor: C.border },
  tab:             { flex: 1, paddingVertical: rs(12), alignItems: 'center' },
  tabOn:           { borderBottomWidth: 2, borderColor: C.purple },
  tabTxt:          { color: C.muted, fontSize: rf(13), fontWeight: '600' },
  tabTxtOn:        { color: C.purple, fontWeight: '800' },

  // Centered states
  centerWrap:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: rs(28), marginTop: rw(40) },
  centerTxt:       { color: C.muted, fontSize: rf(14), marginTop: rs(12), textAlign: 'center', lineHeight: rf(22) },
  retryBtn:        { marginTop: rs(20), backgroundColor: C.accent, borderRadius: 12,
                     paddingHorizontal: rs(24), paddingVertical: rs(11) },
  retryBtnTxt:     { color: '#0A0A0F', fontWeight: '800', fontSize: rf(14) },

  // Overall score card
  overallCard:     { backgroundColor: C.card, borderRadius: rw(18), borderWidth: 1,
                     borderColor: C.border, padding: rs(16), marginBottom: rs(12),
                     flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  overallLeft:     { flex: 1, marginRight: rs(14) },
  overallTitle:    { color: C.text, fontSize: rf(16), fontWeight: '800', marginBottom: rs(4) },
  overallDate:     { color: C.muted, fontSize: rf(12), marginBottom: rs(10) },
  overallBadge:    { borderRadius: 10, paddingHorizontal: rs(10), paddingVertical: rs(5), alignSelf: 'flex-start' },
  overallBadgeTxt: { fontSize: rf(12), fontWeight: '700' },

  // Metrics grid — 2 columns, responsive card width
  metricsGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: rs(10), marginBottom: rs(12) },
  metricCard:      { width: (SCREEN_W - rs(16) * 2 - rs(10)) / 2,
                     backgroundColor: C.card, borderRadius: rw(14), borderWidth: 1,
                     borderColor: C.border, padding: rs(12) },
  metricTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rs(6) },
  metricBadge:     { borderRadius: 7, paddingHorizontal: rs(7), paddingVertical: rs(3), maxWidth: '60%' },
  metricBadgeTxt:  { fontSize: rf(9), fontWeight: '700' },
  metricLabel:     { color: C.muted, fontSize: rf(10), fontWeight: '700', textTransform: 'uppercase',
                     letterSpacing: 0.5, marginBottom: rs(5) },
  metricBarBg:     { height: rs(5), backgroundColor: C.border, borderRadius: 3,
                     overflow: 'hidden', marginBottom: rs(6) },
  metricBarFill:   { height: '100%', borderRadius: 3 },
  metricScore:     { color: C.text, fontSize: rf(20), fontWeight: '900', marginBottom: rs(3) },
  metricScoreOf:   { color: C.dim, fontSize: rf(11), fontWeight: '400' },
  metricSummary:   { color: C.muted, fontSize: rf(11), lineHeight: rf(16) },

  // Coach message card
  coachMsgCard:    { backgroundColor: `${C.purple}12`, borderRadius: rw(16), borderWidth: 1,
                     borderColor: `${C.purple}35`, padding: rs(14), marginBottom: rs(12) },
  coachMsgHeader:  { flexDirection: 'row', alignItems: 'center', gap: rs(10), marginBottom: rs(8) },
  coachMsgIcon:    { width: rw(34), height: rw(34), borderRadius: rw(11),
                     backgroundColor: `${C.purple}25`, alignItems: 'center', justifyContent: 'center' },
  coachMsgTitle:   { color: C.purple, fontSize: rf(11), fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  coachMsgTxt:     { color: C.text, fontSize: rf(13), lineHeight: rf(21) },

  // Next steps card
  nextStepsCard:   { backgroundColor: C.card, borderRadius: rw(16), borderWidth: 1,
                     borderColor: C.border, padding: rs(14), marginBottom: rs(12) },
  nextStepsTitle:  { color: C.text, fontSize: rf(14), fontWeight: '800', marginBottom: rs(12) },
  stepRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: rs(10), marginBottom: rs(10) },
  stepNum:         { width: rw(24), height: rw(24), borderRadius: rw(12),
                     alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNumTxt:      { color: '#0A0A0F', fontSize: rf(11), fontWeight: '900' },
  stepTxt:         { color: C.text, fontSize: rf(13), lineHeight: rf(19), flex: 1 },

  // Tips card
  tipsCard:        { backgroundColor: C.card2, borderRadius: rw(16), borderWidth: 1,
                     borderColor: C.border, padding: rs(14), marginBottom: rs(14) },
  tipsTitle:       { color: C.text, fontSize: rf(14), fontWeight: '800', marginBottom: rs(10) },
  tipRow:          { flexDirection: 'row', alignItems: 'flex-start', gap: rs(10), marginBottom: rs(10) },
  tipTxt:          { color: C.muted, fontSize: rf(13), lineHeight: rf(19), flex: 1 },

  // Ask AI button
  askAiBtn:        { backgroundColor: `${C.purple}18`, borderRadius: rw(14), borderWidth: 1,
                     borderColor: `${C.purple}40`, paddingVertical: rs(14), alignItems: 'center' },
  askAiTxt:        { color: C.purple, fontSize: rf(14), fontWeight: '800' },

  // Chat
  msgList:         { flex: 1 },
  chatEmpty:       { alignItems: 'center', paddingTop: rs(40), paddingHorizontal: rs(20) },
  chatEmptyTitle:  { color: C.text, fontSize: rf(19), fontWeight: '800', marginBottom: rs(8) },
  chatEmptyTxt:    { color: C.muted, fontSize: rf(13), textAlign: 'center', lineHeight: rf(20) },
  msgRow:          { flexDirection: 'row', alignItems: 'flex-end', marginBottom: rs(12), gap: rs(8) },
  msgRowUser:      { flexDirection: 'row-reverse' },
  botAvatarSmall:  { width: rw(28), height: rw(28), borderRadius: rw(14),
                     backgroundColor: `${C.purple}22`, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bubble:          { maxWidth: '82%', borderRadius: rw(18), paddingHorizontal: rs(14), paddingVertical: rs(10) },
  bubbleBot:       { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderBottomLeftRadius: 4 },
  bubbleUser:      { backgroundColor: C.accent, borderBottomRightRadius: 4 },
  bubbleTxt:       { fontSize: rf(14), lineHeight: rf(21) },
  bubbleTxtBot:    { color: C.text },
  bubbleTxtUser:   { color: '#0A0A0F', fontWeight: '500' },
  typingDot:       { width: rw(8), height: rw(8), borderRadius: rw(4), backgroundColor: C.purple },
  chipScroll:      { maxHeight: rw(48), borderTopWidth: 0.5, borderColor: C.border },
  chip:            { backgroundColor: C.card2, borderRadius: rw(20), borderWidth: 1,
                     borderColor: C.border, paddingHorizontal: rs(13), paddingVertical: rs(7), alignSelf: 'flex-start' },
  chipOff:         { opacity: 0.4 },
  chipTxt:         { color: C.text, fontSize: rf(12), fontWeight: '600' },
  inputBar:        { flexDirection: 'row', alignItems: 'flex-end', gap: rs(10),
                     paddingHorizontal: rs(12), paddingVertical: rs(10), paddingBottom: rs(14),
                     borderTopWidth: 1, borderColor: C.border, backgroundColor: C.card },
  input:           { flex: 1, backgroundColor: C.bg, borderRadius: rw(22), borderWidth: 1,
                     borderColor: C.border, paddingHorizontal: rs(16), paddingVertical: rs(10),
                     color: C.text, fontSize: rf(14), maxHeight: rw(100) },
  sendBtn:         { width: rw(44), height: rw(44), borderRadius: rw(22),
                     backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  sendBtnOff:      { backgroundColor: C.border },
  sendIcon:        { color: '#0A0A0F', fontSize: rf(15), fontWeight: '900' },
});
