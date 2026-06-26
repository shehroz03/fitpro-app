const SB = 'https://nlzuqzkxtmqabmwkggpy.supabase.co/storage/v1/object/public/exercise-videos/female';
const fv = (f) => ({ uri: `${SB}/${f}` });

// ─────────────────────────────────────────────────────────────────────────────
//  YOGA POSES
// ─────────────────────────────────────────────────────────────────────────────
export const POSES = [
  // ── Original 12 ────────────────────────────────────────────────────────────
  { id: 'cobra',    label: 'Cobra Pose',       dur: '8 min',  reps: '3 × 30 sec',      calories: 45, level: 'Beginner',
    benefits: ['Spine Flexibility', 'Chest Opening', 'Stress Relief'],
    tips: 'Keep elbows slightly bent. Press feet and thighs into the mat. Breathe deeply and hold.',
    src: fv('Woman_doing_Cobra_Pose_202606182200.mp4') },

  { id: 'backbend', label: 'Deep Backbend',    dur: '6 min',  reps: '3 × 20 sec',      calories: 38, level: 'Intermediate',
    benefits: ['Spine Stretch', 'Hip Flexors', 'Better Posture'],
    tips: 'Engage core before bending. Keep neck neutral. Breathe slowly.',
    src: fv('Woman_doing_deep_backbend_202606182201.mp4') },

  { id: 'happy',    label: 'Happy Baby',        dur: '8 min',  reps: '2 × 45 sec',      calories: 30, level: 'Beginner',
    benefits: ['Hip Opening', 'Lower Back Relief', 'Calming'],
    tips: 'Grab feet from outer edges. Rock side to side gently. Keep shoulders flat.',
    src: fv('Woman_doing_Happy_Baby_Pose_202606182201.mp4') },

  { id: 'twist',    label: 'Supine Twist',      dur: '10 min', reps: '2 × 30 sec/side', calories: 35, level: 'Beginner',
    benefits: ['Spinal Detox', 'Digestion', 'Back Pain Relief'],
    tips: 'Keep both shoulders flat. Extend top arm out. Deepen with each exhale.',
    src: fv('Woman_doing_supine_twist_202606182201.mp4') },

  { id: 'vshape',   label: 'V-Shape Stretch',   dur: '6 min',  reps: '3 × 30 sec',      calories: 40, level: 'Intermediate',
    benefits: ['Hamstrings', 'Inner Thighs', 'Core Strength'],
    tips: 'Lean forward from hips not waist. Flex feet. Keep spine long.',
    src: fv('Woman_doing_V-shape_exercise_202606182201.mp4') },

  { id: 'flow',     label: 'Yoga Flow',          dur: '15 min', reps: '2 rounds',         calories: 90, level: 'All Levels',
    benefits: ['Full Body', 'Mindfulness', 'Balance'],
    tips: 'Move with breath — inhale to expand, exhale to deepen. Smooth transitions.',
    src: fv('Woman_doing_yoga_poses_202606182200.mp4') },

  { id: 'child',    label: "Child's Pose",       dur: '8 min',  reps: '3 × 45 sec',      calories: 25, level: 'Beginner',
    benefits: ['Hip Relief', 'Back Stretch', 'Deep Relaxation'],
    tips: 'Extend arms forward. Let forehead touch mat. Breathe into your back.',
    src: fv("Woman_in_Child%27s_Pose_202606182200.mp4") },

  { id: 'tree',     label: 'Tree Pose',          dur: '10 min', reps: '3 × 30 sec/side', calories: 50, level: 'Beginner',
    benefits: ['Balance', 'Focus', 'Leg Strength'],
    tips: 'Fix gaze on one point. Press raised foot into inner thigh. Never on the knee.',
    src: fv('Woman_in_Tree_Pose_202606182200.mp4') },

  { id: 'pigeon',   label: 'Pigeon Pose',        dur: '12 min', reps: '2 × 60 sec/side', calories: 55, level: 'Intermediate',
    benefits: ['Deep Hip Opener', 'Sciatic Relief', 'Flexibility'],
    tips: 'Square hips to the front. Ease in slowly. Fold forward to deepen.',
    src: fv('Woman_performing_Pigeon_Pose_202606182200.mp4') },

  { id: 'warrior2', label: 'Warrior II',         dur: '10 min', reps: '3 × 30 sec/side', calories: 65, level: 'Beginner',
    benefits: ['Leg Strength', 'Hip Opening', 'Stamina'],
    tips: 'Front knee over ankle. Arms parallel to floor. Gaze over front fingers.',
    src: fv('Woman_performing_Warrior_II_pose_202606182159.mp4') },

  { id: 'triangle', label: 'Triangle Pose',      dur: '10 min', reps: '3 × 30 sec/side', calories: 58, level: 'Beginner',
    benefits: ['Lateral Stretch', 'Balance', 'Core'],
    tips: 'Stack hips and open chest to ceiling. Reach through top hand. Engage core.',
    src: fv('Woman_performs_Triangle_Pose_202606182200.mp4') },

  { id: 'downdog',  label: 'Downward Dog',       dur: '8 min',  reps: '3 × 30 sec',      calories: 48, level: 'Beginner',
    benefits: ['Full Body Stretch', 'Core Activation', 'Spine Relief'],
    tips: 'Press palms flat, spread fingers. Lift hips high and back. Pedal feet.',
    src: fv('Woman_holding_downward_dog_pose_202606110124.mp4') },

  // ── Standing & Balance ─────────────────────────────────────────────────────
  { id: 'mountain', label: 'Mountain Pose',      dur: '5 min',  reps: '3 × 30 sec',      calories: 20, level: 'Beginner',
    benefits: ['Posture', 'Body Awareness', 'Grounding'],
    tips: 'Stand tall, feet together, arms at sides, palms forward. Spine long. Steady breath.',
    src: fv('A_fit_athletic_woman_with_202606261654.mp4') },

  { id: 'warrior1', label: 'Warrior I',          dur: '10 min', reps: '3 × 30 sec/side', calories: 62, level: 'Beginner',
    benefits: ['Hip Flexors', 'Chest Opening', 'Core Strength'],
    tips: 'Square hips to front. Press back heel down. Arms straight up beside ears.',
    src: fv('Woman_performing_Warrior_I_pose_202606261655.mp4') },

  { id: 'warrior3', label: 'Warrior III',        dur: '8 min',  reps: '3 × 20 sec/side', calories: 60, level: 'Intermediate',
    benefits: ['Balance', 'Core Strength', 'Hamstrings'],
    tips: 'Balance on one leg, torso and lifted leg horizontal like a T. Arms reach forward.',
    src: fv('A_fit_young_woman_in_202606261655.mp4') },

  { id: 'chair',    label: 'Chair Pose',         dur: '8 min',  reps: '3 × 30 sec',      calories: 55, level: 'Beginner',
    benefits: ['Quad Strength', 'Core Engagement', 'Posture'],
    tips: 'Sit back as if into an invisible chair. Knees together. Arms overhead.',
    src: fv('Woman_performing_Chair_Pose_yoga_202606261655.mp4') },

  { id: 'halfmoon', label: 'Half Moon Pose',     dur: '8 min',  reps: '3 × 20 sec/side', calories: 55, level: 'Intermediate',
    benefits: ['Balance', 'Lateral Stretch', 'Hip Opener'],
    tips: 'One hand on floor, other arm reaches up. Lift leg parallel to ground. Open chest.',
    src: fv('A_fit_young_woman_with_202606261655.mp4') },

  { id: 'eagle',    label: 'Eagle Pose',         dur: '8 min',  reps: '3 × 20 sec/side', calories: 52, level: 'Intermediate',
    benefits: ['Balance', 'Focus', 'Shoulder Stretch'],
    tips: 'Cross and wrap one leg around the other. Interlock arms in front. Bend and balance.',
    src: fv('A_fit_young_woman_in_202606261656.mp4') },

  { id: 'dancer',   label: 'Dancer Pose',        dur: '8 min',  reps: '3 × 20 sec/side', calories: 58, level: 'Intermediate',
    benefits: ['Balance', 'Backbend', 'Hip Flexors'],
    tips: 'Hold back foot, kick into hand to create an arch. Reach front arm forward.',
    src: fv('A_fit_young_woman_in_202606261657.mp4') },

  { id: 'forwardfold', label: 'Standing Fold',  dur: '6 min',  reps: '3 × 30 sec',      calories: 35, level: 'Beginner',
    benefits: ['Hamstrings', 'Spine Release', 'Calming'],
    tips: 'Hinge from hips not waist. Let head hang heavy. Bend knees slightly if needed.',
    src: fv('A_fit_young_woman_in_202606261659.mp4') },

  // ── Seated & Folds ─────────────────────────────────────────────────────────
  { id: 'easypose', label: 'Easy Pose',          dur: '8 min',  reps: 'Hold 2–5 min',     calories: 15, level: 'Beginner',
    benefits: ['Hip Opening', 'Spine Lengthening', 'Calming'],
    tips: 'Sit cross-legged, spine tall. Hands on knees. Close eyes and breathe deeply.',
    src: fv('A_fit_young_woman_in_202606261700.mp4') },

  { id: 'seatedfold', label: 'Seated Fold',      dur: '8 min',  reps: '3 × 40 sec',      calories: 32, level: 'Beginner',
    benefits: ['Hamstrings', 'Lower Back', 'Spine Flexibility'],
    tips: 'Legs straight, fold forward from hips with a long spine. Reach for feet.',
    src: fv('A_fit_young_woman_in_202606261701.mp4') },

  { id: 'butterfly', label: 'Butterfly Pose',   dur: '8 min',  reps: '2 × 60 sec',      calories: 28, level: 'Beginner',
    benefits: ['Inner Thigh Stretch', 'Hip Opening', 'Groin Flexibility'],
    tips: 'Soles of feet together, knees out wide. Hold feet and gently fold forward.',
    src: fv('A_fit_young_woman_in_202606261703.mp4') },

  { id: 'boat',     label: 'Boat Pose',          dur: '8 min',  reps: '3 × 20 sec',      calories: 52, level: 'Intermediate',
    benefits: ['Core Strength', 'Hip Flexors', 'Balance'],
    tips: 'Balance on sit-bones. Spine long, not rounded. Reach arms forward, lift chest.',
    src: fv('Woman_performing_yoga_Boat_Pose_202606261702.mp4') },

  { id: 'seatedtwist', label: 'Seated Twist',   dur: '8 min',  reps: '2 × 30 sec/side', calories: 30, level: 'Beginner',
    benefits: ['Spinal Rotation', 'Digestion', 'Detox'],
    tips: 'Sit tall. Cross one leg over, twist torso. Opposite elbow presses against knee.',
    src: fv('A_fit_young_woman_in_202606261706.mp4') },

  // ── Backbends ──────────────────────────────────────────────────────────────
  { id: 'sphinx',   label: 'Sphinx Pose',        dur: '8 min',  reps: '3 × 30 sec',      calories: 30, level: 'Beginner',
    benefits: ['Gentle Backbend', 'Chest Opener', 'Spine Decompression'],
    tips: 'Forearms on floor, elbows under shoulders. Lift chest gently. Shoulders relaxed.',
    src: fv('A_fit_young_woman_in_202606261708.mp4') },

  { id: 'camel',    label: 'Camel Pose',         dur: '8 min',  reps: '3 × 20 sec',      calories: 50, level: 'Intermediate',
    benefits: ['Deep Chest Opener', 'Spine Stretch', 'Hip Flexors'],
    tips: 'Push hips forward before bending back. Tuck chin slightly. Come out slowly.',
    src: fv('Woman_performing_Camel_Pose_yoga_202606261705.mp4') },

  { id: 'bridge',   label: 'Bridge Pose',        dur: '8 min',  reps: '3 × 30 sec',      calories: 45, level: 'Beginner',
    benefits: ['Glutes', 'Lower Back', 'Chest Opener'],
    tips: 'Press feet into floor, lift hips. Squeeze glutes at the top. Arms flat.',
    src: fv('A_fit_young_woman_in_202606261711.mp4') },

  { id: 'bow',      label: 'Bow Pose',           dur: '6 min',  reps: '3 × 20 sec',      calories: 42, level: 'Intermediate',
    benefits: ['Full Back Stretch', 'Chest Opening', 'Hip Flexors'],
    tips: 'Lie face down. Hold ankles and lift chest and legs simultaneously.',
    src: fv('A_fit_young_woman_in_202606261713.mp4') },

  { id: 'fish',     label: 'Fish Pose',          dur: '6 min',  reps: '3 × 20 sec',      calories: 30, level: 'Beginner',
    benefits: ['Throat & Chest Opening', 'Spine Flexibility', 'Fatigue Relief'],
    tips: 'Lie on back, arch chest up, crown of head rests gently down. Breathe deeply.',
    src: fv('A_fit_young_woman_with_202606261713.mp4') },

  // ── Restorative ────────────────────────────────────────────────────────────
  { id: 'catcow',   label: 'Cat-Cow',            dur: '6 min',  reps: '2 min flowing',    calories: 22, level: 'Beginner',
    benefits: ['Spine Mobility', 'Core Warm-up', 'Stress Relief'],
    tips: 'Sync with breath — inhale cow (belly drops), exhale cat (back arches). Slow flow.',
    src: fv('A_fit_young_woman_in_202606261714.mp4') },
];

