import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator, Dimensions, Animated,
} from 'react-native';
import { Video, ResizeMode, Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
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

// â"€â"€ Gender-aware body image map â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
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

// ── Female Workout Banners (For Today's Workout Card) ─────────────────────────
const FEMALE_BANNER = {
  strength:    require('../../assets/images/female/female_banner_strength.png'),
  cardio:      require('../../assets/images/female/female_banner_cardio.png'),
  hiit:        require('../../assets/images/female/female_banner_hiit.png'),
  core:        require('../../assets/images/female/female_banner_core.png'),
  flexibility: require('../../assets/images/female/female_banner_flexibility.png'),
  recovery:    require('../../assets/images/female/female_banner_recovery.png'),
  yoga:        require('../../assets/images/female/female_banner_yoga.png'),
};

const getWorkoutImg = (plan, gender) => {
  if (!plan) return null;
  if (gender === 'female') {
    const cat = (plan?.category || '').toLowerCase();
    return FEMALE_BANNER[cat] || FEMALE_BANNER.strength; // default to strength if not found
  }
  // No local male banners set yet, so return null to fallback to gradient
  return null;
};

// ── Supabase Storage base URL ─────────────────────────────────────────────────
const SB_VID = 'https://nlzuqzkxtmqabmwkggpy.supabase.co/storage/v1/object/public/exercise-videos';
const mv = (file) => ({ uri: `${SB_VID}/male/${file}` });
const fv = (file) => ({ uri: `${SB_VID}/female/${file}` });

// ── Gender-aware workout videos ───────────────────────────────────────────────
const VIDEOS_MALE = [
  { src: mv('Man_performing_barbell_deadlift_202606110121.mp4'),        label: 'Barbell Deadlift',   tag: 'STRENGTH'   },
  { src: mv('Man_performs_barbell_bench_press_202606172041.mp4'),        label: 'Bench Press',        tag: 'STRENGTH'   },
  { src: mv('Man_performing_barbell_squat_202606172035.mp4'),            label: 'Barbell Squat',      tag: 'STRENGTH'   },
  { src: mv('Man_performing_bent-over_row_202606180000.mp4'),            label: 'Bent-Over Row',      tag: 'STRENGTH'   },
  { src: mv('Man_performing_barbell_press_202606180000.mp4'),            label: 'Overhead Press',     tag: 'STRENGTH'   },
  { src: mv('Man_performing_Romanian_deadlift_202606172359.mp4'),        label: 'Romanian Deadlift',  tag: 'STRENGTH'   },
  { src: mv('Man_performing_incline_dumbbell_press_202606180000.mp4'),   label: 'Incline DB Press',   tag: 'CHEST'      },
  { src: mv('Man_performing_chest_dips_202606172358.mp4'),               label: 'Chest Dips',         tag: 'CHEST'      },
  { src: mv('Man_performing_dumbbell_flys_202606172358.mp4'),            label: 'Dumbbell Flys',      tag: 'CHEST'      },
  { src: mv('Man_performs_one_push-up_202606110121.mp4'),                label: 'Push-Up',            tag: 'CHEST'      },
  { src: mv('Man_performs_one_pull-up_202606110121.mp4'),                label: 'Pull-Up',            tag: 'BACK'       },
  { src: mv('Man_performing_lat_pulldown_202606172359.mp4'),             label: 'Lat Pulldown',       tag: 'BACK'       },
  { src: mv('Man_performing_shoulder_press_202606110121.mp4'),           label: 'Shoulder Press',     tag: 'SHOULDERS'  },
  { src: mv('Man_performing_face_pulls_202606172358.mp4'),               label: 'Face Pulls',         tag: 'SHOULDERS'  },
  { src: mv('Man_performing_dumbbell_curl_202606110121.mp4'),            label: 'Dumbbell Curl',      tag: 'ARMS'       },
  { src: mv('Man_performing_hammer_curls_202606172359.mp4'),             label: 'Hammer Curls',       tag: 'ARMS'       },
  { src: mv('Man_performing_cable_pushdown_202606180000.mp4'),           label: 'Tricep Pushdown',    tag: 'ARMS'       },
  { src: mv('Man_performing_tricep_dip_202606110121.mp4'),               label: 'Tricep Dip',         tag: 'ARMS'       },
  { src: mv('Man_performing_barbell_hip_thrust_202606110121.mp4'),       label: 'Hip Thrust',         tag: 'GLUTES'     },
  { src: mv('Man_performing_leg_press_202606172359.mp4'),                label: 'Leg Press',          tag: 'LEGS'       },
  { src: mv('Man_performing_bodyweight_squat_202606110121.mp4'),         label: 'Bodyweight Squat',   tag: 'LEGS'       },
  { src: mv('Man_performing_forward_lunge_202606110121.mp4'),            label: 'Forward Lunge',      tag: 'LEGS'       },
  { src: mv('Man_holding_forearm_plank_202606110121.mp4'),               label: 'Forearm Plank',      tag: 'CORE'       },
  { src: mv('Man_performing_Russian_twists_202606110121.mp4'),           label: 'Russian Twists',     tag: 'CORE'       },
  { src: mv('Man_performing_box_jump_202606172359.mp4'),                 label: 'Box Jump',           tag: 'CARDIO'     },
  { src: mv('Man_performing_battle_ropes_202606172359.mp4'),             label: 'Battle Ropes',       tag: 'CARDIO'     },
  { src: mv('Man_performing_kettlebell_swings_202606172359.mp4'),        label: 'Kettlebell Swings',  tag: 'HIIT'       },
  { src: mv('Man_performs_one_burpee_202606110121.mp4'),                 label: 'Burpee',             tag: 'HIIT'       },
  { src: mv('Man_performing_high_knees_202606110121.mp4'),               label: 'High Knees',         tag: 'CARDIO'     },
  { src: mv('Man_performing_jumping_jacks_202606110121.mp4'),            label: 'Jumping Jacks',      tag: 'CARDIO'     },
  { src: mv('Man_performs_mountain_climbers_202606110121.mp4'),          label: 'Mountain Climbers',  tag: 'CARDIO'     },
  { src: mv('Man_running_in_place_202606110121.mp4'),                    label: 'Running in Place',   tag: 'CARDIO'     },
  { src: mv('Man_skipping_jump_rope_202606110121.mp4'),                  label: 'Jump Rope',          tag: 'CARDIO'     },
  { src: mv('Man_foam-rolling_thighs_202606110121.mp4'),                 label: 'Foam Rolling',       tag: 'RECOVERY'   },
  { src: mv('Man_holding_downward_dog_pose_202606110121.mp4'),           label: 'Downward Dog',       tag: 'FLEXIBILITY'},
];

const VIDEOS_FEMALE = [
  { src: fv('Woman_performing_barbell_hip_thrust_202606110124.mp4'),     label: 'Hip Thrust',          tag: 'GLUTES'     },
  { src: fv('Woman_performing_glute_bridge_202606172356.mp4'),           label: 'Glute Bridge',        tag: 'GLUTES'     },
  { src: fv('Woman_performing_cable_glute_kickback_202606172356.mp4'),   label: 'Cable Kickback',      tag: 'GLUTES'     },
  { src: fv('Woman_performing_donkey_kicks_202606172356.mp4'),           label: 'Donkey Kicks',        tag: 'GLUTES'     },
  { src: fv('Woman_performing_fire_hydrant_exercise_202606172357.mp4'),  label: 'Fire Hydrant',        tag: 'GLUTES'     },
  { src: fv('Woman_performing_hip_abduction_exercise_202606172358.mp4'), label: 'Hip Abduction',       tag: 'GLUTES'     },
  { src: fv('Woman_performing_barbell_deadlift_202606110124.mp4'),       label: 'Barbell Deadlift',    tag: 'STRENGTH'   },
  { src: fv('Woman_performing_Romanian_deadlift_202606172357.mp4'),      label: 'Romanian Deadlift',   tag: 'LEGS'       },
  { src: fv('Woman_performing_Bulgarian_split_squat_202606172356.mp4'),  label: 'Bulgarian Split Squat', tag: 'LEGS'    },
  { src: fv('Woman_performing_sumo_squat_dumbbell_202606172356.mp4'),    label: 'Sumo Squat',          tag: 'LEGS'       },
  { src: fv('Woman_performing_banded_squat_202606172357.mp4'),           label: 'Banded Squat',        tag: 'LEGS'       },
  { src: fv('Woman_performing_bodyweight_squat_202606110124.mp4'),       label: 'Bodyweight Squat',    tag: 'LEGS'       },
  { src: fv('Woman_performing_leg_extension_machine_202606172357.mp4'),  label: 'Leg Extension',       tag: 'LEGS'       },
  { src: fv('Woman_performing_lying_leg_curl_202606172357.mp4'),         label: 'Lying Leg Curl',      tag: 'LEGS'       },
  { src: fv('Woman_performing_lateral_band_walks_202606172357.mp4'),     label: 'Lateral Band Walk',   tag: 'LEGS'       },
  { src: fv('Woman_performing_dumbbell_step-ups_202606172358.mp4'),      label: 'Dumbbell Step-Ups',   tag: 'LEGS'       },
  { src: fv('Woman_performs_forward_lunge_202606110124.mp4'),            label: 'Forward Lunge',       tag: 'LEGS'       },
  { src: fv('Woman_performs_one_pull-up_202606110124.mp4'),              label: 'Pull-Up',             tag: 'BACK'       },
  { src: fv('Woman_performing_lat_pulldown_202606172357.mp4'),           label: 'Lat Pulldown',        tag: 'BACK'       },
  { src: fv('Woman_performing_seated_cable_row_202606172357.mp4'),       label: 'Seated Cable Row',    tag: 'BACK'       },
  { src: fv('Woman_performing_dumbbell_press_202606110124.mp4'),         label: 'Dumbbell Press',      tag: 'CHEST'      },
  { src: fv('Woman_performing_incline_push-ups_202606172358.mp4'),       label: 'Incline Push-Up',     tag: 'CHEST'      },
  { src: fv('Woman_performing_push-up_202606110124.mp4'),                label: 'Push-Up',             tag: 'CHEST'      },
  { src: fv('Woman_performing_face_pulls_202606172358.mp4'),             label: 'Face Pulls',          tag: 'SHOULDERS'  },
  { src: fv('Woman_performing_dumbbell_curl_202606110124.mp4'),          label: 'Dumbbell Curl',       tag: 'ARMS'       },
  { src: fv('Woman_performing_dumbbell_extension_202606172358.mp4'),     label: 'Tricep Extension',    tag: 'ARMS'       },
  { src: fv('Woman_performing_tricep_dip_202606110124.mp4'),             label: 'Tricep Dip',          tag: 'ARMS'       },
  { src: fv('Woman_holding_forearm_plank_202606110124.mp4'),             label: 'Forearm Plank',       tag: 'CORE'       },
  { src: fv('Woman_performing_plank_on_mat_202606172357.mp4'),           label: 'Plank',               tag: 'CORE'       },
  { src: fv('Woman_performing_Russian_twists_202606110124.mp4'),         label: 'Russian Twists',      tag: 'CORE'       },
  { src: fv('Woman_performs_box_jump_202606110124.mp4'),                 label: 'Box Jump',            tag: 'CARDIO'     },
  { src: fv('Woman_performing_high_knees_202606110124.mp4'),             label: 'High Knees',          tag: 'CARDIO'     },
  { src: fv('Woman_performing_jumping_jacks_202606110124.mp4'),          label: 'Jumping Jacks',       tag: 'CARDIO'     },
  { src: fv('Woman_performing_mountain_climbers_202606110124.mp4'),      label: 'Mountain Climbers',   tag: 'CARDIO'     },
  { src: fv('Woman_running_in_place_202606110124.mp4'),                  label: 'Running in Place',    tag: 'CARDIO'     },
  { src: fv('Woman_skipping_jump_rope_202606110124.mp4'),                label: 'Jump Rope',           tag: 'CARDIO'     },
  { src: fv('Woman_performs_one_burpee_202606110124.mp4'),               label: 'Burpee',              tag: 'HIIT'       },
  { src: fv('Woman_foam-rolling_thighs_202606110124.mp4'),               label: 'Foam Rolling',        tag: 'RECOVERY'   },
  { src: fv('Woman_holding_downward_dog_pose_202606110124.mp4'),
    label: 'Downward Dog',    tag: 'FLEXIBILITY', dur: '8 min',  reps: '3 sets × 30 sec',
    benefits: ['Full Body Stretch', 'Core Activation', 'Spine Relief'] },
  { src: fv('Woman_doing_Cobra_Pose_202606182200.mp4'),
    label: 'Cobra Pose',      tag: 'FLEXIBILITY', dur: '8 min',  reps: '3 sets × 30 sec',
    benefits: ['Spine Flexibility', 'Chest Opening', 'Stress Relief'] },
  { src: fv('Woman_doing_deep_backbend_202606182201.mp4'),
    label: 'Deep Backbend',   tag: 'FLEXIBILITY', dur: '6 min',  reps: '3 sets × 20 sec',
    benefits: ['Spine Stretch', 'Hip Flexors', 'Better Posture'] },
  { src: fv('Woman_doing_Happy_Baby_Pose_202606182201.mp4'),
    label: 'Happy Baby',      tag: 'FLEXIBILITY', dur: '8 min',  reps: '2 sets × 45 sec',
    benefits: ['Hip Opening', 'Lower Back Relief', 'Calming'] },
  { src: fv('Woman_doing_supine_twist_202606182201.mp4'),
    label: 'Supine Twist',    tag: 'FLEXIBILITY', dur: '10 min', reps: '2 sets × 30 sec/side',
    benefits: ['Spinal Detox', 'Digestion', 'Back Pain Relief'] },
  { src: fv('Woman_doing_V-shape_exercise_202606182201.mp4'),
    label: 'V-Shape Stretch', tag: 'FLEXIBILITY', dur: '6 min',  reps: '3 sets × 30 sec',
    benefits: ['Hamstrings', 'Inner Thighs', 'Core Strength'] },
  { src: fv('Woman_doing_yoga_poses_202606182200.mp4'),
    label: 'Yoga Flow',       tag: 'FLEXIBILITY', dur: '15 min', reps: '2 rounds',
    benefits: ['Full Body', 'Mindfulness', 'Balance'] },
  { src: fv("Woman_in_Child%27s_Pose_202606182200.mp4"),
    label: "Child's Pose",    tag: 'FLEXIBILITY', dur: '8 min',  reps: '3 sets × 45 sec',
    benefits: ['Hip Relief', 'Back Stretch', 'Deep Relaxation'] },
  { src: fv('Woman_in_Tree_Pose_202606182200.mp4'),
    label: 'Tree Pose',       tag: 'FLEXIBILITY', dur: '10 min', reps: '3 sets × 30 sec/side',
    benefits: ['Balance', 'Focus', 'Leg Strength'] },
  { src: fv('Woman_performing_Pigeon_Pose_202606182200.mp4'),
    label: 'Pigeon Pose',     tag: 'FLEXIBILITY', dur: '12 min', reps: '2 sets × 60 sec/side',
    benefits: ['Deep Hip Opener', 'Sciatic Relief', 'Flexibility'] },
  { src: fv('Woman_performing_Warrior_II_pose_202606182159.mp4'),
    label: 'Warrior II',      tag: 'FLEXIBILITY', dur: '10 min', reps: '3 sets × 30 sec/side',
    benefits: ['Leg Strength', 'Hip Opening', 'Stamina'] },
  { src: fv('Woman_performs_Triangle_Pose_202606182200.mp4'),
    label: 'Triangle Pose',   tag: 'FLEXIBILITY', dur: '10 min', reps: '3 sets × 30 sec/side',
    benefits: ['Lateral Stretch', 'Balance', 'Core'] },
];

// â"€â"€ Macro progress ring (animated fill on mount) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
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
          {/* static ring at target â€" invisible, just for sizing */}
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
          <Text style={{ color: C.text, fontSize: 11, fontWeight: '900', lineHeight: 12 }}>{displayVal}</Text>
          <Text style={{ color: C.dim, fontSize: 7, fontWeight: '700' }}>{unit}</Text>
        </View>
      </View>
      <Text style={{ color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>{label}</Text>
    </View>
  );
}
// Animated SVG circle (stroke-dasharray must be animatable)
const AnimatedCircle = Animated.createAnimatedComponent(SvgCircle);

// â"€â"€ Featured workout video card â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
const YOGA_MUSIC_URI = 'https://archive.org/download/yoga-music/A%20Song%20of%20Rain%2C%20Calming%20Yoga%20Music.mp3';

function MusicBars({ active, accentColor = '#C8F135' }) {
  const b = [useRef(new Animated.Value(0.3)).current,
             useRef(new Animated.Value(0.7)).current,
             useRef(new Animated.Value(0.5)).current];
  useEffect(() => {
    if (!active) { b.forEach(v => v.setValue(0.3)); return; }
    const durs = [380, 260, 500];
    const anims = b.map((v, i) => Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1.0, duration: durs[i], useNativeDriver: true }),
      Animated.timing(v, { toValue: 0.15, duration: durs[i], useNativeDriver: true }),
    ])));
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, [active]);
  return (
    <View style={{ flexDirection:'row', alignItems:'flex-end', gap:2, height:13 }}>
      {b.map((v, i) => (
        <Animated.View key={i} style={{
          width:3, height:13, borderRadius:2, backgroundColor: accentColor,
          transform:[{ scaleY: v }],
        }} />
      ))}
    </View>
  );
}

