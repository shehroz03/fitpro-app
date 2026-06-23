// ─────────────────────────────────────────────────────────────────────────────
//  FitCore — Nutrition / Diet Plans design tokens
//  Single accent: Indigo #4F46E5. Green = success/streak only.
//  Muted pastel cards — saturation reduced so nothing competes with accent.
// ─────────────────────────────────────────────────────────────────────────────

export const DIET = {
  // Surfaces — clean off-white system
  bg:        '#FAFAFB',
  card:      '#FFFFFF',
  panel:     '#F4F4F5',
  divider:   '#ECECEF',

  // Text
  text:      '#18181B',
  textMuted: '#71717A',
  label:     '#A1A1AA',
  onPastel:  '#18181B',

  // Accent — Indigo
  accent:    '#4F46E5',
  accentDim: 'rgba(79,70,229,0.08)',

  // Success — only for completed/streak states
  success:   '#16A34A',
} as const;

// Macro circle backgrounds — muted pastels, not saturated
export const MACRO = {
  carbs:   '#EEF2FF', // muted blue-indigo
  fat:     '#FEFCE8', // muted yellow
  protein: '#F0FDF4', // muted green
} as const;

// Category card backgrounds — low saturation, consistent treatment
export const CATEGORY = {
  keto:      '#FEF3E2',
  ketoBreak: '#FFF1F2',
  smoothie:  '#EEF2FF',
  vegan:     '#F0FDF4',
} as const;

export const RADIUS = {
  card:     16,
  panel:    12,
  category: 16,
  pill:     999,
} as const;

export const SPACE = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
} as const;
