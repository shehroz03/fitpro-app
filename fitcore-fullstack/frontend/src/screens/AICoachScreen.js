import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
  RefreshControl,
} from 'react-native';
import { nutritionAPI, progressAPI, sleepAPI, goalsAPI, aiCoachAPI } from '../api/services';
import { useAuthStore } from '../store/authStore';
import { useC } from '../utils/theme';

// ── helpers ──────────────────────────────────────────────────────────────────
const scoreColor = (score, C) =>
  score >= 80 ? C.teal : score >= 60 ? C.accent : score >= 40 ? C.orange : C.red;
const scoreLabel = (score) =>
  score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Work';

const METRICS = [
  { key: 'nutrition', icon: '🍎', label: 'Nutrition'  },
  { key: 'workout',   icon: '💪', label: 'Workout'    },
  { key: 'sleep',     icon: '😴', label: 'Sleep'      },
  { key: 'goals',     icon: '🎯', label: 'Goals'      },
];

const QUICK = [
  { label: '📅 Kal Ka Plan',     text: 'Create a detailed plan for tomorrow: exact meals with portions, workout with sets/reps, sleep schedule. Be specific.' },
  { label: '📆 Week Plan',       text: 'Create a complete 7-day fitness and nutrition plan for next week. Include daily workout types and calorie/macro targets for each day.' },
  { label: '🍽️ Meal Ideas',      text: 'Suggest 3 specific healthy meal ideas for tomorrow with approximate calories and macros. Keep them practical.' },
  { label: '💪 Workout Advice',  text: 'Based on my workout history and fitness level, what should I do tomorrow? Give me a full workout plan with sets, reps, and rest times.' },
  { label: '⚖️ Goal Strategy',   text: 'Analyze my goal progress in detail. Am I on track? What is the most important change I can make right now to reach my goals faster?' },
  { label: '😴 Sleep Improve',   text: 'Analyze my sleep data and give me 5 specific, actionable tips to improve my sleep quality for better recovery and performance.' },
  { label: '🔥 Burn More Fat',   text: 'Based on my current data, give me a specific strategy to maximize fat burning this week. Include diet and training adjustments.' },
  { label: '💡 Coach Tip',       text: 'Give me one powerful, personalized coaching tip based on my data that will have the biggest impact on my fitness progress right now.' },
];

// ── ScoreRing ─────────────────────────────────────────────────────────────────
const ScoreRing = ({ score, color, size = 120, mutedColor = '#888' }) => (
  <View style={{
    width: size, height: size, borderRadius: size / 2,
    borderWidth: 10, borderColor: color,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: color, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  }}>
    <Text style={{ fontSize: size * 0.28, fontWeight: '900', color }}>{score}</Text>
    <Text style={{ fontSize: 10, color: mutedColor, marginTop: -4 }}>/ 100</Text>
  </View>
);