function WorkoutVideoCard({ gender, navigation, C, s }) {
  const pool    = gender === 'female' ? VIDEOS_FEMALE : VIDEOS_MALE;
  const idx     = useMemo(() => Math.floor(Math.random() * pool.length), []);
  const video   = pool[idx];
  const vidRef  = useRef(null);
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const onReady  = () => { if (readyRef.current) return; readyRef.current = true; setReady(true); };
  const pulseStyle = usePulse(true, 0.94, 1.0, 1600);
  const [secs, setSecs] = useState(0);
  const dotAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => setSecs(s => s + 1), 1000);
    Animated.loop(Animated.sequence([
      Animated.timing(dotAnim, { toValue: 0.2, duration: 600, useNativeDriver: true }),
      Animated.timing(dotAnim, { toValue: 1,   duration: 600, useNativeDriver: true }),
    ])).start();
    return () => clearInterval(id);
  }, [ready]);
  const timerStr = `${String(Math.floor(secs / 60)).padStart(2,'0')}:${String(secs % 60).padStart(2,'0')}`;

  const [musicOn, setMusicOn] = useState(false);
  const [musicLoading, setMusicLoading] = useState(false);
  const soundRef = useRef(null);

  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });
    return () => { soundRef.current?.unloadAsync().catch(() => {}); };
  }, []);

  const toggleMusic = async () => {
    if (musicLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMusicLoading(true);
    try {
      if (musicOn) {
        await soundRef.current?.pauseAsync();
        setMusicOn(false);
      } else {
        if (!soundRef.current) {
          const { sound } = await Audio.Sound.createAsync(
            { uri: YOGA_MUSIC_URI },
            { shouldPlay: true, isLooping: true, volume: 0.65 }
          );
          soundRef.current = sound;
        } else {
          await soundRef.current.playAsync();
        }
        setMusicOn(true);
      }
    } catch (e) { console.warn('Yoga music:', e); }
    setMusicLoading(false);
  };

  return (
    <TouchableOpacity activeOpacity={0.9}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('Workouts'); }}
      style={s.videoCard}>
      {!ready && (
        <View style={s.videoHolder}>
          <Ionicons name="barbell-outline" size={32} color={`${C.accent}66`} />
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
        {video.tag === 'FLEXIBILITY' && video.dur ? (
          <>
            {/* Duration + reps row */}
            <View style={{ flexDirection:'row', alignItems:'center', gap:10, marginTop:4 }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                <Ionicons name="time-outline" size={12} color={C.accent} />
                <Text style={{ color:C.accent, fontSize:12, fontWeight:'700' }}>{video.dur}</Text>
              </View>
              <View style={{ width:1, height:10, backgroundColor:'rgba(255,255,255,0.25)' }} />
              <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                <Ionicons name="refresh-outline" size={12} color="rgba(255,255,255,0.7)" />
                <Text style={{ color:'rgba(255,255,255,0.85)', fontSize:12, fontWeight:'600' }}>{video.reps}</Text>
              </View>
            </View>
            {/* Benefits pills */}
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:5, marginTop:6 }}>
              {video.benefits.map((b, i) => (
                <View key={i} style={{
                  backgroundColor:'rgba(255,255,255,0.14)',
                  borderRadius:20, paddingHorizontal:8, paddingVertical:3,
                  borderWidth:1, borderColor:'rgba(255,255,255,0.28)',
                }}>
                  <Text style={{ color:'rgba(255,255,255,0.92)', fontSize:10, fontWeight:'600' }}>✦ {b}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
            <Animated.View style={[s.playBtn, pulseStyle]}>
              <Ionicons name="play" size={10} color={C.accentText} />
            </Animated.View>
            <Text style={s.videoSub}>Tap to explore workouts</Text>
          </View>
        )}
      </View>
      {/* Music toggle — top-right, only for FLEXIBILITY videos */}
      {video.tag === 'FLEXIBILITY' && (
        <TouchableOpacity
          onPress={toggleMusic}
          activeOpacity={0.85}
          style={{
            position:'absolute', top:12, right:12,
            flexDirection:'row', alignItems:'center', gap:6,
            backgroundColor: musicOn ? `${C.accent}30` : 'rgba(0,0,0,0.52)',
            borderRadius:22, paddingHorizontal:11, paddingVertical:7,
            borderWidth:1,
            borderColor: musicOn ? `${C.accent}88` : 'rgba(255,255,255,0.18)',
          }}>
          {musicOn
            ? <><MusicBars active={true} accentColor={C.accent} /><Ionicons name="musical-notes" size={14} color={C.accent} /></>
            : <><Ionicons name="musical-notes-outline" size={14} color="rgba(255,255,255,0.65)" />
                <Text style={{ color:'rgba(255,255,255,0.65)', fontSize:11, fontWeight:'600', letterSpacing:0.3 }}>
                  {musicLoading ? 'Loading…' : 'Music'}
                </Text></>
          }
        </TouchableOpacity>
      )}
      {/* Timer badge — bottom-right, covers watermark */}
      <View pointerEvents="none" style={{
        position:'absolute', bottom:14, right:14,
        flexDirection:'row', alignItems:'center', gap:5,
        backgroundColor:'rgba(0,0,0,0.52)',
        borderRadius:10, paddingHorizontal:9, paddingVertical:5,
        borderWidth:1, borderColor:'rgba(255,255,255,0.20)',
      }}>
        <Animated.View style={{
          width:6, height:6, borderRadius:3,
          backgroundColor: C.accent, opacity: ready ? dotAnim : 0,
        }} />
        <Text style={{
          color: C.accent, fontSize:13, fontWeight:'700',
          letterSpacing:1.5, fontVariant:['tabular-nums'],
        }}>{timerStr}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Female category strip ──────────────────────────────────────────────────────
const FEMALE_CATS = [
  { id:'glutes',  label:'Glutes',  emoji:'🍑', color:'#FF6B9D' },
  { id:'legs',    label:'Legs',    emoji:'🦵', color:'#F59E0B' },
  { id:'yoga',    label:'Yoga',    emoji:'🧘', color:'#A78BFA' },
  { id:'core',    label:'Core',    emoji:'🔥', color:'#FF6B6B' },
  { id:'cardio',  label:'Cardio',  emoji:'❤️', color:'#EC4899' },
  { id:'arms',    label:'Arms',    emoji:'💪', color:'#4ECDC4' },
  { id:'flex',    label:'Stretch', emoji:'🌿', color:'#6EE7B7' },
  { id:'hiit',    label:'HIIT',    emoji:'⚡', color:'#C8F135' },
];

function FemaleCategoryStrip({ C, isDark, navigation }) {
  const [active, setActive] = useState('glutes');
  return (
    <View style={{ marginBottom: 6 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}>
        {FEMALE_CATS.map(cat => {
          const on = active === cat.id;
          return (
            <TouchableOpacity key={cat.id}
              onPress={() => { Haptics.selectionAsync(); setActive(cat.id); cat.id === 'yoga' && navigation.navigate('Yoga'); }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 5,
                backgroundColor: on ? C.accentDim : C.surfaceAlt,
                borderRadius: 22, paddingHorizontal: 14, paddingVertical: 9,
                borderWidth: 1.5, borderColor: on ? C.accent : 'transparent',
              }}>
              <Text style={{ fontSize: 15 }}>{cat.emoji}</Text>
              <Text style={{ color: on ? C.accent : C.muted, fontWeight: '800', fontSize: 12 }}>{cat.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ── Female featured video card ─────────────────────────────────────────────────
const TAG_COLORS_F = {
  GLUTES:'#FF6B9D', LEGS:'#F59E0B', FLEXIBILITY:'#A78BFA',
  CORE:'#FF6B6B', CARDIO:'#EC4899', ARMS:'#4ECDC4',
  HIIT:'#C8F135', STRENGTH:'#C8F135', RECOVERY:'#6EE7B7', SHOULDERS:'#60A5FA',
};

function FeaturedVideoCard({ video, navigation }) {
  const [ready, setReady] = useState(false);
  const color = TAG_COLORS_F[video.tag] || '#C8F135';
  return (
    <TouchableOpacity
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('Workouts'); }}
      activeOpacity={0.88}
      style={{ width: 148, height: 210, borderRadius: 18, overflow: 'hidden', backgroundColor: '#0a0a14',
        shadowColor: color, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 }}>
      {!ready && (
        <View style={[StyleSheet.absoluteFill, { justifyContent:'center', alignItems:'center', backgroundColor:'#0a0a14' }]}>
          <Ionicons name="body-outline" size={24} color="rgba(255,255,255,0.15)" />
        </View>
      )}
      <Video source={video.src} style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER} shouldPlay isLooping isMuted
        onReadyForDisplay={() => setReady(true)} />
      <LinearGradient colors={['transparent','rgba(0,0,0,0.88)']}
        style={[StyleSheet.absoluteFill, { justifyContent:'flex-end', padding: 10 }]}>
        <View style={{ backgroundColor: color + '28', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
          alignSelf:'flex-start', borderWidth:1, borderColor: color + '55', marginBottom: 5 }}>
          <Text style={{ color, fontSize: 9, fontWeight:'800', letterSpacing:0.5 }}>{video.tag}</Text>
        </View>
        <Text style={{ color:'#fff', fontWeight:'800', fontSize: 13, lineHeight:17 }} numberOfLines={2}>{video.label}</Text>
        {video.dur && (
          <View style={{ flexDirection:'row', alignItems:'center', gap:3, marginTop:4 }}>
            <Ionicons name="time-outline" size={10} color={color} />
            <Text style={{ color, fontSize:10, fontWeight:'700' }}>{video.dur}</Text>
          </View>
        )}
        {!video.dur && (
          <View style={{ flexDirection:'row', alignItems:'center', gap:3, marginTop:4 }}>
            <View style={{ width:5, height:5, borderRadius:3, backgroundColor: color }} />
            <Text style={{ color:'rgba(255,255,255,0.5)', fontSize:10 }}>Tap to explore</Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

function FemaleFeaturedSlider({ C, navigation }) {
  const featured = useMemo(() => {
    const cats = ['GLUTES','LEGS','FLEXIBILITY','CORE','CARDIO','ARMS','HIIT','STRENGTH'];
    const picks = [];
    cats.forEach(cat => {
      const pool = VIDEOS_FEMALE.filter(v => v.tag === cat);
      if (pool.length > 0) picks.push(pool[Math.floor(Math.random() * pool.length)]);
    });
    return picks;
  }, []);
  return (
    <View style={{ marginBottom: 4 }}>
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:16, marginBottom:10 }}>
        <View>
          <Text style={{ color: C.text, fontSize: 16, fontWeight:'800' }}>Featured For You</Text>
          <Text style={{ color: C.dim, fontSize: 11, marginTop:2 }}>Personalized workout picks ✨</Text>
        </View>
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); navigation.navigate('Workouts'); }}>
          <Text style={{ color:C.accent, fontSize:12, fontWeight:'700' }}>See All ›</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal:16, gap:10, paddingBottom:4 }}>
        {featured.map((v, i) => <FeaturedVideoCard key={i} video={v} navigation={navigation} />)}
      </ScrollView>
    </View>
  );
}

// ── Female yoga quick banner ───────────────────────────────────────────────────
const YOGA_DAY_MAP = {
  Sun:{ name:'Rest & Restore',  dur:'15 min', color:'#6EE7B7' },
  Mon:{ name:'Morning Flow',    dur:'15 min', color:'#FF6B6B' },
  Tue:{ name:'Hip Openers',     dur:'20 min', color:'#C8F135' },
  Wed:{ name:'Balance & Focus', dur:'15 min', color:'#4ECDC4' },
  Thu:{ name:'Backbend Flow',   dur:'20 min', color:'#A78BFA' },
  Fri:{ name:'Full Body',       dur:'20 min', color:'#F59E0B' },
  Sat:{ name:'Core & Stretch',  dur:'20 min', color:'#EC4899' },
};
const DAY_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function FemaleYogaBanner({ navigation, C, isDark }) {
  const todayKey = DAY_SHORT[new Date().getDay()];
  const session = YOGA_DAY_MAP[todayKey];
  // Zero lime in light mode: replace #C8F135 with theme accent; all other day colors pass through
  const displayColor = !isDark && session.color === '#C8F135' ? C.accent : session.color;
  return (
    <TouchableOpacity
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); navigation.navigate('Yoga'); }}
      activeOpacity={0.87}
      style={{ marginHorizontal:16, marginBottom:14, borderRadius:20, overflow:'hidden',
        shadowColor: isDark ? displayColor : C.accent, shadowOpacity:0.3, shadowRadius:12, elevation:6 }}>
      <LinearGradient
        colors={isDark ? [displayColor + '40', displayColor + '18', '#0A0A0F'] : [C.accentDim, C.surfaceAlt]}
        start={{ x:0, y:0 }} end={{ x:1, y:1 }}
        style={{ padding:18, borderWidth:1, borderColor: isDark ? displayColor + '35' : C.border, borderRadius:20 }}>
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
          <View style={{ flex:1 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:7 }}>
              <LinearGradient colors={[C.accent + 'CC', C.accent]}
                style={{ width:30, height:30, borderRadius:15, justifyContent:'center', alignItems:'center' }}>
                <Ionicons name="leaf" size={15} color={C.accentText} />
              </LinearGradient>
              <Text style={{ color: isDark ? 'rgba(255,255,255,0.5)' : C.muted, fontSize:10, fontWeight:'800', letterSpacing:1.2 }}>TODAY'S YOGA SESSION</Text>
            </View>
            <Text style={{ color: isDark ? '#fff' : C.text, fontSize:22, fontWeight:'900', marginBottom:5, letterSpacing:-0.3 }}>{session.name}</Text>
            <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:5 }}>
                <Ionicons name="time-outline" size={12} color={isDark ? displayColor : C.accent} />
                <Text style={{ color: isDark ? displayColor : C.accent, fontWeight:'700', fontSize:12 }}>{session.dur}</Text>
              </View>
              <View style={{ flexDirection:'row', alignItems:'center', gap:5 }}>
                <Ionicons name="body-outline" size={12} color={isDark ? 'rgba(255,255,255,0.4)' : C.dim} />
                <Text style={{ color: isDark ? 'rgba(255,255,255,0.4)' : C.muted, fontSize:12 }}>3 poses</Text>
              </View>
            </View>
          </View>
          <LinearGradient colors={[C.accent, C.accent + 'BB']}
            style={{ width:54, height:54, borderRadius:27, justifyContent:'center', alignItems:'center',
              shadowColor: C.accent, shadowOpacity:0.6, shadowRadius:10 }}>
            <Ionicons name="play" size={22} color={C.accentText} />
          </LinearGradient>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ── Female wellness glow strip ─────────────────────────────────────────────────
function FemaleWellnessStrip({ C, isDark }) {
  const items = [
    { icon:'leaf-outline',         label:'Yoga',    sub:'3 poses today',  color:'#A78BFA' },
    { icon:'flame-outline',        label:'Burn',    sub:'Active zone',    color:'#FF6B6B' },
    { icon:'heart-outline',        label:'Wellness',sub:'On track',       color:'#FF6B9D' },
    { icon:'sparkles-outline',     label:'Glow',    sub:'Keep it up!',    color:'#F59E0B' },
  ];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal:16, gap:10, paddingVertical:4 }}>
      {items.map((item, i) => (
        <LinearGradient key={i}
          colors={[item.color + '22', item.color + '0A']}
          style={{ borderRadius:16, padding:12, minWidth:95, borderWidth:1, borderColor: item.color + '33',
            alignItems:'center', gap:5 }}>
          <View style={{ width:36, height:36, borderRadius:18, backgroundColor: item.color + '22',
            justifyContent:'center', alignItems:'center', borderWidth:1, borderColor: item.color + '44' }}>
            <Ionicons name={item.icon} size={16} color={item.color} />
          </View>
          <Text style={{ color: item.color, fontWeight:'800', fontSize:12 }}>{item.label}</Text>
          <Text style={{ color:C.dim, fontSize:10, fontWeight:'600', textAlign:'center' }}>{item.sub}</Text>
        </LinearGradient>
      ))}
    </ScrollView>
  );
}

