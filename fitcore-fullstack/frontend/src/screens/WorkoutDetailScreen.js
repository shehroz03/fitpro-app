import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image,
  Animated, Easing, Alert, Modal, SafeAreaView, TextInput, ActivityIndicator,
} from 'react-native';
import { workoutAPI } from '../api/services';
import { speakAsAgent, stopAgent, buildWorkoutLine } from '../api/ttsService';
import { VoiceCoach } from '../components/VoiceCoach';
import { useC } from '../utils/theme';
import { useAuthStore } from '../store/authStore';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import EXERCISES_JSON from '../data/exercises.json';
import * as FileSystem from 'expo-file-system';

const DL_DIR = FileSystem.documentDirectory + 'fitcore_videos/';
const SB_VID = 'https://nlzuqzkxtmqabmwkggpy.supabase.co/storage/v1/object/public/exercise-videos';

const HERO_IMG_MALE = {
  strength:    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80',
  cardio:      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80',
  hiit:        'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=400&q=80',
  flexibility: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80',
  core:        'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80',
  recovery:    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80',
  yoga:        'https://images.unsplash.com/photo-1510894347713-fc3dc6166ef5?w=400&q=80',
  // extended pool for unique-per-workout fallback
  _pool: [
    'https://images.unsplash.com/photo-1581009137042-c552e485697a?w=400&q=80',
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80',
    'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=400&q=80',
    'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=400&q=80',
  ],
};
const HERO_IMG_FEMALE = {
  strength:    require('../../assets/images/female/female_banner_strength.png'),
  cardio:      require('../../assets/images/female/female_banner_cardio.png'),
  hiit:        require('../../assets/images/female/female_banner_hiit.png'),
  flexibility: require('../../assets/images/female/female_banner_flexibility.png'),
  core:        require('../../assets/images/female/female_banner_core.png'),
  recovery:    require('../../assets/images/female/female_banner_recovery.png'),
  yoga:        require('../../assets/images/female/female_banner_yoga.png'),
};

const imgSrc = (val) => (typeof val === 'string') ? { uri: val } : val;

const _strHash = (s = '') => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const getHeroImg = (plan, isFemale) => {
  const map  = isFemale ? HERO_IMG_FEMALE : HERO_IMG_MALE;
  const name = plan?.name || '';
  // category-specific image if it exists, else pick from pool by name hash
  const cat  = plan?.category;
  if (map[cat]) return map[cat];
  const pool = isFemale
    ? [map.strength, map.cardio, map.core, map.flexibility, map.recovery, map.yoga]
    : (map._pool || [map.strength, map.cardio, map.core]);
  return pool[_strHash(name) % pool.length] || map.strength;
};

const EXERCISE_VIDEO = {
  male: {
    'Running':           'Man_running_in_place_202606110121.mp4',
    'Barbell Squat':     'Man_performing_barbell_squat_202606172035.mp4',
    'Bench Press':       'Man_performs_barbell_bench_press_202606172041.mp4',
    'Pull-ups':          'Man_performs_one_pull-up_202606110121.mp4',
    'Deadlift':          'Man_performing_barbell_deadlift_202606110121.mp4',
    'Shoulder Press':    'Man_performing_shoulder_press_202606110121.mp4',
    'Lunges':            'Man_performing_forward_lunge_202606110121.mp4',
    'Burpees':           'Man_performs_one_burpee_202606110121.mp4',
    'Push-ups':          'Man_performs_one_push-up_202606110121.mp4',
    'Russian Twists':    'Man_performing_Russian_twists_202606110121.mp4',
    'Mountain Climbers': 'Man_performs_mountain_climbers_202606110121.mp4',
    'Jump Rope':         'Man_skipping_jump_rope_202606110121.mp4',
    'Plank':             'Man_holding_forearm_plank_202606110121.mp4',
    'Downward Dog':      'Man_holding_downward_dog_pose_202606110121.mp4',
    'Foam Rolling':      'Man_foam-rolling_thighs_202606110121.mp4',
    'Jumping Jacks':     'Man_performing_jumping_jacks_202606110121.mp4',
    'High Knees':        'Man_performing_high_knees_202606110121.mp4',
    'Box Jump':          'Man_performing_box_jump_202606172359.mp4',
    'Tricep Dip':        'Man_performing_tricep_dip_202606110121.mp4',
    'Dumbbell Curl':     'Man_performing_dumbbell_curl_202606110121.mp4',
    'Hip Thrust':        'Man_performing_barbell_hip_thrust_202606110121.mp4',
    'Leg Raises':        'Man_holding_forearm_plank_202606110121.mp4',
  },
  female: {
    'Running':           'Woman_running_in_place_202606110124.mp4',
    'Barbell Squat':     'Woman_performing_bodyweight_squat_202606110124.mp4',
    'Bench Press':       'Woman_performing_dumbbell_press_202606110124.mp4',
    'Pull-ups':          'Woman_performs_one_pull-up_202606110124.mp4',
    'Deadlift':          'Woman_performing_barbell_deadlift_202606110124.mp4',
    'Shoulder Press':    'Woman_performing_face_pulls_202606172358.mp4',
    'Lunges':            'Woman_performs_forward_lunge_202606110124.mp4',
    'Burpees':           'Woman_performs_one_burpee_202606110124.mp4',
    'Push-ups':          'Woman_performing_push-up_202606110124.mp4',
    'Russian Twists':    'Woman_performing_Russian_twists_202606110124.mp4',
    'Mountain Climbers': 'Woman_performing_mountain_climbers_202606110124.mp4',
    'Jump Rope':         'Woman_skipping_jump_rope_202606110124.mp4',
    'Plank':             'Woman_performing_plank_on_mat_202606172357.mp4',
    'Downward Dog':      'Woman_holding_downward_dog_pose_202606110124.mp4',
    'Foam Rolling':      'Woman_foam-rolling_thighs_202606110124.mp4',
    'Jumping Jacks':     'Woman_performing_jumping_jacks_202606110124.mp4',
    'High Knees':        'Woman_performing_high_knees_202606110124.mp4',
    'Box Jump':          'Woman_performs_box_jump_202606110124.mp4',
    'Tricep Dip':        'Woman_performing_tricep_dip_202606110124.mp4',
    'Dumbbell Curl':     'Woman_performing_dumbbell_curl_202606110124.mp4',
    'Hip Thrust':        'Woman_performing_barbell_hip_thrust_202606110124.mp4',
    'Leg Raises':        'Woman_holding_forearm_plank_202606110124.mp4',
  },
};

