import React, { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { View, Text, ScrollView, TouchableOpacity, Modal,
  StyleSheet, Alert, ActivityIndicator, TextInput, RefreshControl, Switch, Dimensions } from 'react-native';
import { authAPI } from '../api/services';
import { useAuthStore } from '../store/authStore';
import { progressAPI } from '../api/services';
import { useC, DARK, LIGHT } from '../utils/theme';
import { useThemeStore } from '../store/themeStore';
import { AVATARS, avatarSource } from '../utils/avatars';
import { ProfileFrame, FrameSelector } from '../components/ProfileFrame';
import { useFrameStore } from '../store/frameStore';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { triggerThemeTransition } from '../utils/themeTransition';

const { width: SW, height: SH } = Dimensions.get('window');


export default function ProfileScreen({ navigation }) {
  const C = useC();
  const s = useMemo(() => makeStyles(C), [C]);
  const { user, logout, patchUser } = useAuthStore();
  const { isDark, toggle: toggleTheme } = useThemeStore();
  const toggleRowRef = useRef(null);

  const handleThemeToggle = () => {
    const nextBg = isDark ? LIGHT.bg : DARK.bg;
    // measureInWindow works correctly inside ScrollViews (unlike measure)
    if (toggleRowRef.current?.measureInWindow) {
      toggleRowRef.current.measureInWindow((x, y, w, h) => {
        const rippleX = x + w * 0.88;  // near the switch on the right
        const rippleY = y + h / 2;
        triggerThemeTransition(rippleX, rippleY, nextBg, toggleTheme);
      });
    } else {
      triggerThemeTransition(SW / 2, SH * 0.6, nextBg, toggleTheme);
    }
  };
  const { frameId, setFrame } = useFrameStore();
  const [showFrame,   setShowFrame]   = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [showEdit,    setShowEdit]    = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [editForm,    setEditForm]    = useState({
    full_name: user?.full_name || '',
    bio:       user?.bio       || '',
    unit_system: user?.unit_system || 'metric',
    avatar_url: user?.avatar_url || '',
  });
  const [metricsForm, setMetricsForm] = useState({
    height_cm: user?.height_cm      ? String(user.height_cm)      : '',
    weight_kg: user?.weight_kg      ? String(user.weight_kg)      : '',
    body_fat_pct: user?.body_fat_pct ? String(user.body_fat_pct) : '',
    fitness_level: user?.fitness_level || 'beginner',
  });

  const { data: stats, isRefetching: refresh, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => progressAPI.getDashboard().then(r => r.data.data),
  });

  const handleLogout = () =>
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: async () => {
        setLoading(true);
        await logout();
        setLoading(false);
      }},
    ]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await authAPI.updateProfile(editForm);
      patchUser(res.data.data);
      setShowEdit(false);
      Alert.alert('Saved', 'Profile updated.');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Could not update');
    } finally { setSaving(false); }
  };

  const handleSaveMetrics = async () => {
    setSaving(true);
    try {
      const payload = {};
      if (metricsForm.height_cm)    payload.height_cm      = +metricsForm.height_cm;
      if (metricsForm.weight_kg)    payload.weight_kg      = +metricsForm.weight_kg;
      if (metricsForm.body_fat_pct) payload.body_fat_pct   = +metricsForm.body_fat_pct;
      if (metricsForm.fitness_level) payload.fitness_level = metricsForm.fitness_level;
      const res = await authAPI.updateProfile(payload);
      patchUser(res.data.data);
      setShowMetrics(false);
      Alert.alert('Saved', 'Metrics updated.');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Could not update');
    } finally { setSaving(false); }
  };

  const initials = (user?.full_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  const ws = stats?.workout_stats;

  const StatBox = ({ val, label, color }) => (
    <View style={s.statBox}>
      <Text style={[s.statVal, color && { color }]}>{val || '—'}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );

  const SRow = ({ iconBg, icon, label, sub, onPress, isRed, right }) => (
    <TouchableOpacity style={s.sRow} onPress={onPress || (() => {})}>
      <View style={[s.sIcon, { backgroundColor: iconBg }]}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.sLabel, isRed && { color: C.muted }]}>{label}</Text>
        {sub && <Text style={s.sSub}>{sub}</Text>}
      </View>
      {right || <Text style={s.chevron}>›</Text>}
    </TouchableOpacity>
  );

  const InputField = ({ label, value, onChange, keyboardType, placeholder }) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.inputLabel}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType || 'default'}
        placeholder={placeholder || ''}
        placeholderTextColor={C.dim}
      />
    </View>
  );

  return (
    <SafeAreaView style={s.root} edges={['top']}>
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => refetch()} tintColor={C.accent} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── HERO ─────────────────────────────────────── */}
      <View style={s.hero}>
        <View style={s.avatarWrap}>
          <ProfileFrame frameId={frameId} avatarSize={82}>
            {avatarSource(user?.avatar_url) ? (
              <Image source={avatarSource(user.avatar_url)}
                style={[s.avatar, frameId !== 'none' && { borderWidth: 0 }]} />
            ) : (
              <View style={[s.avatar, frameId !== 'none' && { borderWidth: 0 }]}>
                <Text style={s.avatarTxt}>{initials}</Text>
              </View>
            )}
          </ProfileFrame>
          <TouchableOpacity style={s.editAvatarBtn} onPress={() => setShowEdit(true)}>
            <Ionicons name="pencil" size={11} color={C.text} />
          </TouchableOpacity>
        </View>
        <Text style={s.name}>{user?.full_name || 'User'}</Text>
        <Text style={s.email}>{user?.email}</Text>
        {user?.bio && <Text style={s.bio}>{user.bio}</Text>}
        <View style={s.tagRow}>
          {user?.fitness_level && (
            <View style={s.tag}>
              <Ionicons name="fitness-outline" size={11} color={C.muted} />
              <Text style={s.tagTxt}>{user.fitness_level}</Text>
            </View>
          )}
          {user?.unit_system && (
            <View style={s.tag}>
              <Ionicons name="resize-outline" size={11} color={C.muted} />
              <Text style={s.tagTxt}>{user.unit_system}</Text>
            </View>
          )}
          {user?.is_premium && (
            <View style={[s.tag, { backgroundColor:C.accentDim, borderColor:C.accent }]}>
              <Ionicons name="star" size={11} color={C.accent} />
              <Text style={[s.tagTxt, { color:C.accent }]}>PRO</Text>
            </View>
          )}
        </View>
      </View>

      <View style={s.body}>

        {/* ── WORKOUT STATS ──────────────────────────── */}
        <Text style={s.secTitle}>LIFETIME STATS</Text>
        <View style={s.statsRow}>
          <StatBox val={ws?.total_workouts}              label="Workouts"    color={C.accent} />
          <StatBox val={ws?.total_minutes ? `${Math.round(ws.total_minutes/60)}h` : '—'} label="Hours" color={C.accent} />
          <StatBox val={ws?.total_calories ? `${Math.round(ws.total_calories/1000)}k` : '—'} label="Calories" color={C.accent} />
          <StatBox val={stats?.streak?.longest_streak}  label="Best Streak" color={C.accent} />
        </View>

        {/* ── BODY METRICS ───────────────────────────── */}
        <View style={s.row}>
          <Text style={s.secTitle}>BODY METRICS</Text>
          <TouchableOpacity onPress={() => setShowMetrics(true)}>
            <Text style={s.editLink}>Edit ›</Text>
          </TouchableOpacity>
        </View>
        <View style={s.metricsCard}>
          {[
            ['Height',       user?.height_cm      ? `${user.height_cm} cm`   : '—'],
            ['Weight',       user?.weight_kg      ? `${user.weight_kg} kg`   : '—'],
            ['Body Fat',     user?.body_fat_pct   ? `${user.body_fat_pct}%`  : '—'],
            ['Muscle Mass',  user?.muscle_mass_kg ? `${user.muscle_mass_kg} kg` : '—'],
            ['BMI',          user?.bmi            ? String(user.bmi)         : '—'],
            ['Level',        user?.fitness_level  || '—'],
          ].map(([k, v], i, arr) => (
            <View key={k} style={[s.metricRow, i < arr.length-1 && { borderBottomWidth:0.5, borderColor:C.border }]}>
              <Text style={s.metricKey}>{k}</Text>
              <Text style={[s.metricVal, v === '—' && { color:C.dim }]}>{v}</Text>
            </View>
          ))}
        </View>

        {/* ── GOALS SHORTCUT ─────────────────────────── */}
        <Text style={s.secTitle}>MY GOALS</Text>
        <View style={s.settingsCard}>
          <SRow iconBg={C.accentDim}
            icon={<Ionicons name="trophy-outline" size={18} color={C.accent} />}
            label="View & Manage Goals"
            sub="Track your fitness targets" onPress={() => navigation.navigate('Goals')} />
        </View>

        {/* ── SETTINGS ───────────────────────────────── */}
        <Text style={s.secTitle}>SETTINGS</Text>
        <View style={s.settingsCard}>
          <View ref={toggleRowRef} collapsable={false}>
            <SRow
              iconBg={C.accentDim}
              icon={<Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={C.accent} />}
              label="Appearance"
              sub={isDark ? 'Dark Mode' : 'Light Mode'}
              right={
                <Switch
                  value={isDark}
                  onValueChange={handleThemeToggle}
                  trackColor={{ false: C.border, true: C.accent }}
                  thumbColor={isDark ? C.accentText : '#FFFFFF'}
                />
              }
            />
          </View>
          <SRow iconBg={C.accentDim}
            icon={<Ionicons name="notifications-outline" size={18} color={C.accent} />}
            label="Notifications" sub="Workout & meal reminders"
            onPress={() => Alert.alert('Notifications', 'Feature coming soon!')} />
          <SRow iconBg={C.accentDim}
            icon={<Ionicons name="star-outline" size={18} color={C.accent} />}
            label="Premium Plan"
            sub={user?.is_premium ? 'FitCore Pro — Active' : 'Upgrade to unlock all features'}
            onPress={() => Alert.alert('Premium', 'Feature coming soon!')} />
          <SRow iconBg={C.accentDim}
            icon={<Ionicons name="create-outline" size={18} color={C.accent} />}
            label="Edit Profile" sub="Name, bio, preferences"
            onPress={() => setShowEdit(true)} />
          <SRow iconBg={C.accentDim}
            icon={<Ionicons name="image-outline" size={18} color={C.accent} />}
            label="Profile Frame"
            sub={frameId === 'none' ? 'No frame selected' : `Active: ${frameId.replace(/_/g,' ')}`}
            onPress={() => setShowFrame(true)} />
          <SRow iconBg={C.accentDim}
            icon={<Ionicons name="body-outline" size={18} color={C.muted} />}
            label="Body Metrics" sub="Height, weight, body fat"
            onPress={() => setShowMetrics(true)} />
          <SRow iconBg={C.accentDim}
            icon={<Ionicons name="shield-checkmark-outline" size={18} color={C.accent} />}
            label="Data & Privacy" sub="Manage your data"
            onPress={() => Alert.alert('Privacy', 'Feature coming soon!')} />
        </View>

        {/* ── SIGN OUT ───────────────────────────────── */}
        <View style={[s.settingsCard, { marginBottom:30 }]}>
          <SRow iconBg={C.border}
            icon={<Ionicons name="log-out-outline" size={18} color={C.muted} />}
            label="Sign Out" isRed
            onPress={handleLogout}
            right={loading
              ? <ActivityIndicator size="small" color={C.muted} />
              : <Text style={[s.chevron, { color:C.muted }]}>›</Text>
            }
          />
        </View>

        <Text style={s.version}>FitCore Pro v1.0.0 • © 2025 Fitness Inc.</Text>
      </View>

      {/* ── EDIT PROFILE MODAL ─────────────────────── */}
      <Modal visible={showEdit} animationType="slide" transparent>
        <View style={s.modalBg}>
          <ScrollView style={s.modalCard} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            <Text style={s.modalTitle}>Edit Profile</Text>
            <InputField label="Full Name" value={editForm.full_name}
              onChange={v => setEditForm(p => ({ ...p, full_name:v }))} />
            <InputField label="Bio" value={editForm.bio}
              onChange={v => setEditForm(p => ({ ...p, bio:v }))}
              placeholder="Tell us about yourself..." />

            <Text style={s.inputLabel}>Avatar</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.avatarScroll}>
              {AVATARS.map((a) => (
                <TouchableOpacity key={a.id} onPress={() => setEditForm(p => ({ ...p, avatar_url: a.id }))}>
                  <Image source={a.src} style={[s.avatarOpt, editForm.avatar_url === a.id && s.avatarOptOn]} />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[s.inputLabel, { marginTop: 8 }]}>Profile Frame</Text>
            <View style={{ maxHeight: 280 }}>
              <FrameSelector currentId={frameId} onSelect={setFrame} C={C} />
            </View>

            <Text style={s.inputLabel}>Units</Text>
            <View style={s.unitToggle}>
              {['metric','imperial'].map(u => (
                <TouchableOpacity key={u}
                  style={[s.unitBtn, editForm.unit_system===u && s.unitBtnOn]}
                  onPress={() => setEditForm(p => ({ ...p, unit_system:u }))}>
                  <Text style={[s.unitBtnTxt, editForm.unit_system===u && { color:'#000' }]}>
                    {u === 'metric' ? 'Metric' : 'Imperial'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowEdit(false)}>
                <Text style={s.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={handleSaveProfile} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={s.confirmTxt}>Save Changes</Text>
                }
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ── FRAME SELECTOR MODAL ──────────────────── */}
      <Modal visible={showFrame} animationType="slide" transparent>
        <View style={s.modalBg}>
          <View style={[s.modalCard, { maxHeight: '80%' }]}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <Text style={s.modalTitle}>Choose Frame</Text>
              <TouchableOpacity onPress={() => setShowFrame(false)}>
                <Ionicons name="close" size={20} color={C.muted} />
              </TouchableOpacity>
            </View>
            <FrameSelector
              currentId={frameId}
              onSelect={(id) => { setFrame(id); setShowFrame(false); }}
              C={C}
            />
          </View>
        </View>
      </Modal>

      {/* ── BODY METRICS MODAL ─────────────────────── */}
      <Modal visible={showMetrics} animationType="slide" transparent>
        <View style={s.modalBg}>
          <ScrollView>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>Body Metrics</Text>
              <InputField label="Height (cm)" value={metricsForm.height_cm}
                onChange={v => setMetricsForm(p => ({ ...p, height_cm:v }))}
                keyboardType="numeric" placeholder="e.g. 175" />
              <InputField label="Weight (kg)" value={metricsForm.weight_kg}
                onChange={v => setMetricsForm(p => ({ ...p, weight_kg:v }))}
                keyboardType="numeric" placeholder="e.g. 75" />
              <InputField label="Body Fat %" value={metricsForm.body_fat_pct}
                onChange={v => setMetricsForm(p => ({ ...p, body_fat_pct:v }))}
                keyboardType="numeric" placeholder="e.g. 18" />
              <Text style={s.inputLabel}>Fitness Level</Text>
              <View style={s.levelRow}>
                {['beginner','intermediate','advanced'].map(lvl => {
                  const on = metricsForm.fitness_level === lvl;
                  return (
                    <TouchableOpacity key={lvl}
                      style={[s.levelBtn, on && { borderColor:C.accent, backgroundColor:C.accentDim }]}
                      onPress={() => setMetricsForm(p => ({ ...p, fitness_level:lvl }))}>
                      <Text style={[s.levelBtnTxt, on && { color:C.accent }]}>{lvl}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={s.modalBtns}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setShowMetrics(false)}>
                  <Text style={s.cancelTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.confirmBtn} onPress={handleSaveMetrics} disabled={saving}>
                  {saving
                    ? <ActivityIndicator color="#000" size="small" />
                    : <Text style={s.confirmTxt}>Save Metrics</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  root:         { flex:1, backgroundColor:C.bg },
  hero:         { backgroundColor:C.accentDim, paddingTop:20, paddingBottom:24,
                  alignItems:'center', borderBottomWidth:1, borderColor:C.border },
  avatarWrap:   { position:'relative', marginBottom:12 },
  avatar:       { width:82, height:82, borderRadius:41, backgroundColor:C.accent,
                  alignItems:'center', justifyContent:'center',
                  borderWidth:3, borderColor:`${C.accent}60` },
  avatarTxt:    { fontSize:28, fontWeight:'900', color:C.accentText },
  editAvatarBtn:{ position:'absolute', bottom:0, right:-2, backgroundColor:C.card2,
                  borderRadius:12, width:24, height:24, alignItems:'center',
                  justifyContent:'center', borderWidth:1, borderColor:C.border },
  name:         { color:C.text, fontSize:22, fontWeight:'800', marginBottom:4 },
  email:        { color:C.muted, fontSize:13, marginBottom:6 },
  bio:          { color:C.muted, fontSize:13, textAlign:'center', paddingHorizontal:24, marginBottom:8 },
  tagRow:       { flexDirection:'row', gap:8, flexWrap:'wrap', justifyContent:'center' },
  tag:          { flexDirection:'row', alignItems:'center', gap:5, backgroundColor:C.card,
                  borderRadius:10, paddingHorizontal:12, paddingVertical:4,
                  borderWidth:1, borderColor:C.border },
  tagTxt:       { color:C.muted, fontSize:12, fontWeight:'600', textTransform:'capitalize' },
  body:         { padding:16 },
  row:          { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 },
  secTitle:     { color:C.dim, fontSize:11, fontWeight:'700', letterSpacing:1,
                  textTransform:'uppercase', marginBottom:8, marginTop:4 },
  editLink:     { color:C.accent, fontSize:13, fontWeight:'700' },
  statsRow:     { flexDirection:'row', gap:8, marginBottom:20 },
  statBox:      { flex:1, backgroundColor:C.card, borderRadius:14, borderWidth:1,
                  borderColor:C.border, paddingVertical:12, alignItems:'center' },
  statVal:      { color:C.accent, fontSize:18, fontWeight:'900' },
  statLabel:    { color:C.muted, fontSize:9, marginTop:2, textAlign:'center' },
  metricsCard:  { backgroundColor:C.card, borderRadius:16, borderWidth:1,
                  borderColor:C.border, marginBottom:20, overflow:'hidden' },
  metricRow:    { flexDirection:'row', justifyContent:'space-between', alignItems:'center',
                  paddingVertical:12, paddingHorizontal:16 },
  metricKey:    { color:C.muted, fontSize:14 },
  metricVal:    { color:C.text, fontSize:14, fontWeight:'700' },
  settingsCard: { backgroundColor:C.card, borderRadius:16, borderWidth:1,
                  borderColor:C.border, marginBottom:16, overflow:'hidden' },
  sRow:         { flexDirection:'row', alignItems:'center', gap:12, paddingVertical:12,
                  paddingHorizontal:14, borderBottomWidth:0.5, borderColor:C.border },
  sIcon:        { width:36, height:36, borderRadius:9, alignItems:'center', justifyContent:'center' },
  sLabel:       { color:C.text, fontSize:14, fontWeight:'500' },
  sSub:         { color:C.muted, fontSize:11, marginTop:1 },
  chevron:      { color:C.dim, fontSize:20 },
  version:      { color:C.dim, fontSize:12, textAlign:'center', marginBottom:16 },
  modalBg:      { flex:1, backgroundColor:'rgba(0,0,0,0.75)', justifyContent:'flex-end' },
  modalCard:    { backgroundColor:C.card2, borderTopLeftRadius:24, borderTopRightRadius:24,
                  padding:24, borderTopWidth:1, borderColor:C.border, maxHeight:'85%' },
  modalTitle:   { color:C.text, fontSize:18, fontWeight:'800', marginBottom:18 },
  inputLabel:   { color:C.muted, fontSize:11, fontWeight:'700', letterSpacing:0.5,
                  marginBottom:6, textTransform:'uppercase' },
  input:        { backgroundColor:C.bg, borderRadius:12, borderWidth:1, borderColor:C.border,
                  padding:12, color:C.text, fontSize:14, marginBottom:0 },
  avatarScroll: { flexDirection:'row', marginBottom:14 },
  avatarOpt:    { width:50, height:50, borderRadius:25, marginRight:10, borderWidth:2, borderColor:'transparent' },
  avatarOptOn:  { borderColor:C.accent },
  unitToggle:   { flexDirection:'row', gap:10, marginBottom:14 },
  unitBtn:      { flex:1, borderRadius:12, borderWidth:1, borderColor:C.border,
                  paddingVertical:10, alignItems:'center', backgroundColor:C.bg },
  unitBtnOn:    { backgroundColor:C.accent, borderColor:C.accent },
  unitBtnTxt:   { color:C.muted, fontSize:13, fontWeight:'700' },
  levelRow:     { flexDirection:'row', gap:8, marginBottom:14 },
  levelBtn:     { flex:1, borderRadius:10, borderWidth:1, borderColor:C.border,
                  paddingVertical:9, alignItems:'center', backgroundColor:C.bg },
  levelBtnTxt:  { color:C.muted, fontSize:11, fontWeight:'700', textTransform:'capitalize' },
  modalBtns:    { flexDirection:'row', gap:10, marginTop:8 },
  cancelBtn:    { flex:1, backgroundColor:C.border, borderRadius:12, paddingVertical:13, alignItems:'center' },
  cancelTxt:    { color:C.text, fontWeight:'700' },
  confirmBtn:   { flex:2, backgroundColor:C.accent, borderRadius:12, paddingVertical:13, alignItems:'center' },
  confirmTxt:   { color:'#000', fontWeight:'800', fontSize:15 },
});
