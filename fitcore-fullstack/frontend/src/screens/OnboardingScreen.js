import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  ScrollView, Image, Animated, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { goalsAPI } from '../api/services';
import { useAuthStore } from '../store/authStore';
import { useC } from '../utils/theme';
import { AVATARS } from '../utils/avatars';

export const onboardedKey = (uid) => `fitcore_onboarded:${uid}`;

const LEVELS = [
  { key: 'beginner',     icon: '🌱', label: 'Beginner',     sub: 'New to fitness' },
  { key: 'intermediate', icon: '🔥', label: 'Intermediate', sub: 'Train regularly' },
  { key: 'advanced',     icon: '⚡', label: 'Advanced',      sub: 'Very experienced' },
];

const GOALS = [
  { key: 'weight_loss', icon: '📉', label: 'Lose Weight',     sub: 'Burn fat & get lean' },
  { key: 'weight_gain', icon: '📈', label: 'Gain Muscle',     sub: 'Build size & strength' },
  { key: 'maintenance', icon: '⚖️', label: 'Stay Fit',        sub: 'Maintain & tone' },
];

const TOTAL = 5;

export default function OnboardingScreen({ onComplete }) {
  const C = useC();
  const s = useMemo(() => makeStyles(C), [C]);
  const user    = useAuthStore(st => st.user);
  const setUser = useAuthStore(st => st.setUser);

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    gender: user?.gender || '',
    age: '',
    height_cm: user?.height_cm ? String(user.height_cm) : '',
    weight_kg: user?.weight_kg ? String(user.weight_kg) : '',
    body_fat_pct: '',
    muscle_mass_kg: '',
    fitness_level: user?.fitness_level || 'beginner',
    goal: 'weight_gain',
    avatar_url: user?.avatar_url || '',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // progress bar animation
  const progress = useRef(new Animated.Value(0)).current;
  const animateTo = (s) => {
    Animated.timing(progress, {
      toValue: (s + 1) / TOTAL, duration: 280, useNativeDriver: false,
    }).start();
  };

  const next = () => {
    if (step < TOTAL - 1) { const n = step + 1; setStep(n); animateTo(n); }
    else finish(false);
  };
  const back = () => {
    if (step > 0) { const p = step - 1; setStep(p); animateTo(p); }
  };

  const markDone = async () => {
    try { if (user?.id) await AsyncStorage.setItem(onboardedKey(user.id), '1'); } catch {}
    onComplete?.();
  };

  const skip = () => markDone();

  const finish = async (skipped) => {
    setSaving(true);
    try {
      const updates = {};
      if (form.gender)        updates.gender = form.gender;
      if (form.age)           updates.date_of_birth = `${new Date().getFullYear() - +form.age}-01-01`;
      if (form.height_cm)     updates.height_cm = +form.height_cm;
      if (form.weight_kg)     updates.weight_kg = +form.weight_kg;
      if (form.body_fat_pct)  updates.body_fat_pct = +form.body_fat_pct;
      if (form.muscle_mass_kg)updates.muscle_mass_kg = +form.muscle_mass_kg;
      if (form.fitness_level) updates.fitness_level = form.fitness_level;
      if (form.avatar_url)    updates.avatar_url = form.avatar_url;
      if (updates.height_cm && updates.weight_kg) {
        const h = updates.height_cm / 100;
        updates.bmi = +(updates.weight_kg / (h * h)).toFixed(1);
      }

      // setUser writes to Supabase AND refreshes the store so the app updates instantly
      if (Object.keys(updates).length) await setUser(updates);

      // create the primary goal (Nutrition screen auto-detects from this)
      if (form.goal) {
        const titleMap = { weight_loss: 'Lose Weight', weight_gain: 'Gain Muscle', maintenance: 'Stay Fit' };
        try { await goalsAPI.create({ type: form.goal, title: titleMap[form.goal] }); } catch {}
      }

      await markDone();
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not save. Check your connection.');
    } finally {
      setSaving(false);
    }
  };

  const fillW = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Top bar: progress + skip */}
      <View style={s.topBar}>
        <View style={s.progressTrack}>
          <Animated.View style={[s.progressFill, { width: fillW }]} />
        </View>
        <TouchableOpacity onPress={skip} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
          <Text style={s.skipTxt}>Skip</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.stepCount}>Step {step + 1} of {TOTAL}</Text>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>

        {/* ── STEP 1: Gender + Age ── */}
        {step === 0 && (
          <>
            <Text style={s.title}>Tell us about you 👋</Text>
            <Text style={s.subtitle}>This helps us personalize your plan.</Text>

            <Text style={s.label}>Gender</Text>
            <View style={s.row2}>
              {[['male','♂','Male'], ['female','♀','Female']].map(([k, ic, lbl]) => (
                <TouchableOpacity key={k}
                  style={[s.bigCard, form.gender === k && s.bigCardOn]}
                  onPress={() => set('gender', k)} activeOpacity={0.85}>
                  <Text style={[s.bigIcon, form.gender === k && { color: C.accent }]}>{ic}</Text>
                  <Text style={[s.bigLbl, form.gender === k && { color: C.text }]}>{lbl}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Age</Text>
            <TextInput
              style={s.input} placeholder="e.g. 24" placeholderTextColor={C.dim}
              keyboardType="number-pad" value={form.age}
              onChangeText={t => set('age', t.replace(/[^0-9]/g, ''))} maxLength={3}
            />
          </>
        )}

        {/* ── STEP 2: Height + Weight ── */}
        {step === 1 && (
          <>
            <Text style={s.title}>Your body basics 📏</Text>
            <Text style={s.subtitle}>We'll calculate your BMI automatically.</Text>

            <Text style={s.label}>Height (cm)</Text>
            <TextInput
              style={s.input} placeholder="e.g. 175" placeholderTextColor={C.dim}
              keyboardType="numeric" value={form.height_cm}
              onChangeText={t => set('height_cm', t.replace(/[^0-9.]/g, ''))} maxLength={5}
            />

            <Text style={s.label}>Weight (kg)</Text>
            <TextInput
              style={s.input} placeholder="e.g. 70" placeholderTextColor={C.dim}
              keyboardType="numeric" value={form.weight_kg}
              onChangeText={t => set('weight_kg', t.replace(/[^0-9.]/g, ''))} maxLength={6}
            />

            {form.height_cm && form.weight_kg ? (
              <View style={s.bmiBox}>
                <Text style={s.bmiLbl}>Your BMI</Text>
                <Text style={s.bmiVal}>
                  {(+form.weight_kg / Math.pow(+form.height_cm / 100, 2)).toFixed(1)}
                </Text>
              </View>
            ) : null}
          </>
        )}

        {/* ── STEP 3: Body Fat + Muscle Mass (optional) ── */}
        {step === 2 && (
          <>
            <Text style={s.title}>Advanced metrics 💪</Text>
            <Text style={s.subtitle}>Optional — skip if you don't know these.</Text>

            <Text style={s.label}>Body Fat %</Text>
            <TextInput
              style={s.input} placeholder="e.g. 18" placeholderTextColor={C.dim}
              keyboardType="numeric" value={form.body_fat_pct}
              onChangeText={t => set('body_fat_pct', t.replace(/[^0-9.]/g, ''))} maxLength={4}
            />

            <Text style={s.label}>Muscle Mass (kg)</Text>
            <TextInput
              style={s.input} placeholder="e.g. 32" placeholderTextColor={C.dim}
              keyboardType="numeric" value={form.muscle_mass_kg}
              onChangeText={t => set('muscle_mass_kg', t.replace(/[^0-9.]/g, ''))} maxLength={5}
            />
          </>
        )}

        {/* ── STEP 4: Level + Goal ── */}
        {step === 3 && (
          <>
            <Text style={s.title}>Your fitness goal 🎯</Text>
            <Text style={s.subtitle}>We'll tune workouts & nutrition for this.</Text>

            <Text style={s.label}>Experience Level</Text>
            {LEVELS.map(l => (
              <TouchableOpacity key={l.key}
                style={[s.listCard, form.fitness_level === l.key && s.listCardOn]}
                onPress={() => set('fitness_level', l.key)} activeOpacity={0.85}>
                <Text style={s.listIcon}>{l.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.listLbl, form.fitness_level === l.key && { color: C.text }]}>{l.label}</Text>
                  <Text style={s.listSub}>{l.sub}</Text>
                </View>
                {form.fitness_level === l.key && <Text style={s.check}>✓</Text>}
              </TouchableOpacity>
            ))}

            <Text style={[s.label, { marginTop: 18 }]}>Main Goal</Text>
            {GOALS.map(g => (
              <TouchableOpacity key={g.key}
                style={[s.listCard, form.goal === g.key && s.listCardOn]}
                onPress={() => set('goal', g.key)} activeOpacity={0.85}>
                <Text style={s.listIcon}>{g.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.listLbl, form.goal === g.key && { color: C.text }]}>{g.label}</Text>
                  <Text style={s.listSub}>{g.sub}</Text>
                </View>
                {form.goal === g.key && <Text style={s.check}>✓</Text>}
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ── STEP 5: Avatar ── */}
        {step === 4 && (
          <>
            <Text style={s.title}>Pick your avatar 🙂</Text>
            <Text style={s.subtitle}>Choose a profile picture (you can change it later).</Text>

            <View style={s.avatarGrid}>
              {AVATARS.map(a => (
                <TouchableOpacity key={a.id} onPress={() => set('avatar_url', a.id)} activeOpacity={0.8}>
                  <Image source={a.src}
                    style={[s.avatarOpt, form.avatar_url === a.id && s.avatarOptOn]} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.finishNote}>
              <Text style={s.finishNoteTxt}>🎉 You're all set! Tap Finish to start your journey.</Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom nav */}
      <View style={s.footer}>
        {step > 0 ? (
          <TouchableOpacity style={s.backBtn} onPress={back} disabled={saving}>
            <Text style={s.backTxt}>‹ Back</Text>
          </TouchableOpacity>
        ) : <View style={{ flex: 1 }} />}

        <TouchableOpacity style={s.nextBtn} onPress={next} disabled={saving} activeOpacity={0.85}>
          {saving
            ? <ActivityIndicator color="#0A0A0F" />
            : <Text style={s.nextTxt}>{step === TOTAL - 1 ? 'Finish 🎉' : 'Next ›'}</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.bg, paddingTop: 50 },
  topBar:       { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20 },
  progressTrack:{ flex: 1, height: 8, borderRadius: 4, backgroundColor: C.card, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: C.accent },
  skipTxt:      { color: C.muted, fontSize: 14, fontWeight: '700' },
  stepCount:    { color: C.dim, fontSize: 12, fontWeight: '600', paddingHorizontal: 20, marginTop: 8 },

  body:         { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 30 },
  title:        { color: C.text, fontSize: 26, fontWeight: '900', marginBottom: 6 },
  subtitle:     { color: C.muted, fontSize: 14, marginBottom: 22, lineHeight: 20 },
  label:        { color: C.text, fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 6 },

  input:        { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border,
                  paddingHorizontal: 16, paddingVertical: 14, color: C.text, fontSize: 16, marginBottom: 12 },

  row2:         { flexDirection: 'row', gap: 12, marginBottom: 12 },
  bigCard:      { flex: 1, backgroundColor: C.card, borderRadius: 16, borderWidth: 1.5, borderColor: C.border,
                  alignItems: 'center', paddingVertical: 24 },
  bigCardOn:    { borderColor: C.accent, backgroundColor: 'rgba(200,241,53,0.06)' },
  bigIcon:      { fontSize: 40, color: C.muted, marginBottom: 8 },
  bigLbl:       { color: C.muted, fontSize: 15, fontWeight: '800' },

  bmiBox:       { backgroundColor: 'rgba(200,241,53,0.08)', borderRadius: 14, borderWidth: 1,
                  borderColor: 'rgba(200,241,53,0.25)', padding: 16, alignItems: 'center', marginTop: 8 },
  bmiLbl:       { color: C.muted, fontSize: 12, fontWeight: '700' },
  bmiVal:       { color: C.accent, fontSize: 30, fontWeight: '900', marginTop: 2 },

  listCard:     { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.card,
                  borderRadius: 14, borderWidth: 1.5, borderColor: C.border, padding: 14, marginBottom: 10 },
  listCardOn:   { borderColor: C.accent, backgroundColor: 'rgba(200,241,53,0.06)' },
  listIcon:     { fontSize: 26 },
  listLbl:      { color: C.muted, fontSize: 15, fontWeight: '800' },
  listSub:      { color: C.dim, fontSize: 12, marginTop: 2 },
  check:        { color: C.accent, fontSize: 18, fontWeight: '900' },

  avatarGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginTop: 6 },
  avatarOpt:    { width: 66, height: 66, borderRadius: 33, borderWidth: 2.5, borderColor: 'transparent',
                  backgroundColor: C.card },
  avatarOptOn:  { borderColor: C.accent },

  finishNote:   { backgroundColor: C.card, borderRadius: 14, padding: 16, marginTop: 24, borderWidth: 1, borderColor: C.border },
  finishNoteTxt:{ color: C.text, fontSize: 14, textAlign: 'center', lineHeight: 20, fontWeight: '600' },

  footer:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20,
                  paddingVertical: 16, borderTopWidth: 1, borderTopColor: C.border },
  backBtn:      { flex: 1, paddingVertical: 15, borderRadius: 14, alignItems: 'center',
                  backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  backTxt:      { color: C.text, fontSize: 15, fontWeight: '800' },
  nextBtn:      { flex: 2, paddingVertical: 15, borderRadius: 14, alignItems: 'center', backgroundColor: C.accent },
  nextTxt:      { color: '#0A0A0F', fontSize: 16, fontWeight: '900' },
});
