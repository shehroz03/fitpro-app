import { useThemeStore } from '../store/themeStore';

// ─────────────────────────────────────────────────────────────────────────────
//  DESIGN TOKENS — Single source of truth.
//  DARK: deep navy + vibrant purple #7C5CFC (matches reference fitness app)
//  LIGHT: off-white + indigo #4F46E5 (clean professional)
//  Green (#16A34A) = success/streak/completed only — never accent.
// ─────────────────────────────────────────────────────────────────────────────

// Card shadow (use in style prop as: ...SHADOW.card)
export const SHADOW = {
  card: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  sm: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
};

// DARK: deep navy base + vibrant purple — matches reference fitness app design
export const DARK = {
  bg:          '#0B0C1A',   // very dark navy
  surface:     '#161730',   // card background
  surfaceAlt:  '#1E1F3C',   // elevated surface
  textPrimary: '#F0F0FF',   // slightly purple-tinted white
  textMuted:   '#8B8BAF',
  dim:         '#52526A',
  border:      '#252548',
  accent:      '#7C5CFC',   // vibrant purple
  accentText:  '#FFFFFF',
  accentDim:   'rgba(124,92,252,0.15)',
  success:     '#16A34A',

  card:   '#161730',
  card2:  '#1E1F3C',
  text:   '#F0F0FF',
  muted:  '#8B8BAF',

  blue:   '#7C5CFC',
  orange: '#F59E0B',
  purple: '#7C5CFC',
  teal:   '#7C5CFC',
  red:    '#EF4444',
};

export const LIGHT = {
  // Backgrounds
  bg:          '#FAFAFB',   // off-white — pure white feels flat
  surface:     '#FFFFFF',   // card bg — use with SHADOW.card
  surfaceAlt:  '#F4F4F5',   // secondary surface (pill track, input bg)

  // Text scale
  textPrimary: '#18181B',
  textMuted:   '#71717A',
  dim:         '#A1A1AA',

  // Structure
  border:      '#ECECEF',

  // Accent — Indigo only
  accent:      '#4F46E5',
  accentText:  '#FFFFFF',
  accentDim:   'rgba(79,70,229,0.08)',
  success:     '#16A34A',   // completed / streak / positive delta ONLY

  // Compat aliases
  card:  '#FFFFFF',
  card2: '#F4F4F5',
  text:  '#18181B',
  muted: '#71717A',

  // Semantic — used sparingly
  blue:   '#4F46E5',
  orange: '#F59E0B',
  purple: '#4F46E5',
  teal:   '#4F46E5',
  red:    '#EF4444',
};

// ── Typography scale ───────────────────────────────────────────
export const TYPE = {
  display: { fontSize: 34, fontWeight: '800' },
  h1:      { fontSize: 24, fontWeight: '700' },
  body:    { fontSize: 15, fontWeight: '500' },
  label:   { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
};

// ── Spacing — 4/8/12/16/24/32 only ────────────────────────────
export const SPACE = { xs: 4, sm: 8, md: 12, base: 16, lg: 24, xl: 32 };

// ── Radius ────────────────────────────────────────────────────
export const RADIUS = { card: 20, pill: 999, button: 14 };

// Static dark reference for module-level StyleSheets
export const C = DARK;

export function useC() {
  const isDark = useThemeStore(s => s.isDark);
  return isDark ? DARK : LIGHT;
}

export const FONTS = {
  regular: 'DM-Sans',
  bold:    'DM-Sans-Bold',
  black:   'Barlow-Condensed',
};