export const POSE_MAP = Object.fromEntries(POSES.map(p => [p.id, p]));

// ─────────────────────────────────────────────────────────────────────────────
//  MEDITATION
// ─────────────────────────────────────────────────────────────────────────────
export const MEDITATIONS = [
  { id: 'mindfulness',    label: 'Mindfulness',       dur: '10 min', reps: 'Guided session',  calories: 15, level: 'Beginner',
    benefits: ['Stress Relief', 'Mental Clarity', 'Present Moment'],
    tips: 'Let thoughts come and go without judgment. Return focus to breath when distracted.',
    src: fv('Woman_performing_mindfulness_meditation_202606261715.mp4') },

  { id: 'bodyscan',       label: 'Body Scan',          dur: '12 min', reps: 'Guided session',  calories: 12, level: 'Beginner',
    benefits: ['Deep Relaxation', 'Body Awareness', 'Tension Release'],
    tips: 'Scan from head to toe. Breathe into areas of tension and let them soften.',
    src: fv('Woman_performing_body_scan_meditation_202606261715.mp4') },

  { id: 'om',             label: 'Om Mantra',          dur: '8 min',  reps: 'Guided chanting', calories: 10, level: 'Beginner',
    benefits: ['Calming Vibration', 'Focus', 'Positive Energy'],
    tips: 'Feel the vibration in your chest and throat. Let the sound fade into stillness.',
    src: fv('Woman_chanting_Om_Mantra_yoga_202606261716.mp4') },

  { id: 'altnostril',     label: 'Nostril Breathing', dur: '8 min',  reps: '5 min practice',  calories: 10, level: 'Beginner',
    benefits: ['Nervous System Balance', 'Mental Clarity', 'Energy'],
    tips: 'Inhale left, exhale right, inhale right, exhale left. One round. Stay slow and steady.',
    src: fv('A_fit_young_woman_with_202606261720.mp4') },

  { id: 'lovingkindness', label: 'Loving-Kindness',  dur: '10 min', reps: 'Guided session',  calories: 12, level: 'Beginner',
    benefits: ['Compassion', 'Emotional Healing', 'Joy'],
    tips: 'Start with yourself, then extend love outward. Feel warmth radiating from the heart.',
    src: fv('A_fit_young_woman_with_202606261723.mp4') },

  { id: 'breathaware',    label: 'Breath Awareness',  dur: '8 min',  reps: '5 min practice',  calories: 10, level: 'Beginner',
    benefits: ['Calm Mind', 'Focus', 'Anxiety Relief'],
    tips: 'Observe natural breath without controlling it. Feel each inhale and exhale fully.',
    src: fv('A_fit_young_woman_in_202606261725.mp4') },
];

