import { useThemeStore } from '../store/themeStore';

// ── Design tokens ──────────────────────────────────────────────
// DARK: deep green-black base, lime accent stays identical in both modes
export const DARK = {
  bg:          '#0B0D0A',
  surface:     '#161914',
  surfaceAlt:  '#1F231C',
  textPrimary: '#F4F5F3',
  textMuted:   '#8A8F86',
  dim:         '#55556A',
  border:      '#262A22',
  accent:      '#C8F135',
  accentText:  '#0E1117',
  accentDim:   'rgba(200,241,53,0.15)',

  // Backward-compat aliases — old names still resolve
  card:   '#161914',
  card2:  '#1F231C',
  text:   '#F4F5F3',
  muted:  '#8A8F86',

  // Removed semantic palette — mapped to accent/neutral
  blue:   '#C8F135',
  orange: '#C8F135',
  purple: '#C8F135',
  teal:   '#C8F135',
  red:    '#8A8F86',
};

// LIGHT: warm off-white base, same lime accent
export const LIGHT = {
  bg:          '#F4F5F3',
  surface:     '#FFFFFF',
  surfaceAlt:  '#ECEEE9',
  textPrimary: '#0E1117',
  textMuted:   '#6B7280',
  dim:         '#8888A0',
  border:      '#E3E5E0',
  accent:      '#C8F135',
  accentText:  '#0E1117',
  accentDim:   'rgba(200,241,53,0.15)',

  // Backward-compat aliases
  card:  '#FFFFFF',
  card2: '#ECEEE9',
  text:  '#0E1117',
  muted: '#6B7280',

  // Removed semantic palette — mapped to accent/neutral
  blue:   '#C8F135',
  orange: '#C8F135',
  purple: '#C8F135',
  teal:   '#C8F135',
  red:    '#6B7280',
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