// ── MetricCard ────────────────────────────────────────────────────────────────
const MetricCard = ({ data, icon, label, C, s }) => {
  if (!data) return null;
  const color = scoreColor(data.score, C);
  const pct   = `${data.score}%`;
  return (
    <View style={s.metricCard}>
      <View style={s.metricTop}>
        <Text style={{ fontSize: 20 }}>{icon}</Text>
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
  const [appData,    setAppData]    = useState(null);

  const scrollRef  = useRef(null);
  const msgId      = useRef(0);
  const inFlight   = useRef(false);   // guard against concurrent AI calls
  const nextId     = () => ++msgId.current;

  // Max messages kept in chat — prevents unbounded memory growth in long sessions
  const MAX_MSGS = 40;

  // ── fetch all user fitness data (allSettled — one failure won't kill the rest) ──
  const fetchData = useCallback(async () => {
    const results = await Promise.allSettled([
      progressAPI.getDashboard(),
      nutritionAPI.getDailyStats(),
      sleepAPI.getLogs(),
      goalsAPI.getAll('active'),
    ]);
    const [dashR, nutR, sleepR, goalR] = results;
    return {
      profile: {
        name:          user?.full_name   || 'User',
        age:           user?.age,
        gender:        user?.gender,
        height_cm:     user?.height_cm,
        weight_kg:     user?.weight_kg,
        bmi:           user?.bmi,
        fitness_level: user?.fitness_level || 'beginner',
      },
      todayNutrition: nutR.status   === 'fulfilled' ? nutR.value?.data?.data   : null,
      dashboard:      dashR.status  === 'fulfilled' ? dashR.value?.data?.data  : null,
      recentSleep:    sleepR.status === 'fulfilled' ? (sleepR.value?.data?.data || []).slice(0, 3) : [],
      goals:          goalR.status  === 'fulfilled' ? (goalR.value?.data?.data  || []) : [],
    };
  }, [user]);

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

  useEffect(() => {
    fetchData().then(data => {
      if (data) { setAppData(data); loadReport(data); }
      else { setReportErr('Could not load fitness data. Check connection.'); setReportLoad(false); }
    });
  }, []);

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
      setMessages(prev => [...prev, { role: 'ai', text: `⚠️ ${e.message}`, id: nextId() }]);
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
        <Text style={{ fontSize: 40, marginBottom: 12 }}>⚠️</Text>
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
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
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
          <ScoreRing score={overall} color={overallColor} size={110} mutedColor={C.muted} />
        </View>

        {/* ── 4 Metric Cards ── */}
        <View style={s.metricsGrid}>
          {METRICS.map(m => (
            <MetricCard
              key={m.key}
              data={report[m.key]}
              icon={m.icon}
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
              <View style={s.coachMsgIcon}><Text style={{ fontSize: 18 }}>🤖</Text></View>
              <Text style={s.coachMsgTitle}>Coach Says</Text>
            </View>
            <Text style={s.coachMsgTxt}>{report.coach_message}</Text>
          </View>
        )}

        {/* ── Next Steps ── */}
        {report.next_steps?.length > 0 && (
          <View style={s.nextStepsCard}>
            <Text style={s.nextStepsTitle}>🎯 Action Plan for Tomorrow</Text>
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
          <Text style={s.tipsTitle}>💡 Personalized Tips</Text>
          {METRICS.map(m => {
            const d = report[m.key];
            if (!d?.tip) return null;
            return (
              <View key={m.key} style={s.tipRow}>
                <Text style={{ fontSize: 16, width: 28 }}>{m.icon}</Text>
                <Text style={s.tipTxt}>{d.tip}</Text>
              </View>
            );
          })}
        </View>

        {/* ── Ask AI button ── */}
        <TouchableOpacity style={s.askAiBtn} onPress={() => setTab('chat')} activeOpacity={0.85}>
          <Text style={s.askAiTxt}>💬 Ask AI Coach a Question</Text>
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
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && (
          <View style={s.chatEmpty}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>🤖</Text>
            <Text style={s.chatEmptyTitle}>Ask Me Anything</Text>
            <Text style={s.chatEmptyTxt}>I have your complete fitness data. Ask about your diet, workouts, sleep, goals, or request a personalized plan.</Text>
          </View>
        )}
        {messages.map(msg => (
          <View key={msg.id} style={[s.msgRow, msg.role === 'user' && s.msgRowUser]}>
            {msg.role === 'ai' && (
              <View style={s.botAvatarSmall}><Text style={{ fontSize: 13 }}>🤖</Text></View>
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
            <View style={s.botAvatarSmall}><Text style={{ fontSize: 13 }}>🤖</Text></View>
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
          <Text style={s.sendIcon}>▶</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      {/* ── HEADER ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backTxt}>‹</Text>
        </TouchableOpacity>
        <View style={s.headerAiIcon}><Text style={{ fontSize: 20 }}>🤖</Text></View>
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
          { key: 'report', label: '📊  Daily Report' },
          { key: 'chat',   label: '💬  Chat' },
        ].map(t => (
          <TouchableOpacity key={t.key} style={[s.tab, tab === t.key && s.tabOn]}
            onPress={() => setTab(t.key)}>
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
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
                     paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1,
                     borderColor: C.border, backgroundColor: C.card, gap: 10 },
  backBtn:         { width: 32 },
  backTxt:         { color: C.accent, fontSize: 30, lineHeight: 34 },
  headerAiIcon:    { width: 40, height: 40, borderRadius: 20, backgroundColor: `${C.purple}22`,
                     alignItems: 'center', justifyContent: 'center',
                     borderWidth: 1, borderColor: `${C.purple}40` },
  headerTitle:     { color: C.text, fontSize: 16, fontWeight: '800' },
  onlineRow:       { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  onlineDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: C.teal },
  onlineTxt:       { color: C.muted, fontSize: 10 },
  modelBadge:      { backgroundColor: `${C.purple}22`, borderRadius: 8, paddingHorizontal: 8,
                     paddingVertical: 4, borderWidth: 1, borderColor: `${C.purple}40` },
  modelBadgeTxt:   { color: C.purple, fontSize: 10, fontWeight: '800' },

  // Tabs
  tabs:            { flexDirection: 'row', backgroundColor: C.card,
                     borderBottomWidth: 1, borderColor: C.border },
  tab:             { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabOn:           { borderBottomWidth: 2, borderColor: C.purple },
  tabTxt:          { color: C.muted, fontSize: 13, fontWeight: '600' },
  tabTxtOn:        { color: C.purple, fontWeight: '800' },

  // Centered states
  centerWrap:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, marginTop: 60 },
  centerTxt:       { color: C.muted, fontSize: 14, marginTop: 12, textAlign: 'center', lineHeight: 20 },
  retryBtn:        { marginTop: 20, backgroundColor: C.accent, borderRadius: 12,
                     paddingHorizontal: 24, paddingVertical: 11 },
  retryBtnTxt:     { color: '#0A0A0F', fontWeight: '800', fontSize: 14 },

  // Overall score card
  overallCard:     { backgroundColor: C.card, borderRadius: 20, borderWidth: 1,
                     borderColor: C.border, padding: 20, marginBottom: 12,
                     flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  overallLeft:     { flex: 1, marginRight: 16 },
  overallTitle:    { color: C.text, fontSize: 17, fontWeight: '800', marginBottom: 4 },
  overallDate:     { color: C.muted, fontSize: 12, marginBottom: 10 },
  overallBadge:    { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start' },
  overallBadgeTxt: { fontSize: 12, fontWeight: '700' },

  // Metrics grid
  metricsGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  metricCard:      { width: '48%', backgroundColor: C.card, borderRadius: 16, borderWidth: 1,
                     borderColor: C.border, padding: 14 },
  metricTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  metricBadge:     { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  metricBadgeTxt:  { fontSize: 9, fontWeight: '700' },
  metricLabel:     { color: C.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
                     letterSpacing: 0.5, marginBottom: 6 },
  metricBarBg:     { height: 5, backgroundColor: C.border, borderRadius: 3,
                     overflow: 'hidden', marginBottom: 6 },
  metricBarFill:   { height: '100%', borderRadius: 3 },
  metricScore:     { color: C.text, fontSize: 22, fontWeight: '900', marginBottom: 4 },
  metricScoreOf:   { color: C.dim, fontSize: 12, fontWeight: '400' },
  metricSummary:   { color: C.muted, fontSize: 11, lineHeight: 15 },

  // Coach message card
  coachMsgCard:    { backgroundColor: `${C.purple}12`, borderRadius: 18, borderWidth: 1,
                     borderColor: `${C.purple}35`, padding: 16, marginBottom: 12 },
  coachMsgHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  coachMsgIcon:    { width: 36, height: 36, borderRadius: 12, backgroundColor: `${C.purple}25`,
                     alignItems: 'center', justifyContent: 'center' },
  coachMsgTitle:   { color: C.purple, fontSize: 12, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  coachMsgTxt:     { color: C.text, fontSize: 14, lineHeight: 21 },

  // Next steps card
  nextStepsCard:   { backgroundColor: C.card, borderRadius: 18, borderWidth: 1,
                     borderColor: C.border, padding: 16, marginBottom: 12 },
  nextStepsTitle:  { color: C.text, fontSize: 14, fontWeight: '800', marginBottom: 14 },
  stepRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  stepNum:         { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNumTxt:      { color: '#0A0A0F', fontSize: 12, fontWeight: '900' },
  stepTxt:         { color: C.text, fontSize: 13, lineHeight: 19, flex: 1 },

  // Tips card
  tipsCard:        { backgroundColor: C.card2, borderRadius: 18, borderWidth: 1,
                     borderColor: C.border, padding: 16, marginBottom: 14 },
  tipsTitle:       { color: C.text, fontSize: 14, fontWeight: '800', marginBottom: 12 },
  tipRow:          { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  tipTxt:          { color: C.muted, fontSize: 13, lineHeight: 18, flex: 1 },

  // Ask AI button
  askAiBtn:        { backgroundColor: `${C.purple}18`, borderRadius: 14, borderWidth: 1,
                     borderColor: `${C.purple}40`, paddingVertical: 14, alignItems: 'center' },
  askAiTxt:        { color: C.purple, fontSize: 14, fontWeight: '800' },

  // Chat
  msgList:         { flex: 1 },
  chatEmpty:       { alignItems: 'center', paddingTop: 50, paddingHorizontal: 20 },
  chatEmptyTitle:  { color: C.text, fontSize: 20, fontWeight: '800', marginBottom: 8 },
  chatEmptyTxt:    { color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  msgRow:          { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, gap: 8 },
  msgRowUser:      { flexDirection: 'row-reverse' },
  botAvatarSmall:  { width: 28, height: 28, borderRadius: 14, backgroundColor: `${C.purple}22`,
                     alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bubble:          { maxWidth: '82%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleBot:       { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderBottomLeftRadius: 4 },
  bubbleUser:      { backgroundColor: C.accent, borderBottomRightRadius: 4 },
  bubbleTxt:       { fontSize: 14, lineHeight: 21 },
  bubbleTxtBot:    { color: C.text },
  bubbleTxtUser:   { color: '#0A0A0F', fontWeight: '500' },
  typingDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: C.purple },
  chipScroll:      { maxHeight: 48, borderTopWidth: 0.5, borderColor: C.border },
  chip:            { backgroundColor: C.card2, borderRadius: 20, borderWidth: 1,
                     borderColor: C.border, paddingHorizontal: 13, paddingVertical: 7, alignSelf: 'flex-start' },
  chipOff:         { opacity: 0.4 },
  chipTxt:         { color: C.text, fontSize: 12, fontWeight: '600' },
  inputBar:        { flexDirection: 'row', alignItems: 'flex-end', gap: 10,
                     paddingHorizontal: 12, paddingVertical: 10, paddingBottom: 14,
                     borderTopWidth: 1, borderColor: C.border, backgroundColor: C.card },
  input:           { flex: 1, backgroundColor: C.bg, borderRadius: 22, borderWidth: 1,
                     borderColor: C.border, paddingHorizontal: 16, paddingVertical: 10,
                     color: C.text, fontSize: 14, maxHeight: 100 },
  sendBtn:         { width: 44, height: 44, borderRadius: 22, backgroundColor: C.accent,
                     alignItems: 'center', justifyContent: 'center' },
  sendBtnOff:      { backgroundColor: C.border },
  sendIcon:        { color: '#0A0A0F', fontSize: 15, fontWeight: '900' },
});