export const MEDITATION_MAP = Object.fromEntries(MEDITATIONS.map(m => [m.id, m]));

// ─────────────────────────────────────────────────────────────────────────────
//  WEEKLY SCHEDULE
// ─────────────────────────────────────────────────────────────────────────────
export const WEEKLY = [
  { day: 'Mon', name: 'Morning Flow',    dur: '20 min', color: '#FF6B6B',
    poses: ['mountain', 'warrior1', 'warrior2', 'chair'],
    desc: 'Standing energizing sequence to power up your morning' },
  { day: 'Tue', name: 'Hip Openers',     dur: '22 min', color: '#C8F135',
    poses: ['pigeon', 'butterfly', 'happy', 'twist'],
    desc: 'Deep hip release for flexibility and sciatic relief' },
  { day: 'Wed', name: 'Balance & Power', dur: '20 min', color: '#4ECDC4',
    poses: ['tree', 'warrior3', 'halfmoon', 'dancer'],
    desc: 'Advanced balance poses for focus and leg strength' },
  { day: 'Thu', name: 'Backbend Flow',   dur: '22 min', color: '#A78BFA',
    poses: ['camel', 'bridge', 'bow', 'sphinx'],
    desc: 'Chest and spine opening for better posture' },
  { day: 'Fri', name: 'Full Body',       dur: '25 min', color: '#F59E0B',
    poses: ['flow', 'warrior2', 'triangle', 'eagle'],
    desc: 'Complete flow combining strength and flexibility' },
  { day: 'Sat', name: 'Core & Stretch',  dur: '20 min', color: '#EC4899',
    poses: ['boat', 'vshape', 'seatedfold', 'seatedtwist'],
    desc: 'Core activation with deep stretching for recovery' },
  { day: 'Sun', name: 'Rest & Restore',  dur: '18 min', color: '#6EE7B7',
    poses: ['catcow', 'child', 'fish', 'downdog'],
    desc: 'Gentle restorative yoga to recover and reset' },
];

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const YOGA_MUSIC_URI =
  'https://archive.org/download/yoga-music/A%20Song%20of%20Rain%2C%20Calming%20Yoga%20Music.mp3';
