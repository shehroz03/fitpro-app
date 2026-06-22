// ─────────────────────────────────────────────────────────────────────────────
//  QuizOnboarding — BetterMe-style onboarding funnel, FitCore dark + lime.
//  One engine drives every step (data in quizData.js). Gender-aware, SVG bodies.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Image } from 'expo-image';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView,
  Animated, PanResponder, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Defs, LinearGradient, RadialGradient, Stop, Circle as SvgCircle, Line as SvgLine, G as SvgG } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useC } from '../utils/theme';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { goalsAPI } from '../api/services';
import { onboardedKey } from '../screens/OnboardingScreen';
import BodySilhouette from './BodySilhouette';
import { STEPS, FOCUS_AREAS, BODY_SHAPES, BODYFAT_STOPS, FREQ_STOPS } from './quizData';

const TONE = { hard: '#FF8C42', good: '#2FCFA0', risk: '#FF453A' };

// ── custom snap slider ───────────────────────────────────────────────────────
function Slider({ count, value, onChange, C }) {
  const wRef = useRef(0);
  const cb = useRef(onChange); cb.current = onChange;
  const cnt = useRef(count);   cnt.current = count;
  const [w, setW] = useState(0);
  const setFromX = (x) => {
    const width = wRef.current; if (!width) return;
    const r = Math.max(0, Math.min(1, x / width));
    cb.current(Math.round(r * (cnt.current - 1)));
  };
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => setFromX(e.nativeEvent.locationX),
    onPanResponderMove: (e) => setFromX(e.nativeEvent.locationX),
  })).current;
  const knobX = count > 1 ? (value / (count - 1)) * w : 0;
  return (
    <View
      style={sl.track}
      onLayout={(e) => { wRef.current = e.nativeEvent.layout.width; setW(e.nativeEvent.layout.width); }}
      {...pan.panHandlers}
    >
      <View style={[sl.fill, { width: knobX, backgroundColor: C.accent }]} pointerEvents="none" />
      <View style={[sl.bar, { backgroundColor: C.border }]} pointerEvents="none" />
      {Array.from({ length: count }).map((_, i) => {
        const x = count > 1 ? (i / (count - 1)) * w : 0;
        return <View key={i} style={[sl.dot, { left: x - 3, backgroundColor: i <= value ? C.accent : C.dim }]} pointerEvents="none" />;
      })}
      <View style={[sl.knob, { left: knobX - 14, borderColor: C.accent, backgroundColor: C.bg }]} pointerEvents="none" />
    </View>
  );
}
const sl = StyleSheet.create({
  track: { height: 28, justifyContent: 'center', marginVertical: 8 },
  bar:   { position: 'absolute', top: 11, left: 0, right: 0, height: 6, borderRadius: 3 },
  fill:  { position: 'absolute', top: 11, left: 0, height: 6, borderRadius: 3, zIndex: 1 },
  dot:   { position: 'absolute', top: 11, width: 6, height: 6, borderRadius: 3, zIndex: 2 },
  knob:  { position: 'absolute', top: 0, width: 28, height: 28, borderRadius: 14, borderWidth: 4, zIndex: 3 },
});

// ── results prediction graph ─────────────────────────────────────────────────
function ResultGraph({ from, to, C }) {
  const W = 300, H = 150;
  const up = to >= from;
  const d = `M0 ${up ? H - 20 : 30} C ${W * 0.4} ${up ? H - 20 : 30}, ${W * 0.55} ${up ? 35 : H - 25}, ${W} ${up ? 35 : H - 25}`;
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <LinearGradient id="grl" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#FF2D6B" />
          <Stop offset="0.5" stopColor="#9B6DFF" />
          <Stop offset="1" stopColor={C.accent} />
        </LinearGradient>
      </Defs>
      <Path d={d} stroke="url(#grl)" strokeWidth={5} fill="none" strokeLinecap="round" />
      <SvgCircle cx={2} cy={up ? H - 20 : 30} r={7} fill="#FF2D6B" />
      <SvgCircle cx={W - 2} cy={up ? 35 : H - 25} r={8} fill={C.accent} />
    </Svg>
  );
}