// ── Today's Workout card with spring play button + pulse ──────────────────────
function WorkoutCardAnimated({ plan, planName, planMins, planCals, planExs, gender, navigation, C, s, isDark }) {
  const { animStyle: cardScale, onPressIn, onPressOut } = useSpringPress(0.97);
  const pulseStyle = usePulse(true, 0.92, 1.0, 1800);
  const cardGlow = glowStyle(isDark, C.accent, 10, 0.14);
  const bgImg = getWorkoutImg(plan, gender);

  return (
    <Animated.View style={[cardScale]}>
      <TouchableOpacity style={[s.workoutCard, cardGlow]}
        activeOpacity={1}
        onPressIn={onPressIn} onPressOut={onPressOut}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          plan ? navigation.navigate('WorkoutDetail', { plan }) : navigation.navigate('Workouts');
        }}>
        
        {bgImg ? (
          <>
            <Image source={bgImg} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="center top" />
            <LinearGradient colors={isDark ? ['rgba(26,42,10,0.85)','rgba(10,26,10,0.95)'] : ['rgba(0,0,0,0.40)','rgba(0,0,0,0.82)']}
              style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:1}} />
          </>
        ) : (
          <LinearGradient colors={isDark ? ['#1A2A0A','#0A1A0A'] : [C.surfaceAlt, C.bg]}
            style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:1}} />
        )}
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
        <Animated.View style={[s.workoutPlayBtn, pulseStyle]}>
          <Ionicons name="play" size={22} color={C.accentText} />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// â"€â"€ Quick action button with spring press â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
