const SB = 'https://nlzuqzkxtmqabmwkggpy.supabase.co/storage/v1/object/public/exercise-videos/female';
const fv = (f) => ({ uri: `${SB}/${f}` });

// ─────────────────────────────────────────────────────────────────────────────
//  YOGA POSES
// ─────────────────────────────────────────────────────────────────────────────
export const POSES = [
  // ── Original 12 ────────────────────────────────────────────────────────────
  { id: 'cobra',    label: 'Cobra Pose',      dur: '8 min',  reps: '3 sets × 30 sec',      calories: 45,  level: 'Beginner',
    benefits: ['Spine Flexibility', 'Chest Opening', 'Stress Relief'],
    tips: 'Keep your elbows slightly bent. Press the tops of your feet and thighs into the mat. Breathe deeply and hold.',
    src: fv('Woman_doing_Cobra_Pose_202606182200.mp4') },

  { id: 'backbend', label: 'Deep Backbend',   dur: '6 min',  reps: '3 sets × 20 sec',      calories: 38,  level: 'Intermediate',
    benefits: ['Spine Stretch', 'Hip Flexors', 'Better Posture'],
    tips: 'Engage your core before bending. Keep your neck neutral. Breathe slowly and avoid rushing the stretch.',
    src: fv('Woman_doing_deep_backbend_202606182201.mp4') },

  { id: 'happy',    label: 'Happy Baby',      dur: '8 min',  reps: '2 sets × 45 sec',      calories: 30,  level: 'Beginner',
    benefits: ['Hip Opening', 'Lower Back Relief', 'Calming'],
    tips: 'Grab your feet from the outer edges. Rock side to side gently to massage the spine. Keep shoulders flat.',
    src: fv('Woman_doing_Happy_Baby_Pose_202606182201.mp4') },

  { id: 'twist',    label: 'Supine Twist',    dur: '10 min', reps: '2 sets × 30 sec/side', calories: 35,  level: 'Beginner',
    benefits: ['Spinal Detox', 'Digestion', 'Back Pain Relief'],
    tips: 'Keep both shoulders flat on the ground. Extend the top arm out. Breathe into the rotation and deepen with each exhale.',
    src: fv('Woman_doing_supine_twist_202606182201.mp4') },

  { id: 'vshape',   label: 'V-Shape Stretch', dur: '6 min',  reps: '3 sets × 30 sec',      calories: 40,  level: 'Intermediate',
    benefits: ['Hamstrings', 'Inner Thighs', 'Core Strength'],
    tips: 'Sit tall and lean forward from the hips, not the waist. Flex your feet. Keep the spine long throughout.',
    src: fv('Woman_doing_V-shape_exercise_202606182201.mp4') },

  { id: 'flow',     label: 'Yoga Flow',       dur: '15 min', reps: '2 rounds',              calories: 90,  level: 'All Levels',
    benefits: ['Full Body', 'Mindfulness', 'Balance'],
    tips: 'Move with your breath — inhale to expand, exhale to deepen. Focus on smooth transitions between poses.',
    src: fv('Woman_doing_yoga_poses_202606182200.mp4') },

  { id: 'child',    label: "Child's Pose",    dur: '8 min',  reps: '3 sets × 45 sec',      calories: 25,  level: 'Beginner',
    benefits: ['Hip Relief', 'Back Stretch', 'Deep Relaxation'],
    tips: 'Extend arms forward or rest them alongside the body. Let your forehead touch the mat. Breathe into your back.',
    src: fv("Woman_in_Child%27s_Pose_202606182200.mp4") },

  { id: 'tree',     label: 'Tree Pose',       dur: '10 min', reps: '3 sets × 30 sec/side', calories: 50,  level: 'Beginner',
    benefits: ['Balance', 'Focus', 'Leg Strength'],
    tips: 'Fix your gaze on a single point. Press the raised foot into the inner thigh. Never place the foot on the knee joint.',
    src: fv('Woman_in_Tree_Pose_202606182200.mp4') },

  { id: 'pigeon',   label: 'Pigeon Pose',     dur: '12 min', reps: '2 sets × 60 sec/side', calories: 55,  level: 'Intermediate',
    benefits: ['Deep Hip Opener', 'Sciatic Relief', 'Flexibility'],
    tips: 'Square your hips toward the front of the mat. Ease into it slowly. Fold forward to deepen the hip stretch.',
    src: fv('Woman_performing_Pigeon_Pose_202606182200.mp4') },

  { id: 'warrior2', label: 'Warrior II',      dur: '10 min', reps: '3 sets × 30 sec/side', calories: 65,  level: 'Beginner',
    benefits: ['Leg Strength', 'Hip Opening', 'Stamina'],
    tips: 'Keep the front knee directly over the ankle. Extend both arms parallel to the floor. Gaze over your front fingers.',
    src: fv('Woman_performing_Warrior_II_pose_202606182159.mp4') },

  { id: 'triangle', label: 'Triangle Pose',   dur: '10 min', reps: '3 sets × 30 sec/side', calories: 58,  level: 'Beginner',
    benefits: ['Lateral Stretch', 'Balance', 'Core'],
    tips: 'Stack your hips and keep your chest open to the ceiling. Reach long through the top hand. Engage your core.',
    src: fv('Woman_performs_Triangle_Pose_202606182200.mp4') },

  { id: 'downdog',  label: 'Downward Dog',    dur: '8 min',  reps: '3 sets × 30 sec',      calories: 48,  level: 'Beginner',
    benefits: ['Full Body Stretch', 'Core Activation', 'Spine Relief'],
    tips: 'Press palms flat and spread fingers wide. Lift your hips high and back. Pedal the feet to warm up the calves.',
    src: fv('Woman_holding_downward_dog_pose_202606110124.mp4') },

  // ── NEW poses ──────────────────────────────────────────────────────────────
  { id: 'warrior1', label: 'Warrior I',        dur: '10 min', reps: '3 sets × 30 sec/side', calories: 62,  level: 'Beginner',
    benefits: ['Hip Flexors', 'Chest Opening', 'Core Strength'],
    tips: 'Square your hips to the front. Press through the back heel. Lift your chest and reach arms straight up.',
    src: fv('Woman_performing_Warrior_I_pose_202606261655.mp4') },

  { id: 'chair',    label: 'Chair Pose',       dur: '8 min',  reps: '3 sets × 30 sec',      calories: 55,  level: 'Beginner',
    benefits: ['Quad Strength', 'Core Engagement', 'Posture'],
    tips: 'Sit back as if into an invisible chair. Keep your knees together. Reach your arms overhead beside your ears.',
    src: fv('Woman_performing_Chair_Pose_yoga_202606261655.mp4') },

  { id: 'boat',     label: 'Boat Pose',        dur: '8 min',  reps: '3 sets × 20 sec',      calories: 52,  level: 'Intermediate',
    benefits: ['Core Strength', 'Hip Flexors', 'Balance'],
    tips: 'Balance on your sit-bones. Keep your spine long, not rounded. Reach arms forward and lift your chest.',
    src: fv('Woman_performing_yoga_Boat_Pose_202606261702.mp4') },

  { id: 'camel',    label: 'Camel Pose',       dur: '8 min',  reps: '3 sets × 20 sec',      calories: 50,  level: 'Intermediate',
    benefits: ['Deep Chest Opener', 'Spine Stretch', 'Hip Flexors'],
    tips: 'Push your hips forward before bending back. Tuck your chin slightly. Come out slowly to avoid dizziness.',
    src: fv('Woman_performing_Camel_Pose_yoga_202606261705.mp4') },
];

