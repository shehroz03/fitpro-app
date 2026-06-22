const SB = 'https://nlzuqzkxtmqabmwkggpy.supabase.co/storage/v1/object/public/exercise-videos/female';
const fv = (f) => ({ uri: `${SB}/${f}` });

export const POSES = [
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

  { id: 'warrior',  label: 'Warrior II',      dur: '10 min', reps: '3 sets × 30 sec/side', calories: 65,  level: 'Beginner',
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
];

export const POSE_MAP = Object.fromEntries(POSES.map(p => [p.id, p]));

export const WEEKLY = [
  { day: 'Mon', name: 'Morning Flow',    dur: '15 min', color: '#FF6B6B', poses: ['cobra', 'child', 'downdog'],   desc: 'Gentle wake-up sequence to energize your morning' },
  { day: 'Tue', name: 'Hip Openers',     dur: '20 min', color: '#C8F135', poses: ['pigeon', 'twist', 'happy'],    desc: 'Deep hip release for flexibility and sciatic relief' },
  { day: 'Wed', name: 'Balance & Focus', dur: '15 min', color: '#4ECDC4', poses: ['tree', 'warrior', 'triangle'], desc: 'Standing poses to build focus and leg strength' },
  { day: 'Thu', name: 'Backbend Flow',   dur: '20 min', color: '#A78BFA', poses: ['backbend', 'cobra', 'vshape'], desc: 'Spine extension to open chest and improve posture' },
  { day: 'Fri', name: 'Full Body',       dur: '20 min', color: '#F59E0B', poses: ['flow', 'warrior', 'triangle'], desc: 'Complete flow combining strength and flexibility' },
  { day: 'Sat', name: 'Core & Stretch',  dur: '20 min', color: '#EC4899', poses: ['vshape', 'triangle', 'twist'], desc: 'Core activation with deep stretching for recovery' },
  { day: 'Sun', name: 'Rest & Restore',  dur: '15 min', color: '#6EE7B7', poses: ['happy', 'child', 'twist'],     desc: 'Gentle restorative yoga to recover and reset' },
];

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const YOGA_MUSIC_URI =
  'https://archive.org/download/yoga-music/A%20Song%20of%20Rain%2C%20Calming%20Yoga%20Music.mp3';
