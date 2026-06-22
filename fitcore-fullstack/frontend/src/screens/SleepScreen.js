import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  TextInput, StyleSheet, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { sleepAPI } from '../api/services';
import { useC } from '../utils/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const qualColor = (score, C) => score >= 80 ? C.teal : score >= 60 ? C.accent : score >= 40 ? C.orange : C.red;
const qualLabel = (s) => s >= 80 ? 'Excellent' : s >= 60 ? 'Good' : s >= 40 ? 'Fair' : 'Poor';
const fmtDur    = (min) => min ? `${Math.floor(min/60)}h ${min%60}m` : '—';
const fmtTime   = (iso) => iso ? new Date(iso).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : '—';
const fmtDate   = (iso) => iso ? new Date(iso).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}) : '—';

const SLEEP_TIPS = [
  { ion:'clock-outline',          tip:'Sleep & wake at the same time every day' },
  { ion:'cellphone-off',          tip:'No screens 1 hour before bedtime' },
  { ion:'thermometer-low',        tip:'Keep room cool — 18-20°C is optimal' },
  { ion:'meditation',             tip:'10 min meditation before sleep' },
  { ion:'coffee-off-outline',     tip:'No caffeine after 2 PM' },
  { ion:'dumbbell',               tip:'Avoid intense exercise within 3 hours of sleep' },
];