function QuickActionBtn({ q, navigation, s, C }) {
  const { animStyle, onPressIn, onPressOut } = useSpringPress(0.90);
  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity style={s.quickBtn} activeOpacity={1}
        onPressIn={onPressIn} onPressOut={onPressOut}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate(q.screen); }}>
        <View style={[s.quickIcon, { backgroundColor:`${q.color}18`, borderColor:`${q.color}33` }]}>
          <Ionicons name={q.icon} size={20} color={q.color} />
        </View>
        <Text style={s.quickLabel}>{q.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// â"€â"€ Animated calorie progress bar â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
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

// ── 7-day training split ────────────────────────────────────────
const DAILY_SPLIT = [
  { key:'chest',  label:'Chest Day',      mcIcon:'weight-lifter',    tags:['CHEST'],                                               sub:'Push · Chest Focus'       },
  { key:'back',   label:'Back Day',       mcIcon:'human-handsdown',  tags:['BACK','STRENGTH'],                                     sub:'Pull · Back Focus'        },
  { key:'arms',   label:'Arms Day',       mcIcon:'arm-flex',         tags:['ARMS'],                                                sub:'Biceps & Triceps'         },
  { key:'legs',   label:'Leg Day',        mcIcon:'run-fast',         tags:['LEGS','GLUTES'],                                       sub:'Lower Body Focus'         },
  { key:'core',   label:'Core & Cardio',  mcIcon:'lightning-bolt',   tags:['CORE','CARDIO','HIIT'],                                sub:'Endurance Focus'          },
  { key:'full',   label:'Full Body',      mcIcon:'dumbbell',         tags:['CHEST','BACK','ARMS','LEGS','GLUTES','SHOULDERS'],     sub:'All Muscle Groups'        },
  { key:'rest',   label:'Rest Day',       mcIcon:'leaf',             tags:['RECOVERY','FLEXIBILITY'],                              sub:'Active Recovery'          },
];
const DAY_LABELS = ['MON','TUE','WED','THU','FRI','SAT','SUN'];

function DailyRoutineSection({ gender, C, isDark, navigation }) {
  const pool     = gender === 'female' ? VIDEOS_FEMALE : VIDEOS_MALE;
  const now      = new Date();
  const splitIdx = (now.getDay() + 6) % 7; // Sun=6, Mon=0, Tue=1...
  const today    = DAILY_SPLIT[splitIdx];

  const exercises = useMemo(() => {
    const matches = pool.filter(v => today.tags.includes(v.tag));
    if (matches.length === 0) return [];
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    const start     = dayOfYear % matches.length;
    return Array.from({ length: Math.min(4, matches.length) }, (_, i) => matches[(start + i) % matches.length]);
  }, [splitIdx, gender]);

  const todayGlow = isDark ? {
    shadowColor: C.accent, shadowOffset: { width:0, height:0 },
    shadowOpacity: 0.18, shadowRadius: 10, elevation: 6,
  } : {};

  return (
    <View style={{ marginHorizontal:16, marginBottom:16 }}>
      {/* Row header */}
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <Text style={{ color:C.muted, fontSize:10, fontWeight:'800', letterSpacing:1.4, textTransform:'uppercase' }}>Daily Routine</Text>
        <View style={{ backgroundColor:`${C.accent}18`, borderRadius:8, paddingHorizontal:8, paddingVertical:3, borderWidth:1, borderColor:`${C.accent}33` }}>
          <Text style={{ color:C.accent, fontSize:9, fontWeight:'800', letterSpacing:0.8 }}>SPLIT PROGRAM</Text>
        </View>
      </View>

      {/* 7-day strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap:6, paddingBottom:12 }}>
        {DAILY_SPLIT.map((day, i) => {
          const isToday = i === splitIdx;
          return (
            <View key={day.key} style={{
              paddingHorizontal:10, paddingVertical:8, borderRadius:14,
              backgroundColor: isToday ? C.accent : C.card,
              borderWidth:1, borderColor: isToday ? C.accent : C.border,
              alignItems:'center', minWidth:48,
            }}>
              <Text style={{ color: isToday ? C.accentText : C.dim, fontSize:9, fontWeight:'800', letterSpacing:0.6 }}>
                {DAY_LABELS[i]}
              </Text>
              <Text style={{ color: isToday ? C.accentText : C.text, fontSize:11, fontWeight:'900', marginTop:3 }} numberOfLines={1}>
                {day.label.split(' ')[0]}
              </Text>
              {isToday && (
                <View style={{ width:4, height:4, borderRadius:2, backgroundColor:C.accentText, marginTop:4, opacity:0.6 }} />
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Today's card */}
      <View style={[{
        backgroundColor: isDark ? '#121A00' : C.surface,
        borderRadius:18, borderWidth:1, borderColor:`${C.accent}40`,
        overflow:'hidden',
      }, todayGlow]}>
        {/* Header row */}
        <View style={{
          flexDirection:'row', alignItems:'center', gap:12,
          padding:14, paddingBottom:12,
          borderBottomWidth:1, borderBottomColor: isDark ? `${C.accent}22` : `${C.accent}20`,
        }}>
          <View style={{ width:46, height:46, borderRadius:13, backgroundColor:`${C.accent}22`,
            alignItems:'center', justifyContent:'center' }}>
            <MaterialCommunityIcons name={today.mcIcon} size={24} color={C.accent} />
          </View>
          <View style={{ flex:1 }}>
            <Text style={{ color:C.accent, fontSize:9, fontWeight:'900', letterSpacing:1.2, textTransform:'uppercase', marginBottom:2 }}>
              TODAY · {DAY_LABELS[splitIdx]}
            </Text>
            <Text style={{ color:C.text, fontSize:17, fontWeight:'900', lineHeight:20 }}>{today.label}</Text>
            <Text style={{ color:C.muted, fontSize:11, fontWeight:'600', marginTop:2 }}>{today.sub}</Text>
          </View>
          <View style={{ backgroundColor:`${C.accent}22`, borderRadius:10, paddingHorizontal:10, paddingVertical:6, alignItems:'center' }}>
            <Text style={{ color:C.text, fontSize:14, fontWeight:'900' }}>{exercises.length}</Text>
            <Text style={{ color:C.muted, fontSize:8, fontWeight:'800', letterSpacing:0.4 }}>EXCS</Text>
          </View>
        </View>

        {/* Exercise rows */}
        {exercises.length > 0 ? (
          exercises.map((ex, i) => (
            <TouchableOpacity key={`${ex.label}${i}`} activeOpacity={0.7}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('Workouts'); }}
              style={{
                flexDirection:'row', alignItems:'center', gap:12,
                paddingVertical:11, paddingHorizontal:14,
                borderTopWidth: i > 0 ? 1 : 0, borderTopColor: isDark ? `${C.accent}15` : `${C.accent}18`,
              }}>
              <View style={{ width:28, height:28, borderRadius:8, backgroundColor:`${C.accent}22`,
                alignItems:'center', justifyContent:'center' }}>
                <Text style={{ color:C.text, fontSize:12, fontWeight:'900' }}>{i + 1}</Text>
              </View>
              <Text style={{ flex:1, color:C.text, fontSize:13, fontWeight:'700' }}>{ex.label}</Text>
              <View style={{ backgroundColor:`${C.accent}18`, borderRadius:8, paddingHorizontal:8, paddingVertical:4,
                borderWidth:1, borderColor:`${C.accent}30` }}>
                <Text style={{ color:C.accent, fontSize:9, fontWeight:'800', letterSpacing:0.5 }}>{ex.tag}</Text>
              </View>
              <Ionicons name="play-circle-outline" size={20} color={`${C.accent}88`} />
            </TouchableOpacity>
          ))
        ) : (
          <View style={{ alignItems:'center', paddingVertical:24, gap:8 }}>
            <MaterialCommunityIcons name="leaf" size={32} color={C.muted} />
            <Text style={{ color:C.muted, fontSize:13, fontWeight:'700' }}>Rest Day — Recharge!</Text>
            <Text style={{ color:C.dim, fontSize:11 }}>Light stretching or foam rolling recommended</Text>
          </View>
        )}

        {/* Footer CTA */}
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('Workouts'); }}
          style={{
            flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6,
            paddingVertical:12, borderTopWidth:1,
            borderTopColor: isDark ? `${C.accent}22` : `${C.accent}20`,
          }}>
          <Text style={{ color:C.accent, fontSize:12, fontWeight:'800', letterSpacing:0.4 }}>View Full Workout Plan</Text>
          <Ionicons name="arrow-forward" size={13} color={C.accent} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Nutrition home card data ───────────────────────────────────────────────────