const EXERCISE_DATA = {
  'Running': { sets:1, reps:0, rest:0, move:'run', muscle:'Full Body · Cardio',
    steps:['Stand tall with a slight forward lean from your ankles','Lift your knees to hip height with each stride','Swing arms at 90° — opposite arm to opposite leg','Land on the midfoot, not your heel','Keep shoulders relaxed and breathe in a steady rhythm','Run continuously for the target duration'],
    tips:['Land midfoot','Arms at 90°','Shoulders relaxed','Breathe rhythmically'] },

  'Barbell Squat': { sets:4, reps:12, rest:90, move:'squat', muscle:'Quads · Glutes · Core',
    steps:['Place barbell on your upper traps, stand feet shoulder-width apart','Take a deep breath, brace your core tight','Push knees outward and lower your hips down','Go until thighs are parallel to the floor (or deeper)','Drive through your heels to stand back up','Exhale at the top — that is 1 rep. Do 12 reps then rest 90 seconds'],
    tips:['Feet shoulder-width','Chest up','Knees track toes','Go to parallel'] },

  'Bench Press': { sets:4, reps:10, rest:90, move:'press', muscle:'Chest · Triceps · Shoulders',
    steps:['Lie flat on bench, grip bar slightly wider than shoulder-width','Unrack bar and hold it directly above your chest','Lower bar to mid-chest in a slow controlled arc','Press bar straight up explosively back to start','Keep feet flat on floor and slight arch in lower back','Do 10 reps then re-rack. Rest 90 seconds before next set'],
    tips:['Grip wider than shoulders','Bar to mid-chest','Feet flat','Slight arch'] },

  'Pull-ups': { sets:3, reps:10, rest:90, move:'pullup', muscle:'Back · Biceps · Core',
    steps:['Grip the bar slightly wider than shoulders, palms facing away','Hang at full arm extension — this is the dead hang start','Pull elbows down toward your hips to initiate the movement','Keep pulling until your chin clears the bar','Lower yourself slowly back to dead hang','Complete 10 reps then drop off the bar. Rest 90 seconds'],
    tips:['Dead hang start','Pull elbows down','Chin over bar','Control descent'] },

  'Deadlift': { sets:3, reps:8, rest:120, move:'deadlift', muscle:'Hamstrings · Glutes · Back',
    steps:['Stand with feet hip-width, bar directly over mid-foot','Hinge at hips, bend knees, grip bar just outside your legs','Flatten your back, chest up, big breath before each rep','Push the floor away to stand — keep bar dragging up your shins','Lock hips and squeeze glutes fully at the top','Hinge back down to reset. Do 8 reps then rest 2 minutes'],
    tips:['Bar over mid-foot','Hip hinge','Bar close to body','Drive hips at top'] },

  'Shoulder Press': { sets:3, reps:12, rest:60, move:'press', muscle:'Shoulders · Triceps',
    steps:['Hold dumbbells at shoulder height, palms facing forward','Stand with feet shoulder-width, core braced','Press dumbbells directly overhead until arms fully extend','Do not flare elbows out — keep them slightly forward','Lower dumbbells back to shoulder height slowly','Complete 12 reps then rest 60 seconds before next set'],
    tips:['Core tight','Press overhead','No elbow flare','Lower to chin'] },

  'Lunges': { sets:3, reps:12, rest:60, move:'lunge', muscle:'Quads · Glutes · Balance',
    steps:['Stand tall, feet together, hands on hips or holding dumbbells','Step forward with one leg — land on your heel first','Lower your back knee toward the floor until both knees are at 90°','Drive through your front heel to push back to standing','Alternate legs each rep — 12 reps per leg total','Complete 24 total steps then rest 60 seconds'],
    tips:['Step forward wide','Front knee 90°','Back knee near floor','Drive through heel'] },

  'Burpees': { sets:4, reps:15, rest:60, move:'burpee', muscle:'Full Body · HIIT',
    steps:['Stand with feet shoulder-width apart','Drop hands to floor beside feet','Jump both feet back to a high plank position','Optionally do one push-up here','Jump both feet back toward your hands','Explode upward, fully extending your body — clap overhead','Land softly and repeat immediately. Do 15 reps then rest 60 seconds'],
    tips:['Explosive jump','Land softly','Core tight','Breathe rhythm'] },

  'Leg Raises': { sets:5, reps:10, rest:60, move:'pushup', muscle:'Lower Abs · Hip Flexors',
    steps:['Lie flat on your back, arms straight by your sides','Press your lower back firmly into the floor','Keep both legs straight and together throughout','Raise legs until they point straight up at 90°','Lower legs slowly back down until just above the floor','Do not let heels touch down. Complete 10 reps, rest 60 seconds'],
    tips:['Back flat on floor','Legs straight','Lower slowly','No momentum'] },

  'Push-ups': { sets:5, reps:20, rest:45, move:'pushup', muscle:'Chest · Shoulders · Triceps',
    steps:['Start in a high plank — hands shoulder-width, body straight as a board','Keep elbows at 45° to your torso as you lower down','Lower chest until it nearly touches the floor','Push through both palms to return to start position','Do not let hips sag or pike up — keep core locked','Complete 20 reps then rest 45 seconds before next set'],
    tips:['Hands shoulder-width','Body straight','Chest to floor','Elbows 45°'] },

  'Russian Twists': { sets:3, reps:20, rest:45, move:'twist', muscle:'Obliques · Core',
    steps:['Sit on floor, lean back at 45° with feet raised off the ground','Clasp your hands together in front of your chest','Rotate your torso to the right, lowering hands toward the floor','Rotate to the left — that counts as 1 rep','Move from your core, not just your arms','Do 20 reps (10 each side) then rest 45 seconds'],
    tips:['Lean back 45°','Feet elevated','Rotate from core','Controlled'] },

  'Mountain Climbers': { sets:4, reps:20, rest:45, move:'climb', muscle:'Core · Shoulders · Cardio',
    steps:['Start in a high plank — arms straight, body in a straight line','Drive your right knee toward your chest quickly','Immediately switch — extend right leg and drive left knee in','Keep hips level throughout — do not let them rise up','Pump legs fast like you are running horizontally','Complete 20 reps (10 per side) then rest 45 seconds'],
    tips:['Hips level','Drive knees fast','Arms extended','Breathe continuously'] },

  'Jump Rope': { sets:3, reps:0, rest:30, move:'jumprope', muscle:'Full Body · Cardio',
    steps:['Hold rope handles loosely at hip height, one in each hand','Swing the rope over your head using your wrists, not arms','Jump as the rope comes under your feet — keep jumps small (2-3 cm)','Land softly on the balls of your feet, not flat-footed','Keep a consistent rhythm and look straight ahead','Jump continuously for the set duration then rest 30 seconds'],
    tips:['Light on feet','Wrists turn rope','Land softly','Steady rhythm'] },

  'Plank': { sets:4, reps:0, rest:45, move:'plank', muscle:'Core · Shoulders · Glutes',
    steps:['Place forearms on the floor, elbows directly under your shoulders','Extend your legs behind you, toes on the floor','Lift your body into one straight line from head to heels','Squeeze your glutes and brace your core as hard as you can','Breathe normally — do not hold your breath','Hold for the target time. Rest 45 seconds between sets'],
    tips:['Hips level','Core braced','Gaze down','Breathe steadily'] },

  'Downward Dog': { sets:3, reps:10, rest:30, move:'downwarddog', muscle:'Hamstrings · Shoulders · Back',
    steps:['Start on all fours — wrists under shoulders, knees under hips','Tuck your toes under and push your hips up and back','Straighten your legs as much as possible without rounding spine','Press your heels toward the floor (they do not need to touch)','Hold the position for 3 slow deep breaths','Lower back to start — that is 1 rep. Do 10 reps, rest 30 seconds'],
    tips:['Push heels toward floor','Straight arms','Relax neck','Deep breaths'] },

  'Foam Rolling': { sets:1, reps:0, rest:0, move:'foamroll', muscle:'Recovery · Full Body',
    steps:['Place the foam roller under the target muscle group','Support your weight on your hands or opposite leg','Slowly roll back and forth along the full length of the muscle','When you find a tight or sore spot — pause there for 20-30 seconds','Breathe slowly and let the muscle relax into the roller','Work each muscle for 60-90 seconds then move to the next area'],
    tips:['Slow controlled rolls','Pause on tight spots','Breathe through it','Cover full muscle'] },

  'Jumping Jacks': { sets:3, reps:30, rest:30, move:'jumpjack', muscle:'Full Body · Cardio',
    steps:['Stand with feet together and arms straight down by your sides','Jump your feet out to shoulder-width while raising both arms overhead','Immediately jump feet back together while lowering arms to sides','Keep a fast, steady rhythm throughout each rep','Land softly on balls of feet — do not stomp','Complete 30 reps then rest 30 seconds before next set'],
    tips:['Arms fully extend overhead','Land softly','Keep rhythm steady','Breathe continuously'] },

  'High Knees': { sets:3, reps:0, rest:30, move:'highknees', muscle:'Legs · Core · Cardio',
    steps:['Stand with feet hip-width apart, arms bent at 90°','Drive your right knee up to hip height while pushing off left foot','Quickly switch — drive left knee up as right foot lands','Pump your arms in opposition — left arm with right knee','Stay on the balls of your feet and keep a fast pace','Continue for the set duration then rest 30 seconds'],
    tips:['Drive knees to hip height','Pump arms','Stay on balls of feet','Fast pace'] },

  'Dumbbell Curl': { sets:3, reps:12, rest:45, move:'curl', muscle:'Biceps · Forearms',
    steps:['Stand holding dumbbells at your sides, palms facing forward','Keep your elbows pinned tightly to your sides — do not swing','Curl both dumbbells up toward your shoulders in an arc','Squeeze your biceps hard at the top for 1 second','Lower the dumbbells slowly back to the starting position','Complete 12 reps then rest 45 seconds before next set'],
    tips:['Elbows fixed at sides','Full range of motion','Squeeze at top','Control descent'] },

  'Hip Thrust': { sets:4, reps:12, rest:60, move:'hipthrust', muscle:'Glutes · Hamstrings · Core',
    steps:['Sit on the floor with your upper back against a bench edge','Place a barbell across your hip crease with a pad for comfort','Plant both feet flat on floor, hip-width apart, knees at 90°','Drive hips up by squeezing glutes until body forms a straight line','Hold and squeeze at the top for 1 second','Lower hips to just above floor. Do 12 reps then rest 60 seconds'],
    tips:['Bar on hip crease','Drive through heels','Squeeze glutes at top','Back on bench edge'] },

  'Tricep Dips': { sets:3, reps:12, rest:45, move:'tricdip', muscle:'Triceps · Chest · Shoulders',
    steps:['Grip parallel bars or the edge of a bench, arms fully extended','Keep your body upright — leaning forward shifts load to chest','Bend elbows and lower your body until elbows reach 90°','Keep elbows pointing straight back, not flaring out','Press through your palms to push back up to full extension','Complete 12 reps then rest 45 seconds before the next set'],
    tips:['Hands shoulder-width','Lower until 90°','Keep elbows back','Fully extend at top'] },

  'Box Jumps': { sets:4, reps:8, rest:60, move:'boxjump', muscle:'Legs · Glutes · Power',
    steps:['Stand facing the box, feet hip-width apart','Swing arms back and bend knees into a quarter squat','Swing arms forward explosively and jump onto the box','Land softly on your full foot in a slight squat position','Stand fully upright on the box, then step down carefully','Reset and repeat. Do 8 reps then rest 60 seconds'],
    tips:['Soft landing on full foot','Hinge on landing','Full hip extension at top','Step down safely'] },
};
const DEF = { sets:3, reps:12, rest:60, move:'squat', muscle:'Full Body', tips:['Form first','Control movement','Breathe properly','Stay consistent'] };