export default function SleepScreen({ navigation, route }) {
  const C = useC();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(C), [C]);
  const queryClient = useQueryClient();
  const [showAdd,   setShowAdd]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [form,      setForm]      = useState({
    sleep_start:'', sleep_end:'', quality_score:'80',
    deep_sleep_min:'', rem_sleep_min:'', notes:'',
  });
  const [activeTab, setActiveTab] = useState('logs');

  const { data: logs = [], isLoading: logsLoading, isRefetching: logsRefreshing, refetch: refetchLogs } = useQuery({
    queryKey: ['sleepLogs'],
    queryFn: () => sleepAPI.getLogs().then(r => r.data.data || []),
  });
  const { data: stats = null, isLoading: statsLoading, isRefetching: statsRefreshing, refetch: refetchStats } = useQuery({
    queryKey: ['sleepStats'],
    queryFn: () => sleepAPI.getStats().then(r => r.data.data || null),
  });

  const loading = logsLoading || statsLoading;
  const refresh = logsRefreshing || statsRefreshing;
  const onRefresh = () => { refetchLogs(); refetchStats(); };

  const invalidateSleep = () => {
    queryClient.invalidateQueries({ queryKey: ['sleepLogs'] });
    queryClient.invalidateQueries({ queryKey: ['sleepStats'] });
  };

  const { mutateAsync: logSleepMutation } = useMutation({
    mutationFn: (payload) => sleepAPI.logSleep(payload),
    onSuccess: invalidateSleep,
  });

  const { mutateAsync: deleteLogMutation } = useMutation({
    mutationFn: (id) => sleepAPI.deleteLog(id),
    onSuccess: invalidateSleep,
  });

  // Prefill current time helpers
  // Format local datetime as YYYY-MM-DDTHH:MM:SS (local, not UTC)
  const fmtLocal = (d) => {
    const pad = (n) => String(n).padStart(2,'0');
    return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes())+':00';
  };

  const prefillTonight = () => {
    const bed  = new Date(); bed.setHours(23,0,0,0);
    const wake = new Date(); wake.setDate(wake.getDate()+1); wake.setHours(7,0,0,0);
    setForm(p => ({ ...p, sleep_start:fmtLocal(bed), sleep_end:fmtLocal(wake) }));
  };

  const prefillLastNight = () => {
    const bed  = new Date(); bed.setDate(bed.getDate()-1); bed.setHours(23,0,0,0);
    const wake = new Date(); wake.setHours(7,0,0,0);
    setForm(p => ({ ...p, sleep_start:fmtLocal(bed), sleep_end:fmtLocal(wake) }));
  };

  const handleLog = async () => {
    if (!form.sleep_start || !form.sleep_end) return Alert.alert('Error', 'Start and end times required');
    setSaving(true);
    try {
      await logSleepMutation({
        sleep_start:    form.sleep_start,
        sleep_end:      form.sleep_end,
        quality_score:  form.quality_score  ? +form.quality_score  : undefined,
        deep_sleep_min: form.deep_sleep_min ? +form.deep_sleep_min : undefined,
        rem_sleep_min:  form.rem_sleep_min  ? +form.rem_sleep_min  : undefined,
        notes:          form.notes          || undefined,
      });
      setShowAdd(false);
      setForm({ sleep_start:'', sleep_end:'', quality_score:'80', deep_sleep_min:'', rem_sleep_min:'', notes:'' });
      Alert.alert('Sleep Logged', 'Your sleep data has been recorded.');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Could not log sleep');
    } finally { setSaving(false); }
  };

  const handleDelete = (id) =>
    Alert.alert('Delete?', 'Remove this sleep log?', [
      { text:'Cancel', style:'cancel' },
      { text:'Delete', style:'destructive', onPress: async () => {
        try { await deleteLogMutation(id); } catch {}
      }},
    ]);

  const TABS = [
    { key:'logs',  label:'History', ion:'list-outline'      },
    { key:'stats', label:'Stats',   ion:'stats-chart-outline' },
    { key:'tips',  label:'Tips',    ion:'bulb-outline'      },
  ];

  const last7 = logs.slice(0, 7);
  const avgDur = last7.length ? Math.round(last7.reduce((s,l)=>s+(l.duration_min||0),0)/last7.length) : 0;

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.secLabel}>TRACK</Text>
          <Text style={s.title}>Sleep</Text>
        </View>
        <TouchableOpacity style={[s.addBtn, { flexDirection:'row', alignItems:'center', gap:5 }]} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={15} color={C.purple} />
          <Text style={s.addBtnTxt}>Log Sleep</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key}
            style={[s.tab, activeTab===t.key && s.tabOn]}
            onPress={() => setActiveTab(t.key)}>
            <Ionicons name={t.ion} size={13} color={activeTab===t.key ? C.purple : C.muted} />
            <Text style={[s.tabTxt, activeTab===t.key && s.tabTxtOn]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading
        ? <ActivityIndicator color={C.accent} style={{ marginTop:50 }} />
        : (
          <ScrollView
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refresh}
              onRefresh={onRefresh} tintColor={C.accent} />}
          >

            {/* ══ LOGS TAB ══════════════════════════════════ */}
            {activeTab === 'logs' && (
              <>
                {/* Last night quick card */}
                {logs.length > 0 && (
                  <View style={s.lastNightCard}>
                    <View style={s.lastNightLeft}>
                      <Text style={s.lastNightLabel}>LAST NIGHT</Text>
                      <Text style={s.lastNightDur}>{fmtDur(logs[0].duration_min)}</Text>
                      <Text style={s.lastNightTime}>
                        {fmtTime(logs[0].sleep_start)} — {fmtTime(logs[0].sleep_end)}
                      </Text>
                    </View>
                    {logs[0].quality_score && (
                      <View style={[s.qualCircle, { borderColor:qualColor(logs[0].quality_score, C) }]}>
                        <Text style={[s.qualNum, { color:qualColor(logs[0].quality_score, C) }]}>
                          {logs[0].quality_score}
                        </Text>
                        <Text style={s.qualSub}>score</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* 7-day bar chart */}
                {last7.length > 1 && (
                  <View style={s.card}>
                    <Text style={s.cardTitle}>Last 7 Nights</Text>
                    <View style={s.barChartWrap}>
                      {[...last7].reverse().map((log, i) => {
                        const h     = Math.min((log.duration_min||0)/540*80, 80);
                        const color = qualColor(log.quality_score||60, C);
                        return (
                          <View key={log.id} style={s.barItem}>
                            <Text style={s.barTopLabel}>{fmtDur(log.duration_min).split(' ')[0]}</Text>
                            <View style={[s.bar, { height:h, backgroundColor:color }]} />
                            <Text style={s.barDateLabel}>
                              {new Date(log.sleep_start).toLocaleDateString('en-US',{weekday:'short'}).slice(0,1)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                    <View style={s.avgRow}>
                      <Text style={s.avgLabel}>7-day avg:</Text>
                      <Text style={s.avgVal}>{fmtDur(avgDur)}</Text>
                    </View>
                  </View>
                )}

                {/* Log list */}
                <Text style={s.sectionTitle}>All Logs</Text>
                {logs.length === 0 ? (
                  <View style={s.emptyWrap}>
                    <Ionicons name="moon-outline" size={48} color={C.purple} style={{ marginBottom:10 }} />
                    <Text style={s.emptyTitle}>No Sleep Logs</Text>
                    <Text style={s.emptySub}>Track your sleep to see insights and improvements.</Text>
                    <TouchableOpacity style={s.emptyBtn} onPress={() => setShowAdd(true)}>
                      <Text style={s.emptyBtnTxt}>+ Log First Sleep</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  logs.map(log => {
                    const qc = qualColor(log.quality_score||60, C);
                    return (
                      <View key={log.id} style={s.logCard}>
                        <View style={s.logTop}>
                          <View>
                            <Text style={s.logDate}>{fmtDate(log.sleep_start)}</Text>
                            <Text style={s.logTime}>{fmtTime(log.sleep_start)} → {fmtTime(log.sleep_end)}</Text>
                          </View>
                          <View style={{ alignItems:'flex-end' }}>
                            <Text style={s.logDur}>{fmtDur(log.duration_min)}</Text>
                            {log.quality_score && (
                              <Text style={[s.logQual, { color:qc }]}>{qualLabel(log.quality_score)}</Text>
                            )}
                          </View>
                        </View>

                        {/* Quality bar */}
                        {log.quality_score && (
                          <View style={s.qualBarBg}>
                            <View style={[s.qualBarFill, { width:`${log.quality_score}%`, backgroundColor:qc }]} />
                          </View>
                        )}

                        {/* Stages */}
                        {(log.deep_sleep_min || log.rem_sleep_min) && (
                          <View style={s.stagesRow}>
                            {log.deep_sleep_min && (
                              <View style={s.stagePill}>
                                <Ionicons name="moon" size={11} color={C.blue} />
                                <Text style={s.stageTxt}>Deep: {fmtDur(log.deep_sleep_min)}</Text>
                              </View>
                            )}
                            {log.rem_sleep_min && (
                              <View style={[s.stagePill, { backgroundColor:'rgba(155,109,255,0.12)' }]}>
                                <Ionicons name="cloud-outline" size={11} color={C.purple} />
                                <Text style={[s.stageTxt, { color:C.purple }]}>REM: {fmtDur(log.rem_sleep_min)}</Text>
                              </View>
                            )}
                          </View>
                        )}

                        {log.notes && <Text style={s.logNotes}>{log.notes}</Text>}

                        <TouchableOpacity style={[s.deleteBtn, { flexDirection:'row', alignItems:'center', gap:3 }]} onPress={() => handleDelete(log.id)}>
                          <Ionicons name="trash-outline" size={12} color={C.dim} />
                          <Text style={s.deleteBtnTxt}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
              </>
            )}

            {/* ══ STATS TAB ══════════════════════════════════ */}
            {activeTab === 'stats' && (
              <>
                {!stats || stats.total_logged === 0 ? (
                  <View style={s.emptyWrap}>
                    <Ionicons name="stats-chart-outline" size={48} color={C.purple} style={{ marginBottom:10 }} />
                    <Text style={s.emptyTitle}>No Data Yet</Text>
                    <Text style={s.emptySub}>Log at least one night of sleep to see stats.</Text>
                  </View>
                ) : (
                  <>
                    {/* Stats grid */}
                    <View style={s.statsGrid}>
                      {[
                        { ion:'time-outline',        label:'Avg Duration',  val:fmtDur(stats.avg_duration_min),    color:C.accent },
                        { ion:'star-outline',        label:'Avg Quality',   val:`${stats.avg_quality_score||0}/100`, color:qualColor(stats.avg_quality_score||60, C) },
                        { ion:'moon-outline',        label:'Avg Deep Sleep',val:fmtDur(stats.avg_deep_sleep_min),   color:C.blue },
                        { ion:'cloud-outline',       label:'Avg REM',       val:fmtDur(stats.avg_rem_sleep_min),    color:C.purple },
                        { ion:'trophy-outline',      label:'Best Sleep',    val:fmtDur(stats.best_duration_min),    color:C.teal },
                        { ion:'calendar-outline',    label:'Nights Logged', val:String(stats.total_logged),         color:C.orange },
                      ].map(({ ion,label,val,color }) => (
                        <View key={label} style={s.statBox}>
                          <Ionicons name={ion} size={22} color={color} style={{ marginBottom:6 }} />
                          <Text style={[s.statVal, { color }]}>{val}</Text>
                          <Text style={s.statLabel}>{label}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Sleep stages donut info */}
                    <View style={s.stagesCard}>
                      <Text style={s.cardTitle}>Sleep Stages Guide</Text>
                      {[
                        { ion:'bed-outline',     label:'Light Sleep',  pct:'50-60%', color:C.muted,  desc:'Body relaxes, easy to wake' },
                        { ion:'moon-outline',    label:'Deep Sleep',   pct:'15-25%', color:C.blue,   desc:'Body repairs, immune boost' },
                        { ion:'cloud-outline',   label:'REM Sleep',    pct:'20-25%', color:C.purple, desc:'Memory, learning, dreaming' },
                        { ion:'sunny-outline',   label:'Awake cycles', pct:'5-10%',  color:C.orange, desc:'Normal brief arousals' },
                      ].map(({ ion,label,pct,color,desc }) => (
                        <View key={label} style={s.stageRow}>
                          <Ionicons name={ion} size={18} color={color} />
                          <View style={{ flex:1 }}>
                            <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                              <Text style={[s.stageLabel, { color }]}>{label}</Text>
                              <Text style={[s.stagePct, { color }]}>{pct}</Text>
                            </View>
                            <Text style={s.stageDesc}>{desc}</Text>
                          </View>
                        </View>
                      ))}
                    </View>

                    {/* Recommendations */}
                    <View style={s.recCard}>
                      <Text style={s.cardTitle}>Recommendations</Text>
                      {[
                        stats.avg_duration_min < 420 && 'Sleeping less than 7 hours. Aim for 7-9 hours.',
                        stats.avg_duration_min > 540 && 'Sleeping over 9 hours could signal health issues.',
                        (stats.avg_quality_score||0) < 60 && 'Sleep quality below 60. Check room temp & screen time.',
                        stats.total_logged < 7 && 'Log at least 7 nights for accurate insights.',
                      ].filter(Boolean).map((rec,i) => (
                        <View key={i} style={{ flexDirection:'row', alignItems:'flex-start', gap:6, marginBottom:8 }}>
                          <Ionicons name="alert-circle-outline" size={14} color={C.orange} style={{ marginTop:3 }} />
                          <Text style={[s.recTxt, { marginBottom:0, flex:1 }]}>{rec}</Text>
                        </View>
                      ))}
                      {stats.avg_duration_min >= 420 && stats.avg_duration_min <= 540
                        && (stats.avg_quality_score||0) >= 60 && (
                        <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                          <Ionicons name="checkmark-circle" size={15} color={C.teal} />
                          <Text style={s.recTxtGood}>Great sleep habits! Keep it up!</Text>
                        </View>
                      )}
                    </View>
                  </>
                )}
              </>
            )}

            {/* ══ TIPS TAB ══════════════════════════════════ */}
            {activeTab === 'tips' && (
              <>
                <View style={s.tipsHero}>
                  <Ionicons name="moon" size={44} color={C.purple} />
                  <Text style={s.tipsHeroTitle}>Sleep Better Tonight</Text>
                  <Text style={s.tipsHeroSub}>Science-backed tips for deeper, more restorative sleep</Text>
                </View>
                {SLEEP_TIPS.map(({ ion, tip }, i) => (
                  <View key={i} style={s.tipCard}>
                    <View style={s.tipIconBox}>
                      <MaterialCommunityIcons name={ion} size={20} color={C.purple} />
                    </View>
                    <Text style={s.tipTxt}>{tip}</Text>
                  </View>
                ))}
                <View style={s.idealCard}>
                  <Text style={s.idealTitle}>Ideal Sleep Goals</Text>
                  {[
                    ['Duration',   '7–9 hours per night'],
                    ['Bedtime',    'Before 11:00 PM'],
                    ['Wake time',  'Same time every day'],
                    ['Quality',    '75+ score'],
                    ['Deep sleep', '90–120 minutes'],
                    ['REM sleep',  '90–120 minutes'],
                  ].map(([k,v]) => (
                    <View key={k} style={s.idealRow}>
                      <Text style={s.idealKey}>{k}</Text>
                      <Text style={s.idealVal}>{v}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            <View style={{ height:90 }} />
          </ScrollView>
        )
      }

      {/* ── LOG SLEEP MODAL ─────────────────────────── */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={s.modalBg}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>Log Sleep</Text>

              {/* Quick fill buttons */}
              <View style={s.quickFill}>
                <TouchableOpacity style={[s.quickFillBtn, { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:5 }]} onPress={prefillLastNight}>
                  <Ionicons name="calendar-outline" size={13} color={C.purple} />
                  <Text style={s.quickFillTxt}>Last Night</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.quickFillBtn, { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:5 }]} onPress={prefillTonight}>
                  <Ionicons name="moon-outline" size={13} color={C.purple} />
                  <Text style={s.quickFillTxt}>Tonight</Text>
                </TouchableOpacity>
              </View>

              <Text style={s.inputHint}>Format: 2025-01-20T23:00:00</Text>

              {[
                ['Sleep Start', 'sleep_start', '2025-01-20T23:00:00'],
                ['Wake Up',     'sleep_end',   '2025-01-21T07:00:00'],
              ].map(([label, key, ph]) => (
                <View key={key}>
                  <Text style={s.inputLabel}>{label}</Text>
                  <TextInput style={s.input} placeholder={ph}
                    placeholderTextColor={C.dim} value={form[key]}
                    onChangeText={v => setForm(p => ({ ...p, [key]:v }))} />
                </View>
              ))}

              {/* Quality slider (manual input) */}
              <Text style={s.inputLabel}>Quality Score (0–100)</Text>
              <TextInput style={s.input} keyboardType="numeric"
                placeholder="80" placeholderTextColor={C.dim}
                value={form.quality_score}
                onChangeText={v => setForm(p => ({ ...p, quality_score:v }))} />
              {form.quality_score && (
                <View style={[s.qualPreview, { backgroundColor:`${qualColor(+form.quality_score, C)}18` }]}>
                  <Text style={[s.qualPreviewTxt, { color:qualColor(+form.quality_score, C) }]}>
                    {qualLabel(+form.quality_score)}
                  </Text>
                </View>
              )}

              <View style={s.rowInputs}>
                <View style={{ flex:1 }}>
                  <Text style={s.inputLabel}>Deep Sleep (min)</Text>
                  <TextInput style={s.input} keyboardType="numeric" placeholder="90"
                    placeholderTextColor={C.dim} value={form.deep_sleep_min}
                    onChangeText={v => setForm(p => ({ ...p, deep_sleep_min:v }))} />
                </View>
                <View style={{ flex:1 }}>
                  <Text style={s.inputLabel}>REM (min)</Text>
                  <TextInput style={s.input} keyboardType="numeric" placeholder="100"
                    placeholderTextColor={C.dim} value={form.rem_sleep_min}
                    onChangeText={v => setForm(p => ({ ...p, rem_sleep_min:v }))} />
                </View>
              </View>

              <Text style={s.inputLabel}>Notes</Text>
              <TextInput style={[s.input, { height:70, textAlignVertical:'top' }]}
                placeholder="How did you feel? Any disturbances?"
                placeholderTextColor={C.dim} multiline
                value={form.notes}
                onChangeText={v => setForm(p => ({ ...p, notes:v }))} />

              <View style={s.modalBtns}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setShowAdd(false)}>
                  <Text style={s.cancelTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.confirmBtn} onPress={handleLog} disabled={saving}>
                  {saving
                    ? <ActivityIndicator color="#000" size="small" />
                    : <Text style={s.confirmTxt}>Save Sleep</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  root:          { flex:1, backgroundColor:C.bg },
  backBtn:       { width:36, height:36, borderRadius:18, alignItems:'center', justifyContent:'center', marginRight:8, marginBottom:2 },
  header:        { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-end',
                   paddingHorizontal:16, paddingTop:16, marginBottom:10 },
  secLabel:      { color:C.muted, fontSize:10, fontWeight:'700', letterSpacing:1.2 },
  title:         { color:C.text, fontSize:24, fontWeight:'900' },
  addBtn:        { backgroundColor:'rgba(155,109,255,0.15)', borderRadius:12,
                   paddingHorizontal:14, paddingVertical:9, borderWidth:1, borderColor:C.purple },
  addBtnTxt:     { color:C.purple, fontSize:13, fontWeight:'900' },
  tabs:          { flexDirection:'row', paddingHorizontal:16, gap:6, marginBottom:8 },
  tab:           { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center',
                   gap:4, borderRadius:10, borderWidth:1, borderColor:C.border,
                   paddingVertical:8, backgroundColor:C.card },
  tabOn:         { backgroundColor:'rgba(155,109,255,0.12)', borderColor:C.purple },
  tabTxt:        { color:C.muted, fontSize:10, fontWeight:'700' },
  tabTxtOn:      { color:C.purple },
  list:          { padding:16 },
  lastNightCard: { backgroundColor:'rgba(155,109,255,0.1)', borderRadius:18, borderWidth:1,
                   borderColor:'rgba(155,109,255,0.3)', padding:18,
                   flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 },
  lastNightLeft: {},
  lastNightLabel:{ color:C.purple, fontSize:10, fontWeight:'800', letterSpacing:1, marginBottom:4 },
  lastNightDur:  { color:C.text, fontSize:28, fontWeight:'900', marginBottom:2 },
  lastNightTime: { color:C.muted, fontSize:12 },
  qualCircle:    { width:64, height:64, borderRadius:32, borderWidth:3,
                   alignItems:'center', justifyContent:'center' },
  qualNum:       { fontSize:20, fontWeight:'900' },
  qualSub:       { color:C.muted, fontSize:9 },
  card:          { backgroundColor:C.card, borderRadius:18, borderWidth:1, borderColor:C.border, padding:16, marginBottom:12 },
  cardTitle:     { color:C.text, fontSize:14, fontWeight:'700', marginBottom:12 },
  barChartWrap:  { flexDirection:'row', alignItems:'flex-end', gap:6, height:100 },
  barItem:       { flex:1, alignItems:'center', gap:3 },
  bar:           { width:'100%', borderRadius:4, minHeight:4 },
  barTopLabel:   { color:C.muted, fontSize:9 },
  barDateLabel:  { color:C.dim, fontSize:9 },
  avgRow:        { flexDirection:'row', gap:8, marginTop:10 },
  avgLabel:      { color:C.muted, fontSize:12 },
  avgVal:        { color:C.accent, fontSize:12, fontWeight:'800' },
  sectionTitle:  { color:C.text, fontSize:14, fontWeight:'700', marginBottom:10 },
  logCard:       { backgroundColor:C.card, borderRadius:16, borderWidth:1, borderColor:C.border, padding:14, marginBottom:10 },
  logTop:        { flexDirection:'row', justifyContent:'space-between', marginBottom:10 },
  logDate:       { color:C.text, fontSize:14, fontWeight:'700', marginBottom:2 },
  logTime:       { color:C.muted, fontSize:12 },
  logDur:        { color:C.text, fontSize:20, fontWeight:'900', textAlign:'right' },
  logQual:       { fontSize:11, fontWeight:'700', textAlign:'right', marginTop:2 },
  qualBarBg:     { height:5, backgroundColor:C.border, borderRadius:3, overflow:'hidden', marginBottom:8 },
  qualBarFill:   { height:'100%', borderRadius:3 },
  stagesRow:     { flexDirection:'row', gap:8, marginBottom:8 },
  stagePill:     { flexDirection:'row', alignItems:'center', gap:4, backgroundColor:'rgba(77,141,255,0.12)',
                   borderRadius:8, paddingHorizontal:8, paddingVertical:4 },
  stageTxt:      { color:C.blue, fontSize:11, fontWeight:'600' },
  logNotes:      { color:C.muted, fontSize:12, marginBottom:6 },
  deleteBtn:     { alignSelf:'flex-end' },
  deleteBtnTxt:  { color:C.dim, fontSize:11 },
  // Stats tab
  statsGrid:     { flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:16 },
  statBox:       { width:'47%', backgroundColor:C.card, borderRadius:14, borderWidth:1,
                   borderColor:C.border, padding:14, alignItems:'center' },
  statVal:       { fontSize:18, fontWeight:'900', marginBottom:2 },
  statLabel:     { color:C.muted, fontSize:11, textAlign:'center' },
  stagesCard:    { backgroundColor:C.card, borderRadius:16, borderWidth:1, borderColor:C.border, padding:16, marginBottom:12 },
  stageRow:      { flexDirection:'row', gap:10, alignItems:'flex-start', paddingVertical:8,
                   borderBottomWidth:0.5, borderColor:C.border },
  stageLabel:    { fontSize:13, fontWeight:'700' },
  stagePct:      { fontSize:13, fontWeight:'800' },
  stageDesc:     { color:C.muted, fontSize:11, marginTop:2 },
  recCard:       { backgroundColor:C.card, borderRadius:16, borderWidth:1, borderColor:C.border, padding:16, marginBottom:12 },
  recTxt:        { color:C.orange, fontSize:13, marginBottom:8, lineHeight:20 },
  recTxtGood:    { color:C.teal, fontSize:13, fontWeight:'700' },
  // Tips tab
  tipsHero:      { alignItems:'center', paddingVertical:20, marginBottom:12 },
  tipsHeroTitle: { color:C.text, fontSize:20, fontWeight:'900', marginTop:10, marginBottom:6 },
  tipsHeroSub:   { color:C.muted, fontSize:13, textAlign:'center' },
  tipCard:       { flexDirection:'row', alignItems:'center', gap:14, backgroundColor:C.card,
                   borderRadius:14, borderWidth:1, borderColor:C.border, padding:14, marginBottom:8 },
  tipIconBox:    { width:44, height:44, borderRadius:12, backgroundColor:'rgba(155,109,255,0.12)',
                   alignItems:'center', justifyContent:'center' },
  tipTxt:        { color:C.text, fontSize:13, flex:1, lineHeight:19 },
  idealCard:     { backgroundColor:C.card, borderRadius:16, borderWidth:1, borderColor:C.border, padding:16, marginBottom:12 },
  idealTitle:    { color:C.text, fontSize:14, fontWeight:'700', marginBottom:12 },
  idealRow:      { flexDirection:'row', justifyContent:'space-between', paddingVertical:8,
                   borderBottomWidth:0.5, borderColor:C.border },
  idealKey:      { color:C.muted, fontSize:13 },
  idealVal:      { color:C.accent, fontSize:13, fontWeight:'700' },
  // Empty state
  emptyWrap:     { alignItems:'center', paddingTop:50, paddingHorizontal:24 },
  emptyTitle:    { color:C.text, fontSize:20, fontWeight:'900', marginBottom:8 },
  emptySub:      { color:C.muted, fontSize:13, textAlign:'center', lineHeight:20, marginBottom:20 },
  emptyBtn:      { backgroundColor:C.purple, borderRadius:14, paddingVertical:12, paddingHorizontal:24 },
  emptyBtnTxt:   { color:'#fff', fontWeight:'900', fontSize:14 },
  // Modal
  modalBg:       { flex:1, backgroundColor:'rgba(0,0,0,0.78)', justifyContent:'flex-end' },
  modalCard:     { backgroundColor:C.card2, borderTopLeftRadius:24, borderTopRightRadius:24,
                   padding:24, borderTopWidth:1, borderColor:C.border },
  modalTitle:    { color:C.text, fontSize:18, fontWeight:'900', marginBottom:14 },
  quickFill:     { flexDirection:'row', gap:10, marginBottom:12 },
  quickFillBtn:  { flex:1, backgroundColor:'rgba(155,109,255,0.15)', borderRadius:10,
                   paddingVertical:9, alignItems:'center', borderWidth:1, borderColor:C.purple },
  quickFillTxt:  { color:C.purple, fontWeight:'700', fontSize:12 },
  inputHint:     { color:C.dim, fontSize:11, marginBottom:10 },
  inputLabel:    { color:C.muted, fontSize:10, fontWeight:'700', letterSpacing:0.8,
                   marginBottom:5, textTransform:'uppercase' },
  input:         { backgroundColor:C.bg, borderRadius:12, borderWidth:1, borderColor:C.border,
                   padding:12, color:C.text, fontSize:14, marginBottom:12 },
  qualPreview:   { borderRadius:10, padding:8, marginBottom:10, alignItems:'center' },
  qualPreviewTxt:{ fontSize:14, fontWeight:'800' },
  rowInputs:     { flexDirection:'row', gap:12 },
  modalBtns:     { flexDirection:'row', gap:10, marginTop:4 },
  cancelBtn:     { flex:1, backgroundColor:C.border, borderRadius:12, paddingVertical:14, alignItems:'center' },
  cancelTxt:     { color:C.text, fontWeight:'700' },
  confirmBtn:    { flex:2, backgroundColor:C.purple, borderRadius:12, paddingVertical:14, alignItems:'center' },
  confirmTxt:    { color:'#fff', fontWeight:'900', fontSize:15 },
});