const DIET_PLAN_CARDS = [
  { id:'keto',   cat:'KETO',           label:'Easy Keto',      sub:'Healthy & Simple', color:'#E8A435', bg:'#1C1400', img:'https://images.pexels.com/photos/1580466/pexels-photo-1580466.jpeg?auto=compress&cs=tinysrgb&w=300' },
  { id:'drinks', cat:'HEALTHY DRINKS', label:'5-Min Smoothie', sub:'Quick Energy',     color:'#60A5FA', bg:'#00142A', img:'https://images.pexels.com/photos/775030/pexels-photo-775030.jpeg?auto=compress&cs=tinysrgb&w=300'   },
  { id:'vegan',  cat:'VEGAN',          label:'Easy Vegan',     sub:'High Protein',     color:'#4ADE80', bg:'#001400', img:'https://images.pexels.com/photos/1143754/pexels-photo-1143754.jpeg?auto=compress&cs=tinysrgb&w=300'  },
  { id:'keto2',  cat:'KETO',           label:'Keto Breakfast', sub:'Low Carb Start',   color:'#F87171', bg:'#1C0000', img:'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=300'   },
];

const DAILY_MEAL_SETS = [
  [
    { type:'Breakfast', name:'Oat Milk Bowls',           img:'https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&w=120' },
    { type:'Lunch',     name:'Peanut Tofu Wrap',         img:'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=120' },
    { type:'Dinner',    name:'Pasta with Peas',          img:'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=120' },
  ],
  [
    { type:'Breakfast', name:'Strawberry Banana Yogurt', img:'https://images.pexels.com/photos/1132047/pexels-photo-1132047.jpeg?auto=compress&cs=tinysrgb&w=120' },
    { type:'Lunch',     name:'Grilled Chicken Salad',    img:'https://images.pexels.com/photos/2097090/pexels-photo-2097090.jpeg?auto=compress&cs=tinysrgb&w=120' },
    { type:'Dinner',    name:'Grilled Ancho Chicken',    img:'https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=120' },
  ],
  [
    { type:'Breakfast', name:'Avocado Toast',            img:'https://images.pexels.com/photos/1351238/pexels-photo-1351238.jpeg?auto=compress&cs=tinysrgb&w=120' },
    { type:'Lunch',     name:'Quinoa Power Bowl',        img:'https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&cs=tinysrgb&w=120' },
    { type:'Dinner',    name:'Lemon Herb Salmon',        img:'https://images.pexels.com/photos/3655916/pexels-photo-3655916.jpeg?auto=compress&cs=tinysrgb&w=120' },
  ],
  [
    { type:'Breakfast', name:'Greek Yogurt Parfait',     img:'https://images.pexels.com/photos/1102007/pexels-photo-1102007.jpeg?auto=compress&cs=tinysrgb&w=120' },
    { type:'Lunch',     name:'Turkey Lettuce Wrap',      img:'https://images.pexels.com/photos/1640775/pexels-photo-1640775.jpeg?auto=compress&cs=tinysrgb&w=120' },
    { type:'Dinner',    name:'Stir-Fry Tofu Bowl',      img:'https://images.pexels.com/photos/1410235/pexels-photo-1410235.jpeg?auto=compress&cs=tinysrgb&w=120' },
  ],
  [
    { type:'Breakfast', name:'Green Protein Smoothie',   img:'https://images.pexels.com/photos/775030/pexels-photo-775030.jpeg?auto=compress&cs=tinysrgb&w=120' },
    { type:'Lunch',     name:'Brown Rice Veggie Bowl',   img:'https://images.pexels.com/photos/723198/pexels-photo-723198.jpeg?auto=compress&cs=tinysrgb&w=120' },
    { type:'Dinner',    name:'Baked Chicken Breast',     img:'https://images.pexels.com/photos/2673353/pexels-photo-2673353.jpeg?auto=compress&cs=tinysrgb&w=120' },
  ],
  [
    { type:'Breakfast', name:'Chia Seed Pudding',        img:'https://images.pexels.com/photos/3026810/pexels-photo-3026810.jpeg?auto=compress&cs=tinysrgb&w=120' },
    { type:'Lunch',     name:'Mediterranean Salad',      img:'https://images.pexels.com/photos/1684863/pexels-photo-1684863.jpeg?auto=compress&cs=tinysrgb&w=120' },
    { type:'Dinner',    name:'Lean Beef Stir Fry',       img:'https://images.pexels.com/photos/3763847/pexels-photo-3763847.jpeg?auto=compress&cs=tinysrgb&w=120' },
  ],
  [
    { type:'Breakfast', name:'Egg White Omelette',       img:'https://images.pexels.com/photos/824635/pexels-photo-824635.jpeg?auto=compress&cs=tinysrgb&w=120' },
    { type:'Lunch',     name:'Lentil Soup & Bread',      img:'https://images.pexels.com/photos/539451/pexels-photo-539451.jpeg?auto=compress&cs=tinysrgb&w=120' },
    { type:'Dinner',    name:'Shrimp Cauliflower Rice',  img:'https://images.pexels.com/photos/566566/pexels-photo-566566.jpeg?auto=compress&cs=tinysrgb&w=120' },
  ],
];