// ─── Supabase Storage — exercise videos (keeps APK size small) ───────────────
const SB = 'https://nlzuqzkxtmqabmwkggpy.supabase.co/storage/v1/object/public/exercise-videos';
const v = (path) => ({ uri: `${SB}/${path}` });

const VIDEOS = {
  male: {
    run:         v('male/Man_running_in_place_202606110121.mp4'),
    squat:       v('male/Man_performing_bodyweight_squat_202606110121.mp4'),
    press:       v('male/Man_performing_shoulder_press_202606110121.mp4'),
    pullup:      v('male/Man_performs_one_pull-up_202606110121.mp4'),
    lunge:       v('male/Man_performing_forward_lunge_202606110121.mp4'),
    burpee:      v('male/Man_performs_one_burpee_202606110121.mp4'),
    twist:       v('male/Man_performing_Russian_twists_202606110121.mp4'),
    pushup:      v('male/Man_performs_one_push-up_202606110121.mp4'),
    deadlift:    v('male/Man_performing_barbell_deadlift_202606110121.mp4'),
    climb:       v('male/Man_performs_mountain_climbers_202606110121.mp4'),
    jumprope:    v('male/Man_skipping_jump_rope_202606110121.mp4'),
    plank:       v('male/Man_holding_forearm_plank_202606110121.mp4'),
    downwarddog: v('male/Man_holding_downward_dog_pose_202606110121.mp4'),
    foamroll:    v('male/Man_foam-rolling_thighs_202606110121.mp4'),
    curl:        v('male/Man_performing_dumbbell_curl_202606110121.mp4'),
    hipthrust:   v('male/Man_performing_barbell_hip_thrust_202606110121.mp4'),
    tricdip:     v('male/Man_performing_tricep_dip_202606110121.mp4'),
    boxjump:     v('male/Man_performs_box_jump_202606110121.mp4'),
    jumpjack:    v('male/Man_performing_jumping_jacks_202606110121.mp4'),
    highknees:   v('male/Man_performing_high_knees_202606110121.mp4'),
  },
  female: {
    run:         v('female/Woman_running_in_place_202606110124.mp4'),
    squat:       v('female/Woman_performing_bodyweight_squat_202606110124.mp4'),
    press:       v('female/Woman_performing_dumbbell_press_202606110124.mp4'),
    pullup:      v('female/Woman_performs_one_pull-up_202606110124.mp4'),
    lunge:       v('female/Woman_performs_forward_lunge_202606110124.mp4'),
    burpee:      v('female/Woman_performs_one_burpee_202606110124.mp4'),
    twist:       v('female/Woman_performing_Russian_twists_202606110124.mp4'),
    pushup:      v('female/Woman_performing_push-up_202606110124.mp4'),
    deadlift:    v('female/Woman_performing_barbell_deadlift_202606110124.mp4'),
    climb:       v('female/Woman_performing_mountain_climbers_202606110124.mp4'),
    jumprope:    v('female/Woman_skipping_jump_rope_202606110124.mp4'),
    plank:       v('female/Woman_holding_forearm_plank_202606110124.mp4'),
    downwarddog: v('female/Woman_holding_downward_dog_pose_202606110124.mp4'),
    foamroll:    v('female/Woman_foam-rolling_thighs_202606110124.mp4'),
    curl:        v('female/Woman_performing_dumbbell_curl_202606110124.mp4'),
    hipthrust:   v('female/Woman_performing_barbell_hip_thrust_202606110124.mp4'),
    tricdip:     v('female/Woman_performing_tricep_dip_202606110124.mp4'),
    boxjump:     v('female/Woman_performs_box_jump_202606110124.mp4'),
    jumpjack:    v('female/Woman_performing_jumping_jacks_202606110124.mp4'),
    highknees:   v('female/Woman_performing_high_knees_202606110124.mp4'),
  },
};

// ── Exercise move → icon/color map ────────────────────────────
const MOVE_INFO = {
  run:         { icon:'walk-outline',    color:'#2FCFA0' },
  squat:       { icon:'barbell-outline', color:'#C8F135' },
  press:       { icon:'barbell-outline', color:'#4D8DFF' },
  pullup:      { icon:'fitness-outline', color:'#FF9F0A' },
  deadlift:    { icon:'barbell-outline', color:'#C8F135' },
  lunge:       { icon:'walk-outline',    color:'#9B6DFF' },
  burpee:      { icon:'flash-outline',   color:'#FF453A' },
  legraise:    { icon:'body-outline',    color:'#4D8DFF' },
  twist:       { icon:'body-outline',    color:'#2FCFA0' },
  pushup:      { icon:'fitness-outline', color:'#C8F135' },
  climb:       { icon:'walk-outline',    color:'#FF9F0A' },
  jumprope:    { icon:'flash-outline',   color:'#4D8DFF' },
  plank:       { icon:'body-outline',    color:'#9B6DFF' },
  downwarddog: { icon:'body-outline',    color:'#2FCFA0' },
  foamroll:    { icon:'body-outline',    color:'#FF8C42' },
  jumpjack:    { icon:'flash-outline',   color:'#C8F135' },
  highknees:   { icon:'walk-outline',    color:'#FF453A' },
  curl:        { icon:'barbell-outline', color:'#4D8DFF' },
  hipthrust:   { icon:'fitness-outline', color:'#FF6B9D' },
  tricdip:     { icon:'barbell-outline', color:'#9B6DFF' },
  boxjump:     { icon:'flash-outline',   color:'#C8F135' },
};

// ── Paused video thumbnail for exercise list ──────────────────
function ExThumb({ move, gender, accentColor, localUri }) {
  const C    = useC();
  const info = MOVE_INFO[move] || { icon:'barbell-outline', color: accentColor };
  const src  = localUri ? { uri: localUri } : (VIDEOS[gender]?.[move] || VIDEOS['male']?.[move]);
  const accentTextColor = gender === 'female' ? '#000' : C.accentText;

  if (!src) {
    return (
      <View style={{ width:80, height:90, borderRadius:14, overflow:'hidden',
        backgroundColor:`${info.color}18`, borderWidth:1, borderColor:`${info.color}35`,
        alignItems:'center', justifyContent:'center' }}>
        <Ionicons name={info.icon} size={26} color={info.color} />
      </View>
    );
  }
  return (
    <View style={{ width:80, height:90, borderRadius:14, overflow:'hidden', backgroundColor:'#111' }}>
      <Video
        source={src}
        style={{ width:'100%', height:'100%' }}
        resizeMode={ResizeMode.COVER}
        shouldPlay={false}
        isMuted
        isLooping={false}
        positionMillis={300}
      />
      {/* gender pill */}
      <View style={{ position:'absolute', bottom:5, left:5,
        backgroundColor: `${accentColor}D9`,
        borderRadius:6, paddingHorizontal:4, paddingVertical:1 }}>
        <Text style={{ color:accentTextColor, fontSize:8, fontWeight:'900' }}>
          {gender==='female'?'♀':'♂'}
        </Text>
      </View>
    </View>
  );
}

