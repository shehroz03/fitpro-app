import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  TextInput, StyleSheet, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { goalsAPI, progressAPI } from '../api/services';
import { useC } from '../utils/theme';

const GOAL_TYPES = ['weight_loss','muscle_gain','endurance','flexibility','maintenance'];
const TYPE_ICONS = { weight_loss:'⚖️', muscle_gain:'💪', endurance:'🏃', flexibility:'🧘', maintenance:'🎯' };
const TYPE_DESC   = {
  weight_loss:  'Reduce body fat through calorie deficit & cardio',
  muscle_gain:  'Build muscle through progressive overload & protein',
  endurance:    'Improve stamina with consistent cardio training',
  flexibility:  'Enhance range of motion with daily stretching',
  maintenance:  'Maintain current weight & fitness level',
};

export default function GoalsScreen({ navigation }) {
  const C = useC();
  const gc = useMemo(() => makeGc(C), [C]);
  const s  = useMemo(() => makeS(C), [C]);
  const TYPE_COLORS = useMemo(() => ({
    weight_loss: C.orange, muscle_gain: C.blue, endurance: C.teal,
    flexibility: C.purple, maintenance: C.accent,
  }), [C]);
  const [goals,      setGoals]      = useState([]);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refresh,    setRefresh]    = useState(false);
  const [showAdd,    setShowAdd]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  // Progress update modal (replaces Alert.prompt - works on Android+iOS)
  const [showUpdate, setShowUpdate] = useState(false);
  const [updateGoal, setUpdateGoal] = useState(null);
  const [updateVal,  setUpdateVal]  = useState('');

  const [form, setForm] = useState({
    type:'weight_loss', title:'', description:'',
    target_value:'', unit:'kg', target_date:'',
  });

  const load = useCallback(async () => {
    try {
      const [gRes, sRes] = await Promise.all([
        goalsAPI.getAll(),
        progressAPI.getDashboard(),
      ]);
      setGoals(gRes.data.data || []);
      setStats(sRes.data.data);
    } catch { Alert.alert('Error', 'Could not load goals'); }
    finally { setLoading(false); setRefresh(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.title.trim()) return Alert.alert('Error', 'Goal title is required');
    setSaving(true);
    try {
      await goalsAPI.create({
        type:         form.type,
        title:        form.title.trim(),
        description:  form.description.trim() || undefined,
        target_value: form.target_value ? +form.target_value : undefined,
        unit:         form.unit         || undefined,
        target_date:  form.target_date  || undefined,
      });
      setShowAdd(false);
      setForm({ type:'weight_loss', title:'', description:'', target_value:'', unit:'kg', target_date:'' });
      load();
      Alert.alert('🎯 Goal Created!', 'Your new goal is set!');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Could not create goal');
    } finally { setSaving(false); }
  };

  const openUpdateModal = (goal) => {
    setUpdateGoal(goal);
    setUpdateVal(String(goal.current_value || 0));
    setShowUpdate(true);
  };

  const handleUpdateProgress = async () => {
    if (!updateGoal || isNaN(+updateVal)) return;
    try {
      const res = await goalsAPI.updateProgress(updateGoal.id, +updateVal);
      setShowUpdate(false);
      setUpdateGoal(null);
      load();
      Alert.alert('✅', res.data.message || 'Progress updated!');
    } catch { Alert.alert('Error', 'Could not update progress'); }
  };

  const handleStatusChange = (goal, newStatus) => {
    const label = newStatus === 'completed' ? 'Mark as Completed?' : newStatus === 'paused' ? 'Pause Goal?' : 'Resume Goal?';
    Alert.alert(label, `"${goal.title}"`, [
      { text:'Cancel', style:'cancel' },
      { text:'Confirm', onPress: async () => {
        try { await goalsAPI.updateStatus(goal.id, newStatus); load(); } catch {}
      }},
    ]);
  };

  const handleDelete = (id, title) =>
    Alert.alert('Delete Goal?', `"${title}" will be permanently removed.`, [
      { text:'Cancel', style:'cancel' },
      { text:'Delete', style:'destructive', onPress: async () => {
        try { await goalsAPI.delete(id); load(); } catch {}
      }},
    ]);

  // ── Goal Card ──────────────────────────────────────────────
  const GoalCard = ({ goal }) => {
    const color    = TYPE_COLORS[goal.type] || C.accent;
    const pct      = goal.target_value
      ? Math.min(((goal.current_value||0)/goal.target_value)*100, 100)
      : 0;
    const daysLeft = goal.target_date
      ? Math.max(0, Math.ceil((new Date(goal.target_date)-new Date())/86400000))
      : null;
    const isDone   = goal.status === 'completed';
    const isPaused = goal.status === 'paused';

    return (
      <View style={[gc.card, isDone && gc.cardDone, isPaused && gc.cardPaused]}>
        <View style={gc.top}>
          <View style={[gc.iconBox, { backgroundColor:`${color}18` }]}>
            <Text style={{ fontSize:26 }}>{TYPE_ICONS[goal.type]||'🎯'}</Text>
          </View>
          <View style={{ flex:1 }}>
            <Text style={gc.title}>{goal.title}</Text>
            <Text style={gc.desc} numberOfLines={2}>
              {goal.description || TYPE_DESC[goal.type] || ''}
            </Text>
          </View>
          <View style={{ alignItems:'flex-end', gap:4 }}>
            <View style={[gc.typeBadge, { backgroundColor:`${color}20` }]}>
              <Text style={[gc.typeTxt, { color }]}>{(goal.type||'').replace('_',' ')}</Text>
            </View>
            {isDone  && <Text style={{ fontSize:16 }}>🏆</Text>}
            {isPaused && <Text style={{ fontSize:14 }}>⏸️</Text>}
          </View>
        </View>

        {goal.target_value > 0 && (
          <View style={gc.progressWrap}>
            <View style={gc.progressTop}>
              <Text style={gc.progressLabel}>
                {goal.current_value||0} / {goal.target_value} {goal.unit||''}
              </Text>
              <Text style={[gc.progressPct, { color }]}>{pct.toFixed(1)}%</Text>
            </View>
            <View style={gc.progressBg}>
              <View style={[gc.progressFill, { width:`${pct}%`, backgroundColor:color }]} />
            </View>
            {isDone && <Text style={[gc.completedLabel, { color:C.teal }]}>🎉 Goal achieved!</Text>}
          </View>
        )}

        <View style={gc.metaRow}>
          {goal.target_date && (
            <View style={gc.metaItem}>
              <Text style={gc.metaIcon}>📅</Text>
              <Text style={gc.metaTxt}>
                {new Date(goal.target_date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
              </Text>
            </View>
          )}
          {daysLeft !== null && !isDone && (
            <View style={[gc.daysBadge, daysLeft<=7 && { backgroundColor:'rgba(255,69,58,0.15)' }]}>
              <Text style={[gc.daysTxt, daysLeft<=7 && { color:C.red }]}>
                {daysLeft===0 ? '⚠️ Due today!' : `${daysLeft} days left`}
              </Text>
            </View>
          )}
        </View>

        {!isDone && (
          <View style={gc.actions}>
            {goal.target_value > 0 && (
              <TouchableOpacity style={[gc.actionBtn, { borderColor:color, backgroundColor:`${color}12` }]}
                onPress={() => openUpdateModal(goal)}>
                <Text style={{ fontSize:13 }}>📊</Text>
                <Text style={[gc.actionTxt, { color }]}>Update</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[gc.actionBtn, { borderColor:C.teal, backgroundColor:'rgba(47,207,160,0.1)' }]}
              onPress={() => handleStatusChange(goal,'completed')}>
              <Text style={{ fontSize:13 }}>✅</Text>
              <Text style={[gc.actionTxt, { color:C.teal }]}>Complete</Text>
            </TouchableOpacity>
            {!isPaused ? (
              <TouchableOpacity style={[gc.actionBtn, { borderColor:C.muted }]}
                onPress={() => handleStatusChange(goal,'paused')}>
                <Text style={{ fontSize:13 }}>⏸️</Text>
                <Text style={[gc.actionTxt, { color:C.muted }]}>Pause</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[gc.actionBtn, { borderColor:C.blue, backgroundColor:'rgba(77,141,255,0.1)' }]}
                onPress={() => handleStatusChange(goal,'active')}>
                <Text style={{ fontSize:13 }}>▶️</Text>
                <Text style={[gc.actionTxt, { color:C.blue }]}>Resume</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[gc.actionBtn, { borderColor:'rgba(255,69,58,0.3)', backgroundColor:'rgba(255,69,58,0.07)' }]}
              onPress={() => handleDelete(goal.id, goal.title)}>
              <Text style={{ fontSize:13 }}>🗑️</Text>
              <Text style={[gc.actionTxt, { color:C.red }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}

        {isDone && (
          <TouchableOpacity style={[gc.actionBtn, { borderColor:'rgba(255,69,58,0.3)', marginTop:8, alignSelf:'flex-end' }]}
            onPress={() => handleDelete(goal.id, goal.title)}>
            <Text style={[gc.actionTxt, { color:C.red }]}>🗑️ Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const active    = goals.filter(g => g.status === 'active');
  const paused    = goals.filter(g => g.status === 'paused');
  const completed = goals.filter(g => g.status === 'completed');
  const ws        = stats?.workout_stats;
  const streak    = stats?.streak?.current_streak || 0;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View>
          <Text style={s.secLabel}>MY FITNESS</Text>
          <Text style={s.title}>Goals 🎯</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={s.addBtnTxt}>+ New Goal</Text>
        </TouchableOpacity>
      </View>

      {loading
        ? <ActivityIndicator color={C.accent} style={{ marginTop:50 }} />
        : (
          <ScrollView
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refresh}
              onRefresh={() => { setRefresh(true); load(); }} tintColor={C.accent} />}
          >
            {/* Stats */}
            <View style={s.statsRow}>
              {[
                { icon:'🔥', val:streak,           label:'Streak' },
                { icon:'✅', val:completed.length,  label:'Done' },
                { icon:'🎯', val:active.length,     label:'Active' },
                { icon:'🏋️', val:ws?.total_workouts||0, label:'Workouts' },
              ].map(({ icon,val,label }) => (
                <View key={label} style={s.statBox}>
                  <Text style={{ fontSize:18, marginBottom:4 }}>{icon}</Text>
                  <Text style={s.statVal}>{val}</Text>
                  <Text style={s.statLabel}>{label}</Text>
                </View>
              ))}
            </View>

            {goals.length === 0 && (
              <View style={s.emptyWrap}>
                <Text style={{ fontSize:60, marginBottom:14 }}>🎯</Text>
                <Text style={s.emptyTitle}>No Goals Yet!</Text>
                <Text style={s.emptySub}>Set your first fitness goal and start tracking progress every day.</Text>
                <TouchableOpacity style={s.emptyBtn} onPress={() => setShowAdd(true)}>
                  <Text style={s.emptyBtnTxt}>🚀 Create First Goal</Text>
                </TouchableOpacity>
              </View>
            )}

            {active.length > 0 && (
              <>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>Active Goals</Text>
                  <View style={s.countBadge}><Text style={s.countBadgeTxt}>{active.length}</Text></View>
                </View>
                {active.map(g => <GoalCard key={g.id} goal={g} />)}
              </>
            )}

            {paused.length > 0 && (
              <>
                <View style={s.sectionHeader}>
                  <Text style={[s.sectionTitle, { color:C.muted }]}>Paused</Text>
                  <View style={[s.countBadge, { backgroundColor:C.border }]}>
                    <Text style={[s.countBadgeTxt, { color:C.muted }]}>{paused.length}</Text>
                  </View>
                </View>
                {paused.map(g => <GoalCard key={g.id} goal={g} />)}
              </>
            )}

            {completed.length > 0 && (
              <>
                <View style={s.sectionHeader}>
                  <Text style={[s.sectionTitle, { color:C.teal }]}>🏆 Completed</Text>
                  <View style={[s.countBadge, { backgroundColor:'rgba(47,207,160,0.15)' }]}>
                    <Text style={[s.countBadgeTxt, { color:C.teal }]}>{completed.length}</Text>
                  </View>
                </View>
                {completed.map(g => <GoalCard key={g.id} goal={g} />)}
              </>
            )}

            <View style={{ height:90 }} />
          </ScrollView>
        )
      }

      {/* ── PROGRESS UPDATE MODAL (replaces Alert.prompt) ─── */}
      <Modal visible={showUpdate} transparent animationType="fade">
        <View style={s.overlayBg}>
          <View style={s.updateCard}>
            <Text style={s.modalTitle}>📊 Update Progress</Text>
            {updateGoal && (
              <>
                <Text style={s.updateGoalName}>{updateGoal.title}</Text>
                <View style={s.updateMetaRow}>
                  <Text style={s.updateMeta}>Current: <Text style={{ color:C.accent, fontWeight:'800' }}>{updateGoal.current_value||0} {updateGoal.unit||''}</Text></Text>
                  <Text style={s.updateMeta}>Target: <Text style={{ color:C.blue, fontWeight:'800' }}>{updateGoal.target_value||'—'} {updateGoal.unit||''}</Text></Text>
                </View>
              </>
            )}
            <TextInput
              style={s.updateInput}
              value={updateVal}
              onChangeText={setUpdateVal}
              keyboardType="numeric"
              placeholder="Enter new value"
              placeholderTextColor={C.dim}
              autoFocus
            />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn}
                onPress={() => { setShowUpdate(false); setUpdateGoal(null); }}>
                <Text style={s.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={handleUpdateProgress}>
                <Text style={s.confirmTxt}>Save Progress</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── ADD GOAL MODAL ─────────────────────────────── */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={s.modalBg}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>New Goal 🎯</Text>

              <Text style={s.inputLabel}>Goal Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:14 }}>
                {GOAL_TYPES.map(t => {
                  const on    = form.type === t;
                  const color = TYPE_COLORS[t];
                  return (
                    <TouchableOpacity key={t}
                      style={[s.typePill, on && { backgroundColor:`${color}22`, borderColor:color }]}
                      onPress={() => setForm(p => ({ ...p, type:t }))}>
                      <Text style={{ fontSize:20 }}>{TYPE_ICONS[t]}</Text>
                      <Text style={[s.typePillTxt, on && { color }]}>{t.replace('_',' ')}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={s.typeDescBox}>
                <Text style={{ fontSize:20 }}>{TYPE_ICONS[form.type]}</Text>
                <Text style={s.typeDescTxt}>{TYPE_DESC[form.type]}</Text>
              </View>

              <Text style={s.inputLabel}>Goal Title *</Text>
              <TextInput style={s.input}
                placeholder="e.g. Lose 5kg by summer"
                placeholderTextColor={C.dim}
                value={form.title}
                onChangeText={v => setForm(p => ({ ...p, title:v }))} />

              <Text style={s.inputLabel}>Description (optional)</Text>
              <TextInput style={[s.input, { height:68, textAlignVertical:'top' }]}
                placeholder="Why is this goal important?"
                placeholderTextColor={C.dim}
                multiline
                value={form.description}
                onChangeText={v => setForm(p => ({ ...p, description:v }))} />

              <View style={s.rowInputs}>
                <View style={{ flex:2 }}>
                  <Text style={s.inputLabel}>Target Value</Text>
                  <TextInput style={s.input}
                    placeholder="e.g. 70"
                    placeholderTextColor={C.dim}
                    keyboardType="numeric"
                    value={form.target_value}
                    onChangeText={v => setForm(p => ({ ...p, target_value:v }))} />
                </View>
                <View style={{ flex:1 }}>
                  <Text style={s.inputLabel}>Unit</Text>
                  <TextInput style={s.input}
                    placeholder="kg"
                    placeholderTextColor={C.dim}
                    value={form.unit}
                    onChangeText={v => setForm(p => ({ ...p, unit:v }))} />
                </View>
              </View>

              <Text style={s.inputLabel}>Target Date</Text>
              <TextInput style={s.input}
                placeholder="YYYY-MM-DD  e.g. 2025-12-31"
                placeholderTextColor={C.dim}
                value={form.target_date}
                onChangeText={v => setForm(p => ({ ...p, target_date:v }))} />

              <View style={s.quickDates}>
                {['1 Month','3 Months','6 Months','1 Year'].map((label,i) => {
                  const months = [1,3,6,12][i];
                  const d = new Date();
                  d.setMonth(d.getMonth()+months);
                  const ds = d.toISOString().split('T')[0];
                  return (
                    <TouchableOpacity key={label} style={s.quickDateBtn}
                      onPress={() => setForm(p => ({ ...p, target_date:ds }))}>
                      <Text style={s.quickDateTxt}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={s.modalBtns}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setShowAdd(false)}>
                  <Text style={s.cancelTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.confirmBtn} onPress={handleCreate} disabled={saving}>
                  {saving
                    ? <ActivityIndicator color="#000" size="small" />
                    : <Text style={s.confirmTxt}>Create Goal 🎯</Text>
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

const makeGc = (C) => StyleSheet.create({
  card:          { backgroundColor:C.card, borderRadius:18, borderWidth:1, borderColor:C.border, padding:16, marginBottom:12 },
  cardDone:      { borderColor:'rgba(47,207,160,0.4)', backgroundColor:'rgba(47,207,160,0.04)' },
  cardPaused:    { opacity:0.65 },
  top:           { flexDirection:'row', gap:12, marginBottom:12, alignItems:'flex-start' },
  iconBox:       { width:50, height:50, borderRadius:14, alignItems:'center', justifyContent:'center', flexShrink:0 },
  title:         { color:C.text, fontSize:15, fontWeight:'800', marginBottom:3 },
  desc:          { color:C.muted, fontSize:12, lineHeight:17 },
  typeBadge:     { borderRadius:8, paddingHorizontal:8, paddingVertical:3 },
  typeTxt:       { fontSize:10, fontWeight:'800', textTransform:'capitalize' },
  progressWrap:  { marginBottom:12 },
  progressTop:   { flexDirection:'row', justifyContent:'space-between', marginBottom:6 },
  progressLabel: { color:C.muted, fontSize:12 },
  progressPct:   { fontSize:13, fontWeight:'900' },
  progressBg:    { height:8, backgroundColor:C.border, borderRadius:4, overflow:'hidden' },
  progressFill:  { height:'100%', borderRadius:4 },
  completedLabel:{ fontSize:12, fontWeight:'700', marginTop:6 },
  metaRow:       { flexDirection:'row', gap:10, alignItems:'center', marginBottom:10, flexWrap:'wrap' },
  metaItem:      { flexDirection:'row', alignItems:'center', gap:4 },
  metaIcon:      { fontSize:12 },
  metaTxt:       { color:C.dim, fontSize:11 },
  daysBadge:     { backgroundColor:'rgba(255,140,66,0.15)', borderRadius:8, paddingHorizontal:8, paddingVertical:3 },
  daysTxt:       { color:C.orange, fontSize:10, fontWeight:'700' },
  actions:       { flexDirection:'row', flexWrap:'wrap', gap:7 },
  actionBtn:     { flexDirection:'row', alignItems:'center', gap:4, borderRadius:10, borderWidth:1, paddingHorizontal:10, paddingVertical:7 },
  actionTxt:     { fontSize:11, fontWeight:'700' },
});

const makeS = (C) => StyleSheet.create({
  root:          { flex:1, backgroundColor:C.bg },
  header:        { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-end', paddingHorizontal:16, paddingTop:16, marginBottom:14 },
  secLabel:      { color:C.muted, fontSize:10, fontWeight:'700', letterSpacing:1.2 },
  title:         { color:C.text, fontSize:24, fontWeight:'900' },
  addBtn:        { backgroundColor:C.accentDim, borderRadius:12, paddingHorizontal:14, paddingVertical:9, borderWidth:1, borderColor:C.accent },
  addBtnTxt:     { color:C.accent, fontSize:13, fontWeight:'900' },
  list:          { paddingHorizontal:16 },
  statsRow:      { flexDirection:'row', gap:8, marginBottom:16 },
  statBox:       { flex:1, backgroundColor:C.card, borderRadius:14, borderWidth:1, borderColor:C.border, paddingVertical:12, alignItems:'center' },
  statVal:       { color:C.accent, fontSize:18, fontWeight:'900' },
  statLabel:     { color:C.muted, fontSize:9, marginTop:2, textAlign:'center' },
  sectionHeader: { flexDirection:'row', alignItems:'center', gap:8, marginBottom:10, marginTop:4 },
  sectionTitle:  { color:C.text, fontSize:14, fontWeight:'700' },
  countBadge:    { backgroundColor:C.accentDim, borderRadius:10, paddingHorizontal:8, paddingVertical:2 },
  countBadgeTxt: { color:C.accent, fontSize:12, fontWeight:'800' },
  emptyWrap:     { alignItems:'center', paddingTop:50, paddingHorizontal:24 },
  emptyTitle:    { color:C.text, fontSize:22, fontWeight:'900', marginBottom:8 },
  emptySub:      { color:C.muted, fontSize:14, textAlign:'center', lineHeight:20, marginBottom:24 },
  emptyBtn:      { backgroundColor:C.accent, borderRadius:14, paddingVertical:13, paddingHorizontal:28 },
  emptyBtnTxt:   { color:'#0A0A0F', fontWeight:'900', fontSize:15 },
  // Progress update overlay
  overlayBg:     { flex:1, backgroundColor:'rgba(0,0,0,0.6)', alignItems:'center', justifyContent:'center', padding:24 },
  updateCard:    { backgroundColor:C.card2, borderRadius:20, padding:24, width:'100%', borderWidth:1, borderColor:C.border },
  updateGoalName:{ color:C.text, fontSize:15, fontWeight:'700', marginBottom:10 },
  updateMetaRow: { flexDirection:'row', gap:16, marginBottom:14 },
  updateMeta:    { color:C.muted, fontSize:13 },
  updateInput:   { backgroundColor:C.bg, borderRadius:12, borderWidth:1, borderColor:C.accent, padding:14, color:C.text, fontSize:22, fontWeight:'800', textAlign:'center', marginBottom:16 },
  // Modal
  modalBg:       { flex:1, backgroundColor:'rgba(0,0,0,0.78)', justifyContent:'flex-end' },
  modalCard:     { backgroundColor:C.card2, borderTopLeftRadius:24, borderTopRightRadius:24, padding:24, borderTopWidth:1, borderColor:C.border },
  modalTitle:    { color:C.text, fontSize:20, fontWeight:'900', marginBottom:16 },
  inputLabel:    { color:C.muted, fontSize:10, fontWeight:'700', letterSpacing:0.8, marginBottom:6, textTransform:'uppercase' },
  input:         { backgroundColor:C.bg, borderRadius:12, borderWidth:1, borderColor:C.border, padding:13, color:C.text, fontSize:14, marginBottom:14 },
  rowInputs:     { flexDirection:'row', gap:10 },
  typePill:      { flexDirection:'column', alignItems:'center', gap:4, borderRadius:14, borderWidth:1, borderColor:C.border, paddingHorizontal:14, paddingVertical:10, marginRight:8, backgroundColor:C.bg, minWidth:80 },
  typePillTxt:   { color:C.muted, fontSize:11, fontWeight:'700', textTransform:'capitalize', textAlign:'center' },
  typeDescBox:   { flexDirection:'row', alignItems:'center', gap:10, backgroundColor:C.bg, borderRadius:12, padding:12, marginBottom:14, borderWidth:1, borderColor:C.border },
  typeDescTxt:   { color:C.muted, fontSize:12, flex:1, lineHeight:18 },
  quickDates:    { flexDirection:'row', gap:8, marginBottom:16 },
  quickDateBtn:  { flex:1, backgroundColor:C.bg, borderRadius:10, borderWidth:1, borderColor:C.border, paddingVertical:8, alignItems:'center' },
  quickDateTxt:  { color:C.muted, fontSize:11, fontWeight:'700' },
  modalBtns:     { flexDirection:'row', gap:10 },
  cancelBtn:     { flex:1, backgroundColor:C.border, borderRadius:12, paddingVertical:14, alignItems:'center' },
  cancelTxt:     { color:C.text, fontWeight:'700', fontSize:14 },
  confirmBtn:    { flex:2, backgroundColor:C.accent, borderRadius:12, paddingVertical:14, alignItems:'center' },
  confirmTxt:    { color:'#000', fontWeight:'900', fontSize:15 },
});