function NutritionHomeCard({ calConsumed, calTarget, protConsumed, protTarget, carbConsumed, carbTarget, fatConsumed, fatTarget, calPct, calDisplay, C, isDark, navigation }) {
  const now     = new Date();
  const doy     = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const meals   = DAILY_MEAL_SETS[doy % DAILY_MEAL_SETS.length];
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 14 }}>


      {/* Macro summary card */}
      <View style={{ backgroundColor: isDark ? '#16161F' : C.surface, borderRadius:18, borderWidth:1, borderColor: isDark ? 'rgba(255,255,255,0.07)' : C.border, padding:14, marginTop:12 }}>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <Text style={{ color: C.muted, fontSize:11, fontWeight:'700' }}>Daily Calories</Text>
          <Text style={{ color: C.text, fontSize:13, fontWeight:'900' }}>
            {calDisplay} <Text style={{ color: C.muted, fontWeight:'600', fontSize:11 }}>/ {calTarget} kcal</Text>
          </Text>
        </View>
        <CalBar pct={calPct} C={C} isDark={isDark} />
        <View style={{ flexDirection:'row', justifyContent:'space-around', marginTop:14 }}>
          <MacroRing value={protConsumed} max={protTarget} color={C.accent} label="PROTEIN" unit="g" C={C} isDark={isDark} />
          <MacroRing value={carbConsumed} max={carbTarget} color={C.accent} label="CARBS"   unit="g" C={C} isDark={isDark} />
          <MacroRing value={fatConsumed}  max={fatTarget}  color={C.accent} label="FATS"    unit="g" C={C} isDark={isDark} />
        </View>
      </View>
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

  // â"€â"€ Computed values (safe with null data while loading) â"€â"€â"€â"€â"€â"€â"€â"€
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

  // â"€â"€ Entrance animations â€" must be before early return â"€â"€â"€â"€â"€â"€â"€â"€â"€
  const e0 = useEntrance(0);
  const e1 = useEntrance(1);
  const e2 = useEntrance(2);
  const e3 = useEntrance(3);
  const e4 = useEntrance(4);
  const e5 = useEntrance(5);
  const e6 = useEntrance(6);
  const e7 = useEntrance(7);

  // â"€â"€ Count-up â€" enabled only after data loads â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  const streakDisplay      = useCountUp(streak,      700, !loading);
  const totalWktsDisplay   = useCountUp(totalWkts,   700, !loading);
  const calDisplay         = useCountUp(calConsumed, 800, !loading);

  // â"€â"€ Hero card glow / border depth â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
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

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          HEADER
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <Animated.View style={e0}>
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
      </Animated.View>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          HERO â€" GENDER BODY TRANSFORMATION CARD
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}

      {gender === 'female' && <FemaleCategoryStrip C={C} isDark={isDark} navigation={navigation} />}
      {/* Female category strip */}
      <Animated.View style={[e1, { marginHorizontal:16, marginBottom:14 }, ...heroDepth]}>
      <View style={[s.heroCard, { marginHorizontal:0, marginBottom:0 }]}>
        <LinearGradient
          colors={isDark ? [C.surfaceAlt ?? C.card2, C.bg] : [C.surface, C.surfaceAlt]}
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
      </Animated.View>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          3-STAT STRIP
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <Animated.View style={e2}>
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
              <Text style={[s.statNum, { color: C.text }]}>{item.val}</Text>
              <Text style={s.statSub}>{item.sub}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
      </Animated.View>

      {/* Female featured slider */}
      {gender === 'female' && <FemaleFeaturedSlider C={C} navigation={navigation} />}


      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          TODAY'S MACROS â€" RING PROGRESS
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <Animated.View style={e3}>
      <NutritionHomeCard
        calConsumed={calConsumed}   calTarget={calTarget}
        protConsumed={protConsumed} protTarget={protTarget}
        carbConsumed={carbConsumed} carbTarget={carbTarget}
        fatConsumed={fatConsumed}   fatTarget={fatTarget}
        calPct={calPct}             calDisplay={calDisplay}
        C={C} isDark={isDark}       navigation={navigation}
      />
      </Animated.View>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          TODAY'S WORKOUT CARD
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <Animated.View style={e4}>
      <WorkoutCardAnimated plan={plan} planName={planName} planMins={planMins} planCals={planCals}
        planExs={planExs} gender={gender} navigation={navigation} C={C} s={s} isDark={isDark} />

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          QUICK ACTIONS
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <View style={s.quickGrid}>
        {[
          { icon:'restaurant',      label:'Log Food',  color:C.accent, screen:'Nutrition' },
          { icon:'moon',            label:'Sleep',     color:C.accent, screen:'Sleep'   },
          { icon:'trophy',          label:'Goals',     color:C.accent, screen:'Goals'   },
          { icon:'analytics',       label:'Tracker',   color:C.accent, screen:'Tracker' },
        ].map(q => (
          <QuickActionBtn key={q.label} q={q} navigation={navigation} s={s} C={C} />
        ))}
      </View>
      </Animated.View>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          AI COACH BANNER
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* Female yoga quick banner */}
      {gender === 'female' && <FemaleYogaBanner navigation={navigation} C={C} isDark={isDark} />}

      <Animated.View style={e5}>
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
      </Animated.View>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          WORKOUT VIDEO OF THE DAY
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <Animated.View style={e5}>
      <Text style={s.sectionLbl}>WORKOUT OF THE DAY</Text>
      <WorkoutVideoCard gender={gender} navigation={navigation} C={C} s={s} />
      </Animated.View>

      {/* DAILY TRAINING SPLIT */}
      <Animated.View style={e6}>
      <DailyRoutineSection gender={gender} C={C} isDark={isDark} navigation={navigation} />
      </Animated.View>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          WEEKLY ACTIVITY BAR CHART
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <Animated.View style={e5}>
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
      </Animated.View>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          ACTIVE GOALS
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <Animated.View style={e7}>
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
                      <Text style={[s.goalDays, dLeft <= 7 && { color: C.red }]}>
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
                        <Text style={[{ fontSize:10, fontWeight:'800', color: C.text }]}>{pct.toFixed(0)}%</Text>
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
      </Animated.View>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          SLEEP
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <Animated.View style={e7}>
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
      </Animated.View>
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
  heroTargetUnit:{ color:C.muted, fontSize:10 },
  setGoalBtn:   { borderWidth:1, borderRadius:10, paddingHorizontal:8, paddingVertical:5 },
  heroBarBg:    { height:6, backgroundColor:C.border, borderRadius:3,
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

