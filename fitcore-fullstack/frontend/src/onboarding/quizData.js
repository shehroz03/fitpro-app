// ─────────────────────────────────────────────────────────────────────────────
//  Onboarding quiz definition (BetterMe-style funnel, FitCore dark + lime).
//  One data file drives the whole funnel. Each step has a `type` that maps to a
//  template in QuizOnboarding. Gender-aware options live under `byGender`.
// ─────────────────────────────────────────────────────────────────────────────

export const FOCUS_AREAS = {
  female: [
    { key: 'arms',   label: 'Toned Arms',  region: 'arms' },
    { key: 'chest',  label: 'Firm Chest',  region: 'chest' },
    { key: 'abs',    label: 'Flat Abs',    region: 'abs' },
    { key: 'glutes', label: 'Bubble Butt', region: 'glutes' },
    { key: 'legs',   label: 'Slim Legs',   region: 'legs' },
    { key: 'full',   label: 'Full Body',   region: 'full' },
  ],
  male: [
    { key: 'arms',   label: 'Bigger Arms',   region: 'arms' },
    { key: 'chest',  label: 'Broad Chest',   region: 'chest' },
    { key: 'abs',    label: 'Six-Pack Abs',  region: 'abs' },
    { key: 'back',   label: 'Stronger Back', region: 'back' },
    { key: 'legs',   label: 'Bigger Legs',   region: 'legs' },
    { key: 'full',   label: 'Full Body',     region: 'full' },
  ],
};

export const BODY_SHAPES = [
  { key: 'skinny', label: 'Skinny' },
  { key: 'medium', label: 'Medium' },
  { key: 'flabby', label: 'Flabby' },
  { key: 'toned',  label: 'Toned'  },
];

// desired body-fat slider stops (used for both genders, copy differs slightly)
export const BODYFAT_STOPS = [
  { range: '10%~15%', tone: 'hard',  shape: 'toned',  title: 'Sweaty choice!',
    note: "Get ready to break a sweat! This target is not easy but we're sure you are ready!" },
  { range: '16%~20%', tone: 'good',  shape: 'toned',  title: 'Reasonable Goal!',
    note: 'Step by step! This goal is practical and friendly for beginners.' },
  { range: '21%~25%', tone: 'good',  shape: 'medium', title: "That's good!",
    note: 'You are already in your target zone. Just keep it up!' },
  { range: '26%~30%', tone: 'good',  shape: 'medium', title: "That's good!",
    note: 'You are already in your target zone. Just keep it up!' },
  { range: '31%~35%', tone: 'good',  shape: 'flabby', title: 'Reasonable Goal!',
    note: 'Step by step! This goal is practical and friendly for beginners.' },
  { range: '36%~45%', tone: 'risk',  shape: 'flabby', title: 'Consult a doctor',
    note: 'This body fat level seems too high, which might cause some health issues...' },
];

export const FREQ_STOPS = [
  { n: 1, label: '1 time/week',  sub: 'Just getting started' },
  { n: 2, label: '2 times/week', sub: 'Easing into a routine' },
  { n: 3, label: '3 times/week', sub: 'I enjoy workout as a part of my lifestyle' },
  { n: 4, label: '4 times/week', sub: 'Staying consistent & strong' },
  { n: 5, label: '5 times/week', sub: 'Fitness is my priority' },
];

// the ordered funnel
// NOTE: gender is now collected at RegisterScreen — no gender step here
export const STEPS = [
  { type: 'theme',   key: 'theme_choice', title: 'Choose your style' },

  { type: 'section', num: '1', title: 'About you',   sub: "Let's personalise your journey" },

  { type: 'focus', key: 'focus_areas', title: 'Which area would you',
    title2: 'like to focus on?' },

  { type: 'shape', key: 'body_shape', title: "What's your current",
    title2: 'body shape?' },

  { type: 'bodyfat', key: 'target_bodyfat', title: "What's your desired",
    title2: 'body shape?' },

  { type: 'section', num: '2', title: 'Body data',   sub: 'A few quick measurements' },

  { type: 'number', key: 'age', title: 'How old are you?',
    placeholder: 'e.g. 24', unit: 'years', min: 12, max: 99 },

  { type: 'number', key: 'height_cm', title: 'How tall are you?',
    placeholder: 'e.g. 175', unit: 'cm', min: 120, max: 230 },

  { type: 'results', key: 'results', title: 'Your plan is ready' },
];