export const POSE_MAP = Object.fromEntries(POSES.map(p => [p.id, p]));

// ─────────────────────────────────────────────────────────────────────────────
//  MEDITATION
// ─────────────────────────────────────────────────────────────────────────────
export const MEDITATIONS = [
  { id: 'mindfulness', label: 'Mindfulness',      dur: '10 min', reps: 'Guided session',       calories: 15,  level: 'Beginner',
    benefits: ['Stress Relief', 'Mental Clarity', 'Present Moment'],
    tips: 'Sit comfortably and let thoughts come and go without judgment. Simply return focus to your breath whenever distracted.',
    src: fv('Woman_performing_mindfulness_meditation_202606261715.mp4') },

  { id: 'bodyscan',    label: 'Body Scan',         dur: '12 min', reps: 'Guided session',       calories: 12,  level: 'Beginner',
    benefits: ['Deep Relaxation', 'Body Awareness', 'Tension Release'],
    tips: 'Scan from head to toe. Breathe into any area of tension and let it soften with each exhale.',
    src: fv('Woman_performing_body_scan_meditation_202606261715.mp4') },

  { id: 'om',          label: 'Om Mantra',          dur: '8 min',  reps: 'Guided chanting',      calories: 10,  level: 'Beginner',
    benefits: ['Calming Vibration', 'Focus', 'Positive Energy'],
    tips: 'Feel the vibration in your chest and throat as you chant. Let the sound fade into silence and sit with the stillness.',
    src: fv('Woman_chanting_Om_Mantra_yoga_202606261716.mp4') },
];

export const MEDITATION_MAP = Object.fromEntries(MEDITATIONS.map(m => [m.id, m]));

// ─────────────────────────────────────────────────────────────────────────────
//  WEEKLY SCHEDULE  (updated to include new poses)
// ─────────────────────────────────────────────────────────────────────────────
export const WEEKLY = [
  { day: 'Mon', name: 'Morning Flow',    dur: '15 min', color: '#FF6B6B', poses: ['cobra', 'child', 'downdog'],      desc: 'Gentle wake-up sequence to energize your morning' },
  { day: 'Tue', name: 'Hip Openers',     dur: '20 min', color: '#C8F135', poses: ['pigeon', 'twist', 'happy'],       desc: 'Deep hip release for flexibility and sciatic relief' },
  { day: 'Wed', name: 'Balance & Focus', dur: '18 min', color: '#4ECDC4', poses: ['tree', 'warrior2', 'warrior1'],   desc: 'Standing poses to build focus, balance and leg strength' },
  { day: 'Thu', name: 'Backbend Flow',   dur: '20 min', color: '#A78BFA', poses: ['camel', 'backbend', 'cobra'],     desc: 'Deep chest and spine extension to open posture' },
  { day: 'Fri', name: 'Full Body',       dur: '22 min', color: '#F59E0B', poses: ['flow', 'warrior2', 'triangle'],   desc: 'Complete flow combining strength and flexibility' },
  { day: 'Sat', name: 'Core & Stretch',  dur: '20 min', color: '#EC4899', poses: ['boat', 'chair', 'vshape'],        desc: 'Core activation with deep stretching for recovery' },
  { day: 'Sun', name: 'Rest & Restore',  dur: '15 min', color: '#6EE7B7', poses: ['happy', 'child', 'twist'],        desc: 'Gentle restorative yoga to recover and reset' },
];

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const YOGA_MUSIC_URI =
  'https://archive.org/download/yoga-music/A%20Song%20of%20Rain%2C%20Calming%20Yoga%20Music.mp3';