// ── Theme picker ─────────────────────────────────────────────────────────────
function ThemeStep({ ans, set, C, onNext }) {
  const setDark = useThemeStore(s => s.setDark);
  const isDark  = useThemeStore(s => s.isDark);
  const chosen  = ans.theme_choice;
  const ACCENT  = '#C8F135';

  const pick = (dark) => {
    setDark(dark);
    set('theme_choice', dark ? 'dark' : 'light');
    setTimeout(() => onNext(), 500);
  };

  const THEMES = [
    {
      dark: true, name: 'Dark Mode', emoji: '🌙',
      tagline: 'Easy on the eyes', desc: 'Perfect for gym & night sessions',
      popular: true,
      bg: '#0D0D14', card: '#16161F', text: '#FFFFFF', muted: 'rgba(255,255,255,0.45)',
      accent2: '#4D8DFF', accent3: '#FF9F0A',
    },
    {
      dark: false, name: 'Light Mode', emoji: '☀️',
      tagline: 'Clean & energetic', desc: 'Great for outdoor workouts',
      popular: false,
      bg: '#F0F3FA', card: '#FFFFFF', text: '#0D0D14', muted: 'rgba(0,0,0,0.4)',
      accent2: '#3B82F6', accent3: '#F59E0B',
    },
  ];

  return (
    <View style={th.wrap}>
      <Text style={[th.title, { color: C.text }]}>Choose your style</Text>
      <Text style={[th.sub, { color: C.muted }]}>You can change this anytime in settings</Text>

      <View style={th.cards}>
        {THEMES.map((t) => {
          const selected = chosen ? chosen === (t.dark ? 'dark' : 'light') : isDark === t.dark;
          return (
            <TouchableOpacity key={t.name} activeOpacity={0.88} onPress={() => pick(t.dark)}
              style={[th.card, { backgroundColor: t.bg, borderColor: selected ? ACCENT : 'transparent' }]}>

              {/* decorative BG blobs */}
              <View style={[th.blob1, { backgroundColor: t.dark ? '#1E1E3A' : '#E2E9F5' }]} />
              <View style={[th.blob2, { backgroundColor: ACCENT + (t.dark ? '12' : '18') }]} />

              {/* popular badge */}
              {t.popular && (
                <View style={[th.badge, { backgroundColor: ACCENT }]}>
                  <Text style={th.badgeTxt}>⭐ POPULAR</Text>
                </View>
              )}

              {/* checkmark */}
              {selected && (
                <View style={[th.check, { backgroundColor: ACCENT }]}>
                  <Ionicons name="checkmark" size={14} color="#0A0A0F" />
                </View>
              )}

              {/* content */}
              <View style={th.inner}>
                {/* left: info */}
                <View style={{ flex: 1 }}>
                  <Text style={th.emoji}>{t.emoji}</Text>
                  <Text style={[th.name, { color: t.text }]}>{t.name}</Text>
                  <Text style={[th.tagline, { color: ACCENT }]}>{t.tagline}</Text>
                  <Text style={[th.desc, { color: t.muted }]}>{t.desc}</Text>

                  {/* color swatches */}
                  <View style={th.swatches}>
                    {[ACCENT, t.accent2, t.accent3, t.dark ? '#FF6B9D' : '#EC4899'].map((col, i) => (
                      <View key={i} style={[th.swatch, { backgroundColor: col }]} />
                    ))}
                  </View>
                </View>

                {/* right: mini UI preview */}
                <View style={[th.preview, { backgroundColor: t.card }]}>
                  {/* header */}
                  <View style={th.pvHdr}>
                    <View style={[th.pvPill, { width: 32, backgroundColor: t.muted, opacity: 0.4 }]} />
                    <View style={[th.pvDot, { backgroundColor: ACCENT }]} />
                  </View>
                  {/* hero bar */}
                  <View style={[th.pvHero, { backgroundColor: ACCENT + '22' }]}>
                    <View style={[th.pvPill, { width: 40, backgroundColor: ACCENT }]} />
                    <View style={[th.pvPill, { width: 26, height: 3, backgroundColor: t.muted, opacity: 0.4, marginTop: 3 }]} />
                  </View>
                  {/* stat dots */}
                  <View style={th.pvStats}>
                    {[ACCENT, t.accent2, t.accent3].map((col, i) => (
                      <View key={i} style={[th.pvStat, { backgroundColor: t.dark ? '#1E1E2A' : '#F0F3FA' }]}>
                        <View style={[th.pvStatDot, { backgroundColor: col }]} />
                      </View>
                    ))}
                  </View>
                  {/* bottom bar */}
                  <View style={[th.pvBar, { backgroundColor: t.dark ? '#1E1E2A' : '#E8ECF4' }]}>
                    {[0,1,2].map(i => (
                      <View key={i} style={[th.pvBarDot, { backgroundColor: i === 1 ? ACCENT : t.muted, opacity: i === 1 ? 1 : 0.3, width: i === 1 ? 18 : 8 }]} />
                    ))}
                  </View>
                </View>
              </View>

              {/* select footer */}
              <View style={[th.foot, { backgroundColor: selected ? ACCENT : (t.dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)') }]}>
                <Text style={[th.footTxt, { color: selected ? '#0A0A0F' : t.muted }]}>
                  {selected ? '✓  Selected' : 'Tap to select'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const th = StyleSheet.create({
  wrap:      { flex:1, paddingHorizontal:18, paddingTop:4, paddingBottom:8 },
  title:     { fontSize:26, fontWeight:'900', textAlign:'center', marginBottom:5 },
  sub:       { fontSize:12, textAlign:'center', marginBottom:16, opacity:0.6 },
  cards:     { flex:1, gap:14 },

  card:      { flex:1, borderRadius:24, borderWidth:2.5, overflow:'hidden',
               padding:18, position:'relative' },
  blob1:     { position:'absolute', width:160, height:160, borderRadius:80,
               top:-50, right:-50, opacity:0.7 },
  blob2:     { position:'absolute', width:200, height:200, borderRadius:100,
               bottom:-70, left:-60 },

  badge:     { position:'absolute', top:14, left:14, borderRadius:8,
               paddingHorizontal:10, paddingVertical:4, zIndex:10 },
  badgeTxt:  { fontSize:9, fontWeight:'900', color:'#0A0A0F', letterSpacing:0.5 },
  check:     { position:'absolute', top:14, right:14, width:28, height:28,
               borderRadius:14, alignItems:'center', justifyContent:'center', zIndex:10 },

  inner:     { flex:1, flexDirection:'row', alignItems:'center', gap:16, paddingTop:16 },

  emoji:     { fontSize:36, marginBottom:6 },
  name:      { fontSize:20, fontWeight:'900', marginBottom:2 },
  tagline:   { fontSize:13, fontWeight:'700', marginBottom:3 },
  desc:      { fontSize:11, lineHeight:16, marginBottom:12 },

  swatches:  { flexDirection:'row', gap:7 },
  swatch:    { width:22, height:22, borderRadius:11 },

  preview:   { width:90, borderRadius:14, padding:8, gap:6,
               shadowColor:'#000', shadowOpacity:0.15, shadowRadius:8, shadowOffset:{width:0,height:4},
               elevation:4 },
  pvHdr:     { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  pvPill:    { height:5, borderRadius:3 },
  pvDot:     { width:10, height:10, borderRadius:5 },
  pvHero:    { borderRadius:8, padding:7, gap:2 },
  pvStats:   { flexDirection:'row', gap:4 },
  pvStat:    { flex:1, borderRadius:6, padding:5, alignItems:'center' },
  pvStatDot: { width:10, height:10, borderRadius:5 },
  pvBar:     { borderRadius:8, paddingVertical:6, flexDirection:'row',
               justifyContent:'space-around', alignItems:'center' },
  pvBarDot:  { height:4, borderRadius:2 },

  foot:      { borderRadius:14, paddingVertical:11, alignItems:'center', marginTop:14 },
  footTxt:   { fontSize:12, fontWeight:'800', letterSpacing:0.3 },
});

// ── Section intro with spring animation ─────────────────────────────────────
function SectionIntro({ step, C }) {
  const scale = useRef(new Animated.Value(0.72)).current;
  const op    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 55, friction: 8 }),
      Animated.timing(op,    { toValue: 1, duration: 380, useNativeDriver: true }),
    ]).start();
  }, []);

  const sectionCount = STEPS.filter(s => s.type === 'section').length;

  return (
    <View style={si.wrap}>
      {/* top decorative bar */}
      <View style={si.topBar}>
        <View style={[si.barLine, { backgroundColor: C.accent, flex: 1 }]} />
        <View style={[si.barDot,  { backgroundColor: C.accent }]} />
        <View style={[si.barLine, { backgroundColor: C.border, flex: 3 }]} />
      </View>

      <Animated.View style={[si.center, { opacity: op, transform: [{ scale }] }]}>
        {/* glow ring */}
        <Svg width={220} height={220} style={si.glowSvg}>
          <Defs>
            <RadialGradient id="sg" cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0"   stopColor={C.accent} stopOpacity="0.18" />
              <Stop offset="0.6" stopColor={C.accent} stopOpacity="0.06" />
              <Stop offset="1"   stopColor={C.accent} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <SvgCircle cx={110} cy={110} r={105} fill="url(#sg)" />
          <SvgCircle cx={110} cy={110} r={72}
            fill="none" stroke={C.accent} strokeWidth={1.5} strokeOpacity={0.3}
            strokeDasharray="6 8" />
        </Svg>

        {/* number */}
        <Text style={[si.num, { color: C.accent }]}>{step.num}</Text>

        {/* section label */}
        <View style={[si.badge, { borderColor: C.accent + '55', backgroundColor: C.accentDim }]}>
          <Text style={[si.badgeTxt, { color: C.accent }]}>
            SECTION {step.num} OF {sectionCount}
          </Text>
        </View>

        {/* title */}
        <Text style={[si.title, { color: C.text }]}>{step.title}</Text>

        {/* subtitle */}
        {step.sub ? <Text style={[si.sub, { color: C.muted }]}>{step.sub}</Text> : null}
      </Animated.View>

      {/* bottom decorative bar */}
      <View style={si.bottomBar}>
        <View style={[si.barLine, { backgroundColor: C.border, flex: 3 }]} />
        <View style={[si.barDot,  { backgroundColor: C.accent }]} />
        <View style={[si.barLine, { backgroundColor: C.accent, flex: 1 }]} />
      </View>
    </View>
  );
}

const si = StyleSheet.create({
  wrap:     { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 32 },
  topBar:   { flexDirection: 'row', alignItems: 'center', gap: 8, width: '80%' },
  bottomBar:{ flexDirection: 'row', alignItems: 'center', gap: 8, width: '80%' },
  barLine:  { height: 2, borderRadius: 1 },
  barDot:   { width: 8, height: 8, borderRadius: 4 },
  center:   { alignItems: 'center', gap: 14 },
  glowSvg:  { position: 'absolute', top: -62, left: -110 },
  num: {
    fontSize: 110, fontWeight: '900', letterSpacing: -4,
    lineHeight: 110,
    textShadowColor: '#C8F135', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 24,
  },
  badge:    { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  badgeTxt: { fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  title:    { fontSize: 38, fontWeight: '900', textAlign: 'center', letterSpacing: -0.5 },
  sub:      { fontSize: 16, fontWeight: '500', textAlign: 'center', opacity: 0.8 },
});

// ── Focus-area heatmap screen with connector lines ───────────────────────────
function FocusScreen({ gender, ans, set, C, s }) {
  const BODY_H = 272;
  const VB_W = 160, VB_H = 340;
  const BODY_W = Math.round(BODY_H * VB_W / VB_H); // ≈128
  const COL_PAD = 6; // horizontal padding inside body column

  // dot position (px from SVG top-left) for each region at BODY_H=272
  const scale  = BODY_H / VB_H;
  const scaleX = BODY_W / VB_W;
  const gSh    = gender === 'male' ? 43 : 33; // shoulder HW matches BodySilhouette
  const RDOT = {
    arms:   { x: (80 - gSh - 12) * scaleX,  y: 142 * scale },
    chest:  { x: 60 * scaleX,               y: 108 * scale },
    abs:    { x: 60 * scaleX,               y: 162 * scale },
    glutes: { x: 60 * scaleX,               y: 219 * scale },
    legs:   { x: (80 - 17) * scaleX,        y: 286 * scale },
    back:   { x: 60 * scaleX,               y: 118 * scale },
    full:   { x: 60 * scaleX,               y: 175 * scale },
  };

  const [optY, setOptY]     = useState({});
  const [rowW, setRowW]     = useState(0);
  const [rowH, setRowH]     = useState(0);
  const [listW, setListW]   = useState(0);
  const [bodyTopY, setBodyTopY] = useState(0);

  const areas = FOCUS_AREAS[gender];
  const GAP   = 8;

  return (
    <View style={[s.body, { flex: 1 }]}>
      <Heading C={C} a="Which area would you" b="like to focus on?" />
      <View
        style={s.focusRow}
        onLayout={e => {
          setRowW(e.nativeEvent.layout.width);
          setRowH(e.nativeEvent.layout.height);
        }}
      >
        {/* option pills */}
        <View
          style={s.focusList}
          onLayout={e => setListW(e.nativeEvent.layout.width)}
        >
          {areas.map(opt => {
            const on = (ans.focus_areas || []).includes(opt.region);
            return (
              <TouchableOpacity
                key={opt.key}
                style={[s.focusCard, {
                  borderColor: on ? C.accent : C.border,
                  backgroundColor: on ? C.accentDim : C.card,
                }]}
                onLayout={e => {
                  const { y, height } = e.nativeEvent.layout;
                  setOptY(p => ({ ...p, [opt.region]: y + height / 2 }));
                }}
                onPress={() => {
                  const cur = ans.focus_areas || [];
                  set('focus_areas', cur.includes(opt.region)
                    ? cur.filter(r => r !== opt.region)
                    : [...cur, opt.region]);
                }}
                activeOpacity={0.8}
              >
                <Text style={[s.focusTxt, { color: on ? C.accent : C.text }]} numberOfLines={1}>
                  {opt.label}
                </Text>
                <Ionicons
                  name={on ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18} color={on ? C.accent : C.dim}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* body silhouette */}
        <View style={{ width: BODY_W + COL_PAD * 2, alignItems: 'center', justifyContent: 'center' }}>
          <View onLayout={e => setBodyTopY(e.nativeEvent.layout.y)}>
            <Image
              source={
                gender === 'female'
                  ? require('../../assets/gender/female.png')
                  : require('../../assets/gender/male.png')
              }
              style={{ 
                width: BODY_W, 
                height: BODY_H,
                transform: [{ scale: 1.6 }, { translateY: 10 }]
              }}
              contentFit="contain"
            />
          </View>
        </View>

        {/* connector lines SVG overlay */}
        {rowW > 0 && rowH > 0 && listW > 0 && (
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width: rowW, height: rowH }}>
          <Svg
            width={rowW}
            height={rowH}
          >
            {areas.map(opt => {
              const oy  = optY[opt.region];
              const rd  = RDOT[opt.region];
              if (oy == null || !rd) return null;
              const on = (ans.focus_areas || []).includes(opt.region);
              const col = on ? C.accent : C.border;
              const op  = on ? 1 : 0.38;
              // line start: right edge of option list
              const x1 = listW;
              const y1 = oy;
              // line end: dot on body (body col starts after listW + GAP)
              const bodyLeft = listW + GAP + COL_PAD;
              const x2 = bodyLeft + rd.x;
              const y2 = bodyTopY + rd.y;
              return (
                <SvgG key={opt.region}>
                  <SvgLine
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={col} strokeWidth={1.4} opacity={op}
                    strokeDasharray={on ? undefined : '5 4'}
                  />
                  {/* small circle at option edge */}
                  <SvgCircle cx={x1} cy={y1} r={2.8} fill={col} opacity={op} />
                  {/* dot on body */}
                  <SvgCircle
                    cx={x2} cy={y2} r={on ? 5 : 3.5}
                    fill={on ? C.accent : 'transparent'}
                    stroke={col} strokeWidth={1.5}
                    opacity={op}
                  />
                </SvgG>
              );
            })}
          </Svg>
          </View>
        )}
      </View>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function QuizOnboarding({ onComplete }) {
  const C = useC();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(C), [C]);
  const user = useAuthStore(st => st.user);
  const setUser = useAuthStore(st => st.setUser);

  const [idx, setIdx] = useState(0);
  // gender comes from profile (set at signup) — pre-fill so gender-aware screens work immediately
  const [ans, setAns] = useState({ gender: user?.gender || '', focus_areas: [], target_bodyfat: 1, frequency: 2, theme_choice: '' });
  const [saving, setSaving] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;

  const step = STEPS[idx];
  const total = STEPS.length;
  const set = (k, v) => setAns(p => ({ ...p, [k]: v }));

  const animate = (dir, to) => {
    Animated.timing(fade, { toValue: 0, duration: 130, useNativeDriver: true }).start(() => {
      setIdx(to);
      fade.setValue(0);
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    });
  };
  const next = () => { if (idx < total - 1) animate(1, idx + 1); else finish(); };
  const back = () => { if (idx > 0) animate(-1, idx - 1); };

  // auto-advance section intros
  useEffect(() => {
    if (step?.type === 'section') {
      const t = setTimeout(() => { if (idx < total - 1) next(); }, 1100);
      return () => clearTimeout(t);
    }
  }, [idx]);

  const markDone = async () => {
    try { if (user?.id) await AsyncStorage.setItem(onboardedKey(user.id), '1'); } catch {}
    onComplete?.();
  };

  const finish = async () => {
    setSaving(true);
    try {
      const u = {};
      // gender already saved at signup; only update if explicitly changed in quiz
      if (ans.gender && ans.gender !== user?.gender) u.gender = ans.gender;
      if (ans.age)       u.date_of_birth = `${new Date().getFullYear() - +ans.age}-01-01`;
      if (ans.height_unit === 'ft' && ans.height_ft) {
        u.height_cm = Math.round((+ans.height_ft * 30.48) + (+(ans.height_in || 0) * 2.54));
      } else if (ans.height_cm) {
        u.height_cm = +ans.height_cm;
      }
      if (ans.weight_kg) u.weight_kg = +ans.weight_kg;
      const lvl = { easy: 'beginner', sweat: 'intermediate', hard: 'advanced' }[ans.level];
      if (lvl) u.fitness_level = lvl;
      if (u.height_cm && u.weight_kg) {
        const h = u.height_cm / 100;
        u.bmi = +(u.weight_kg / (h * h)).toFixed(1);
      }
      if (ans.focus_areas?.length) u.focus_areas = ans.focus_areas;
      if (Object.keys(u).length) await setUser(u);

      const goalType = ans.body_shape === 'skinny' ? 'muscle_gain'
        : ans.body_shape === 'toned' ? 'maintenance' : 'weight_loss';
      const titleMap = { weight_loss: 'Lose Weight', muscle_gain: 'Gain Muscle', maintenance: 'Stay Fit' };
      try { await goalsAPI.create({ type: goalType, title: titleMap[goalType] }); } catch {}

      await markDone();
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not save. Check your connection.');
    } finally { setSaving(false); }
  };

  // ── per-step validation (can we proceed?) ──
  const canNext = (() => {
    switch (step.type) {
      case 'theme':   return true; // auto-advances on pick; Next also works
      case 'gender':  return !!ans.gender;
      case 'focus':   return (ans.focus_areas || []).length > 0;
      case 'shape':   return !!ans.body_shape;
      case 'number': {
        if (step.key === 'height_cm' && ans.height_unit === 'ft') {
          return ans.height_ft && +ans.height_ft > 0 && ans.height_in != null;
        }
        return ans[step.key] && +ans[step.key] >= step.min && +ans[step.key] <= step.max;
      }
      case 'choice':  return !!ans[step.key];
      case 'statement': return !!ans[step.key];
      case 'social_proof': return true;
      default:        return true;
    }
  })();

  // Use profile gender (set at signup) as source of truth; fallback to quiz answer
  const gender = user?.gender || ans.gender || 'male';
  const progress = ((idx + 1) / total) * 100;

  return (
    <View style={[s.root, { paddingTop: insets.top + 8 }]}>
      {/* top bar */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={back} disabled={idx === 0}>
          <Ionicons name="chevron-back" size={22} color={idx === 0 ? C.dim : C.text} />
        </TouchableOpacity>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${progress}%`, backgroundColor: C.accent }]} />
        </View>
        <TouchableOpacity onPress={markDone} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={s.skip}>Skip</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={{ flex: 1, opacity: fade }}>
        {/* ═══ SECTION INTRO ═══ */}
        {step.type === 'section' && (
          <SectionIntro step={step} C={C} />
        )}

        {/* ═══ THEME PICKER ═══ */}
        {step.type === 'theme' && (
          <ThemeStep ans={ans} set={set} C={C} onNext={next} />
        )}

        {/* ═══ GENDER ═══ */}
        {step.type === 'gender' && (
          <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
            <Heading C={C} a={step.title} b={step.title2} />
            <View style={s.genderRow}>
              {['female', 'male'].map(g => {
                const on = ans.gender === g;
                return (
                  <TouchableOpacity key={g} style={[s.genderCard, { borderColor: on ? C.accent : C.border, backgroundColor: on ? C.accentDim : C.card }]}
                    onPress={() => set('gender', g)} activeOpacity={0.85}>
                    <Image
                      source={
                        g === 'female'
                          ? require('../../assets/gender/female.png')
                          : require('../../assets/gender/male.png')
                      }
                      style={{ width: 145, height: 210, borderRadius: 12, marginBottom: 16, opacity: on ? 1 : 0.6 }}
                      contentFit="cover"
                    />
                    <Text style={[s.genderLbl, { color: on ? C.accent : C.text }]}>
                      {g === 'female' ? 'Female' : 'Male'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* ═══ FOCUS AREA HEATMAP ═══ */}
        {step.type === 'focus' && (
          <FocusScreen gender={gender} ans={ans} set={set} C={C} s={s} />
        )}

        {/* ═══ BODY SHAPE ═══ */}
        {step.type === 'shape' && (
          <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
            <Heading C={C} a={step.title} b={step.title2} />
            <View style={s.shapeGrid}>
              {BODY_SHAPES.map(sh => {
                const on = ans.body_shape === sh.key;
                const getShapeImage = (g, k) => {
                  if (g === 'female') {
                    if (k === 'skinny') return require('../../assets/shapes/female_skinny.png');
                    if (k === 'medium') return require('../../assets/shapes/female_medium.png');
                    if (k === 'flabby') return require('../../assets/shapes/female_flabby.png');
                    return require('../../assets/shapes/female_toned.png');
                  } else {
                    if (k === 'skinny') return require('../../assets/shapes/male_skinny.png');
                    if (k === 'medium') return require('../../assets/shapes/male_medium.png');
                    if (k === 'flabby') return require('../../assets/shapes/male_flabby.png');
                    return require('../../assets/shapes/male_toned.png');
                  }
                };
                return (
                  <TouchableOpacity key={sh.key}
                    style={[s.shapeCard, { borderColor: on ? C.accent : C.border, backgroundColor: on ? C.accentDim : C.card }]}
                    onPress={() => set('body_shape', sh.key)} activeOpacity={0.85}>
                    <Image source={getShapeImage(gender, sh.key)} style={{ width: 120, height: 160, opacity: on ? 1 : 0.6 }} contentFit="contain" />
                    <Text style={[s.shapeLbl, { color: on ? C.accent : C.text, marginTop: 8 }]}>{sh.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* ═══ DESIRED BODY-FAT SLIDER ═══ */}
        {step.type === 'bodyfat' && (() => {
          const stop = BODYFAT_STOPS[ans.target_bodyfat] || BODYFAT_STOPS[1];
          return (
            <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
              <Heading C={C} a={step.title} b={step.title2} />
              <View style={s.bfBody}>
                {(() => {
                  const getShapeImage = (g, k) => {
                    if (g === 'female') {
                      if (k === 'skinny') return require('../../assets/shapes/female_skinny.png');
                      if (k === 'medium') return require('../../assets/shapes/female_medium.png');
                      if (k === 'flabby') return require('../../assets/shapes/female_flabby.png');
                      return require('../../assets/shapes/female_toned.png');
                    } else {
                      if (k === 'skinny') return require('../../assets/shapes/male_skinny.png');
                      if (k === 'medium') return require('../../assets/shapes/male_medium.png');
                      if (k === 'flabby') return require('../../assets/shapes/male_flabby.png');
                      return require('../../assets/shapes/male_toned.png');
                    }
                  };
                  return <Image source={getShapeImage(gender, stop.shape)} style={{ width: 180, height: 260 }} contentFit="contain" />;
                })()}
              </View>
              <Slider count={BODYFAT_STOPS.length} value={ans.target_bodyfat} onChange={v => set('target_bodyfat', v)} C={C} />
              <View style={s.sliderEnds}>
                <Text style={s.endLbl}>Cut</Text>
                <Text style={s.endLbl}>Extra</Text>
              </View>
              <View style={[s.feedback, { borderColor: C.border }]}>
                <View style={s.fbHead}>
                  <Ionicons name="hardware-chip-outline" size={16} color={C.accent} />
                  <Text style={s.fbTitle}>Your Target Body Fat</Text>
                </View>
                <Text style={[s.fbRange, { color: TONE[stop.tone] }]}>{stop.range} ({stop.title})</Text>
                <Text style={s.fbNote}>{stop.note}</Text>
              </View>
            </ScrollView>
          );
        })()}

        {/* ═══ NUMBER INPUT ═══ */}
        {step.type === 'number' && (() => {
          const isHeight = step.key === 'height_cm';
          const unit = isHeight ? (ans.height_unit || 'cm') : step.unit;
          return (
            <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Heading C={C} a={step.title} />
              
              {isHeight && (
                <View style={{ flexDirection: 'row', alignSelf: 'center', backgroundColor: C.card, borderRadius: 8, padding: 4, marginBottom: 10, marginTop: 20 }}>
                  <TouchableOpacity onPress={() => set('height_unit', 'cm')} style={{ paddingVertical: 6, paddingHorizontal: 20, backgroundColor: unit === 'cm' ? C.accent : 'transparent', borderRadius: 6 }}>
                    <Text style={{ color: unit === 'cm' ? '#0A0A0F' : C.text, fontWeight: 'bold' }}>cm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => set('height_unit', 'ft')} style={{ paddingVertical: 6, paddingHorizontal: 20, backgroundColor: unit === 'ft' ? C.accent : 'transparent', borderRadius: 6 }}>
                    <Text style={{ color: unit === 'ft' ? '#0A0A0F' : C.text, fontWeight: 'bold' }}>ft</Text>
                  </TouchableOpacity>
                </View>
              )}

              {isHeight && unit === 'ft' ? (
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 20, marginTop: 20 }}>
                  <View style={[s.numWrap, { marginTop: 0 }]}>
                    <TextInput
                      style={[s.numInput, { minWidth: 70 }]}
                      value={ans.height_ft ? String(ans.height_ft) : ''}
                      onChangeText={t => set('height_ft', t.replace(/[^0-9]/g, ''))}
                      placeholder="5" placeholderTextColor={C.dim}
                      keyboardType="number-pad" maxLength={1} autoFocus
                    />
                    <Text style={s.numUnit}>ft</Text>
                  </View>
                  <View style={[s.numWrap, { marginTop: 0 }]}>
                    <TextInput
                      style={[s.numInput, { minWidth: 70 }]}
                      value={ans.height_in ? String(ans.height_in) : ''}
                      onChangeText={t => set('height_in', t.replace(/[^0-9]/g, ''))}
                      placeholder="11" placeholderTextColor={C.dim}
                      keyboardType="number-pad" maxLength={2}
                    />
                    <Text style={s.numUnit}>in</Text>
                  </View>
                </View>
              ) : (
                <View style={s.numWrap}>
                  <TextInput
                    style={s.numInput}
                    value={ans[step.key] ? String(ans[step.key]) : ''}
                    onChangeText={t => set(step.key, t.replace(step.decimal ? /[^0-9.]/g : /[^0-9]/g, ''))}
                    placeholder={step.placeholder} placeholderTextColor={C.dim}
                    keyboardType={step.decimal ? 'decimal-pad' : 'number-pad'} maxLength={6} autoFocus
                  />
                  <Text style={s.numUnit}>{unit}</Text>
                </View>
              )}
            </ScrollView>
          );
        })()}

        {/* ═══ CHOICE LIST ═══ */}
        {step.type === 'choice' && (
          <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
            <Heading C={C} a={step.title} b={step.title2} />
            <View style={{ gap: 12, marginTop: 10 }}>
              {step.options.map(opt => {
                const on = ans[step.key] === opt.key;
                return (
                  <View key={opt.key}>
                    <TouchableOpacity
                      style={[s.choiceCard, { borderColor: on ? C.accent : C.border, backgroundColor: on ? C.accentDim : C.card }]}
                      onPress={() => set(step.key, opt.key)} activeOpacity={0.85}>
                      <Ionicons name={opt.ion} size={22} color={on ? C.accent : C.text} />
                      <Text style={[s.choiceTxt, { color: on ? C.accent : C.text }]}>{opt.label}</Text>
                    </TouchableOpacity>
                    {on && opt.feedback && (
                      <View style={[s.feedback, { borderColor: C.border, marginTop: 8 }]}>
                        <View style={s.fbHead}>
                          <Ionicons name="hardware-chip-outline" size={16} color={C.accent} />
                          <Text style={s.fbTitle}>Understood!</Text>
                        </View>
                        <Text style={s.fbNote}>{opt.feedback}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* ═══ STATEMENT ═══ */}
        {step.type === 'statement' && (() => {
          const getImg = (g, k) => {
            if (g === 'female') {
              if (k === 'unsure') return require('../../assets/statement_unsure_female.png');
              if (k === 'giveup') return require('../../assets/statement_giveup_female.png');
              return require('../../assets/statement_dissatisfied_female.png');
            } else {
              if (k === 'unsure') return require('../../assets/statement_unsure_male.png');
              if (k === 'giveup') return require('../../assets/statement_giveup_male.png');
              return require('../../assets/statement_dissatisfied_male.png');
            }
          };

          return (
            <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
              <Heading C={C} a={step.title} b={step.title2} />
              
              <View style={{ backgroundColor: C.card, borderRadius: 24, marginTop: 24, padding: 20, alignItems: 'center' }}>
                <View style={{ backgroundColor: C.bg, borderRadius: 30, paddingHorizontal: 24, paddingVertical: 18, marginBottom: -15, zIndex: 10, borderWidth: 1, borderColor: C.border }}>
                  <Text style={{ color: C.text, fontSize: 16, fontWeight: '700', textAlign: 'center', fontStyle: 'italic', lineHeight: 22 }}>
                    {step.statement}
                  </Text>
                  <View style={{ position: 'absolute', bottom: -10, alignSelf: 'center', width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 10, borderStyle: 'solid', backgroundColor: 'transparent', borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: C.border }} />
                  <View style={{ position: 'absolute', bottom: -8, alignSelf: 'center', width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 8, borderStyle: 'solid', backgroundColor: 'transparent', borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: C.bg }} />
                </View>

                <Image source={getImg(gender, step.imageKey)} style={{ width: '100%', height: 260, borderRadius: 16 }} contentFit="contain" />
              </View>

              <View style={{ flexDirection: 'row', gap: 16, marginTop: 30 }}>
                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: ans[step.key] === 'no' ? C.card2 : C.card, borderRadius: 30, paddingVertical: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 2, borderColor: ans[step.key] === 'no' ? '#FF453A' : 'transparent' }}
                  onPress={() => { set(step.key, 'no'); setTimeout(next, 300); }}>
                  <Ionicons name="close" size={20} color="#FF453A" />
                  <Text style={{ color: C.text, fontSize: 18, fontWeight: '800' }}>No</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: ans[step.key] === 'yes' ? C.card2 : C.card, borderRadius: 30, paddingVertical: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 2, borderColor: ans[step.key] === 'yes' ? '#2FCFA0' : 'transparent' }}
                  onPress={() => { set(step.key, 'yes'); setTimeout(next, 300); }}>
                  <Ionicons name="checkmark" size={20} color="#2FCFA0" />
                  <Text style={{ color: C.text, fontSize: 18, fontWeight: '800' }}>Yes</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          );
        })()}

        {/* ═══ SOCIAL PROOF ═══ */}
        {step.type === 'social_proof' && (
          <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
            <Heading C={C} a="Our app is made for" b="people just like you!" />
            
            <View style={{ marginVertical: 30, alignItems: 'center' }}>
              <Image source={require('../../assets/social_proof_grid.png')} style={{ width: 300, height: 280 }} contentFit="contain" />
            </View>

            <Text style={{ color: C.accent, fontSize: 32, fontWeight: '900', textAlign: 'center' }}>
              83% <Text style={{ color: C.text }}>of users</Text>
            </Text>
            
            <Text style={{ color: C.muted, fontSize: 16, textAlign: 'center', marginTop: 12, lineHeight: 24, paddingHorizontal: 10 }}>
              claim that the workout plan we offer is easy to follow and makes it simple to stay on track.
            </Text>
          </ScrollView>
        )}

        {/* ═══ FREQUENCY SLIDER ═══ */}
        {step.type === 'frequency' && (() => {
          const f = FREQ_STOPS[ans.frequency] || FREQ_STOPS[2];
          return (
            <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
              <Heading C={C} a={step.title} b={step.title2} />
              <View style={s.calWrap}>
                <View style={[s.calTop, { backgroundColor: C.accent }]} />
                <View style={[s.calBody, { backgroundColor: C.card, borderColor: C.border }]}>
                  <Text style={[s.calNum, { color: C.text }]}>{f.n}</Text>
                </View>
              </View>
              <Text style={s.freqLabel}>{f.label}</Text>
              <Text style={s.freqSub}>{f.sub}</Text>
              <Slider count={FREQ_STOPS.length} value={ans.frequency} onChange={v => set('frequency', v)} C={C} />
              <View style={s.sliderEnds}>
                <Text style={s.endLbl}>Less</Text>
                <Text style={s.endLbl}>More</Text>
              </View>
            </ScrollView>
          );
        })()}

        {/* ═══ RESULTS ═══ */}
        {step.type === 'results' && (() => {
          const cur = +ans.weight_kg || 70;
          const shape = ans.body_shape;
          const delta = shape === 'skinny' ? 3.2 : shape === 'toned' ? 0 : -4.5;
          const target = +(cur + delta).toFixed(1);
          const d = new Date(); d.setDate(d.getDate() + 56);
          const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return (
            <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
              <Text style={s.resultTop}>It's totally achievable!</Text>
              <Text style={s.resultBig}>
                {delta >= 0 ? 'Reach ' : 'Reach '}
                <Text style={{ color: C.accent }}>{target} kg</Text> by <Text style={{ color: C.accent }}>{dateStr}</Text>
              </Text>
              <View style={{ marginVertical: 24 }}>
                <ResultGraph from={cur} to={target} C={C} />
                <View style={s.graphLbls}>
                  <Text style={s.graphLbl}>{cur} kg · Today</Text>
                  <Text style={[s.graphLbl, { color: C.accent }]}>{target} kg · {dateStr}</Text>
                </View>
              </View>
              <Text style={s.resultNote}>
                We've predicted this target based on the progress of 60,000+ users like you.
              </Text>
            </ScrollView>
          );
        })()}
      </Animated.View>

      {/* bottom Next button (hidden on section intros + theme auto-advances) */}
      {step.type !== 'section' && step.type !== 'theme' && (
        <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={[s.nextBtn, { backgroundColor: canNext ? C.accent : C.border }]}
            onPress={next} disabled={!canNext || saving} activeOpacity={0.9}>
            {saving
              ? <ActivityIndicator color="#0A0A0F" />
              : <Text style={[s.nextTxt, { color: canNext ? '#0A0A0F' : C.dim }]}>
                  {step.type === 'results' ? 'Start My Journey' : 'Next'}
                </Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// heading helper
const Heading = ({ C, a, b }) => (
  <View style={{ marginBottom: 8 }}>
    <Text style={{ color: C.text, fontSize: 26, fontWeight: '900', textAlign: 'center', lineHeight: 32 }}>{a}</Text>
    {b ? <Text style={{ color: C.text, fontSize: 26, fontWeight: '900', textAlign: 'center', lineHeight: 32 }}>{b}</Text> : null}
  </View>
);

const makeStyles = (C) => StyleSheet.create({
  root:          { flex: 1, backgroundColor: C.bg },
  topBar:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, marginBottom: 8 },
  backBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: C.border, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 3 },
  skip:          { color: C.muted, fontSize: 14, fontWeight: '700' },
  body:          { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },

genderRow:     { flexDirection: 'row', gap: 14, marginTop: 20 },
  genderCard:    { flex: 1, borderWidth: 2, borderRadius: 20, paddingVertical: 18, alignItems: 'center' },
  genderLbl:     { fontSize: 16, fontWeight: '800', marginTop: 10 },

  focusRow:      { flexDirection: 'row', flex: 1, marginTop: 10, gap: 8 },
  focusList:     { flex: 1, gap: 10, justifyContent: 'center' },
  focusCard:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                   borderWidth: 2, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  focusTxt:      { fontSize: 13, fontWeight: '700', flex: 1 },

  shapeGrid:     { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 12, rowGap: 14 },
  shapeCard:     { width: '47%', borderWidth: 2, borderRadius: 18, paddingVertical: 14, alignItems: 'center' },
  shapeLbl:      { fontSize: 15, fontWeight: '800', marginTop: 8 },

  bfBody:        { alignItems: 'center', marginVertical: 16 },
  sliderEnds:    { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  endLbl:        { color: C.muted, fontSize: 13, fontWeight: '600' },
  feedback:      { backgroundColor: C.accentDim, borderRadius: 16, borderWidth: 1, padding: 14, marginTop: 18 },
  fbHead:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  fbTitle:       { color: C.text, fontSize: 15, fontWeight: '800' },
  fbRange:       { fontSize: 17, fontWeight: '900', marginBottom: 4 },
  fbNote:        { color: C.muted, fontSize: 13, lineHeight: 19 },

  numWrap:       { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginTop: 50, gap: 10 },
  numInput:     { color: C.text, fontSize: 56, fontWeight: '900', minWidth: 120, textAlign: 'center',
                   borderBottomWidth: 3, borderColor: C.accent, paddingBottom: 4 },
  numUnit:       { color: C.muted, fontSize: 20, fontWeight: '700', marginBottom: 12 },

  choiceCard:    { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 2, borderRadius: 16, padding: 16 },
  choiceTxt:     { fontSize: 16, fontWeight: '700' },

  calWrap:       { alignItems: 'center', marginVertical: 26 },
  calTop:        { width: 90, height: 22, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  calBody:       { width: 90, height: 76, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderWidth: 1,
                   alignItems: 'center', justifyContent: 'center' },
  calNum:        { fontSize: 44, fontWeight: '900' },
  freqLabel:     { color: C.text, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  freqSub:       { color: C.muted, fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 20, paddingHorizontal: 20 },

  resultTop:     { color: C.muted, fontSize: 16, fontWeight: '700', textAlign: 'center', marginTop: 10 },
  resultBig:     { color: C.text, fontSize: 28, fontWeight: '900', textAlign: 'center', marginTop: 6 },
  graphLbls:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  graphLbl:      { color: C.muted, fontSize: 12, fontWeight: '700' },
  resultNote:    { color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 21, paddingHorizontal: 10 },

  footer:        { paddingHorizontal: 20, paddingTop: 8 },
  nextBtn:       { borderRadius: 30, paddingVertical: 17, alignItems: 'center' },
  nextTxt:       { fontSize: 17, fontWeight: '800' },
});