// ── Full-size exercise video player ───────────────────────────
function ExerciseVideo({ src, active, accentColor }) {
  const [ready, setReady] = React.useState(false);
  const readyRef = React.useRef(false);
  React.useEffect(() => { readyRef.current = false; setReady(false); }, [src]);
  const onReady = () => { if (readyRef.current) return; readyRef.current = true; setReady(true); };

  if (!src) {
    return (
      <View style={{ width:200, height:300, borderRadius:14, overflow:'hidden',
        backgroundColor:'#111118', alignItems:'center', justifyContent:'center', gap:12 }}>
        <View style={{ width:80, height:80, borderRadius:40,
          backgroundColor:`${accentColor}20`, alignItems:'center', justifyContent:'center' }}>
          <Ionicons name="barbell-outline" size={40} color={accentColor} />
        </View>
        <Text style={{ color:'rgba(255,255,255,0.3)', fontSize:11 }}>Video unavailable</Text>
      </View>
    );
  }

  return (
    <View style={{ width:200, height:300, borderRadius:14, overflow:'hidden', backgroundColor:'#111118' }}>
      {!ready && (
        <View style={{ position:'absolute', inset:0, alignItems:'center', justifyContent:'center', zIndex:1 }}>
          <ActivityIndicator color={accentColor} size="large" />
        </View>
      )}
      <Video source={src}
        style={{ width:'100%', height:'100%', opacity: ready ? 1 : 0 }}
        resizeMode={ResizeMode.COVER}
        shouldPlay={active} isLooping isMuted
        onReadyForDisplay={onReady}
        onPlaybackStatusUpdate={st => { if (st.isPlaying && !readyRef.current) onReady(); }}
      />
      {active && ready && (
        <View style={{ position:'absolute', top:10, right:12,
          flexDirection:'row', alignItems:'center', gap:5, zIndex:2 }}>
          <View style={{ width:8, height:8, borderRadius:4, backgroundColor:accentColor }} />
          <Text style={{ color:accentColor, fontSize:9, fontWeight:'900', letterSpacing:1 }}>LIVE</Text>
        </View>
      )}
    </View>
  );
}

const makeRt = (C) => StyleSheet.create({wrap:{alignItems:'center',paddingVertical:20},title:{color:C.muted,fontSize:11,fontWeight:'700',letterSpacing:1,marginBottom:8},num:{fontSize:56,fontWeight:'900',marginBottom:12},barBg:{width:'100%',height:6,backgroundColor:C.border,borderRadius:3,overflow:'hidden',marginBottom:16},barFill:{height:'100%',borderRadius:3},skipBtn:{backgroundColor:C.border,borderRadius:10,paddingHorizontal:20,paddingVertical:8},skipTxt:{color:C.muted,fontWeight:'700',fontSize:13}});
const RestTimer = ({ seconds, onDone }) => {
  const C = useC();
  const rt = useMemo(() => makeRt(C), [C]);
  const [left, setLeft] = useState(seconds);
  const prog = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(prog, { toValue:0, duration:seconds*1000, easing:Easing.linear, useNativeDriver:false }).start();
    const t = setInterval(()=>setLeft(p=>{if(p<=1){clearInterval(t);onDone();return 0;}return p-1;}),1000);
    return ()=>clearInterval(t);
  }, []);
  const barW=prog.interpolate({inputRange:[0,1],outputRange:['0%','100%']});
  const color=left>30?C.teal:left>10?C.accent:C.red;
  return (
    <View style={rt.wrap}>
      <Text style={rt.title}>REST TIME</Text>
      <Text style={[rt.num,{color}]}>{left}s</Text>
      <View style={rt.barBg}><Animated.View style={[rt.barFill,{width:barW,backgroundColor:color}]}/></View>
      <TouchableOpacity style={rt.skipBtn} onPress={onDone}><Text style={rt.skipTxt}>Skip Rest →</Text></TouchableOpacity>
    </View>
  );
};

