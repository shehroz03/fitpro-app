import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator, Dimensions, Animated,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import Reanimated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { progressAPI, nutritionAPI, goalsAPI, workoutAPI } from '../api/services';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useC, DARK, LIGHT } from '../utils/theme';
import { avatarSource } from '../utils/avatars';
import { ProfileFrame } from '../components/ProfileFrame';
import { useFrameStore } from '../store/frameStore';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { triggerThemeTransition } from '../utils/themeTransition';
import { useEntrance, useSpringPress, usePulse, useCountUp, glowStyle, useBarFill } from '../utils/animations';

const { width: SW } = Dimensions.get('window');

// ── Gender-aware body image map ────────────────────────────────
const BODY_IMGS = {
  male: {
    weight_gain: { before: require('../../assets/shapes/male_skinny.png'), after: require('../../assets/shapes/male_toned.png') },
    weight_loss: { before: require('../../assets/shapes/male_flabby.png'), after: require('../../assets/shapes/male_medium.png') },
    default:     { before: require('../../assets/shapes/male_medium.png'), after: require('../../assets/shapes/male_toned.png') },
  },
  female: {
    weight_gain: { before: require('../../assets/shapes/female_skinny.png'), after: require('../../assets/shapes/female_toned.png') },
    weight_loss: { before: require('../../assets/shapes/female_flabby.png'), after: require('../../assets/shapes/female_medium.png') },
    default:     { before: require('../../assets/shapes/female_medium.png'), after: require('../../assets/shapes/female_toned.png') },
  },
};

const getBodyImgs = (gender, goalType) => {
  const g = gender === 'female' ? 'female' : 'male';
  const t = BODY_IMGS[g][goalType] || BODY_IMGS[g].default;
  return t;
};

// ── Gender-aware workout videos ────────────────────────────────
const VIDEOS_MALE = [
  { src: require('../../assets/videos/Man_performing_barbell_deadlift_202606110121.mp4'),  label: 'Barbell Deadlift',  tag: 'STRENGTH' },
  { src: require('../../assets/videos/Man_performing_barbell_hip_thrust_202606110121.mp4'), label: 'Hip Thrust',        tag: 'GLUTES'   },
  { src: require('../../assets/videos/Man_performs_one_pull-up_202606110121.mp4'),          label: 'Pull-Up',           tag: 'BACK'     },
  { src: require('../../assets/videos/Man_performing_dumbbell_curl_202606110121.mp4'),      label: 'Dumbbell Curl',     tag: 'ARMS'     },
  { src: require('../../assets/videos/Man_performing_shoulder_press_202606110121.mp4'),     label: 'Shoulder Press',    tag: 'SHOULDERS'},
];
const VIDEOS_FEMALE = [
  { src: require('../../assets/videos/Woman_performing_barbell_deadlift_202606110124.mp4'),   label: 'Barbell Deadlift', tag: 'STRENGTH' },
  { src: require('../../assets/videos/Woman_performing_barbell_hip_thrust_202606110124.mp4'), label: 'Hip Thrust',       tag: 'GLUTES'   },
  { src: require('../../assets/videos/Woman_performs_one_pull-up_202606110124.mp4'),          label: 'Pull-Up',          tag: 'BACK'     },
  { src: require('../../assets/videos/Woman_performing_dumbbell_curl_202606110124.mp4'),      label: 'Dumbbell Curl',    tag: 'ARMS'     },
  { src: require('../../assets/videos/Woman_performing_dumbbell_press_202606110124.mp4'),     label: 'Dumbbell Press',   tag: 'CHEST'    },
];