export default function WorkoutDetailScreen({ route, navigation }) {
  const C = useC();
  const s = useMemo(() => makeS(C), [C]);
  const { plan } = route.params;
  const userGender = useAuthStore(st => st.user?.gender);
  // Gender is read-only from profile — no toggle, no cross-gender content
  const gender = (userGender || '').toLowerCase() === 'female' ? 'female' : 'male';
  const [phase,setPhase]=useState('overview');
  const [exIdx,setExIdx]=useState(0);
  const [setNum,setSetNum]=useState(1);
  const [setsDone,setSetsDone]=useState([]);
  const [isResting,setIsResting]=useState(false);
  const [isActive,setIsActive]=useState(false);
  const [curReps,setCurReps]=useState('');
  const [curWeight,setCurWeight]=useState('');
  const [setData,setSetData]=useState({});
  const [totalTime,setTotalTime]=useState(0);
  const [logging,setLogging]=useState(false);
  const [showTips,setShowTips]=useState(false);
  const [suggestion,setSuggestion]=useState(null);
  const timerRef=useRef(null);
  const progressAnim=useRef(new Animated.Value(0)).current;
  const [voiceSpeaking,setVoiceSpeaking]=useState(false);
  const [voiceMsg,setVoiceMsg]=useState('');
  const [voiceEnabled,setVoiceEnabled]=useState(true);
  const voiceEnabledRef=useRef(true);
  useEffect(()=>{voiceEnabledRef.current=voiceEnabled;},[voiceEnabled]);
  // gender is a const derived from profile — keep ref in sync for closures
  const genderRef=useRef(gender);
  genderRef.current=gender;

  const exList=(plan.exercises||[]).map((e)=>{
    if(typeof e==='string'){const found=EXERCISES_JSON.find(x=>x.id===e);return found||{id:e,name:e};}
    return e;
  });
  const exercises=exList.length>0?exList.map((e,i)=>{const name=e.name||`Exercise ${i+1}`;const data=EXERCISE_DATA[name]||{...DEF,move:['run','squat','press','pullup','lunge','burpee','twist','pushup'][i%8]};return{id:e.id||`e${i}`,name,...data};}):Object.entries(EXERCISE_DATA).slice(0,5).map(([name,data],i)=>({id:`e${i}`,name,...data}));
  const curEx=exercises[exIdx]||exercises[0]||DEF;
  const totalSets=exercises.reduce((s,e)=>s+(e.sets||3),0);
  const doneSets=setsDone.length;
  const accentColor=gender==='female'?'#FF6B9D':C.accent;
  // Text on top of accentColor backgrounds — must contrast both lime (dark) and indigo (light)
  const accentTextColor=gender==='female'?'#000':C.accentText;
  // rgba helper for Animated.interpolate color strings (C.accent is always a 6-digit hex)
  const _ah=C.accent.slice(1);
  const accentRgb=`${parseInt(_ah.slice(0,2),16)},${parseInt(_ah.slice(2,4),16)},${parseInt(_ah.slice(4,6),16)}`;

  // ── Download for offline ────────────────────────────────────────────────
  const [dlStatus,setDlStatus]=useState({});   // exName -> 'idle'|'downloading'|'done'|'error'
  // Returns local URI if downloaded, else Supabase URI
  const getVideoSrc = (move, exName) => {
    const fn = EXERCISE_VIDEO[gender]?.[exName];
    if (fn && dlStatus[exName] === 'done') return { uri: DL_DIR + fn };
    return VIDEOS[gender]?.[move] || VIDEOS['male']?.[move];
  };
  const [dlProgress,setDlProgress]=useState({}); // exName -> 0..1
  const [isDownloading,setIsDownloading]=useState(false);
  const dlGlow=useRef(new Animated.Value(0)).current;

  useEffect(()=>{
    (async()=>{
      try{
        await FileSystem.makeDirectoryAsync(DL_DIR,{intermediates:true});
        const map={};
        for(const ex of exercises){
          const fn=EXERCISE_VIDEO[gender]?.[ex.name];
          if(!fn)continue;
          const info=await FileSystem.getInfoAsync(DL_DIR+fn);
          map[ex.name]=info.exists?'done':'idle';
        }
        setDlStatus(map);
      }catch(_){}
    })();
  },[]);

  useEffect(()=>{
    const downloadable=exercises.filter(ex=>EXERCISE_VIDEO[gender]?.[ex.name]);
    const allDone=downloadable.length>0&&downloadable.every(ex=>dlStatus[ex.name]==='done');
    if(isDownloading||allDone||downloadable.length===0)return;
    const loop=Animated.loop(Animated.sequence([
      Animated.timing(dlGlow,{toValue:1,duration:950,useNativeDriver:false}),
      Animated.timing(dlGlow,{toValue:0,duration:950,useNativeDriver:false}),
    ]));
    loop.start();
    return()=>loop.stop();
  },[isDownloading,dlStatus]);

  const downloadWorkout=async()=>{
    if(isDownloading)return;
    setIsDownloading(true);
    const pending=exercises.filter(ex=>{
      const fn=EXERCISE_VIDEO[gender]?.[ex.name];
      return fn&&dlStatus[ex.name]!=='done';
    });
    for(const ex of pending){
      const fn=EXERCISE_VIDEO[gender][ex.name];
      const url=`${SB_VID}/${gender}/${fn}`;
      const dest=DL_DIR+fn;
      setDlStatus(p=>({...p,[ex.name]:'downloading'}));
      setDlProgress(p=>({...p,[ex.name]:0}));
      try{
        const dl=FileSystem.createDownloadResumable(url,dest,{},(prog)=>{
          const pct=prog.totalBytesExpectedToWrite>0?prog.totalBytesWritten/prog.totalBytesExpectedToWrite:0;
          setDlProgress(p=>({...p,[ex.name]:pct}));
        });
        await dl.downloadAsync();
        setDlStatus(p=>({...p,[ex.name]:'done'}));
      }catch(_){
        setDlStatus(p=>({...p,[ex.name]:'error'}));
      }
    }
    setIsDownloading(false);
  };
  // ────────────────────────────────────────────────────────────────────────

  useEffect(()=>{if(phase!=='workout')return;timerRef.current=setInterval(()=>setTotalTime(p=>p+1),1000);return()=>clearInterval(timerRef.current);},[phase]);
  useEffect(()=>{Animated.timing(progressAnim,{toValue:totalSets>0?doneSets/totalSets:0,duration:400,useNativeDriver:false}).start();},[doneSets]);

  useEffect(()=>{
    if(phase!=='workout')return;
    let alive=true;
    setSuggestion(null);
    workoutAPI.getProgressionSuggestion(curEx.id,curEx.sets||3,curEx.reps||0)
      .then(r=>{if(alive)setSuggestion(r);})
      .catch(()=>{});
    return()=>{alive=false;};
  },[curEx.id,phase]);

  // Speak exercise intro whenever we move to a new exercise during workout
  useEffect(()=>{
    if(phase!=='workout')return;
    if(!voiceEnabledRef.current)return;
    const text=buildWorkoutLine('exercise_intro',{
      exerciseName:curEx.name,muscle:curEx.muscle,gender:genderRef.current,
    });
    if(!text)return;
    // slight delay so UI settles first
    const t=setTimeout(()=>{
      setVoiceMsg(text);
      speakAsAgent(text,genderRef.current,{
        onStart:()=>setVoiceSpeaking(true),
        onEnd:()=>setVoiceSpeaking(false),
      });
    },400);
    return()=>clearTimeout(t);
  },[exIdx,phase]);

  // Stop audio when leaving screen or workout ends
  useEffect(()=>{
    if(phase==='complete'||phase==='overview') stopAgent();
  },[phase]);

  const fmtTime=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const fmtSuggestion=(sg)=>{
    if(!sg||sg.type==='baseline')return null;
    const bw=!sg.lastWeight;
    if(sg.type==='increase')return bw
      ?`Last: ${sg.lastReps} reps → try ${sg.suggestedReps} today ↑`
      :`Last: ${curEx.sets}×${sg.lastWeight}kg → try ${curEx.sets}×${sg.suggestedWeight}kg today ↑`;
    if(sg.type==='deload')return bw
      ?`Tough 2 sessions — try ${sg.suggestedReps} reps today ↓`
      :`Tough 2 sessions — try ${sg.suggestedWeight}kg today (−10%) ↓`;
    return bw
      ?`Last: ${sg.lastReps} reps — keep it up`
      :`Last: ${curEx.sets}×${sg.lastWeight}kg — keep it up`;
  };
  const sgText=fmtSuggestion(suggestion);
  const sgColor=!suggestion?C.muted:suggestion.type==='increase'?C.teal:suggestion.type==='deload'?(C.red||'#FF5A5A'):C.muted;
  const handleStartSet=()=>{
    const key=`${curEx.id}_${setNum}`;
    const existing=setData[key];
    if(existing){setCurReps(existing.reps);setCurWeight(existing.weight);}
    else{const prev=setData[`${curEx.id}_${setNum-1}`];setCurReps(String(curEx.reps||0));setCurWeight(prev?.weight||'');}
    setIsActive(true);
    if(voiceEnabledRef.current){
      const isLast=setNum>=curEx.sets;
      const ev=isLast?'last_set':'set_start';
      const text=buildWorkoutLine(ev,{exerciseName:curEx.name,setNum,totalSets:curEx.sets,gender:genderRef.current});
      if(text){setVoiceMsg(text);speakAsAgent(text,genderRef.current,{onStart:()=>setVoiceSpeaking(true),onEnd:()=>setVoiceSpeaking(false)});}
    }
  };
  const handleCompleteSet=()=>{
    const reps=parseFloat(curReps);
    const weight=parseFloat(curWeight||'0');
    if(isNaN(reps)||reps<0){Alert.alert('Invalid reps','Enter a valid rep count (≥ 0).');return;}
    const w=(!isNaN(weight)&&weight>=0)?weight:0;
    const key=`${curEx.id}_${setNum}`;
    setSetData(p=>({...p,[key]:{reps:String(Math.round(reps)),weight:String(w),done:true}}));
    setSetsDone(p=>[...p,{exIdx,exName:curEx.name,set:setNum,reps:Math.round(reps),weight:w}]);
    setIsActive(false);
    setIsResting(true);
    if(voiceEnabledRef.current){
      const text=buildWorkoutLine('set_done',{exerciseName:curEx.name,setNum,totalSets:curEx.sets,gender:genderRef.current});
      if(text){setVoiceMsg(text);speakAsAgent(text,genderRef.current,{onStart:()=>setVoiceSpeaking(true),onEnd:()=>setVoiceSpeaking(false)});}
    }
  };
  const handleRestDone=()=>{
    setIsResting(false);
    const n=setNum+1;
    if(n>curEx.sets){
      const nx=exIdx+1;
      if(nx>=exercises.length){
        setPhase('complete');
        if(voiceEnabledRef.current){
          const text=buildWorkoutLine('workout_done',{planName:plan.name,doneSets:setsDone.length+1,totalTime,gender:genderRef.current});
          if(text){setVoiceMsg(text);speakAsAgent(text,genderRef.current,{onStart:()=>setVoiceSpeaking(true),onEnd:()=>setVoiceSpeaking(false)});}
        }
      }else{
        setExIdx(nx);
        setSetNum(1);
        // exercise_intro spoken by the useEffect on exIdx
      }
    }else{
      setSetNum(n);
      if(voiceEnabledRef.current){
        const text=buildWorkoutLine('rest_end',{gender:genderRef.current});
        if(text){setVoiceMsg(text);speakAsAgent(text,genderRef.current,{onStart:()=>setVoiceSpeaking(true),onEnd:()=>setVoiceSpeaking(false)});}
      }
    }
  };
  const handleSave=async()=>{
    setLogging(true);
    try{
      const {data:{data:logRow}}=await workoutAPI.logWorkout({
        plan_id:plan.id,name:plan.name,category:plan.category,
        started_at:new Date(Date.now()-totalTime*1000).toISOString(),
        ended_at:new Date().toISOString(),
        duration_min:Math.round(totalTime/60),
        calories_burned:plan.calories||Math.round(totalTime/60*8),
        notes:`${doneSets} sets. ${gender}.`,rating:5,
      });
      const setRows=[];
      exercises.forEach(ex=>{
        for(let sn=1;sn<=(ex.sets||3);sn++){
          const entry=setData[`${ex.id}_${sn}`];
          if(entry?.done){
            const reps=parseFloat(entry.reps);
            const weight=parseFloat(entry.weight||'0');
            if(!isNaN(reps)&&reps>=0){
              setRows.push({exercise_id:ex.id,exercise_name:ex.name,set_number:sn,reps:Math.round(reps),weight_kg:(!isNaN(weight)&&weight>=0)?weight:0,completed:true});
            }
          }
        }
      });
      if(setRows.length>0)await workoutAPI.logSetsBatch(logRow.id,setRows);
      Alert.alert('Saved','Workout logged.');
    }catch(e){
      Alert.alert('Error',e.message||'Could not save workout.');
    }finally{setLogging(false);navigation.goBack();}
  };

  const progWidth=progressAnim.interpolate({inputRange:[0,1],outputRange:['0%','100%']});

  if(phase==='overview') return (
    <SafeAreaView style={s.root}>
      {/* back button */}
      <TouchableOpacity onPress={()=>navigation.goBack()} style={s.overviewBack} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={22} color={C.text} />
      </TouchableOpacity>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <View style={s.heroIcon}>
            <Image
              source={imgSrc(getHeroImg(plan, gender==='female'))}
              style={{ width:'100%', height:'100%', borderRadius:22 }}
              resizeMode="cover"
            />
            <View style={{ position:'absolute', bottom:4, right:4, backgroundColor: `${accentColor}EB`, borderRadius:6, paddingHorizontal:5, paddingVertical:2 }}>
              <Text style={{ color:accentTextColor, fontSize:9, fontWeight:'900' }}>{gender==='female'?'♀':'♂'}</Text>
            </View>
          </View>
          <Text style={s.heroTitle}>{plan.name}</Text>
          <View style={s.heroMeta}>
            {[[`${plan.duration_min}m`,'time-outline'],[`${plan.calories}kcal`,'flame-outline'],[plan.difficulty,'stats-chart-outline'],[`${exercises.length}ex`,'barbell-outline']].map(([v,ion])=>(
              <View key={v} style={s.metaPill}>
                <Ionicons name={ion} size={13} color={C.muted} />
                <Text style={s.metaTxt}>{v}</Text>
              </View>
            ))}
          </View>
        </View>
        {/* ── Download for offline section ── */}
        {(()=>{
          const downloadable=exercises.filter(ex=>EXERCISE_VIDEO[gender]?.[ex.name]);
          if(downloadable.length===0)return null;
          const doneCount=downloadable.filter(ex=>dlStatus[ex.name]==='done').length;
          const allDone=doneCount===downloadable.length;
          const glowBorder=dlGlow.interpolate({inputRange:[0,1],outputRange:[`rgba(${accentRgb},0.25)`,`rgba(${accentRgb},1)`]});
          return(
            <View style={[s.section,{paddingBottom:4}]}>
              <Text style={s.secLabel}>OFFLINE DOWNLOAD</Text>
              <View style={{backgroundColor:C.card,borderRadius:16,borderWidth:1,borderColor:C.border,padding:14}}>
                <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <View>
                    <Text style={{color:C.text,fontSize:14,fontWeight:'800'}}>{allDone?'Available Offline':'Download for Offline'}</Text>
                    <Text style={{color:C.muted,fontSize:11,marginTop:2}}>{doneCount}/{downloadable.length} videos ready</Text>
                  </View>
                  {allDone&&(
                    <View style={{backgroundColor:`${accentColor}22`,borderRadius:8,paddingHorizontal:10,paddingVertical:4,borderWidth:1,borderColor:`${accentColor}44`}}>
                      <Text style={{color:accentColor,fontSize:10,fontWeight:'800'}}>OFFLINE READY</Text>
                    </View>
                  )}
                </View>
                {/* progress bar */}
                {doneCount>0&&(
                  <View style={{height:4,backgroundColor:C.border,borderRadius:2,marginBottom:10,overflow:'hidden'}}>
                    <View style={{height:'100%',width:`${(doneCount/downloadable.length)*100}%`,backgroundColor:accentColor,borderRadius:2}}/>
                  </View>
                )}
                {/* per-exercise rows */}
                {downloadable.map(ex=>(
                  <View key={ex.name} style={{flexDirection:'row',alignItems:'center',paddingVertical:7,borderBottomWidth:0.5,borderColor:C.border}}>
                    <Text style={{flex:1,color:C.text,fontSize:12,fontWeight:'600'}}>{ex.name}</Text>
                    {dlStatus[ex.name]==='done'?(
                      <Ionicons name="checkmark-circle" size={18} color={accentColor}/>
                    ):dlStatus[ex.name]==='downloading'?(
                      <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                        <Text style={{color:accentColor,fontSize:10,fontWeight:'700'}}>{Math.round((dlProgress[ex.name]||0)*100)}%</Text>
                        <ActivityIndicator size="small" color={accentColor}/>
                      </View>
                    ):dlStatus[ex.name]==='error'?(
                      <Ionicons name="alert-circle-outline" size={18} color="#FF5555"/>
                    ):(
                      <Ionicons name="cloud-download-outline" size={18} color={C.muted}/>
                    )}
                  </View>
                ))}
                {/* glow download button */}
                {!allDone&&(
                  <Animated.View style={{marginTop:14,borderRadius:12,borderWidth:1.5,borderColor:glowBorder}}>
                    <TouchableOpacity
                      style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,paddingVertical:13}}
                      onPress={downloadWorkout}
                      disabled={isDownloading}
                      activeOpacity={0.75}
                    >
                      {isDownloading?(
                        <>
                          <ActivityIndicator size="small" color={accentColor}/>
                          <Text style={{color:accentColor,fontSize:13,fontWeight:'800'}}>DOWNLOADING...</Text>
                        </>
                      ):(
                        <>
                          <Ionicons name="download-outline" size={17} color={accentColor}/>
                          <Text style={{color:accentColor,fontSize:13,fontWeight:'800'}}>DOWNLOAD WORKOUT</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                )}
              </View>
            </View>
          );
        })()}
        {/* ── end download section ── */}
        <View style={s.section}>
          <Text style={s.secLabel}>EXERCISES</Text>
          {exercises.map((ex,i)=>(
            <TouchableOpacity key={ex.id} style={s.exRow} onPress={() => { setExIdx(i); setSetNum(1); setPhase('workout'); }} activeOpacity={0.7}>
              <View style={s.exNum}><Text style={s.exNumTxt}>{i+1}</Text></View>
              <ExThumb
                move={ex.move||'squat'}
                gender={gender}
                accentColor={accentColor}
                localUri={dlStatus[ex.name]==='done' && EXERCISE_VIDEO[gender]?.[ex.name] ? DL_DIR+EXERCISE_VIDEO[gender][ex.name] : null}
              />
              <View style={{flex:1}}>
                <Text style={s.exName}>{ex.name}</Text>
                <Text style={s.exMeta}>{ex.sets||3} sets × {ex.reps||12} reps</Text>
                <Text style={s.exMuscle}>{ex.muscle||'Full Body'}</Text>
              </View>
              {dlStatus[ex.name]==='done'&&(
                <Ionicons name="checkmark-circle" size={16} color={accentColor} style={{marginLeft:4}}/>
              )}
            </TouchableOpacity>
          ))}
        </View>
        <View style={{height:100}}/>
      </ScrollView>
      <View style={s.startWrap}>
        <TouchableOpacity style={[s.bigBtn,{backgroundColor:accentColor,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:8}]} onPress={()=>{setPhase('workout');if(voiceEnabledRef.current){const t=buildWorkoutLine('workout_start',{planName:plan.name,gender:genderRef.current});if(t){setVoiceMsg(t);speakAsAgent(t,genderRef.current,{onStart:()=>setVoiceSpeaking(true),onEnd:()=>setVoiceSpeaking(false)});}}}}>
          <Ionicons name="play" size={16} color={accentTextColor} />
          <Text style={[s.bigBtnTxt,{color:accentTextColor}]}>START WORKOUT</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  if(phase==='complete') return (
    <SafeAreaView style={[s.root,{alignItems:'center',justifyContent:'center',padding:24}]}>
      <Ionicons name="trophy" size={64} color={accentColor} style={{marginBottom:12}} />
      <Text style={[s.heroTitle,{fontSize:24,textAlign:'center',marginBottom:8}]}>WORKOUT COMPLETE!</Text>
      <Text style={{color:C.muted,fontSize:14,textAlign:'center',marginBottom:24}}>Great job finishing {plan.name}!</Text>
      <View style={s.completeStats}>
        {[['time-outline',fmtTime(totalTime),'Time'],['checkmark-circle-outline',`${doneSets}`,'Sets'],['flame-outline',`~${Math.round(totalTime/60*8)}`,'Kcal']].map(([ion,val,lbl])=>(
          <View key={lbl} style={s.completeStat}>
            <Ionicons name={ion} size={22} color={accentColor} style={{marginBottom:4}} />
            <Text style={[s.completeStatVal,{color:accentColor}]}>{val}</Text>
            <Text style={s.completeStatLbl}>{lbl}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity style={[s.bigBtn,{backgroundColor:accentColor,width:'100%'}]} onPress={handleSave} disabled={logging}>
        <Text style={[s.bigBtnTxt,{color:accentTextColor}]}>{logging?'Saving...':'SAVE WORKOUT'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[s.bigBtn,{backgroundColor:C.border,marginTop:10,width:'100%'}]} onPress={()=>navigation.goBack()}>
        <Text style={[s.bigBtnTxt,{color:C.text}]}>Go Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.root}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={()=>Alert.alert('Quit?','End workout?',[{text:'Keep Going',style:'cancel'},{text:'Quit',style:'destructive',onPress:()=>navigation.goBack()}])} style={s.quitBtn}><Ionicons name="close" size={20} color={C.muted} /></TouchableOpacity>
        <View style={{flex:1,marginHorizontal:12}}>
          <View style={s.progBg}><Animated.View style={[s.progFill,{width:progWidth,backgroundColor:accentColor}]}/></View>
          <Text style={s.progTxt}>{doneSets} / {totalSets} sets</Text>
        </View>
        <View style={s.timerBox}><Text style={[s.timerTxt,{color:accentColor}]}>{fmtTime(totalTime)}</Text></View>
        <TouchableOpacity onPress={()=>setVoiceEnabled(v=>{voiceEnabledRef.current=!v;if(!voiceEnabledRef.current)stopAgent();return!v;})} style={[s.voiceToggle,{backgroundColor:voiceEnabled?`${accentColor}22`:C.border}]}>
          <Ionicons name={voiceEnabled?'volume-high':'volume-mute'} size={17} color={voiceEnabled?accentColor:C.muted}/>
        </TouchableOpacity>
      </View>
      {voiceEnabled&&<VoiceCoach gender={gender} speaking={voiceSpeaking} message={voiceMsg} C={C}/>}
      <ScrollView style={{flex:1}} contentContainerStyle={{padding:16,paddingBottom:100}} showsVerticalScrollIndicator={false}>
        <View style={s.exHeader}>
          <View style={{flex:1}}>
            <Text style={s.stepLbl}>EXERCISE {exIdx+1} OF {exercises.length}</Text>
            <Text style={s.activeExName}>{curEx.name}</Text>
            <Text style={s.activeMuscle}>{curEx.muscle}</Text>
          </View>
          <TouchableOpacity style={[s.tipsBtn,{borderColor:accentColor,backgroundColor:`${accentColor}15`,flexDirection:'row',alignItems:'center',gap:4}]} onPress={()=>setShowTips(true)}>
            <Ionicons name="bulb-outline" size={13} color={accentColor} />
            <Text style={[s.tipsBtnTxt,{color:accentColor}]}>Tips</Text>
          </TouchableOpacity>
        </View>

        <View style={[s.figPanel,{borderColor:`${accentColor}35`}]}>
          <View style={[s.figStage,{backgroundColor:'#0A0A0F'}]}>
            <View style={s.setBadge}><Text style={s.setBadgeTxt}>{curEx.sets}×{curEx.reps===0?'∞':curEx.reps}</Text></View>
            <ExerciseVideo src={getVideoSrc(curEx.move||'squat', curEx.name)} active={isActive} accentColor={accentColor} />
          </View>
          <View style={s.setDots}>
            {Array.from({length:curEx.sets||3}).map((_,i)=>{const done=i<setNum-1,curr=i===setNum-1;return <View key={i} style={[s.dot,done&&{backgroundColor:C.teal,borderColor:C.teal},curr&&{backgroundColor:accentColor,borderColor:accentColor}]}>{done&&<Ionicons name="checkmark" size={8} color={C.bg} />}{curr&&<Text style={{fontSize:8,color:accentTextColor,fontWeight:'900'}}>{setNum}</Text>}</View>;})}
          </View>
          <Text style={s.figStatus}>{isResting?'Resting...':isActive?'Set in progress':'Ready'}</Text>
        </View>

        {sgText&&<View style={[s.sgBanner,{borderColor:sgColor}]}><Text style={[s.sgTxt,{color:sgColor}]}>{sgText}</Text></View>}

        <View style={s.setCard}>
          <View style={s.setCardRow}>
            {[['SET',`${setNum}/${curEx.sets}`],[curEx.isTime?'TIME':'REPS',`${curEx.reps}${curEx.isTime?'s':''}`],['REST',`${curEx.rest}s`]].map(([lbl,val],i,arr)=>(
              <React.Fragment key={lbl}>
                <View style={s.setInfo}><Text style={s.setInfoLbl}>{lbl}</Text><Text style={[s.setInfoVal,i===0&&{color:accentColor}]}>{val}</Text></View>
                {i<arr.length-1&&<View style={s.setDiv}/>}
              </React.Fragment>
            ))}
          </View>
        </View>

        {isResting?<RestTimer seconds={curEx.rest} onDone={handleRestDone}/>
        :isActive?(<>
          <View style={[s.inputRow,{borderColor:C.border}]}>
            <View style={s.inputBox}>
              <Text style={[s.inputLbl,{color:C.dim}]}>REPS</Text>
              <TextInput
                style={[s.numInput,{color:C.text,borderColor:accentColor}]}
                value={curReps}
                onChangeText={setCurReps}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={C.dim}
                selectTextOnFocus
              />
            </View>
            <View style={[s.inputDivider,{backgroundColor:C.border}]}/>
            <View style={s.inputBox}>
              <Text style={[s.inputLbl,{color:C.dim}]}>WEIGHT (kg)</Text>
              <TextInput
                style={[s.numInput,{color:C.text,borderColor:C.border}]}
                value={curWeight}
                onChangeText={setCurWeight}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={C.dim}
                selectTextOnFocus
              />
            </View>
          </View>
          <TouchableOpacity style={[s.actionBtn,{borderColor:C.teal,backgroundColor:'rgba(47,207,160,0.1)',flexDirection:'row',justifyContent:'center',alignItems:'center',gap:7}]} onPress={handleCompleteSet}>
            <Ionicons name="checkmark-circle" size={16} color={C.teal} />
            <Text style={[s.actionBtnTxt,{color:C.teal}]}>Set Done →</Text>
          </TouchableOpacity>
        </>)
        :<TouchableOpacity style={[s.bigBtn,{backgroundColor:accentColor,marginBottom:10,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:7}]} onPress={handleStartSet}>
          <Ionicons name="play" size={15} color={accentTextColor} />
          <Text style={[s.bigBtnTxt,{color:accentTextColor}]}>Start Set {setNum}</Text>
        </TouchableOpacity>}

        {setsDone.length>0&&<View style={s.logSec}><Text style={s.secLabel}>COMPLETED</Text>{setsDone.slice(-4).reverse().map((d,i)=><View key={i} style={s.logRow}><Ionicons name="checkmark-circle" size={14} color={C.teal} /><Text style={s.logTxt}>{d.exName} — Set {d.set} — {d.reps} reps{d.weight>0?` @ ${d.weight}kg`:''}</Text></View>)}</View>}
      </ScrollView>

      <Modal visible={showTips} transparent animationType="slide">
        <View style={s.tipsModalBg}>
          <View style={s.tipsModalCard}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:8}}>
              {/* Video */}
              <View style={[s.tipsModalFig,{backgroundColor:'#0A0A0F'}]}>
                <ExerciseVideo src={getVideoSrc(curEx.move||'squat', curEx.name)} active={true} accentColor={accentColor} />
              </View>

              {/* Title + muscle */}
              <Text style={s.tipTitle}>{curEx.name}</Text>
              <Text style={s.tipMuscle}>{curEx.muscle}</Text>

              {/* Set plan card */}
              <View style={[s.tipPlanCard,{borderColor:`${accentColor}40`,backgroundColor:`${accentColor}10`}]}>
                <View style={s.tipPlanRow}>
                  {[['SETS',`${curEx.sets}`],['REPS',curEx.reps===0?'Timed':`${curEx.reps}`],['REST',`${curEx.rest}s`]].map(([lbl,val],i,arr)=>(
                    <React.Fragment key={lbl}>
                      <View style={s.tipPlanItem}>
                        <Text style={[s.tipPlanVal,{color:accentColor}]}>{val}</Text>
                        <Text style={s.tipPlanLbl}>{lbl}</Text>
                      </View>
                      {i<arr.length-1&&<View style={s.tipPlanDiv}/>}
                    </React.Fragment>
                  ))}
                </View>
                <Text style={s.tipPlanNote}>
                  {curEx.reps===0
                    ? `Do ${curEx.sets} sets — rest ${curEx.rest}s between each set`
                    : `Do ${curEx.reps} reps per set × ${curEx.sets} sets — rest ${curEx.rest}s between sets`}
                </Text>
              </View>

              {/* How to do it */}
              <Text style={s.tipSectionLabel}>HOW TO DO IT</Text>
              {(curEx.steps||[]).map((step,i)=>(
                <View key={i} style={s.tipRow}>
                  <View style={[s.tipBullet,{backgroundColor:accentColor}]}>
                    <Text style={{color:accentTextColor,fontSize:10,fontWeight:'900'}}>{i+1}</Text>
                  </View>
                  <Text style={s.tipTxt}>{step}</Text>
                </View>
              ))}

              {/* Form tips */}
              <Text style={[s.tipSectionLabel,{marginTop:14}]}>FORM TIPS</Text>
              {(curEx.tips||[]).map((tip,i)=>(
                <View key={i} style={s.tipRow}>
                  <Text style={[s.tipBulletDot,{color:accentColor}]}>◆</Text>
                  <Text style={s.tipTxt}>{tip}</Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={[s.bigBtn,{backgroundColor:accentColor,marginTop:12}]} onPress={()=>setShowTips(false)}>
              <Text style={[s.bigBtnTxt,{color:accentTextColor}]}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeS=(C)=>StyleSheet.create({
  root:{flex:1,backgroundColor:C.bg},
  voiceToggle:{width:36,height:36,borderRadius:18,alignItems:'center',justifyContent:'center'},
  overviewBack:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center',marginLeft:12,marginTop:8},
  hero:{alignItems:'center',paddingVertical:18,borderBottomWidth:1,borderColor:C.border},
  heroIcon:{width:82,height:82,borderRadius:22,backgroundColor:C.accentDim,alignItems:'center',justifyContent:'center',marginBottom:10,overflow:'hidden'},
  heroTitle:{color:C.text,fontSize:22,fontWeight:'900',marginBottom:10},
  heroMeta:{flexDirection:'row',flexWrap:'wrap',gap:8,justifyContent:'center'},
  metaPill:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:C.card,borderRadius:12,paddingHorizontal:12,paddingVertical:6,borderWidth:1,borderColor:C.border},
  metaTxt:{color:C.text,fontSize:11,fontWeight:'600',textTransform:'capitalize'},
  section:{padding:16},
  secLabel:{color:C.dim,fontSize:10,fontWeight:'700',letterSpacing:1,marginBottom:12,textTransform:'uppercase'},
  exRow:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:C.card,borderRadius:16,borderWidth:1,borderColor:C.border,padding:10,marginBottom:10},
  exNum:{width:26,height:26,borderRadius:13,backgroundColor:C.accentDim,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.accent},
  exNumTxt:{color:C.accent,fontSize:11,fontWeight:'900'},
  exName:{color:C.text,fontSize:13,fontWeight:'700',marginBottom:2},
  exMeta:{color:C.muted,fontSize:11,marginBottom:2},
  exMuscle:{color:C.dim,fontSize:10},
  startWrap:{padding:16,borderTopWidth:1,borderColor:C.border},
  bigBtn:{borderRadius:16,paddingVertical:16,alignItems:'center'},
  bigBtnTxt:{fontSize:15,fontWeight:'900',letterSpacing:0.5},
  completeStats:{flexDirection:'row',gap:12,marginBottom:22},
  completeStat:{backgroundColor:C.card,borderRadius:16,padding:14,alignItems:'center',flex:1,borderWidth:1,borderColor:C.border},
  completeStatVal:{fontSize:20,fontWeight:'900',marginBottom:2},
  completeStatLbl:{color:C.muted,fontSize:10,textAlign:'center'},
  topBar:{flexDirection:'row',alignItems:'center',padding:12,paddingHorizontal:16,borderBottomWidth:1,borderColor:C.border},
  quitBtn:{width:34,height:34,borderRadius:17,backgroundColor:C.card,borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center'},
  quitTxt:{color:C.muted,fontSize:14,fontWeight:'700'},
  progBg:{height:5,backgroundColor:C.border,borderRadius:3,overflow:'hidden',marginBottom:3},
  progFill:{height:'100%',borderRadius:3},
  progTxt:{color:C.muted,fontSize:10,textAlign:'center'},
  timerBox:{backgroundColor:C.card,borderRadius:10,paddingHorizontal:10,paddingVertical:5,borderWidth:1,borderColor:C.border},
  timerTxt:{fontSize:14,fontWeight:'900'},
  exHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12},
  stepLbl:{color:C.dim,fontSize:10,fontWeight:'700',letterSpacing:1,marginBottom:4},
  activeExName:{color:C.text,fontSize:22,fontWeight:'900',marginBottom:4},
  activeMuscle:{color:C.muted,fontSize:12},
  tipsBtn:{borderRadius:10,borderWidth:1,paddingHorizontal:12,paddingVertical:7},
  tipsBtnTxt:{fontSize:12,fontWeight:'700'},
  figPanel:{backgroundColor:C.card,borderRadius:20,borderWidth:1.5,padding:12,marginBottom:14,alignItems:'center'},
  figStage:{width:200,height:300,borderRadius:14,alignItems:'center',justifyContent:'center',marginBottom:10,position:'relative'},
  setBadge:{position:'absolute',top:8,left:10,backgroundColor:'rgba(0,0,0,0.65)',borderRadius:8,paddingHorizontal:8,paddingVertical:3,zIndex:10},
  setBadgeTxt:{color:'#fff',fontSize:13,fontWeight:'900'},
  setDots:{flexDirection:'row',gap:8,flexWrap:'wrap',justifyContent:'center',marginBottom:6},
  dot:{width:28,height:28,borderRadius:14,backgroundColor:C.border,borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center'},
  figStatus:{color:C.muted,fontSize:12,fontWeight:'600'},
  setCard:{backgroundColor:C.card2,borderRadius:16,borderWidth:1,borderColor:C.border,padding:16,marginBottom:14},
  setCardRow:{flexDirection:'row',justifyContent:'space-around',alignItems:'center'},
  setInfo:{alignItems:'center'},
  setInfoLbl:{color:C.dim,fontSize:10,fontWeight:'700',letterSpacing:1,marginBottom:4},
  setInfoVal:{color:C.text,fontSize:22,fontWeight:'900'},
  setDiv:{width:1,height:40,backgroundColor:C.border},
  sgBanner:{borderRadius:8,borderWidth:1,paddingHorizontal:12,paddingVertical:6,marginBottom:10,alignSelf:'flex-start'},
  sgTxt:{fontSize:11,fontWeight:'700'},
  inputRow:{flexDirection:'row',alignItems:'center',backgroundColor:C.card,borderRadius:16,borderWidth:1,marginBottom:12,overflow:'hidden'},
  inputBox:{flex:1,alignItems:'center',paddingVertical:16,paddingHorizontal:8},
  inputLbl:{fontSize:10,fontWeight:'700',letterSpacing:1,marginBottom:6},
  numInput:{fontSize:36,fontWeight:'900',textAlign:'center',borderBottomWidth:2,paddingBottom:4,minWidth:80},
  inputDivider:{width:1,height:72,alignSelf:'center'},
  actionBtn:{backgroundColor:C.card,borderRadius:14,paddingVertical:14,alignItems:'center',borderWidth:1,marginBottom:10},
  actionBtnTxt:{fontSize:15,fontWeight:'800'},
  logSec:{marginTop:8},
  logRow:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:6,borderBottomWidth:0.5,borderColor:C.border},
  logTxt:{color:C.muted,fontSize:12},
  tipsModalBg:{flex:1,backgroundColor:'rgba(0,0,0,0.78)',justifyContent:'flex-end'},
  tipsModalCard:{backgroundColor:C.card2,borderTopLeftRadius:24,borderTopRightRadius:24,padding:24,borderTopWidth:1,borderColor:C.border},
  tipsModalFig:{alignItems:'center',marginBottom:12,borderRadius:16,paddingVertical:6},
  tipTitle:{color:C.text,fontSize:20,fontWeight:'900',marginBottom:4},
  tipMuscle:{color:C.muted,fontSize:13,marginBottom:12},
  tipPlanCard:{borderRadius:14,borderWidth:1.5,padding:14,marginBottom:16},
  tipPlanRow:{flexDirection:'row',justifyContent:'space-around',alignItems:'center',marginBottom:10},
  tipPlanItem:{alignItems:'center'},
  tipPlanVal:{fontSize:22,fontWeight:'900',marginBottom:2},
  tipPlanLbl:{color:C.dim,fontSize:10,fontWeight:'700',letterSpacing:1},
  tipPlanDiv:{width:1,height:36,backgroundColor:C.border},
  tipPlanNote:{color:C.muted,fontSize:12,textAlign:'center',lineHeight:17},
  tipSectionLabel:{color:C.dim,fontSize:10,fontWeight:'700',letterSpacing:1.5,marginBottom:10,textTransform:'uppercase'},
  tipRow:{flexDirection:'row',alignItems:'flex-start',gap:10,marginBottom:10},
  tipBullet:{width:22,height:22,borderRadius:11,alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1},
  tipBulletDot:{fontSize:10,flexShrink:0,marginTop:4,width:22,textAlign:'center'},
  tipTxt:{color:C.text,fontSize:13,flex:1,lineHeight:20},
});