// ── Macro progress ring (animated fill on mount) ───────────────
function MacroRing({ value, max, color, size = 56, stroke = 6, label, unit, C, isDark }) {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min((value || 0) / (max || 1), 1);
  const fill = pct * circ;

  const animOffset = useRef(new Animated.Value(circ)).current;
  useEffect(() => {
    Animated.timing(animOffset, {
      toValue: circ - fill, duration: 700, delay: 200,
      useNativeDriver: false,
    }).start();
  }, [fill, circ]);

  const displayVal = useCountUp(value || 0, 800, true);

  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <SvgCircle cx={size/2} cy={size/2} r={r} fill="none"
            stroke={`${color}28`} strokeWidth={stroke} />
          {/* static ring at target — invisible, just for sizing */}
          <SvgCircle cx={size/2} cy={size/2} r={r} fill="none"
            stroke={color} strokeWidth={stroke}
            strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
            transform={`rotate(-90 ${size/2} ${size/2})`} opacity={0} />
        </Svg>
        {/* Animated fill overlay */}
        <Animated.View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={size} height={size}>
            <AnimatedCircle cx={size/2} cy={size/2} r={r} fill="none"
              stroke={color} strokeWidth={stroke}
              strokeDasharray={circ}
              strokeDashoffset={animOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${size/2} ${size/2})`} />
          </Svg>
        </Animated.View>
        <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
          <Text style={{ color, fontSize: 11, fontWeight: '900', lineHeight: 12 }}>{displayVal}</Text>
          <Text style={{ color: C.dim, fontSize: 7, fontWeight: '700' }}>{unit}</Text>
        </View>
      </View>
      <Text style={{ color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>{label}</Text>
    </View>
  );
}
// Animated SVG circle (stroke-dasharray must be animatable)
const AnimatedCircle = Animated.createAnimatedComponent(SvgCircle);

// ── Featured workout video card ────────────────────────────────
function WorkoutVideoCard({ gender, navigation, C, s }) {
  const pool    = gender === 'female' ? VIDEOS_FEMALE : VIDEOS_MALE;
  const idx     = useMemo(() => Math.floor(Math.random() * pool.length), []);
  const video   = pool[idx];
  const vidRef  = useRef(null);
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const onReady  = () => { if (readyRef.current) return; readyRef.current = true; setReady(true); };
  const pulseStyle = usePulse(true, 0.94, 1.0, 1600);

  return (
    <TouchableOpacity activeOpacity={0.9}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('Workouts'); }}
      style={s.videoCard}>
      {!ready && (
        <View style={s.videoHolder}>
          <Ionicons name="barbell-outline" size={32} color="rgba(200,241,53,0.4)" />
        </View>
      )}
      <Video ref={vidRef} source={video.src}
        style={[StyleSheet.absoluteFill, !ready && { opacity: 0 }]}
        resizeMode={ResizeMode.COVER} shouldPlay isLooping isMuted
        onReadyForDisplay={onReady}
        onPlaybackStatusUpdate={st => { if (st.isPlaying && !readyRef.current) onReady(); }} />
      <LinearGradient colors={['transparent','rgba(10,10,15,0.92)']}
        style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={s.videoOverlay} pointerEvents="none">
        <View style={s.videoTag}><Text style={s.videoTagTxt}>{video.tag}</Text></View>
        <Text style={s.videoLabel}>{video.label}</Text>
        <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
          <Reanimated.View style={[s.playBtn, pulseStyle]}>
            <Ionicons name="play" size={10} color="#0A0A0F" />
          </Reanimated.View>
          <Text style={s.videoSub}>Tap to explore workouts</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Today's Workout card with spring play button + pulse ───────
function WorkoutCardAnimated({ plan, planName, planMins, planCals, planExs, navigation, C, s, isDark }) {
  const { animStyle: cardScale, onPressIn, onPressOut } = useSpringPress(0.97);
  const pulseStyle = usePulse(true, 0.92, 1.0, 1800);
  const cardGlow = glowStyle(isDark, C.accent, 10, 0.14);
  return (
    <Reanimated.View style={[cardScale]}>
      <TouchableOpacity style={[s.workoutCard, cardGlow]}
        activeOpacity={1}
        onPressIn={onPressIn} onPressOut={onPressOut}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          plan ? navigation.navigate('WorkoutDetail', { plan }) : navigation.navigate('Workouts');
        }}>
        <LinearGradient colors={isDark ? ['#1A2A0A','#0A1A0A'] : ['#1A1F17','#0E1117']}
          style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:1}} />
        <View style={{ flex:1 }}>
          <Text style={s.workoutLabel}>TODAY'S WORKOUT</Text>
          <Text style={s.workoutName} numberOfLines={1}>{planName}</Text>
          <View style={s.workoutMeta}>
            {[
              { icon:'time-outline',   val:`${planMins}m` },
              { icon:'flame-outline',  val:`${planCals} kcal` },
              { icon:'repeat-outline', val:`${planExs} exs` },
            ].map(m => (
              <View key={m.icon} style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                <Ionicons name={m.icon} size={12} color={C.accent} />
                <Text style={s.workoutMetaTxt}>{m.val}</Text>
              </View>
            ))}
          </View>
        </View>
        <Reanimated.View style={[s.workoutPlayBtn, pulseStyle]}>
          <Ionicons name="play" size={22} color={C.accentText} />
        </Reanimated.View>
      </TouchableOpacity>
    </Reanimated.View>
  );
}

// ── Quick action button with spring press ─────────────────────
function QuickActionBtn({ q, navigation, s, C }) {
  const { animStyle, onPressIn, onPressOut } = useSpringPress(0.90);
  return (
    <Reanimated.View style={animStyle}>
      <TouchableOpacity style={s.quickBtn} activeOpacity={1}
        onPressIn={onPressIn} onPressOut={onPressOut}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate(q.screen); }}>
        <View style={[s.quickIcon, { backgroundColor:`${q.color}18`, borderColor:`${q.color}33` }]}>
          <Ionicons name={q.icon} size={20} color={q.color} />
        </View>
        <Text style={s.quickLabel}>{q.label}</Text>
      </TouchableOpacity>
    </Reanimated.View>
  );
}

// ── Animated calorie progress bar ─────────────────────────────
function CalBar({ pct, C, isDark }) {
  const anim = useBarFill(pct, 180, 700);
  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const barGlow = isDark ? {
    shadowColor: C.accent, shadowOpacity: 0.5, shadowRadius: 4, shadowOffset: { width: 0, height: 0 },
  } : {};
  return (
    <View style={{ height: 7, backgroundColor: `${C.accent}22`, borderRadius: 4, overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', backgroundColor: C.accent, borderRadius: 4 }, { width }, barGlow]} />
    </View>
  );
}

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 5)  return 'GOOD NIGHT';
  if (h < 12) return 'GOOD MORNING';
  if (h < 17) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
};

// All goal types share the single accent color
const GOAL_TYPE_COLOR = null;

export default function HomeScreen({ navigation }) {
  const C        = useC();
  const s        = useMemo(() => makeStyles(C), [C]);
  const user     = useAuthStore(st => st.user);
  const gender   = user?.gender === 'female' ? 'female' : 'male';
  const frameId  = useFrameStore(st => st.frameId);
  const isDark   = useThemeStore(st => st.isDark);
  const toggle   = useThemeStore(st => st.toggle);
  const toggleRef = useRef(null);

  const handleThemeToggle = () => {
    const nextBg = isDark ? LIGHT.bg : DARK.bg;
    if (toggleRef.current?.measureInWindow) {
      toggleRef.current.measureInWindow((x, y, w, h) =>
        triggerThemeTransition(x + w / 2, y + h / 2, nextBg, toggle));
    } else {
      triggerThemeTransition(SW - 60, 60, nextBg, toggle);
    }
  };

  const { data: stats, isLoading: sL, isRefetching: sR, refetch: rS } =
    useQuery({ queryKey: ['dashboard'], queryFn: () => progressAPI.getDashboard().then(r => r.data.data) });
  const { data: nutri, isLoading: nL, isRefetching: nR, refetch: rN } =
    useQuery({ queryKey: ['dailyNutrition'], queryFn: () => nutritionAPI.getDailyStats().then(r => r.data.data) });
  const { data: goals = [], isLoading: gL, isRefetching: gR, refetch: rG } =
    useQuery({ queryKey: ['goals','active'], queryFn: () => goalsAPI.getAll('active').then(r => r.data.data || []) });
  const { data: plans = [] } = useQuery({
    queryKey: ['workouts','',''],
    queryFn: () => workoutAPI.getPlans({}).then(r => r.data.data || []),
    staleTime: 5 * 60_000,
  });

  const loading = sL || nL || gL;
  const refresh = sR || nR || gR;
  const onRefresh = () => { rS(); rN(); rG(); };

  // ── Computed values (safe with null data while loading) ────────
  const streak      = stats?.streak?.current_streak       || 0;
  const totalWkts   = stats?.workout_stats?.total_workouts || 0;
  const weekly      = stats?.weekly_activity               || [];
  const activeDays  = weekly.filter(d => (d.count || 0) > 0).length;

  const calConsumed = Math.round(nutri?.consumed?.calories  || 0);
  const calTarget   = nutri?.targets?.calories              || 2200;
  const protConsumed= Math.round(nutri?.consumed?.protein_g || 0);
  const protTarget  = nutri?.targets?.protein_g             || 150;
  const carbConsumed= Math.round(nutri?.consumed?.carbs_g   || 0);
  const carbTarget  = nutri?.targets?.carbs_g               || 250;
  const fatConsumed = Math.round(nutri?.consumed?.fat_g     || 0);
  const fatTarget   = nutri?.targets?.fat_g                 || 65;
  const calPct      = Math.min((calConsumed / calTarget) * 100, 100);

  const plan       = plans[0] || null;
  const planName   = plan?.name           || 'Full Body Blast';
  const planMins   = plan?.duration_min   || 42;
  const planCals   = plan?.calories       || 420;
  const planExs    = plan?.exercises?.length || 8;

  const goalType   = (goals[0]?.type === 'weight_loss') ? 'weight_loss' : 'weight_gain';
  const bodyImgs   = getBodyImgs(gender, goalType);
  const maxCal     = weekly.length > 0 ? Math.max(...weekly.map(d => d.calories || 0), 1) : 1;

  const firstName  = user?.full_name?.split(' ')[0] || 'Champ';
  const weightGoal = goals.find(g => g.type === 'weight_loss' || g.type === 'weight_gain');

  // ── Entrance animations — must be before early return ─────────
  const e0 = useEntrance(0);
  const e1 = useEntrance(1);
  const e2 = useEntrance(2);
  const e3 = useEntrance(3);
  const e4 = useEntrance(4);
  const e5 = useEntrance(5);
  const e6 = useEntrance(6);

  // ── Count-up — enabled only after data loads ──────────────────
  const streakDisplay      = useCountUp(streak,      700, !loading);
  const totalWktsDisplay   = useCountUp(totalWkts,   700, !loading);
  const calDisplay         = useCountUp(calConsumed, 800, !loading);

  // ── Hero card glow / border depth ─────────────────────────────
  const heroDepth = isDark
    ? [{ borderColor: `${C.accent}33` }, glowStyle(true, C.accent, 14, 0.18)]
    : [{ borderColor: C.border }];

  if (loading) return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={{ color: C.muted, marginTop: 12, fontSize: 13 }}>Loading your dashboard...</Text>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.root} edges={['top']}>
    <ScrollView style={{ flex: 1 }}
      refreshControl={<RefreshControl refreshing={refresh} onRefresh={onRefresh} tintColor={C.accent} />}
      showsVerticalScrollIndicator={false}>

      {/* ══════════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════════ */}
      <Reanimated.View style={e0}>
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>{getGreeting()}</Text>
          <Text style={s.name}>{firstName} 👋</Text>
        </View>
        <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
          {/* Theme toggle */}
          <View ref={toggleRef} collapsable={false}>
            <TouchableOpacity onPress={handleThemeToggle} activeOpacity={0.8}
              style={[s.themeBtn, { borderColor: isDark ? `${C.accent}55` : `${C.accent}44` }]}>
              <Ionicons name={isDark ? 'sunny' : 'moon'} size={17}
                color={isDark ? C.accent : C.accent} />
            </TouchableOpacity>
          </View>
          {/* Avatar */}
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <ProfileFrame frameId={frameId} avatarSize={44}>
              {avatarSource(user?.avatar_url) ? (
                <Image source={avatarSource(user.avatar_url)}
                  style={[s.avatarImg, frameId !== 'none' && { borderWidth: 0 }]} />
              ) : (
                <View style={[s.avatar, frameId !== 'none' && { borderWidth: 0 }]}>
                  <Text style={s.avatarTxt}>
                    {(user?.full_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </Text>
                </View>
              )}
            </ProfileFrame>
          </TouchableOpacity>
        </View>
      </View>
      </Reanimated.View>

      {/* ══════════════════════════════════════════════════════
          HERO — GENDER BODY TRANSFORMATION CARD
      ══════════════════════════════════════════════════════ */}
      <Reanimated.View style={[e1, { marginHorizontal:16, marginBottom:14 }, ...heroDepth]}>
      <View style={[s.heroCard, { marginHorizontal:0, marginBottom:0 }]}>
        <LinearGradient
          colors={isDark ? [C.surfaceAlt ?? C.card2, C.bg] : ['#1A1F17', '#0E1117']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

        {/* Body images */}
        <View style={s.heroBodyRow}>
          {/* Before */}
          <View style={s.heroBodyWrap}>
            <Text style={s.heroBodyLbl}>NOW</Text>
            <Image source={bodyImgs.before} style={s.heroBodyImg} contentFit="contain" />
          </View>

          {/* Arrow + info center */}
          <View style={s.heroCenter}>
            <View style={[s.goalBadge,
              { backgroundColor: `${C.accent}20`, borderColor: `${C.accent}44` }]}>
              <Text style={[s.goalBadgeTxt, { color: C.accent }]}>
                {goalType === 'weight_gain' ? '💪 GAIN' : '🔥 LOSE'}
              </Text>
            </View>

            <Ionicons name={goalType === 'weight_gain' ? 'trending-up' : 'trending-down'}
              size={28} color={C.accent} />

            {weightGoal?.target_value ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={[s.heroTargetNum, { color: C.accent }]}>
                  {weightGoal.target_value}
                </Text>
                <Text style={s.heroTargetUnit}>kg goal</Text>
              </View>
            ) : (
              <TouchableOpacity onPress={() => navigation.navigate('Goals')}
                style={[s.setGoalBtn, { borderColor: C.accent }]}>
                <Text style={{ color: C.accent, fontSize: 9, fontWeight: '800' }}>SET GOAL</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* After */}
          <View style={s.heroBodyWrap}>
            <Text style={s.heroBodyLbl}>GOAL</Text>
            <Image source={bodyImgs.after} style={s.heroBodyImg} contentFit="contain" />
          </View>
        </View>

        {/* Progress bar */}
        {weightGoal?.target_value && weightGoal?.current_value != null && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom: 5 }}>
              <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700' }}>
                {weightGoal.current_value || user?.weight_kg || 0} kg now
              </Text>
              <Text style={{ color: C.accent, fontSize:10, fontWeight:'800' }}>
                {weightGoal.progress_pct || 0}% complete
              </Text>
            </View>
            <CalBar pct={weightGoal.progress_pct || 0} C={C} isDark={isDark} />
          </View>
        )}
      </View>
      </Reanimated.View>

      {/* ══════════════════════════════════════════════════════
          3-STAT STRIP
      ══════════════════════════════════════════════════════ */}
      <Reanimated.View style={e2}>
      <View style={s.statStrip}>
        {[
          { icon:'flame',            color:C.accent, val: streakDisplay,          sub:'Day Streak' },
          { icon:'calendar-outline', color:C.accent, val: `${activeDays}/7`,      sub:'Active Days' },
          { icon:'barbell-outline',  color:C.accent, val: totalWktsDisplay,       sub:'Workouts' },
        ].map((item, i) => (
          <React.Fragment key={item.sub}>
            {i > 0 && <View style={s.statDivider} />}
            <View style={s.statItem}>
              <Ionicons name={item.icon} size={18} color={item.color} />
              <Text style={[s.statNum, { color: item.color }]}>{item.val}</Text>
              <Text style={s.statSub}>{item.sub}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
      </Reanimated.View>

      {/* ══════════════════════════════════════════════════════
          TODAY'S MACROS — RING PROGRESS
      ══════════════════════════════════════════════════════ */}
      <Reanimated.View style={e3}>
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>Today's Nutrition</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Nutrition')}>
            <Text style={s.seeAll}>Log Food ›</Text>
          </TouchableOpacity>
        </View>

        {/* Calorie bar */}
        <View style={{ marginBottom: 14 }}>
          <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom: 5 }}>
            <Text style={{ color:C.muted, fontSize:11, fontWeight:'700' }}>Calories</Text>
            <Text style={{ color:C.accent, fontSize:12, fontWeight:'900' }}>
              {calDisplay} <Text style={{ color:C.muted, fontWeight:'600' }}>/ {calTarget} kcal</Text>
            </Text>
          </View>
          <CalBar pct={calPct} C={C} isDark={isDark} />
        </View>

        {/* Macro rings row */}
        <View style={{ flexDirection:'row', justifyContent:'space-around' }}>
          <MacroRing value={protConsumed} max={protTarget} color={C.accent} label="PROTEIN" unit="g" C={C} isDark={isDark} />
          <MacroRing value={carbConsumed} max={carbTarget} color={C.accent} label="CARBS"   unit="g" C={C} isDark={isDark} />
          <MacroRing value={fatConsumed}  max={fatTarget}  color={C.accent} label="FATS"    unit="g" C={C} isDark={isDark} />
        </View>
      </View>
      </Reanimated.View>

      {/* ══════════════════════════════════════════════════════
          TODAY'S WORKOUT CARD
      ══════════════════════════════════════════════════════ */}
      <Reanimated.View style={e4}>
      <WorkoutCardAnimated plan={plan} planName={planName} planMins={planMins} planCals={planCals}
        planExs={planExs} navigation={navigation} C={C} s={s} isDark={isDark} />

      {/* ══════════════════════════════════════════════════════
          QUICK ACTIONS
      ══════════════════════════════════════════════════════ */}
      <View style={s.quickGrid}>
        {[
          { icon:'restaurant',      label:'Log Food',  color:C.accent, screen:'Nutrition' },
          { icon:'moon',            label:'Sleep',     color:C.accent, screen:'Sleep'     },
          { icon:'trophy',          label:'Goals',     color:C.accent, screen:'Goals'     },
          { icon:'analytics',       label:'Tracker',   color:C.accent, screen:'Tracker'   },
        ].map(q => (
          <QuickActionBtn key={q.label} q={q} navigation={navigation} s={s} C={C} />
        ))}
      </View>
      </Reanimated.View>

      {/* ══════════════════════════════════════════════════════
          AI COACH BANNER
      ══════════════════════════════════════════════════════ */}
      <Reanimated.View style={e5}>
      <TouchableOpacity style={[s.aiCard, glowStyle(isDark, C.accent, 10, 0.12)]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('AICoach'); }}
        activeOpacity={0.85}>
        <LinearGradient colors={[C.surfaceAlt ?? C.card2, C.bg]}
          style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:1}} />
        <View style={s.aiIconWrap}>
          <MaterialCommunityIcons name="robot-outline" size={24} color={C.accent} />
        </View>
        <View style={{ flex:1 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:3 }}>
            <Text style={s.aiTitle}>AI Coach</Text>
            <View style={{ backgroundColor:C.accentDim, borderRadius:6, paddingHorizontal:6, paddingVertical:2 }}>
              <Text style={{ color:C.accent, fontSize:9, fontWeight:'800' }}>GPT-4o</Text>
            </View>
          </View>
          <Text style={s.aiSub}>
            {streak >= 3
              ? `${streak}-day streak! Get your personalized daily report →`
              : 'Wellness score • Daily report • Custom plans →'}
          </Text>
        </View>
        <View style={[s.aiArrow, { backgroundColor:C.accent }]}>
          <Ionicons name="chevron-forward" size={16} color={C.accentText} />
        </View>
      </TouchableOpacity>
      </Reanimated.View>

      {/* ══════════════════════════════════════════════════════
          WORKOUT VIDEO OF THE DAY
      ══════════════════════════════════════════════════════ */}
      <Reanimated.View style={e5}>
      <Text style={s.sectionLbl}>WORKOUT OF THE DAY</Text>
      <WorkoutVideoCard gender={gender} navigation={navigation} C={C} s={s} />
      </Reanimated.View>

      {/* ══════════════════════════════════════════════════════
          WEEKLY ACTIVITY BAR CHART
      ══════════════════════════════════════════════════════ */}
      <Reanimated.View style={e5}>
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>Weekly Activity</Text>
          <View style={[s.badge, { backgroundColor:`${C.accent}18`, borderColor:`${C.accent}33` }]}>
            <Text style={[s.badgeTxt, { color:C.accent }]}>{activeDays}/7 days</Text>
          </View>
        </View>
        <View style={s.chartRow}>
          {(weekly.length > 0 ? weekly : ['M','T','W','T','F','S','S'].map((d,i) => ({ date:`d${i}`, calories:0, count:0, day_name:d }))).map((d, i) => {
            const h     = Math.max(((d.calories||0)/maxCal)*60, 3);
            const isToday = i === weekly.length - 1;
            const lbl   = d.day_name ? d.day_name[0] : ['S','M','T','W','T','F','S'][new Date(d.date).getDay()];
            return (
              <View key={`${d.date}${i}`} style={s.chartCol}>
                <View style={[s.chartBar, {
                  height: h,
                  backgroundColor: isToday ? C.accent : (d.count||0) > 0 ? `${C.accent}55` : C.border,
                  borderRadius: 4,
                }]} />
                <Text style={[s.chartLbl, isToday && { color:C.accent, fontWeight:'800' }]}>{lbl}</Text>
              </View>
            );
          })}
        </View>
      </View>
      </Reanimated.View>

      {/* ══════════════════════════════════════════════════════
          ACTIVE GOALS
      ══════════════════════════════════════════════════════ */}
      <Reanimated.View style={e6}>
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>Active Goals</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Goals')}>
            <Text style={s.seeAll}>See all ›</Text>
          </TouchableOpacity>
        </View>

        {goals.length === 0 ? (
          <TouchableOpacity style={s.emptyGoal} onPress={() => navigation.navigate('Goals')}>
            <View style={[s.emptyIcon, { backgroundColor:`${C.accent}18` }]}>
              <Ionicons name="flag-outline" size={28} color={C.accent} />
            </View>
            <Text style={s.emptyTitle}>No active goals</Text>
            <Text style={s.emptySub}>Tap to set your first fitness goal</Text>
          </TouchableOpacity>
        ) : (
          goals.slice(0, 3).map(goal => {
            const pct   = goal.target_value ? Math.min(((goal.current_value||0) / goal.target_value)*100, 100) : 0;
            const color = C.accent;
            const dLeft = goal.target_date
              ? Math.max(0, Math.ceil((new Date(goal.target_date) - new Date()) / 86400000))
              : null;
            return (
              <TouchableOpacity key={goal.id} style={s.goalRow}
                onPress={() => navigation.navigate('Goals')} activeOpacity={0.75}>
                <View style={[s.goalIcon, { backgroundColor:`${color}18` }]}>
                  <Ionicons name={`${({ weight_loss:'trending-down', muscle_gain:'barbell', endurance:'walk', flexibility:'body', maintenance:'flag' }[goal.type] || 'trophy')}-outline`}
                    size={18} color={color} />
                </View>
                <View style={{ flex:1 }}>
                  <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:5 }}>
                    <Text style={s.goalTitle} numberOfLines={1}>{goal.title}</Text>
                    {dLeft !== null && (
                      <Text style={[s.goalDays, dLeft <= 7 && { color:'#FF453A' }]}>
                        {dLeft === 0 ? 'Today!' : `${dLeft}d left`}
                      </Text>
                    )}
                  </View>
                  {goal.target_value ? (
                    <>
                      <View style={s.goalBarBg}>
                        <View style={[s.goalBarFill, { width:`${pct}%`, backgroundColor:color }]} />
                      </View>
                      <View style={{ flexDirection:'row', justifyContent:'space-between', marginTop:4 }}>
                        <Text style={[{ fontSize:10, fontWeight:'800', color }]}>{pct.toFixed(0)}%</Text>
                        <Text style={{ color:C.dim, fontSize:10 }}>{goal.current_value||0} / {goal.target_value} {goal.unit||''}</Text>
                      </View>
                    </>
                  ) : (
                    <Text style={{ color:C.muted, fontSize:11 }}>In progress</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <TouchableOpacity style={s.addGoalBtn} onPress={() => navigation.navigate('Goals')}>
          <Ionicons name="add-circle-outline" size={15} color={C.accent} />
          <Text style={s.addGoalTxt}>Add New Goal</Text>
        </TouchableOpacity>
      </View>
      </Reanimated.View>

      {/* ══════════════════════════════════════════════════════
          SLEEP
      ══════════════════════════════════════════════════════ */}
      <Reanimated.View style={e6}>
      {stats?.last_sleep ? (
        <TouchableOpacity style={[s.sleepCard, glowStyle(isDark, C.accent, 8, 0.12)]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('Sleep'); }}
          activeOpacity={0.85}>
          <View style={[s.sleepIcon, { backgroundColor:C.accentDim }]}>
            <Ionicons name="moon" size={20} color={C.accent} />
          </View>
          <View style={{ flex:1 }}>
            <Text style={s.sleepLabel}>Last Night's Sleep</Text>
            <Text style={s.sleepDur}>
              {Math.floor((stats.last_sleep.duration_min||0)/60)}
              <Text style={s.sleepUnit}>h </Text>
              {(stats.last_sleep.duration_min||0)%60}
              <Text style={s.sleepUnit}>m</Text>
            </Text>
          </View>
          <View style={[s.badge, { backgroundColor:C.accentDim, borderColor:`${C.accent}44` }]}>
            <Text style={{ color:C.accent, fontSize:11, fontWeight:'800' }}>
              {(stats.last_sleep.quality_score||0) >= 70 ? 'Good' : 'Fair'}
            </Text>
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[s.sleepCard, glowStyle(isDark, C.accent, 8, 0.12)]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('Sleep'); }}
          activeOpacity={0.85}>
          <View style={[s.sleepIcon, { backgroundColor:C.accentDim }]}>
            <Ionicons name="moon-outline" size={20} color={C.accent} />
          </View>
          <View style={{ flex:1 }}>
            <Text style={s.sleepLabel}>Sleep Tracker</Text>
            <Text style={{ color:C.muted, fontSize:12 }}>Log last night's sleep →</Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={{ height: 28 }} />
      </Reanimated.View>
    </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  root:         { flex:1, backgroundColor:C.bg },
  center:       { flex:1, backgroundColor:C.bg, alignItems:'center', justifyContent:'center' },

  // Header
  header:       { flexDirection:'row', justifyContent:'space-between', alignItems:'center',
                  paddingHorizontal:20, paddingTop:12, paddingBottom:14 },
  greeting:     { color:C.muted, fontSize:10, fontWeight:'700', letterSpacing:1.5 },
  name:         { color:C.text, fontSize:24, fontWeight:'900', marginTop:2 },
  themeBtn:     { width:38, height:38, borderRadius:19, borderWidth:1,
                  backgroundColor:`${C.accent}0F`, alignItems:'center', justifyContent:'center' },
  avatar:       { width:44, height:44, borderRadius:22, backgroundColor:C.accent,
                  alignItems:'center', justifyContent:'center' },
  avatarImg:    { width:44, height:44, borderRadius:22, borderWidth:2, borderColor:C.accent },
  avatarTxt:    { fontSize:15, fontWeight:'900', color:C.accentText },

  // Hero body transformation card
  heroCard:     { marginHorizontal:16, borderRadius:20, overflow:'hidden',
                  borderWidth:1, borderColor:C.border, marginBottom:14 },
  heroBodyRow:  { flexDirection:'row', alignItems:'flex-end', paddingHorizontal:12,
                  paddingTop:14, paddingBottom:4 },
  heroBodyWrap: { alignItems:'center', flex:1 },
  heroBodyLbl:  { color:C.muted, fontSize:9, fontWeight:'900',
                  letterSpacing:1.5, marginBottom:4 },
  heroBodyImg:  { width:80, height:130 },
  heroCenter:   { flex:1.2, alignItems:'center', justifyContent:'center', gap:8, paddingBottom:8 },
  goalBadge:    { borderRadius:20, borderWidth:1, paddingHorizontal:10, paddingVertical:4 },
  goalBadgeTxt: { fontSize:10, fontWeight:'900', letterSpacing:0.5 },
  heroTargetNum:{ fontSize:28, fontWeight:'900', lineHeight:30 },
  heroTargetUnit:{ color:'rgba(255,255,255,0.4)', fontSize:10 },
  setGoalBtn:   { borderWidth:1, borderRadius:10, paddingHorizontal:8, paddingVertical:5 },
  heroBarBg:    { height:6, backgroundColor:'rgba(255,255,255,0.12)', borderRadius:3,
                  overflow:'hidden', marginHorizontal:16 },
  heroBarFill:  { height:'100%', borderRadius:3 },

  // Stat strip
  statStrip:    { flexDirection:'row', marginHorizontal:16, marginBottom:14,
                  backgroundColor:C.card, borderRadius:18, borderWidth:1, borderColor:C.border,
                  paddingVertical:14 },
  statItem:     { flex:1, alignItems:'center', gap:4 },
  statDivider:  { width:1, backgroundColor:C.border },
  statNum:      { fontSize:20, fontWeight:'900', lineHeight:22 },
  statSub:      { color:C.muted, fontSize:9, fontWeight:'700' },

  // Cards
  card:         { marginHorizontal:16, backgroundColor:C.card, borderRadius:18,
                  borderWidth:1, borderColor:C.border, padding:16, marginBottom:14 },
  cardHeader:   { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 },
  cardTitle:    { color:C.text, fontSize:15, fontWeight:'800' },
  seeAll:       { color:C.accent, fontSize:13, fontWeight:'700' },
  badge:        { borderRadius:10, borderWidth:1, paddingHorizontal:8, paddingVertical:3 },
  badgeTxt:     { fontSize:11, fontWeight:'800' },

  // Calorie bar
  calBarBg:     { height:8, backgroundColor:C.border, borderRadius:4, overflow:'hidden' },
  calBarFill:   { height:'100%', backgroundColor:C.accent, borderRadius:4 },

  // Workout card
  workoutCard:  { marginHorizontal:16, borderRadius:18, overflow:'hidden', flexDirection:'row',
                  alignItems:'center', padding:18, marginBottom:14,
                  borderWidth:1, borderColor:`${C.accent}30` },
  workoutLabel: { color:`${C.accent}99`, fontSize:10, fontWeight:'800', letterSpacing:1.5, marginBottom:4 },
  workoutName:  { color:C.text, fontSize:18, fontWeight:'900', marginBottom:10 },
  workoutMeta:  { flexDirection:'row', gap:14 },
  workoutMetaTxt:{ color:C.muted, fontSize:11, fontWeight:'700' },
  workoutPlayBtn:{ width:52, height:52, borderRadius:26, backgroundColor:C.accent,
                  alignItems:'center', justifyContent:'center', flexShrink:0 },

  // Quick actions
  quickGrid:    { flexDirection:'row', gap:10, marginHorizontal:16, marginBottom:14 },
  quickBtn:     { flex:1, alignItems:'center', gap:7 },
  quickIcon:    { width:52, height:52, borderRadius:16, borderWidth:1,
                  alignItems:'center', justifyContent:'center' },
  quickLabel:   { color:C.muted, fontSize:9, fontWeight:'700', textAlign:'center' },

  // AI card
  aiCard:       { marginHorizontal:16, borderRadius:18, overflow:'hidden', flexDirection:'row',
                  alignItems:'center', padding:14, marginBottom:14,
                  borderWidth:1, borderColor:C.border },
  aiIconWrap:   { width:46, height:46, borderRadius:14, backgroundColor:C.accentDim,
                  alignItems:'center', justifyContent:'center', marginRight:12 },
  aiTitle:      { color:C.text, fontSize:15, fontWeight:'900' },
  aiSub:        { color:C.muted, fontSize:11, lineHeight:16 },
  aiArrow:      { width:32, height:32, borderRadius:16, alignItems:'center', justifyContent:'center', marginLeft:8 },

  // Video card
  sectionLbl:   { color:C.dim, fontSize:10, fontWeight:'700', letterSpacing:1.5,
                  marginHorizontal:16, marginBottom:8 },
  videoCard:    { height:200, borderRadius:20, overflow:'hidden', marginHorizontal:16,
                  marginBottom:14, backgroundColor:C.card },
  videoHolder:  { ...StyleSheet.absoluteFillObject, alignItems:'center', justifyContent:'center',
                  backgroundColor:C.surface },
  videoOverlay: { position:'absolute', bottom:0, left:0, right:0, padding:14 },
  videoTag:     { backgroundColor:C.accent, borderRadius:6, paddingHorizontal:8, paddingVertical:3,
                  alignSelf:'flex-start', marginBottom:6 },
  videoTagTxt:  { color:C.accentText, fontSize:9, fontWeight:'900', letterSpacing:1 },
  videoLabel:   { color:'#fff', fontSize:18, fontWeight:'900', marginBottom:6 },
  videoSub:     { color:'rgba(255,255,255,0.55)', fontSize:11 },
  playBtn:      { width:22, height:22, borderRadius:11, backgroundColor:C.accent,
                  alignItems:'center', justifyContent:'center' },

  // Weekly chart
  chartRow:     { flexDirection:'row', alignItems:'flex-end', gap:5, height:72, paddingTop:8 },
  chartCol:     { flex:1, alignItems:'center', gap:4 },
  chartBar:     { width:'100%' },
  chartLbl:     { fontSize:10, color:C.dim },

  // Goals
  goalRow:      { flexDirection:'row', alignItems:'center', gap:12, paddingVertical:12,
                  borderBottomWidth:0.5, borderColor:C.border },
  goalIcon:     { width:40, height:40, borderRadius:13, alignItems:'center', justifyContent:'center' },
  goalTitle:    { color:C.text, fontSize:13, fontWeight:'700', flex:1, marginRight:8 },
  goalDays:     { color:C.muted, fontSize:11, fontWeight:'600' },
  goalBarBg:    { height:5, backgroundColor:C.border, borderRadius:3, overflow:'hidden' },
  goalBarFill:  { height:'100%', borderRadius:3 },
  emptyGoal:    { alignItems:'center', paddingVertical:20 },
  emptyIcon:    { width:60, height:60, borderRadius:20, alignItems:'center',
                  justifyContent:'center', marginBottom:10 },
  emptyTitle:   { color:C.text, fontSize:15, fontWeight:'800', marginBottom:4 },
  emptySub:     { color:C.muted, fontSize:13 },
  addGoalBtn:   { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6,
                  backgroundColor:C.accentDim, borderRadius:12, paddingVertical:10,
                  borderWidth:1, borderColor:`${C.accent}44`, marginTop:10 },
  addGoalTxt:   { color:C.accent, fontSize:13, fontWeight:'800' },

  // Sleep
  sleepCard:    { marginHorizontal:16, backgroundColor:C.card, borderRadius:18,
                  borderWidth:1, borderColor:C.border, padding:16, marginBottom:14,
                  flexDirection:'row', alignItems:'center', gap:12 },
  sleepIcon:    { width:46, height:46, borderRadius:14, alignItems:'center', justifyContent:'center' },
  sleepLabel:   { color:C.muted, fontSize:10, fontWeight:'700', letterSpacing:0.8, marginBottom:3 },
  sleepDur:     { color:C.text, fontSize:22, fontWeight:'900' },
  sleepUnit:    { color:C.muted, fontSize:13, fontWeight:'400' },
});
